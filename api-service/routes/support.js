const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Query = require('../models/Query');
const Feedback = require('../models/Feedback');
const SemanticCacheService = require('../services/cacheService');
const { addInferenceJob } = require('../services/queueService');
const { logEvent } = require('../middleware/logger');

/**
 * POST /api/support/query
 * Submit a support query for AI processing
 */
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    const queryText = query.trim();
    await logEvent('api-service', 'query_received', { queryText: queryText.substring(0, 100) });

    // 1. Check semantic cache first
    const cachedResult = await SemanticCacheService.lookup(queryText);
    if (cachedResult) {
      const jobId = `cache_${uuidv4().slice(0, 8)}`;
      
      const queryDoc = await Query.create({
        jobId,
        queryText,
        responseText: cachedResult.responseText,
        confidence: cachedResult.confidence,
        sources: cachedResult.sources,
        status: 'completed',
        cachedResponse: true,
        processingTime: 0
      });

      await logEvent('api-service', 'cache_hit', { jobId, similarity: cachedResult.cachedSimilarity });

      return res.json({
        jobId,
        status: 'completed',
        cached: true,
        response: cachedResult.responseText,
        confidence: cachedResult.confidence,
        sources: cachedResult.sources
      });
    }

    // 2. Create new job
    const jobId = `job_${uuidv4().slice(0, 8)}`;
    
    const queryDoc = await Query.create({
      jobId,
      queryText,
      status: 'queued'
    });

    // 3. Push to BullMQ queue
    await addInferenceJob(jobId, queryText);
    await logEvent('api-service', 'job_created', { jobId, queryId: queryDoc._id });

    res.status(202).json({ jobId });
  } catch (err) {
    console.error('[Support] Query error:', err);
    await logEvent('api-service', 'query_error', { error: err.message }, 'error');
    res.status(500).json({ error: 'Failed to process query' });
  }
});

/**
 * GET /api/support/result/:jobId
 * Get the result of a processed query
 */
router.get('/result/:jobId', async (req, res) => {
  try {
    const query = await Query.findOne({ jobId: req.params.jobId });
    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({
      jobId: query.jobId,
      queryText: query.queryText,
      response: query.responseText,
      confidence: query.confidence,
      sources: query.sources,
      status: query.status,
      category: query.category,
      processingTime: query.processingTime,
      cached: query.cachedResponse,
      escalated: query.escalated,
      createdAt: query.createdAt,
      updatedAt: query.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get result' });
  }
});

/**
 * GET /api/support/history
 * Paginated query history
 */
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [queries, total] = await Promise.all([
      Query.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Query.countDocuments()
    ]);

    res.json({
      queries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * POST /api/support/feedback
 * Submit feedback for a query response
 */
router.post('/feedback', async (req, res) => {
  try {
    const { queryId, jobId, rating, comment } = req.body;
    if (!rating || !['up', 'down'].includes(rating)) {
      return res.status(400).json({ error: 'Rating must be "up" or "down"' });
    }

    // Find query by jobId or queryId
    let query;
    if (jobId) {
      query = await Query.findOne({ jobId });
    } else if (queryId) {
      query = await Query.findById(queryId);
    }

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    const feedback = await Feedback.create({
      queryId: query._id,
      jobId: query.jobId,
      rating,
      comment: comment || ''
    });

    await logEvent('api-service', 'feedback_submitted', { 
      jobId: query.jobId, rating 
    });

    res.json({ success: true, feedbackId: feedback._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;
