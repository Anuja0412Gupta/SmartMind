const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

/**
 * GET /api/logs
 * Paginated system logs with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { service, level, event } = req.query;

    const filter = {};
    if (service) filter.service = service;
    if (level) filter.level = level;
    if (event) filter.event = { $regex: event, $options: 'i' };

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Log.countDocuments(filter)
    ]);

    res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
