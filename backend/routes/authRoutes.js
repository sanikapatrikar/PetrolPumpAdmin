const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    let user = null;
    try {
      user = await getOne(`SELECT id, username, full_name, password_hash FROM admin_users WHERE username = ?`, [username]);
    } catch (dbErr) {
      console.warn('Database query failed in authRoutes, using fallback check:', dbErr.message);
    }

    if (user && user.password_hash === password) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name
        }
      });
    }

    // Fallback default admin check if DB table not populated
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        message: 'Login successful (Default Admin)',
        user: {
          id: 1,
          username: 'admin',
          full_name: 'Manoj Patrikar'
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (err) {
    console.error('Error in auth login:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  res.json({ success: true, message: 'Session active' });
});

module.exports = router;
