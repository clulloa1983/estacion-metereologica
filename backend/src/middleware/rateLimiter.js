const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../config/logger');

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.API_RATE_LIMIT_WINDOW) / 1000 || 900, // 15 minutes
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    const totalHits = rejRes.totalHits || 1;
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 1;

    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.round(msBeforeNext / 1000),
      limit: rateLimiter.points,
      remaining: remainingPoints,
      reset: new Date(Date.now() + msBeforeNext).toISOString()
    });
  }
};

module.exports = {
  rateLimiter: rateLimiterMiddleware
};