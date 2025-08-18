const Joi = require('joi');
const logger = require('../config/logger');
const {
  weatherDataSchema,
  statusDataSchema,
  alertDataSchema,
  stationIdSchema,
  timeRangeSchema,
  alertConfigSchema,
  configCommandSchema
} = require('../schemas/weatherSchemas');

// Esquemas adicionales para validación de rutas
const weatherDataRouteSchema = weatherDataSchema.keys({
  station_id: Joi.string().required()
});

const querySchema = Joi.object({
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional(),
  limit: Joi.number().integer().min(1).max(10000).default(1000),
  aggregation: Joi.string().valid('1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d').optional(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  acknowledged: Joi.boolean().optional(),
  format: Joi.string().valid('json', 'csv').default('json'),
  timeRange: timeRangeSchema,
  parameters: Joi.string().pattern(/^[a-zA-Z_,]+$/).optional(),
  stationId: stationIdSchema.optional()
});

const paramsSchema = Joi.object({
  stationId: stationIdSchema,
  alertId: Joi.string().uuid().optional()
});

const alertRouteSchema = alertDataSchema.keys({
  station_id: Joi.string().required()
});

/**
 * Middleware genérico para validación usando esquemas Joi
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn(`${property} validation failed:`, {
        endpoint: req.originalUrl,
        method: req.method,
        errors: errorDetails
      });

      return res.status(400).json({
        success: false,
        error: `Invalid ${property} format`,
        details: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

const validateWeatherData = validate(weatherDataRouteSchema, 'body');

const validateQuery = validate(querySchema, 'query');
const validateParams = validate(paramsSchema, 'params');

const validateAlert = validate(alertRouteSchema, 'body');

const validateConfigCommand = validate(configCommandSchema, 'body');

/**
 * Validación para datos MQTT (no middleware de Express)
 */
const validateMQTTData = (data, schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    logger.warn('MQTT data validation failed:', {
      errors: errorDetails,
      originalData: data
    });

    return {
      isValid: false,
      data: null,
      errors: errorDetails
    };
  }

  return {
    isValid: true,
    data: value,
    errors: null
  };
};

/**
 * Sanitiza timestamp de Arduino millis() a ISO string
 */
const sanitizeTimestamp = (timestamp) => {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (typeof timestamp === 'string' && timestamp.includes('-')) {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return timestamp;
    }
  }

  if (typeof timestamp === 'number' || (typeof timestamp === 'string' && /^\d+$/.test(timestamp))) {
    const numTimestamp = Number(timestamp);
    
    if (numTimestamp > 86400000) {
      logger.debug('Arduino millis() detected, using server time');
      return new Date().toISOString();
    }
    
    if (numTimestamp > 1000000000) {
      return new Date(numTimestamp * (numTimestamp < 10000000000 ? 1000 : 1)).toISOString();
    }
  }

  logger.debug('Invalid timestamp format, using server time');
  return new Date().toISOString();
};

module.exports = {
  validate,
  validateWeatherData,
  validateQuery,
  validateParams,
  validateAlert,
  validateConfigCommand,
  validateMQTTData,
  sanitizeTimestamp,
  // Esquemas exportados para uso directo
  weatherDataSchema,
  statusDataSchema,
  alertDataSchema,
  querySchema,
  paramsSchema,
  configCommandSchema
};