const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Feedback = require('../models/Feedback');

/**
 * GET /api/analytics/summary
 * Returns aggregated analytics
 */
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel aggregation queries
    const [
      queriesToday,
      totalQueries,
      completedQueries,
      avgLatencyResult,
      feedbackStats,
      dailyQueryCounts,
      categoryBreakdown,
      statusBreakdown,
      cachedCount,
      escalatedCount
    ] = await Promise.all([
      Query.countDocuments({ createdAt: { $gte: todayStart } }),
      Query.countDocuments(),
      Query.countDocuments({ status: 'completed' }),
      Query.aggregate([
        { $match: { status: 'completed', processingTime: { $ne: null } } },
        { $group: { _id: null, avgLatency: { $avg: '$processingTime' } } }
      ]),
      Feedback.aggregate([
        { $group: { 
          _id: '$rating', 
          count: { $sum: 1 } 
        }}
      ]),
      Query.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      Query.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Query.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Query.countDocuments({ cachedResponse: true }),
      Query.countDocuments({ escalated: true })
    ]);

    // Calculate accuracy from feedback
    const upVotes = feedbackStats.find(f => f._id === 'up')?.count || 0;
    const downVotes = feedbackStats.find(f => f._id === 'down')?.count || 0;
    const totalFeedback = upVotes + downVotes;
    const accuracy = totalFeedback > 0 ? (upVotes / totalFeedback) : 0;

    // Average confidence
    const avgConfidenceResult = await Query.aggregate([
      { $match: { status: 'completed', confidence: { $ne: null } } },
      { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
    ]);

    res.json({
      queriesToday,
      totalQueries,
      completedQueries,
      avgLatency: avgLatencyResult[0]?.avgLatency?.toFixed(2) || 0,
      accuracy: parseFloat(accuracy.toFixed(4)),
      avgConfidence: avgConfidenceResult[0]?.avgConfidence?.toFixed(4) || 0,
      cacheHitRate: totalQueries > 0 ? parseFloat((cachedCount / totalQueries).toFixed(4)) : 0,
      escalationRate: totalQueries > 0 ? parseFloat((escalatedCount / totalQueries).toFixed(4)) : 0,
      dailyQueries: dailyQueryCounts,
      categoryBreakdown,
      statusBreakdown,
      feedbackSummary: {
        upVotes,
        downVotes,
        total: totalFeedback
      }
    });
  } catch (err) {
    console.error('[Analytics] Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
