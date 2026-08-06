const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/reports/daily - Day-End Settlement Summary Report
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Shift readings for the date
    const shiftReadings = await query(
      `SELECT sr.*, e.name as attendant_name FROM shift_readings sr LEFT JOIN employees e ON sr.attendant_id = e.id WHERE sr.reading_date = ? ORDER BY sr.id ASC`,
      [date]
    );

    // Aggregate fuel sales by fuel_type
    const fuelSalesAgg = {};
    let totalGrossSales = 0;
    let totalLitresSold = 0;

    shiftReadings.forEach(sr => {
      if (!fuelSalesAgg[sr.fuel_type]) {
        fuelSalesAgg[sr.fuel_type] = { fuel_type: sr.fuel_type, litres: 0, amount: 0, rate: sr.rate };
      }
      fuelSalesAgg[sr.fuel_type].litres += sr.net_litres;
      fuelSalesAgg[sr.fuel_type].amount += sr.total_amount;

      totalGrossSales += sr.total_amount;
      totalLitresSold += sr.net_litres;
    });

    // 2. Expenses for the date
    const expenses = await query(`SELECT * FROM expenses WHERE expense_date = ? ORDER BY id ASC`, [date]);
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    // 3. Payment Reconciliations for the date
    const reconciliations = await query(`SELECT * FROM payment_reconciliations WHERE reconciliation_date = ?`, [date]);
    let totalCashCollected = 0;
    let totalDigitalCollected = 0;
    let totalUdharGiven = 0;

    reconciliations.forEach(rec => {
      totalCashCollected += rec.cash_collected;
      totalDigitalCollected += rec.digital_collected;
      totalUdharGiven += rec.udhar_amount;
    });

    // 4. Udhar Transactions (Given vs Received) for the date
    const creditTxns = await query(
      `SELECT ct.*, c.name as customer_name, c.vehicle_number 
       FROM credit_transactions ct 
       JOIN credit_customers c ON ct.customer_id = c.id 
       WHERE ct.txn_date = ? ORDER BY ct.id DESC`,
      [date]
    );

    let creditGivenDate = 0;
    let creditReceivedDate = 0;
    creditTxns.forEach(t => {
      if (t.txn_type === 'GIVEN') creditGivenDate += t.amount;
      if (t.txn_type === 'RECEIVED') creditReceivedDate += t.amount;
    });

    // 5. Current Tank Stock Snapshot
    const tanks = await query(`SELECT * FROM fuel_tanks ORDER BY id ASC`);

    const netCashInHand = totalCashCollected - totalExpenses;

    res.json({
      success: true,
      report_date: date,
      summary: {
        total_gross_sales: totalGrossSales,
        total_litres_sold: totalLitresSold,
        total_expenses: totalExpenses,
        cash_collected: totalCashCollected,
        digital_collected: totalDigitalCollected,
        udhar_given: totalUdharGiven || creditGivenDate,
        udhar_recovered: creditReceivedDate,
        net_cash_in_drawer: netCashInHand
      },
      fuel_breakdown: Object.values(fuelSalesAgg),
      shift_readings: shiftReadings,
      expenses: expenses,
      credit_transactions: creditTxns,
      tanks: tanks
    });
  } catch (err) {
    console.error('Error generating daily report:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

module.exports = router;
