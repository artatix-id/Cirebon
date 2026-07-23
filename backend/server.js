/**
 * CIREBON QRIS RUN 2026 - Backend Server
 * Main entry point untuk API dan sistem registrasi
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');

const app = express();

// ========== MIDDLEWARE SETUP ==========

// Security headers
app.use(helmet());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Terlalu banyak request dari IP ini, silakan coba lagi nanti'
});
app.use('/api/', limiter);

// ========== ROUTES ==========

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CIREBON QRIS RUN 2026 API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Import routes
// app.use('/api/registration', require('./routes/registration'));
// app.use('/api/upload', require('./routes/upload'));
// app.use('/api/email', require('./routes/email'));
// app.use('/api/admin', require('./routes/admin'));

// ========== ERROR HANDLING ==========

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== DATABASE CONNECTION ==========

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    logger.info('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ========== START SERVER ==========

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌍 API URL: ${process.env.API_URL}`);
});

// ========== GRACEFUL SHUTDOWN ==========

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
