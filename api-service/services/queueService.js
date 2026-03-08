const { Queue } = require('bullmq');
const { createRedisClient } = require('../../shared/redis-client');

const connection = createRedisClient();

const supportQueue = new Queue('support-inference', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

/**
 * Add a job to the inference queue
 * Supports priority routing based on query category
 */
const addInferenceJob = async (jobId, queryText, category = 'general') => {
  const priority = category === 'faq' ? 3 : category === 'troubleshooting' ? 1 : 2;
  
  const job = await supportQueue.add('infer', {
    jobId,
    queryText,
    category,
    submittedAt: new Date().toISOString()
  }, {
    jobId,
    priority
  });

  console.log(`[Queue] Job ${jobId} added (priority: ${priority}, category: ${category})`);
  return job;
};

/**
 * Get queue metrics
 */
const getQueueMetrics = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    supportQueue.getWaitingCount(),
    supportQueue.getActiveCount(),
    supportQueue.getCompletedCount(),
    supportQueue.getFailedCount(),
    supportQueue.getDelayedCount()
  ]);

  return { waiting, active, completed, failed, delayed };
};

module.exports = { supportQueue, addInferenceJob, getQueueMetrics };
