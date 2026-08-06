const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const rateRoutes = require('./routes/rateRoutes');
const tankRoutes = require('./routes/tankRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const creditRoutes = require('./routes/creditRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reconcile', reconciliationRoutes);
app.use('/api/customers', creditRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Patrikar Petroleum Point Admin Portal',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Fallback route to SPA index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
});

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⛽ Patrikar Petroleum Point - IndianOil Admin Portal`);
  console.log(`🚀 REST API Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Port ${PORT} is already in use by another running server instance.`);
    console.error(`👉 Solution: Stop the process on port ${PORT} or set PORT in .env.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Process exception and termination handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down server gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});
