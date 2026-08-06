const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/shifts - Get shift readings with optional date/shift filters
router.get('/', async (req, res) => {
  try {
    const { date, shift } = req.query;
    let sql = `
      SELECT sr.*, e.name as attendant_name 
      FROM shift_readings sr 
      LEFT JOIN employees e ON sr.attendant_id = e.id
    `;
    const params = [];
    const conditions = [];

    if (date) {
      conditions.push(`sr.reading_date = ?`);
      params.push(date);
    }
    if (shift) {
      conditions.push(`sr.shift_name = ?`);
      params.push(shift);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY sr.id DESC`;

    const readings = await query(sql, params);
    res.json({ success: true, readings });
  } catch (err) {
    console.error('Error fetching shift readings:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch shift readings' });
  }
});

// POST /api/shifts - Log a new nozzle meter shift reading
router.post('/', async (req, res) => {
  try {
    const {
      reading_date,
      shift_name,
      nozzle_name,
      fuel_type,
      opening_meter,
      closing_meter,
      testing_litres,
      rate,
      attendant_id
    } = req.body;

    if (!reading_date || !shift_name || !nozzle_name || !fuel_type || opening_meter === undefined || closing_meter === undefined || !rate) {
      return res.status(400).json({ success: false, message: 'Missing required shift reading fields' });
    }

    const openVal = parseFloat(opening_meter);
    const closeVal = parseFloat(closing_meter);
    const testLitres = parseFloat(testing_litres || 0);
    const rateVal = parseFloat(rate);

    if (closeVal < openVal) {
      return res.status(400).json({ success: false, message: 'Closing meter cannot be less than opening meter' });
    }

    const netLitres = Math.max(0, closeVal - openVal - testLitres);
    const totalAmount = parseFloat((netLitres * rateVal).toFixed(2));

    const result = await query(
      `INSERT INTO shift_readings 
       (reading_date, shift_name, nozzle_name, fuel_type, opening_meter, closing_meter, testing_litres, net_litres, rate, total_amount, attendant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reading_date, shift_name, nozzle_name, fuel_type, openVal, closeVal, testLitres, netLitres, rateVal, totalAmount, attendant_id || null]
    );

    // Auto-deduct stock from matching fuel tank if available
    const matchingTank = await getOne(`SELECT * FROM fuel_tanks WHERE fuel_type = ? OR fuel_type LIKE ? LIMIT 1`, [fuel_type, `%${fuel_type.split(' ')[0]}%`]);
    if (matchingTank) {
      const updatedStock = Math.max(0, matchingTank.current_stock - netLitres);
      await query(`UPDATE fuel_tanks SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [updatedStock, matchingTank.id]);
    }

    const newReading = await getOne(
      `SELECT sr.*, e.name as attendant_name FROM shift_readings sr LEFT JOIN employees e ON sr.attendant_id = e.id WHERE sr.id = ?`,
      [result.lastID]
    );

    res.json({ success: true, message: 'Shift reading logged successfully', reading: newReading });
  } catch (err) {
    console.error('Error adding shift reading:', err);
    res.status(500).json({ success: false, message: 'Failed to log shift reading' });
  }
});

module.exports = router;
