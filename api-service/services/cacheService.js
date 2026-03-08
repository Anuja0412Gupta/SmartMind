const { createRedisClient } = require('../../shared/redis-client');
const axios = require('axios');

const redis = createRedisClient();
const CACHE_PREFIX = 'sm:cache:';
const EMBEDDING_CACHE_PREFIX = 'sm:emb:';
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600;
const SIMILARITY_THRESHOLD = parseFloat(process.env.CACHE_SIMILARITY_THRESHOLD) || 0.92;

/**
 * Semantic Cache Service
 * Uses cosine similarity between query embeddings to find cached responses.
 * Falls back to exact match for speed when possible.
 */
class SemanticCacheService {
  
  // Compute cosine similarity between two vectors
  static cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Get embedding for a query from AI service
  static async getEmbedding(queryText) {
    try {
      const response = await axios.post(`${process.env.AI_SERVICE_URL}/api/embed`, {
        text: queryText
      }, { timeout: 10000 });
      return response.data.embedding;
    } catch (err) {
      console.error('[Cache] Failed to get embedding:', err.message);
      return null;
    }
  }

  // Look up semantically similar cached response
  static async lookup(queryText) {
    try {
      // 1. Try exact match first (fast path)
      const exactKey = CACHE_PREFIX + Buffer.from(queryText.toLowerCase().trim()).toString('base64');
      const exactHit = await redis.get(exactKey);
      if (exactHit) {
        console.log('[Cache] Exact hit for query');
        return JSON.parse(exactHit);
      }

      // 2. Semantic similarity search
      const queryEmbedding = await this.getEmbedding(queryText);
      if (!queryEmbedding) return null;

      // Get all cached embeddings
      const keys = await redis.keys(EMBEDDING_CACHE_PREFIX + '*');
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const key of keys) {
        const data = await redis.get(key);
        if (!data) continue;
        const cached = JSON.parse(data);
        const similarity = this.cosineSimilarity(queryEmbedding, cached.embedding);
        
        if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
          bestSimilarity = similarity;
          bestMatch = cached;
        }
      }

      if (bestMatch) {
        console.log(`[Cache] Semantic hit (similarity: ${bestSimilarity.toFixed(4)})`);
        return {
          responseText: bestMatch.responseText,
          confidence: bestMatch.confidence,
          sources: bestMatch.sources,
          cachedSimilarity: bestSimilarity
        };
      }

      return null;
    } catch (err) {
      console.error('[Cache] Lookup error:', err.message);
      return null;
    }
  }

  // Store response in semantic cache
  static async store(queryText, responseData) {
    try {
      // Store exact match
      const exactKey = CACHE_PREFIX + Buffer.from(queryText.toLowerCase().trim()).toString('base64');
      await redis.setex(exactKey, CACHE_TTL, JSON.stringify(responseData));

      // Store embedding for semantic matching
      const queryEmbedding = await this.getEmbedding(queryText);
      if (queryEmbedding) {
        const embKey = EMBEDDING_CACHE_PREFIX + Date.now();
        await redis.setex(embKey, CACHE_TTL, JSON.stringify({
          queryText,
          embedding: queryEmbedding,
          responseText: responseData.responseText,
          confidence: responseData.confidence,
          sources: responseData.sources
        }));
      }

      console.log('[Cache] Stored response for:', queryText.substring(0, 50));
    } catch (err) {
      console.error('[Cache] Store error:', err.message);
    }
  }

  // Clear all cache
  static async clear() {
    try {
      const keys = await redis.keys('sm:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log('[Cache] Cleared all cached entries');
    } catch (err) {
      console.error('[Cache] Clear error:', err.message);
    }
  }
}

module.exports = SemanticCacheService;
