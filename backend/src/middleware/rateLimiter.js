const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../config/logger');

// More aggressive rate limiting for different endpoints
const generalRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 60, // Reduced from 100
  duration: parseInt(process.env.API_RATE_LIMIT_WINDOW) / 1000 || 900, // 15 minutes
});

// Stricter limiting for authentication endpoints
const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // Only 10 attempts per 15 minutes
  duration: 900, // 15 minutes
});

// Even stricter for configuration commands
const configRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 20, // 20 config commands per hour
  duration: 3600, // 1 hour
});

// Device-specific rate limiting (more lenient)
const deviceRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  points: 1000, // Devices can send more data
  duration: 3600, // 1 hour
});

// AI/ML prediction rate limiting (resource intensive operations)
const aiPredictionRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 30, // 30 AI operations per hour
  duration: 3600, // 1 hour
});

// Generic rate limiter middleware factory
const createRateLimiterMiddleware = (limiter, limiterName = 'general') => {
  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (rejRes) {
      logger.warn(`${limiterName} rate limit exceeded`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      const totalHits = rejRes.totalHits || 1;
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || 1;

      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded for ${limiterName} endpoints`,
        retryAfter: Math.round(msBeforeNext / 1000),
        limit: limiter.points,
        remaining: remainingPoints,
        reset: new Date(Date.now() + msBeforeNext).toISOString()
      });
    }
  };
};

// Device rate limiting (for IoT devices with API keys)
const deviceRateLimiterMiddleware = async (req, res, next) => {
  try {
    // Use API key or IP as identifier
    const key = req.headers['x-api-key'] || req.ip;
    await deviceRateLimiter.consume(key);
    next();
  } catch (rejRes) {
    logger.warn('Device rate limit exceeded', {
      apiKey: req.headers['x-api-key'] ? req.headers['x-api-key'].substring(0, 10) + '...' : 'none',
      ip: req.ip,
      path: req.path
    });
    
    const msBeforeNext = rejRes.msBeforeNext || 1;
    res.status(429).json({
      success: false,
      error: 'Device rate limit exceeded',
      message: 'Too many requests from this device',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

module.exports = {
  // Specific rate limiters
  generalRateLimit: createRateLimiterMiddleware(generalRateLimiter, 'general'),
  authRateLimit: createRateLimiterMiddleware(authRateLimiter, 'authentication'),
  configRateLimit: createRateLimiterMiddleware(configRateLimiter, 'configuration'),
  aiPrediction: createRateLimiterMiddleware(aiPredictionRateLimiter, 'AI prediction'),
  deviceRateLimit: deviceRateLimiterMiddleware,
  
  // Legacy compatibility
  rateLimiter: createRateLimiterMiddleware(generalRateLimiter, 'general')
};