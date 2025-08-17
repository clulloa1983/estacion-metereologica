const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, requestId, userId, stationId, duration, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      service,
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(stationId && { stationId }),
      ...(duration !== undefined && { duration }),
      ...meta
    };
    
    return JSON.stringify(logObject);
  })
);

// Development format for better readability
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, stationId, duration, ...meta }) => {
    let logLine = `${timestamp} [${level}]`;
    
    if (requestId) logLine += ` [${requestId}]`;
    if (stationId) logLine += ` [${stationId}]`;
    
    logLine += `: ${message}`;
    
    if (duration !== undefined) logLine += ` (${duration}ms)`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => 
      !['service', 'timestamp', 'level', 'message'].includes(key)
    );
    if (metaKeys.length > 0) {
      const metaStr = metaKeys.map(key => `${key}: ${meta[key]}`).join(', ');
      logLine += ` | ${metaStr}`;
    }
    
    return logLine;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: 'weather-station-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs - separate file for errors only
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    // Combined logs - all log levels
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      format: structuredFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 3
    }),
    
    // Performance logs - for tracking API performance
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      level: 'info',
      format: structuredFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 2,
      // Only log entries with duration (performance logs)
      filter: (info) => info.duration !== undefined
    }),
    
    // Security logs - for authentication and authorization
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      // Only log security-related entries
      filter: (info) => info.security === true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: devFormat
  }));
}

// Enhanced logger with additional methods
const enhancedLogger = {
  ...logger,
  
  // Request logging with context
  request: (message, context = {}) => {
    logger.info(message, {
      type: 'request',
      ...context
    });
  },
  
  // Performance logging
  performance: (message, duration, context = {}) => {
    logger.info(message, {
      type: 'performance',
      duration,
      ...context
    });
  },
  
  // Security logging
  security: (message, context = {}) => {
    logger.warn(message, {
      type: 'security',
      security: true,
      ...context
    });
  },
  
  // Database operation logging
  database: (operation, duration, context = {}) => {
    logger.info(`Database ${operation}`, {
      type: 'database',
      operation,
      duration,
      ...context
    });
  },
  
  // MQTT message logging
  mqtt: (message, context = {}) => {
    logger.info(message, {
      type: 'mqtt',
      ...context
    });
  },
  
  // Alert logging
  alert: (message, severity, context = {}) => {
    const logLevel = severity === 'CRITICAL' ? 'error' : 
                    severity === 'HIGH' ? 'warn' : 'info';
    
    logger[logLevel](message, {
      type: 'alert',
      severity,
      ...context
    });
  },
  
  // System health logging
  health: (message, component, status, context = {}) => {
    const logLevel = status === 'unhealthy' ? 'error' : 
                    status === 'degraded' ? 'warn' : 'info';
    
    logger[logLevel](message, {
      type: 'health',
      component,
      status,
      ...context
    });
  },
  
  // User action logging
  userAction: (action, userId, context = {}) => {
    logger.info(`User action: ${action}`, {
      type: 'user_action',
      action,
      userId,
      ...context
    });
  },
  
  // Device communication logging
  device: (message, stationId, context = {}) => {
    logger.info(message, {
      type: 'device',
      stationId,
      ...context
    });
  }
};

module.exports = enhancedLogger;