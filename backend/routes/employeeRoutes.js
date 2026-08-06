const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await query(`SELECT * FROM employees ORDER BY id ASC`);
    res.json({ success: true, employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees: ' + err.message });
  }
});

// POST /api/employees - Add new employee
router.post('/', async (req, res) => {
  try {
    const { name, role, phone, assigned_shift, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }

    const result = await query(
      `INSERT INTO employees (name, role, phone, assigned_shift, status) VALUES (?, ?, ?, ?, ?)`,
      [name, role || 'Pump Attendant', phone || '', assigned_shift || 'Morning', status || 'Active']
    );

    const newEmp = await getOne(`SELECT * FROM employees WHERE id = ?`, [result.lastID]);
    res.json({ success: true, message: 'Employee added successfully', employee: newEmp });
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).json({ success: false, message: 'Failed to add employee: ' + err.message });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, role, phone, assigned_shift, status } = req.body;

    await query(
      `UPDATE employees SET name = ?, role = ?, phone = ?, assigned_shift = ?, status = ? WHERE id = ?`,
      [name, role, phone, assigned_shift, status, id]
    );

    const updated = await getOne(`SELECT * FROM employees WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Employee details updated', employee: updated });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ success: false, message: 'Failed to update employee: ' + err.message });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM employees WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ success: false, message: 'Failed to delete employee: ' + err.message });
  }
});

module.exports = router;
