const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { logEvent } = require('../middleware/logger');

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.65;

/**
 * GET /api/escalation
 * Get queries flagged for escalation (low confidence)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const showResolved = req.query.resolved === 'true';

    const filter = { escalated: true };
    if (!showResolved) {
      filter.escalationResolved = false;
    }

    const [queries, total] = await Promise.all([
      Query.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Query.countDocuments(filter)
    ]);

    res.json({
      queries,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

/**
 * POST /api/escalation/:id/resolve
 * Resolve an escalated query with admin response
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { resolvedResponse, resolvedBy } = req.body;
    if (!resolvedResponse) {
      return res.status(400).json({ error: 'Resolved response is required' });
    }

    const query = await Query.findOneAndUpdate(
      { jobId: req.params.id, escalated: true },
      {
        escalationResolved: true,
        resolvedResponse,
        resolvedBy: resolvedBy || 'admin',
        status: 'completed'
      },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({ error: 'Escalated query not found' });
    }

    await logEvent('api-service', 'escalation_resolved', {
      jobId: query.jobId,
      resolvedBy: resolvedBy || 'admin'
    });

    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve escalation' });
  }
});

module.exports = router;
