const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', required: true, index: true },
  jobId: { type: String, required: true },
  rating: { type: String, enum: ['up', 'down'], required: true },
  comment: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
