const Log = require('../models/Log');

const logEvent = async (service, event, metadata = {}, level = 'info') => {
  try {
    await Log.create({
      service,
      event,
      level,
      timestamp: new Date(),
      metadata
    });
  } catch (err) {
    console.error('[Logger] Failed to log event:', err.message);
  }
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logEvent('api-service', 'http_request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

module.exports = { logEvent, requestLogger };
