const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);

// Public certificate download (no auth — linked from emails)
const Certificate = require('./models/Certificate');
app.get('/api/public/certificate/:id/download', async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);
    if (!certificate) return res.status(404).json({ message: 'Certificate not found.' });
    const filePath = path.join(__dirname, 'uploads', 'certificates', certificate.certificateFile);
    const fs = require('fs');
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found.' });
    const downloadName = certificate.originalFileName || `${certificate.recipientName}-certificate.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TwinVerify API is running' });
});

// Connect to PostgreSQL and start server
const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Connected to PostgreSQL — tables synced');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (all interfaces)`);
    });
    // Remove default 2-minute timeout so bulk email can run without limit
    server.timeout = 0;
    server.keepAliveTimeout = 0;
  })
  .catch((err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  });
