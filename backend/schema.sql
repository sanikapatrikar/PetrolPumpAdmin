-- =========================================================
-- Patrikar Petroleum Point - IndianOil Admin Portal Database Schema
-- Database: patrikar_petroleum (MySQL)
-- =========================================================

CREATE DATABASE IF NOT EXISTS patrikar_petroleum;
USE patrikar_petroleum;

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fuel Rates Table
CREATE TABLE IF NOT EXISTS fuel_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fuel_type VARCHAR(50) UNIQUE NOT NULL,
    rate_per_litre DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Fuel Tanks Table
CREATE TABLE IF NOT EXISTS fuel_tanks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tank_name VARCHAR(50) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL,
    max_capacity DECIMAL(10, 2) NOT NULL,
    min_alert_level DECIMAL(10, 2) DEFAULT 1000.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Fuel Refills (Tanker Stock Deliveries)
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

-- 5. Employees & Shift Assignments
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'Pump Attendant',
    phone VARCHAR(15),
    assigned_shift VARCHAR(20) DEFAULT 'Morning',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Shift Nozzle Meter Readings
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

-- 7. Payment Reconciliation
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

-- 8. Customer Udhar Ledger
CREATE TABLE IF NOT EXISTS credit_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    vehicle_number VARCHAR(30),
    credit_limit DECIMAL(12, 2) DEFAULT 50000.00,
    current_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 9. Daily Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    description VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Seed Data
INSERT IGNORE INTO admin_users (id, username, password_hash, full_name) VALUES
(1, 'admin', 'admin123', 'Patrikar Petrol Station Manager');

INSERT IGNORE INTO fuel_rates (id, fuel_type, rate_per_litre) VALUES
(1, 'Petrol (MS)', 116.03),
(2, 'Diesel (HSD)', 101.08);

INSERT IGNORE INTO fuel_tanks (id, tank_name, fuel_type, current_stock, max_capacity, min_alert_level) VALUES
(1, 'Tank 1 (Underground)', 'Petrol (MS)', 12450.00, 20000.00, 2500.00),
(2, 'Tank 2 (Underground)', 'Diesel (HSD)', 18200.00, 25000.00, 3000.00);

INSERT IGNORE INTO employees (id, name, role, phone, assigned_shift, status) VALUES
(1, 'Rajesh Sharma', 'Senior Attendant', '9876543210', 'Morning', 'Active'),
(2, 'Suresh Patil', 'Pump Operator', '9812345678', 'Morning', 'Active'),
(3, 'Vikas Gaikwad', 'Pump Attendant', '9765432109', 'Evening', 'Active'),
(4, 'Anil Kumar', 'Shift Supervisor', '9988776655', 'Night', 'Active');

INSERT IGNORE INTO credit_customers (id, name, phone, vehicle_number, credit_limit, current_balance) VALUES
(1, 'Maharasthra Roadways Bus Depot', '022-254411', 'MH-12-PQ-8899', 200000.00, 48500.00),
(2, 'Patil Transport Ltd', '9822114455', 'MH-14-BT-1024', 150000.00, 32400.00),
(3, 'City Ambulance Service', '9890011223', 'MH-12-AM-1080', 50000.00, 8200.00),
(4, 'Kadam Earthmovers JCB', '9766554433', 'MH-12-JC-4512', 100000.00, 14750.00);
