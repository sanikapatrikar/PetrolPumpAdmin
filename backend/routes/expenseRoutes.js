const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/expenses - Get expenses list with optional date filter
router.get('/', async (req, res) => {
  try {
    const { date, month } = req.query;
    let sql = `SELECT * FROM expenses`;
    const params = [];
    const conditions = [];

    if (date) {
      conditions.push(`expense_date = ?`);
      params.push(date);
    } else if (month) {
      conditions.push(`expense_date LIKE ?`);
      params.push(`${month}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY id DESC`;

    const records = await query(sql, params);
    const totalExpObj = await getOne(
      `SELECT SUM(amount) as total FROM expenses` + (conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''),
      params
    );

    res.json({
      success: true,
      expenses: records,
      total_expense: totalExpObj ? (totalExpObj.total || 0) : 0
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses: ' + err.message });
  }
});

// POST /api/expenses - Record daily expense
router.post('/', async (req, res) => {
  try {
    const { expense_date, category, payment_method, description, amount } = req.body;
    if (!expense_date || !category || !amount) {
      return res.status(400).json({ success: false, message: 'Date, category, and amount are required' });
    }

    const amt = parseFloat(amount);
    const result = await query(
      `INSERT INTO expenses (expense_date, category, payment_method, description, amount) VALUES (?, ?, ?, ?, ?)`,
      [expense_date, category, payment_method || 'Cash', description || '', amt]
    );

    const newExpense = await getOne(`SELECT * FROM expenses WHERE id = ?`, [result.lastID]);
    res.json({ success: true, message: 'Expense recorded successfully', expense: newExpense });
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ success: false, message: 'Failed to record expense: ' + err.message });
  }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM expenses WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ success: false, message: 'Failed to delete expense: ' + err.message });
  }
});

module.exports = router;
