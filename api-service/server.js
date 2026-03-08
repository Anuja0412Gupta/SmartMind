require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const supportRoutes = require('./routes/support');
const jobRoutes = require('./routes/jobs');
const analyticsRoutes = require('./routes/analytics');
const logRoutes = require('./routes/logs');
const escalationRoutes = require('./routes/escalation');
const { logEvent } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/support', supportRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/escalation', escalationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('[MongoDB] Connected successfully');
  logEvent('api-service', 'mongodb_connected', { uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***@') });
  
  app.listen(PORT, () => {
    console.log(`[API Service] Running on port ${PORT}`);
    logEvent('api-service', 'server_started', { port: PORT });
  });
})
.catch((err) => {
  console.error('[MongoDB] Connection error:', err.message);
  process.exit(1);
});

module.exports = app;
