const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/customers - Get all credit customers & overall balance stats
router.get('/', async (req, res) => {
  try {
    const customers = await query(`SELECT * FROM credit_customers ORDER BY name ASC`);
    const totalDueObj = await getOne(`SELECT SUM(current_balance) as total_due FROM credit_customers`);
    res.json({
      success: true,
      customers,
      total_due: totalDueObj ? (totalDueObj.total_due || 0) : 0
    });
  } catch (err) {
    console.error('Error fetching credit customers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch credit customers' });
  }
});

// POST /api/customers - Add new customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, vehicle_number, credit_limit } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const limitVal = parseFloat(credit_limit || 50000);
    const result = await query(
      `INSERT INTO credit_customers (name, phone, vehicle_number, credit_limit, current_balance) VALUES (?, ?, ?, ?, 0.0)`,
      [name, phone || '', vehicle_number || '', limitVal]
    );

    const newCustomer = await getOne(`SELECT * FROM credit_customers WHERE id = ?`, [result.lastID]);
    res.json({ success: true, message: 'Credit customer added successfully', customer: newCustomer });
  } catch (err) {
    console.error('Error adding customer:', err);
    res.status(500).json({ success: false, message: 'Failed to add credit customer' });
  }
});

// GET /api/customers/:id/transactions - Get customer ledger history
router.get('/:id/transactions', async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await getOne(`SELECT * FROM credit_customers WHERE id = ?`, [customerId]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const txns = await query(`SELECT * FROM credit_transactions WHERE customer_id = ? ORDER BY id DESC`, [customerId]);
    res.json({ success: true, customer, transactions: txns });
  } catch (err) {
    console.error('Error fetching customer transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// POST /api/customers/:id/transaction - Record Udhar fuel entry or Repayment received
router.post('/:id/transaction', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { txn_type, fuel_type, litres, amount, bill_number, notes, txn_date } = req.body;

    if (!txn_type || !amount || !txn_date) {
      return res.status(400).json({ success: false, message: 'Transaction type, amount, and date are required' });
    }

    const customer = await getOne(`SELECT * FROM credit_customers WHERE id = ?`, [customerId]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const amt = parseFloat(amount);
    const ltrs = parseFloat(litres || 0);

    // Calculate new customer balance
    let newBalance = customer.current_balance;
    if (txn_type === 'GIVEN') {
      newBalance += amt;
    } else if (txn_type === 'RECEIVED') {
      newBalance = Math.max(0, newBalance - amt);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid txn_type. Must be GIVEN or RECEIVED' });
    }

    await query(
      `INSERT INTO credit_transactions 
       (customer_id, txn_type, fuel_type, litres, amount, bill_number, notes, txn_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, txn_type, fuel_type || '', ltrs, amt, bill_number || '', notes || '', txn_date]
    );

    // Update customer current_balance
    await query(`UPDATE credit_customers SET current_balance = ? WHERE id = ?`, [newBalance, customerId]);

    const updatedCustomer = await getOne(`SELECT * FROM credit_customers WHERE id = ?`, [customerId]);
    res.json({
      success: true,
      message: `Transaction recorded. New balance: ₹${newBalance.toFixed(2)}`,
      customer: updatedCustomer
    });
  } catch (err) {
    console.error('Error logging transaction:', err);
    res.status(500).json({ success: false, message: 'Failed to record transaction' });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    await query(`DELETE FROM credit_customers WHERE id = ?`, [customerId]);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ success: false, message: 'Failed to delete customer' });
  }
});

module.exports = router;
