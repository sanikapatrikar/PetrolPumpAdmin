const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// GET /api/rates - Get all live fuel rates
router.get('/', async (req, res) => {
  try {
    const rates = await query(`SELECT * FROM fuel_rates ORDER BY id ASC`);
    res.json({ success: true, rates });
  } catch (err) {
    console.error('Error fetching rates:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fuel rates' });
  }
});

// PUT /api/rates - Update fuel rates
router.put('/', async (req, res) => {
  try {
    const { rates } = req.body; // Array of { id, rate_per_litre } or { fuel_type, rate_per_litre }
    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({ success: false, message: 'Invalid rates payload' });
    }

    const timestamp = new Date().toISOString();
    for (const item of rates) {
      if (item.id) {
        await query(`UPDATE fuel_rates SET rate_per_litre = ?, updated_at = ? WHERE id = ?`, [item.rate_per_litre, timestamp, item.id]);
      } else if (item.fuel_type) {
        await query(`UPDATE fuel_rates SET rate_per_litre = ?, updated_at = ? WHERE fuel_type = ?`, [item.rate_per_litre, timestamp, item.fuel_type]);
      }
    }

    const updatedRates = await query(`SELECT * FROM fuel_rates ORDER BY id ASC`);
    res.json({ success: true, message: 'Fuel rates updated successfully', rates: updatedRates });
  } catch (err) {
    console.error('Error updating rates:', err);
    res.status(500).json({ success: false, message: 'Failed to update fuel rates' });
  }
});

module.exports = router;
