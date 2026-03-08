const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { getQueueMetrics } = require('../services/queueService');

/**
 * GET /api/jobs/:jobId
 * Check job status
 */
router.get('/:jobId', async (req, res) => {
  try {
    const query = await Query.findOne({ jobId: req.params.jobId });
    if (!query) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const response = {
      jobId: query.jobId,
      status: query.status,
      createdAt: query.createdAt,
      updatedAt: query.updatedAt
    };

    // Include result if completed
    if (query.status === 'completed') {
      response.response = query.responseText;
      response.confidence = query.confidence;
      response.sources = query.sources;
      response.processingTime = query.processingTime;
      response.cached = query.cachedResponse;
    }

    if (query.status === 'failed') {
      response.error = 'Processing failed. Please try again.';
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check job status' });
  }
});

/**
 * GET /api/jobs
 * List all jobs with queue metrics
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [jobs, total, metrics] = await Promise.all([
      Query.find()
        .select('jobId queryText status category processingTime cachedResponse createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Query.countDocuments(),
      getQueueMetrics()
    ]);

    res.json({
      jobs,
      queueMetrics: metrics,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;
