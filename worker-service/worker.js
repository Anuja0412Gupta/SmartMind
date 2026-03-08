require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const mongoose = require('mongoose');
const axios = require('axios');
const { createRedisClient } = require('../shared/redis-client');

// MongoDB Models (inline to avoid cross-service imports)
const querySchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  queryText: { type: String, required: true },
  responseText: { type: String, default: null },
  confidence: { type: Number, default: null },
  sources: [{ type: String }],
  status: { type: String, default: 'queued' },
  category: { type: String, default: 'general' },
  processingTime: { type: Number, default: null },
  cachedResponse: { type: Boolean, default: false },
  escalated: { type: Boolean, default: false },
  escalationResolved: { type: Boolean, default: false },
  resolvedBy: { type: String, default: null },
  resolvedResponse: { type: String, default: null }
}, { timestamps: true });

const logSchema = new mongoose.Schema({
  service: { type: String, required: true },
  event: { type: String, required: true },
  level: { type: String, default: 'info' },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const Query = mongoose.model('Query', querySchema);
const Log = mongoose.model('Log', logSchema);

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.65;
const MIN_WORKERS = parseInt(process.env.MIN_WORKERS) || 1;
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS) || 5;
const SCALE_UP_THRESHOLD = parseInt(process.env.SCALE_UP_THRESHOLD) || 10;
const SCALE_DOWN_THRESHOLD = parseInt(process.env.SCALE_DOWN_THRESHOLD) || 2;

const connection = createRedisClient();
const monitorConnection = createRedisClient();

// ============================================================
// Dynamic Worker Pool
// ============================================================
class DynamicWorkerPool {
  constructor() {
    this.workers = [];
    this.isRunning = false;
    this.scalingInterval = null;
  }

  createWorker(id) {
    const workerConnection = createRedisClient();
    
    const worker = new Worker('support-inference', async (job) => {
      return this.processJob(job, id);
    }, {
      connection: workerConnection,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 1000
      }
    });

    worker.on('completed', (job) => {
      console.log(`[Worker-${id}] Job ${job.data.jobId} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker-${id}] Job ${job?.data?.jobId} failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.error(`[Worker-${id}] Error:`, err.message);
    });

    return { worker, id, connection: workerConnection };
  }

  async processJob(job, workerId) {
    const { jobId, queryText, category } = job.data;
    const startTime = Date.now();

    console.log(`[Worker-${workerId}] Processing job ${jobId} (category: ${category})`);
    
    try {
      // Update status to processing
      await Query.findOneAndUpdate({ jobId }, { status: 'processing' });
      await this.logEvent('worker-service', 'worker_started', { jobId, workerId });

      // Call AI inference service
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/infer`, {
        query: queryText,
        category: category || 'general'
      }, { timeout: 30000 });

      const { response, confidence, sources, category: detectedCategory } = aiResponse.data;
      const processingTime = (Date.now() - startTime) / 1000;

      // Check if escalation is needed
      const needsEscalation = confidence < CONFIDENCE_THRESHOLD;

      // Update query with results
      await Query.findOneAndUpdate({ jobId }, {
        responseText: response,
        confidence,
        sources: sources || [],
        status: needsEscalation ? 'escalated' : 'completed',
        category: detectedCategory || category,
        processingTime,
        escalated: needsEscalation
      });

      await this.logEvent('worker-service', 'ai_response_generated', {
        jobId, workerId, confidence, processingTime, escalated: needsEscalation
      });

      // Store in semantic cache (via API service)
      try {
        await axios.post(`${process.env.API_SERVICE_URL || 'http://localhost:5000'}/api/support/cache`, {
          queryText,
          responseText: response,
          confidence,
          sources
        });
      } catch (cacheErr) {
        // Cache storage is best-effort
        console.log(`[Worker-${workerId}] Cache store skipped:`, cacheErr.message);
      }

      if (needsEscalation) {
        await this.logEvent('worker-service', 'query_escalated', {
          jobId, confidence, threshold: CONFIDENCE_THRESHOLD
        }, 'warn');
        console.log(`[Worker-${workerId}] Job ${jobId} escalated (confidence: ${confidence})`);
      }

      return { jobId, confidence, processingTime };

    } catch (err) {
      const processingTime = (Date.now() - startTime) / 1000;
      
      await Query.findOneAndUpdate({ jobId }, { 
        status: 'failed',
        processingTime,
        responseText: `Processing failed: ${err.message}`
      });

      await this.logEvent('worker-service', 'job_failed', {
        jobId, workerId, error: err.message, processingTime
      }, 'error');

      throw err;
    }
  }

  async logEvent(service, event, metadata = {}, level = 'info') {
    try {
      await Log.create({ service, event, level, timestamp: new Date(), metadata });
    } catch (err) {
      console.error('[Worker] Log failed:', err.message);
    }
  }

  // Dynamic scaling based on queue depth
  async checkAndScale() {
    try {
      const queue = new Queue('support-inference', { connection: monitorConnection });
      const waiting = await queue.getWaitingCount();
      const active = await queue.getActiveCount();
      const queueDepth = waiting + active;
      const currentWorkers = this.workers.length;

      console.log(`[Scaler] Queue depth: ${queueDepth}, Active workers: ${currentWorkers}`);

      if (queueDepth > SCALE_UP_THRESHOLD && currentWorkers < MAX_WORKERS) {
        // Scale UP
        const newId = currentWorkers + 1;
        const newWorker = this.createWorker(newId);
        this.workers.push(newWorker);
        console.log(`[Scaler] Scaled UP to ${this.workers.length} workers`);
        await this.logEvent('worker-service', 'worker_scaled_up', {
          totalWorkers: this.workers.length, queueDepth
        });
      } else if (queueDepth < SCALE_DOWN_THRESHOLD && currentWorkers > MIN_WORKERS) {
        // Scale DOWN
        const removed = this.workers.pop();
        await removed.worker.close();
        removed.connection.disconnect();
        console.log(`[Scaler] Scaled DOWN to ${this.workers.length} workers`);
        await this.logEvent('worker-service', 'worker_scaled_down', {
          totalWorkers: this.workers.length, queueDepth
        });
      }
    } catch (err) {
      console.error('[Scaler] Error:', err.message);
    }
  }

  async start() {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Worker Service] Connected to MongoDB');

    // Start initial workers
    for (let i = 0; i < MIN_WORKERS; i++) {
      this.workers.push(this.createWorker(i + 1));
    }
    console.log(`[Worker Service] Started ${MIN_WORKERS} initial workers`);

    await this.logEvent('worker-service', 'service_started', { 
      minWorkers: MIN_WORKERS, maxWorkers: MAX_WORKERS 
    });

    // Start dynamic scaling monitor (check every 10 seconds)
    this.scalingInterval = setInterval(() => this.checkAndScale(), 10000);
    this.isRunning = true;

    console.log('[Worker Service] Dynamic scaling enabled');
    console.log(`[Worker Service] Scale up at ${SCALE_UP_THRESHOLD} queued, down at ${SCALE_DOWN_THRESHOLD}`);
  }

  async stop() {
    console.log('[Worker Service] Shutting down...');
    clearInterval(this.scalingInterval);
    
    for (const { worker, connection: conn } of this.workers) {
      await worker.close();
      conn.disconnect();
    }
    
    connection.disconnect();
    monitorConnection.disconnect();
    await mongoose.disconnect();
    console.log('[Worker Service] Shut down complete');
  }
}

// ============================================================
// Start Worker Pool
// ============================================================
const pool = new DynamicWorkerPool();

pool.start().catch((err) => {
  console.error('[Worker Service] Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.stop();
  process.exit(0);
});
