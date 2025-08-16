const redis = require('redis');
const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = redis.createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Cache service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      logger.info('Cache service disconnected');
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, data, ttlSeconds = 300) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
      logger.debug(`Cache SET for key: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      logger.debug(`Cache DEL for key: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return false;
    }
  }

  // Cache key generators
  generateKey(prefix, ...parts) {
    return `weather:${prefix}:${parts.join(':')}`;
  }

  getLatestDataKey(stationId) {
    return this.generateKey('latest', stationId);
  }

  getHistoricalDataKey(stationId, start, end, aggregation, limit) {
    const params = [stationId, start, end, aggregation || 'none', limit].join(':');
    return this.generateKey('historical', params);
  }

  getSummaryKey(stationId, start, end) {
    return this.generateKey('summary', stationId, start, end);
  }

  getStationsKey() {
    return this.generateKey('stations', 'list');
  }

  // Cache TTL constants (in seconds)
  static TTL = {
    LATEST_DATA: 30,        // 30 seconds for latest data
    HISTORICAL_SHORT: 300,  // 5 minutes for short historical queries
    HISTORICAL_LONG: 900,   // 15 minutes for longer historical queries  
    SUMMARY: 3600,          // 1 hour for summaries
    STATIONS: 1800          // 30 minutes for stations list
  };
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;