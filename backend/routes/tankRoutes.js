const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// GET /api/tanks - Get tank status & stock levels
router.get('/', async (req, res) => {
  try {
    const tanks = await query(`SELECT * FROM fuel_tanks ORDER BY id ASC`);
    const refills = await query(`
      SELECT fr.*, ft.tank_name, ft.fuel_type 
      FROM fuel_refills fr 
      JOIN fuel_tanks ft ON fr.tank_id = ft.id 
      ORDER BY fr.id DESC LIMIT 20
    `);
    res.json({ success: true, tanks, recent_refills: refills });
  } catch (err) {
    console.error('Error fetching tanks:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tanks' });
  }
});

// POST /api/tanks - Add new tank
router.post('/', async (req, res) => {
  try {
    const { tank_name, fuel_type, current_stock, max_capacity, min_alert_level } = req.body;
    if (!tank_name || !fuel_type || !max_capacity) {
      return res.status(400).json({ success: false, message: 'Tank name, fuel type, and capacity are required' });
    }

    const result = await query(
      `INSERT INTO fuel_tanks (tank_name, fuel_type, current_stock, max_capacity, min_alert_level) VALUES (?, ?, ?, ?, ?)`,
      [tank_name, fuel_type, current_stock || 0, max_capacity, min_alert_level || 1000]
    );

    const newTank = await getOne(`SELECT * FROM fuel_tanks WHERE id = ?`, [result.lastID]);
    res.json({ success: true, message: 'Tank added successfully', tank: newTank });
  } catch (err) {
    console.error('Error adding tank:', err);
    res.status(500).json({ success: false, message: 'Failed to add tank' });
  }
});

// POST /api/tanks/refill - Record Tanker Stock Delivery
router.post('/refill', async (req, res) => {
  try {
    const { tank_id, invoice_number, supplier_name, litres_added, rate_per_litre, delivery_date, notes } = req.body;
    if (!tank_id || !litres_added || !delivery_date) {
      return res.status(400).json({ success: false, message: 'Tank ID, litres, and delivery date are required' });
    }

    const tank = await getOne(`SELECT * FROM fuel_tanks WHERE id = ?`, [tank_id]);
    if (!tank) {
      return res.status(404).json({ success: false, message: 'Tank not found' });
    }

    const addedLitres = parseFloat(litres_added);
    const newStock = Math.min(tank.max_capacity, tank.current_stock + addedLitres);

    // Insert refill log
    await query(
      `INSERT INTO fuel_refills (tank_id, invoice_number, supplier_name, litres_added, rate_per_litre, delivery_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tank_id, invoice_number || `INV-${Date.now().toString().slice(-6)}`, supplier_name || 'IndianOil Petroleum Depot', addedLitres, rate_per_litre || 0, delivery_date, notes || '']
    );

    // Update tank current stock
    await query(`UPDATE fuel_tanks SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStock, tank_id]);

    const updatedTank = await getOne(`SELECT * FROM fuel_tanks WHERE id = ?`, [tank_id]);
    res.json({ success: true, message: 'Tanker delivery logged & stock updated', tank: updatedTank });
  } catch (err) {
    console.error('Error logging refill:', err);
    res.status(500).json({ success: false, message: 'Failed to log refill' });
  }
});

module.exports = router;
