const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: (process.env.DB_HOST || 'localhost').trim(),
  user: (process.env.DB_USER || 'root').trim(),
  password: (process.env.DB_PASSWORD || '').trim(),
  database: (process.env.DB_NAME || 'patrikar_petroleum').trim(),
  port: parseInt((process.env.DB_PORT || '3306').trim(), 10),
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool;
let fallbackMode = false;

const memoryDb = {
  admin_users: [
    { id: 1, username: 'admin', password_hash: 'admin123', full_name: 'Patrikar Petrol Station Manager', created_at: new Date().toISOString() }
  ],
  fuel_rates: [
    { id: 1, fuel_type: 'Petrol (MS)', rate_per_litre: 116.03, updated_at: new Date().toISOString() },
    { id: 2, fuel_type: 'Diesel (HSD)', rate_per_litre: 101.08, updated_at: new Date().toISOString() }
  ],
  fuel_tanks: [
    { id: 1, tank_name: 'Tank 1 (Underground)', fuel_type: 'Petrol (MS)', current_stock: 12450.0, max_capacity: 20000.0, min_alert_level: 2500.0 },
    { id: 2, tank_name: 'Tank 2 (Underground)', fuel_type: 'Diesel (HSD)', current_stock: 18200.0, max_capacity: 25000.0, min_alert_level: 3000.0 }
  ],
  fuel_refills: [],
  employees: [
    { id: 1, name: 'Rajesh Sharma', role: 'Senior Attendant', phone: '9876543210', assigned_shift: 'Morning', status: 'Active', created_at: new Date().toISOString() },
    { id: 2, name: 'Suresh Patil', role: 'Pump Operator', phone: '9812345678', assigned_shift: 'Morning', status: 'Active', created_at: new Date().toISOString() },
    { id: 3, name: 'Vikas Gaikwad', role: 'Pump Attendant', phone: '9765432109', assigned_shift: 'Evening', status: 'Active', created_at: new Date().toISOString() },
    { id: 4, name: 'Anil Kumar', role: 'Shift Supervisor', phone: '9988776655', assigned_shift: 'Night', status: 'Active', created_at: new Date().toISOString() }
  ],
  shift_readings: [
    { id: 1, reading_date: new Date().toISOString().split('T')[0], shift_name: 'Morning', nozzle_name: 'MS Nozzle 1 (Dispenser A)', fuel_type: 'Petrol (MS)', opening_meter: 45210.0, closing_meter: 45860.0, testing_litres: 5.0, net_litres: 645.0, rate: 116.03, total_amount: 74839.35, attendant_id: 1 },
    { id: 2, reading_date: new Date().toISOString().split('T')[0], shift_name: 'Morning', nozzle_name: 'HSD Nozzle 1 (Dispenser B)', fuel_type: 'Diesel (HSD)', opening_meter: 88100.0, closing_meter: 89350.0, testing_litres: 5.0, net_litres: 1245.0, rate: 101.08, total_amount: 125844.60, attendant_id: 2 }
  ],
  payment_reconciliations: [],
  credit_customers: [
    { id: 1, name: 'Maharasthra Roadways Bus Depot', phone: '022-254411', vehicle_number: 'MH-12-PQ-8899', credit_limit: 200000.0, current_balance: 48500.0 },
    { id: 2, name: 'Patil Transport Ltd', phone: '9822114455', vehicle_number: 'MH-14-BT-1024', credit_limit: 150000.0, current_balance: 32400.0 },
    { id: 3, name: 'City Ambulance Service', phone: '9890011223', vehicle_number: 'MH-12-AM-1080', credit_limit: 50000.0, current_balance: 8200.0 },
    { id: 4, name: 'Kadam Earthmovers JCB', phone: '9766554433', vehicle_number: 'MH-12-JC-4512', credit_limit: 100000.0, current_balance: 14750.0 }
  ],
  credit_transactions: [],
  expenses: [
    { id: 1, expense_date: new Date().toISOString().split('T')[0], category: 'Generator Diesel', payment_method: 'Cash', description: '20L Diesel for station generator backup', amount: 1884.00 },
    { id: 2, expense_date: new Date().toISOString().split('T')[0], category: 'Tea/Refreshments', payment_method: 'Cash', description: 'Staff morning tea and snacks', amount: 240.00 },
    { id: 3, expense_date: new Date().toISOString().split('T')[0], category: 'Maintenance', payment_method: 'UPI', description: 'Air tower hose pipe replacement', amount: 850.00 }
  ]
};

function executeMemoryQuery(sql, params = []) {
  const sqlTrimmed = sql.trim();
  const lowerSql = sqlTrimmed.toLowerCase();

  let tableName = '';
  if (lowerSql.includes('from shift_readings') || lowerSql.includes('into shift_readings') || lowerSql.includes('update shift_readings')) tableName = 'shift_readings';
  else if (lowerSql.includes('from fuel_refills') || lowerSql.includes('into fuel_refills') || lowerSql.includes('update fuel_refills')) tableName = 'fuel_refills';
  else if (lowerSql.includes('from credit_transactions') || lowerSql.includes('into credit_transactions') || lowerSql.includes('update credit_transactions')) tableName = 'credit_transactions';
  else if (lowerSql.includes('from payment_reconciliations') || lowerSql.includes('into payment_reconciliations') || lowerSql.includes('update payment_reconciliations')) tableName = 'payment_reconciliations';
  else if (lowerSql.includes('from fuel_tanks') || lowerSql.includes('into fuel_tanks') || lowerSql.includes('update fuel_tanks')) tableName = 'fuel_tanks';
  else if (lowerSql.includes('from credit_customers') || lowerSql.includes('into credit_customers') || lowerSql.includes('update credit_customers')) tableName = 'credit_customers';
  else if (lowerSql.includes('from fuel_rates') || lowerSql.includes('into fuel_rates') || lowerSql.includes('update fuel_rates')) tableName = 'fuel_rates';
  else if (lowerSql.includes('from expenses') || lowerSql.includes('into expenses') || lowerSql.includes('update expenses')) tableName = 'expenses';
  else if (lowerSql.includes('from employees') || lowerSql.includes('into employees') || lowerSql.includes('update employees')) tableName = 'employees';
  else if (lowerSql.includes('from admin_users') || lowerSql.includes('into admin_users') || lowerSql.includes('update admin_users')) tableName = 'admin_users';

  if (!tableName || !memoryDb[tableName]) {
    return [];
  }

  const table = memoryDb[tableName];

  // 1. SELECT QUERIES
  if (lowerSql.startsWith('select')) {
    // Handle COUNT(*)
    if (lowerSql.includes('count(*)')) {
      return [{ cnt: table.length }];
    }

    // Handle SUM(...) aggregates
    if (lowerSql.includes('sum(')) {
      let filtered = [...table];
      if (lowerSql.includes('expense_date =') && params.length > 0) {
        filtered = filtered.filter(item => item.expense_date === params[0]);
      } else if (lowerSql.includes('expense_date like') && params.length > 0) {
        const pattern = String(params[0]).replace(/%/g, '');
        filtered = filtered.filter(item => item.expense_date && item.expense_date.startsWith(pattern));
      }

      let field = '';
      if (lowerSql.includes('sum(amount)')) field = 'amount';
      else if (lowerSql.includes('sum(current_balance)')) field = 'current_balance';
      
      const sumVal = filtered.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
      if (lowerSql.includes('as total_due')) return [{ total_due: sumVal }];
      return [{ total: sumVal }];
    }

    let result = [...table];

    // WHERE filtering
    if ((lowerSql.includes('where id =') || lowerSql.includes('where sr.id =') || lowerSql.includes('where ft.id =') || lowerSql.includes('where c.id =')) && params.length > 0) {
      const targetId = params[params.length - 1];
      result = result.filter(item => item.id == targetId);
    } else if (lowerSql.includes('where username =') && params.length > 0) {
      result = result.filter(item => item.username && item.username.toLowerCase() === String(params[0]).toLowerCase());
    } else if ((lowerSql.includes('where customer_id =') || lowerSql.includes('where ct.customer_id =')) && params.length > 0) {
      result = result.filter(item => item.customer_id == params[0]);
    } else if (lowerSql.includes('where fuel_type =') && params.length > 0) {
      result = result.filter(item => item.fuel_type === params[0] || (item.fuel_type && item.fuel_type.includes(params[0])));
    } else if ((lowerSql.includes('where reading_date =') || lowerSql.includes('where sr.reading_date =')) && params.length > 0) {
      result = result.filter(item => item.reading_date === params[0]);
    } else if (lowerSql.includes('where expense_date =') && params.length > 0) {
      result = result.filter(item => item.expense_date === params[0]);
    } else if (lowerSql.includes('where expense_date like') && params.length > 0) {
      const pattern = String(params[0]).replace(/%/g, '');
      result = result.filter(item => item.expense_date && item.expense_date.startsWith(pattern));
    } else if (lowerSql.includes('where reconciliation_date =') && params.length > 0) {
      result = result.filter(item => item.reconciliation_date === params[0]);
    } else if ((lowerSql.includes('where txn_date =') || lowerSql.includes('where ct.txn_date =')) && params.length > 0) {
      result = result.filter(item => item.txn_date === params[0]);
    }

    // Enrich JOIN mock data
    if (tableName === 'shift_readings') {
      result = result.map(item => {
        const emp = memoryDb.employees.find(e => e.id == item.attendant_id);
        return { ...item, attendant_name: emp ? emp.name : 'Staff' };
      });
    } else if (tableName === 'fuel_refills') {
      result = result.map(item => {
        const tank = memoryDb.fuel_tanks.find(t => t.id == item.tank_id);
        return {
          ...item,
          tank_name: tank ? tank.tank_name : `Tank #${item.tank_id}`,
          fuel_type: tank ? tank.fuel_type : 'Fuel'
        };
      });
    } else if (tableName === 'credit_transactions') {
      result = result.map(item => {
        const cust = memoryDb.credit_customers.find(c => c.id == item.customer_id);
        return {
          ...item,
          customer_name: cust ? cust.name : 'Customer',
          vehicle_number: cust ? cust.vehicle_number : ''
        };
      });
    }

    // Sorting
    if (lowerSql.includes('order by')) {
      if (lowerSql.includes('order by sr.id desc') || lowerSql.includes('order by id desc') || lowerSql.includes('order by fr.id desc') || lowerSql.includes('order by ct.id desc')) {
        result.sort((a, b) => b.id - a.id);
      } else if (lowerSql.includes('order by name asc')) {
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else if (lowerSql.includes('order by id asc') || lowerSql.includes('order by sr.id asc')) {
        result.sort((a, b) => a.id - b.id);
      }
    }

    // LIMIT
    if (lowerSql.includes('limit 1')) {
      return result.length > 0 ? [result[0]] : [];
    } else if (lowerSql.includes('limit 20')) {
      return result.slice(0, 20);
    }

    return result;
  }

  // 2. INSERT QUERIES
  if (lowerSql.startsWith('insert')) {
    const nextId = table.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    let newItem = { id: nextId, created_at: new Date().toISOString() };

    if (tableName === 'employees') {
      newItem = {
        id: nextId,
        name: params[0],
        role: params[1] || 'Pump Attendant',
        phone: params[2] || '',
        assigned_shift: params[3] || 'Morning',
        status: params[4] || 'Active',
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'fuel_tanks') {
      newItem = {
        id: nextId,
        tank_name: params[0],
        fuel_type: params[1],
        current_stock: parseFloat(params[2] || 0),
        max_capacity: parseFloat(params[3] || 0),
        min_alert_level: parseFloat(params[4] || 1000)
      };
    } else if (tableName === 'fuel_refills') {
      newItem = {
        id: nextId,
        tank_id: parseInt(params[0]),
        invoice_number: params[1],
        supplier_name: params[2] || 'IndianOil Petroleum Depot',
        litres_added: parseFloat(params[3]),
        rate_per_litre: parseFloat(params[4]),
        delivery_date: params[5],
        notes: params[6] || '',
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'shift_readings') {
      newItem = {
        id: nextId,
        reading_date: params[0],
        shift_name: params[1],
        nozzle_name: params[2],
        fuel_type: params[3],
        opening_meter: parseFloat(params[4]),
        closing_meter: parseFloat(params[5]),
        testing_litres: parseFloat(params[6] || 0),
        net_litres: parseFloat(params[7]),
        rate: parseFloat(params[8]),
        total_amount: parseFloat(params[9]),
        attendant_id: params[10] ? parseInt(params[10]) : null,
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'payment_reconciliations') {
      newItem = {
        id: nextId,
        reconciliation_date: params[0],
        shift_name: params[1],
        cash_collected: parseFloat(params[2] || 0),
        digital_collected: parseFloat(params[3] || 0),
        udhar_amount: parseFloat(params[4] || 0),
        expected_amount: parseFloat(params[5] || 0),
        difference_amount: parseFloat(params[6] || 0),
        notes: params[7] || '',
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'credit_customers') {
      newItem = {
        id: nextId,
        name: params[0],
        phone: params[1] || '',
        vehicle_number: params[2] || '',
        credit_limit: parseFloat(params[3] || 50000),
        current_balance: 0.0,
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'credit_transactions') {
      newItem = {
        id: nextId,
        customer_id: parseInt(params[0]),
        txn_type: params[1],
        fuel_type: params[2] || '',
        litres: parseFloat(params[3] || 0),
        amount: parseFloat(params[4] || 0),
        bill_number: params[5] || '',
        notes: params[6] || '',
        txn_date: params[7],
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'expenses') {
      newItem = {
        id: nextId,
        expense_date: params[0],
        category: params[1],
        payment_method: params[2] || 'Cash',
        description: params[3] || '',
        amount: parseFloat(params[4]),
        created_at: new Date().toISOString()
      };
    }

    table.push(newItem);
    return { lastID: newItem.id, insertId: newItem.id, changes: 1, affectedRows: 1 };
  }

  // 3. UPDATE QUERIES
  if (lowerSql.startsWith('update')) {
    if (tableName === 'employees' && params.length >= 6) {
      const id = params[5];
      const emp = table.find(e => e.id == id);
      if (emp) {
        emp.name = params[0];
        emp.role = params[1];
        emp.phone = params[2];
        emp.assigned_shift = params[3];
        emp.status = params[4];
      }
    } else if (tableName === 'fuel_rates') {
      const rateVal = params[0];
      const key = params[params.length - 1];
      const rateObj = table.find(r => r.id == key || r.fuel_type === key);
      if (rateObj) rateObj.rate_per_litre = parseFloat(rateVal);
    } else if (tableName === 'fuel_tanks') {
      const targetId = params[params.length - 1];
      const tank = table.find(t => t.id == targetId);
      if (tank) {
        tank.current_stock = parseFloat(params[0]);
      }
    } else if (tableName === 'credit_customers') {
      const targetId = params[params.length - 1];
      const cust = table.find(c => c.id == targetId);
      if (cust) {
        cust.current_balance = parseFloat(params[0]);
      }
    }
    return { lastID: null, insertId: null, changes: 1, affectedRows: 1 };
  }

  // 4. DELETE QUERIES
  if (lowerSql.startsWith('delete')) {
    if (params.length > 0) {
      const targetId = params[0];
      memoryDb[tableName] = table.filter(item => item.id != targetId);
    }
    return { lastID: null, insertId: null, changes: 1, affectedRows: 1 };
  }

  return [];
}

try {
  pool = mysql.createPool(dbConfig);
  console.log(`Connected to MySQL connection pool [${dbConfig.host}:${dbConfig.port}/${dbConfig.database}] (SSL: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'})`);
  initDatabase();
} catch (err) {
  console.warn('Failed to initialize MySQL pool, switching to in-memory fallback mode:', err.message);
  fallbackMode = true;
}

const query = async (sql, params = []) => {
  if (fallbackMode) {
    return executeMemoryQuery(sql, params);
  }
  try {
    const [results] = await pool.query(sql, params);
    if (Array.isArray(results)) {
      return results;
    }
    return {
      lastID: results.insertId,
      changes: results.affectedRows,
      insertId: results.insertId,
      affectedRows: results.affectedRows
    };
  } catch (err) {
    if (!fallbackMode) {
      console.warn(`ℹ️  MySQL Notice: ${err.message || 'Database unavailable'}. Operating in high-reliability In-Memory Fallback mode.`);
      fallbackMode = true;
    }
    return executeMemoryQuery(sql, params);
  }
};

const getOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0];
  }
  return null;
};

// Database Schema Initialization & Seeding
async function initDatabase() {
  try {
    try {
      const rootConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port,
        ssl: dbConfig.ssl
      });
      await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
      await rootConnection.end();
    } catch (e) {
      // Ignore root database creation error
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS fuel_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fuel_type VARCHAR(50) UNIQUE NOT NULL,
        rate_per_litre DECIMAL(10, 2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS fuel_tanks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tank_name VARCHAR(50) NOT NULL,
        fuel_type VARCHAR(50) NOT NULL,
        current_stock DECIMAL(10, 2) NOT NULL,
        max_capacity DECIMAL(10, 2) NOT NULL,
        min_alert_level DECIMAL(10, 2) DEFAULT 1000.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS fuel_refills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tank_id INT NOT NULL,
        invoice_number VARCHAR(50),
        supplier_name VARCHAR(100) DEFAULT 'IndianOil Petroleum Depot',
        litres_added DECIMAL(10, 2) NOT NULL,
        rate_per_litre DECIMAL(10, 2) DEFAULT 0,
        delivery_date DATE NOT NULL,
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tank_id) REFERENCES fuel_tanks(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'Pump Attendant',
        phone VARCHAR(15),
        assigned_shift VARCHAR(20) DEFAULT 'Morning',
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS shift_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reading_date DATE NOT NULL,
        shift_name VARCHAR(20) NOT NULL,
        nozzle_name VARCHAR(50) NOT NULL,
        fuel_type VARCHAR(50) NOT NULL,
        opening_meter DECIMAL(12, 2) NOT NULL,
        closing_meter DECIMAL(12, 2) NOT NULL,
        testing_litres DECIMAL(10, 2) DEFAULT 0,
        net_litres DECIMAL(10, 2) NOT NULL,
        rate DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        attendant_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attendant_id) REFERENCES employees(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_reconciliations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reconciliation_date DATE NOT NULL,
        shift_name VARCHAR(20) NOT NULL,
        cash_collected DECIMAL(12, 2) DEFAULT 0,
        digital_collected DECIMAL(12, 2) DEFAULT 0,
        udhar_amount DECIMAL(12, 2) DEFAULT 0,
        expected_amount DECIMAL(12, 2) NOT NULL,
        difference_amount DECIMAL(12, 2) DEFAULT 0,
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS credit_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15),
        vehicle_number VARCHAR(30),
        credit_limit DECIMAL(12, 2) DEFAULT 50000.00,
        current_balance DECIMAL(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        txn_type VARCHAR(20) NOT NULL,
        fuel_type VARCHAR(50),
        litres DECIMAL(10, 2) DEFAULT 0,
        amount DECIMAL(12, 2) NOT NULL,
        bill_number VARCHAR(50),
        notes VARCHAR(255),
        txn_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES credit_customers(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        expense_date DATE NOT NULL,
        category VARCHAR(50) NOT NULL,
        payment_method VARCHAR(30) DEFAULT 'Cash',
        description VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await seedInitialData();

  } catch (err) {
    console.log('ℹ️  Note: Running in standalone demo mode (MySQL database inactive).');
    fallbackMode = true;
  }
}

async function seedInitialData() {
  await query(`DELETE FROM fuel_rates WHERE fuel_type NOT IN ('Petrol (MS)', 'Diesel (HSD)')`);
  await query(`DELETE FROM fuel_tanks WHERE fuel_type NOT IN ('Petrol (MS)', 'Diesel (HSD)')`);
  
  const ratesCount = await getOne(`SELECT COUNT(*) as cnt FROM fuel_rates`);
  if (!ratesCount || ratesCount.cnt === 0) {
    await query(`INSERT INTO fuel_rates (fuel_type, rate_per_litre) VALUES ('Petrol (MS)', 116.03)`);
    await query(`INSERT INTO fuel_rates (fuel_type, rate_per_litre) VALUES ('Diesel (HSD)', 101.08)`);
  } else {
    await query(`UPDATE fuel_rates SET rate_per_litre = 116.03 WHERE fuel_type = 'Petrol (MS)'`);
    await query(`UPDATE fuel_rates SET rate_per_litre = 101.08 WHERE fuel_type = 'Diesel (HSD)'`);
  }

  const tanksCount = await getOne(`SELECT COUNT(*) as cnt FROM fuel_tanks`);
  if (!tanksCount || tanksCount.cnt === 0) {
    await query(`INSERT INTO fuel_tanks (tank_name, fuel_type, current_stock, max_capacity, min_alert_level) VALUES ('Tank 1 (Underground)', 'Petrol (MS)', 12450.0, 20000.0, 2500.0)`);
    await query(`INSERT INTO fuel_tanks (tank_name, fuel_type, current_stock, max_capacity, min_alert_level) VALUES ('Tank 2 (Underground)', 'Diesel (HSD)', 18200.0, 25000.0, 3000.0)`);
  }
}

module.exports = {
  pool,
  query,
  getOne
};
