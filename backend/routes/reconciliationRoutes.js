const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/reconcile - Get payment reconciliations
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let sql = `SELECT * FROM payment_reconciliations`;
    const params = [];
    if (date) {
      sql += ` WHERE reconciliation_date = ?`;
      params.push(date);
    }
    sql += ` ORDER BY id DESC`;

    const records = await query(sql, params);
    res.json({ success: true, reconciliations: records });
  } catch (err) {
    console.error('Error fetching reconciliations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment reconciliations' });
  }
});

// POST /api/reconcile - Save payment reconciliation sheet
router.post('/', async (req, res) => {
  try {
    const { reconciliation_date, shift_name, cash_collected, digital_collected, udhar_amount, expected_amount, notes } = req.body;
    if (!reconciliation_date || !shift_name || expected_amount === undefined) {
      return res.status(400).json({ success: false, message: 'Missing date, shift, or expected sales amount' });
    }

    const cash = parseFloat(cash_collected || 0);
    const digital = parseFloat(digital_collected || 0);
    const udhar = parseFloat(udhar_amount || 0);
    const expected = parseFloat(expected_amount || 0);

    const totalCollected = cash + digital + udhar;
    const diff = totalCollected - expected;

    const result = await query(
      `INSERT INTO payment_reconciliations 
       (reconciliation_date, shift_name, cash_collected, digital_collected, udhar_amount, expected_amount, difference_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [reconciliation_date, shift_name, cash, digital, udhar, expected, diff, notes || '']
    );

    const newRecord = await getOne(`SELECT * FROM payment_reconciliations WHERE id = ?`, [result.lastID]);
    res.json({ success: true, message: 'Payment reconciliation saved successfully', reconciliation: newRecord });
  } catch (err) {
    console.error('Error saving reconciliation:', err);
    res.status(500).json({ success: false, message: 'Failed to save payment reconciliation' });
  }
});

module.exports = router;
