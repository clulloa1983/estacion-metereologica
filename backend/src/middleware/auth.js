const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Default API keys for development (should be in database in production)
const API_KEYS = new Set([
  process.env.DEVICE_API_KEY || 'dev-device-key-12345',
  process.env.ADMIN_API_KEY || 'dev-admin-key-67890'
]);

/**
 * Generate JWT token for authenticated users
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'weather-station-api'
  });
};

/**
 * Verify JWT token middleware
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt:', { token: token.substring(0, 20) + '...' });
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * API Key authentication middleware for devices
 */
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    logger.warn('Invalid API key attempt:', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'none'
    });
    
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid API key required' 
    });
  }

  // Add API key info to request for logging
  req.apiKey = apiKey;
  req.deviceAuth = true;
  next();
};

/**
 * Optional authentication - allows both token and API key
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.substring(7) 
    : null;
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  // Try JWT first
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.authType = 'jwt';
      return next();
    } catch (error) {
      // Token invalid, continue to API key check
    }
  }

  // Try API key
  if (apiKey && API_KEYS.has(apiKey)) {
    req.apiKey = apiKey;
    req.deviceAuth = true;
    req.authType = 'apikey';
    return next();
  }

  // No valid authentication
  return res.status(401).json({ 
    error: 'Unauthorized', 
    message: 'Valid authentication required (JWT token or API key)' 
  });
};

/**
 * Role-based access control
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.deviceAuth) {
      // Device authentication always allowed for data endpoints
      return next();
    }

    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions' 
      });
    }

    const userRole = req.user.role;
    const roleHierarchy = ['device', 'user', 'admin'];
    const userLevel = roleHierarchy.indexOf(userRole);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);

    if (userLevel === -1 || userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `${requiredRole} role required` 
      });
    }

    next();
  };
};

/**
 * Rate limiting by user/device
 */
const authRateLimit = (req, res, next) => {
  // Enhanced rate limiting based on auth type
  const identifier = req.user?.id || req.apiKey || req.ip;
  const authType = req.authType || 'anonymous';
  
  // Add auth info to request for logging
  req.authIdentifier = identifier;
  req.authType = authType;
  
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  verifyApiKey,
  optionalAuth,
  requireRole,
  authRateLimit,
  JWT_SECRET,
  API_KEYS
};