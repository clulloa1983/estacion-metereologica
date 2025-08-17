const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Add request ID to request object for use in other middleware/controllers
  req.requestId = requestId;
  
  // Extract relevant request information
  const requestInfo = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length') || 0
  };
  
  // Add user info if available (after authentication)
  if (req.user) {
    requestInfo.userId = req.user.id;
    requestInfo.userRole = req.user.role;
  }
  
  // Add station ID if present in params
  if (req.params.stationId) {
    requestInfo.stationId = req.params.stationId;
  }
  
  // Log incoming request
  logger.request(`${req.method} ${req.originalUrl}`, requestInfo);
  
  // Capture the original res.end method
  const originalEnd = res.end;
  
  // Override res.end to log response
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const responseSize = res.get('Content-Length') || 0;
    
    const responseInfo = {
      requestId,
      statusCode: res.statusCode,
      duration,
      responseSize: parseInt(responseSize) || 0,
      method: req.method,
      url: req.originalUrl,
      ...(req.user && { userId: req.user.id }),
      ...(req.params.stationId && { stationId: req.params.stationId })
    };
    
    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' :
                    res.statusCode >= 400 ? 'warn' : 'info';
    
    // Log response with performance data
    logger.performance(
      `${req.method} ${req.originalUrl} - ${res.statusCode}`,
      duration,
      responseInfo
    );
    
    // Log slow requests (> 2 seconds) as warnings
    if (duration > 2000) {
      logger.warn(`Slow request detected`, {
        requestId,
        duration,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        type: 'slow_request'
      });
    }
    
    // Log high memory usage
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      logger.warn(`High memory usage detected`, {
        requestId,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        type: 'high_memory'
      });
    }
    
    // Call the original res.end method
    originalEnd.apply(this, args);
  };
  
  next();
};

// Middleware to add user context to logger after authentication
const addUserContext = (req, res, next) => {
  if (req.user) {
    // Update request logger context with user information
    const userInfo = {
      userId: req.user.id,
      userRole: req.user.role,
      requestId: req.requestId
    };
    
    logger.userAction('User authenticated', req.user.id, {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      role: req.user.role
    });
  }
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    ...(req.user && { userId: req.user.id }),
    ...(req.params.stationId && { stationId: req.params.stationId })
  };
  
  // Log error with full context
  logger.error(`Request error: ${err.message}`, errorInfo);
  
  next(err);
};

// Security event logger
const securityLogger = {
  loginAttempt: (email, success, ip, userAgent) => {
    logger.security(`Login attempt`, {
      email,
      success,
      ip,
      userAgent,
      type: 'login_attempt'
    });
  },
  
  invalidToken: (token, ip, userAgent) => {
    logger.security(`Invalid token used`, {
      token: token.substring(0, 10) + '...',
      ip,
      userAgent,
      type: 'invalid_token'
    });
  },
  
  unauthorizedAccess: (resource, userId, ip) => {
    logger.security(`Unauthorized access attempt`, {
      resource,
      userId,
      ip,
      type: 'unauthorized_access'
    });
  },
  
  apiKeyUsage: (keyId, stationId, ip) => {
    logger.security(`API key usage`, {
      keyId: keyId.substring(0, 8) + '...',
      stationId,
      ip,
      type: 'api_key_usage'
    });
  },
  
  rateLimitExceeded: (ip, endpoint) => {
    logger.security(`Rate limit exceeded`, {
      ip,
      endpoint,
      type: 'rate_limit_exceeded'
    });
  }
};

module.exports = {
  requestLogger,
  addUserContext,
  errorLogger,
  securityLogger
};