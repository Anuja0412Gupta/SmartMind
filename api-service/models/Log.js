const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  event: { type: String, required: true },
  level: { type: String, enum: ['info', 'warn', 'error', 'debug'], default: 'info' },
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

logSchema.index({ timestamp: -1 });
logSchema.index({ service: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
