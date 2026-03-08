const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  queryText: { type: String, required: true },
  responseText: { type: String, default: null },
  confidence: { type: Number, default: null },
  sources: [{ type: String }],
  status: { 
    type: String, 
    enum: ['queued', 'processing', 'completed', 'failed', 'escalated'],
    default: 'queued',
    index: true
  },
  category: { 
    type: String, 
    enum: ['faq', 'troubleshooting', 'classification', 'general'],
    default: 'general'
  },
  processingTime: { type: Number, default: null },
  cachedResponse: { type: Boolean, default: false },
  escalated: { type: Boolean, default: false },
  escalationResolved: { type: Boolean, default: false },
  resolvedBy: { type: String, default: null },
  resolvedResponse: { type: String, default: null }
}, { timestamps: true });

querySchema.index({ createdAt: -1 });
querySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Query', querySchema);
