const Joi = require('joi');
const logger = require('../config/logger');

const weatherDataSchema = Joi.object({
  station_id: Joi.string().required(),
  timestamp: Joi.string().isoDate().optional(),
  temperature: Joi.number().min(-50).max(60).optional(),
  humidity: Joi.number().min(0).max(100).optional(),
  pressure: Joi.number().min(800).max(1200).optional(),
  wind_speed: Joi.number().min(0).max(200).optional(),
  wind_direction: Joi.number().min(0).max(360).optional(),
  rainfall: Joi.number().min(0).optional(),
  pm25: Joi.number().min(0).optional(),
  pm10: Joi.number().min(0).optional(),
  uv_index: Joi.number().min(0).max(15).optional(),
  battery_voltage: Joi.number().min(0).max(15).optional(),
  signal_strength: Joi.number().optional(),
  uptime: Joi.number().optional()
});

const querySchema = Joi.object({
  start: Joi.string().optional(),
  end: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(10000).optional(),
  aggregation: Joi.string().valid('5m', 'hourly', 'daily').optional(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  acknowledged: Joi.string().valid('true', 'false').optional(),
  format: Joi.string().valid('json', 'csv').optional(),
  timeRange: Joi.string().optional(),
  parameters: Joi.string().optional(),
  stationId: Joi.string().optional()
});

const alertSchema = Joi.object({
  station_id: Joi.string().required(),
  alert_type: Joi.string().required(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
  message: Joi.string().required(),
  timestamp: Joi.string().isoDate().optional()
});

const validateWeatherData = (req, res, next) => {
  const { error } = weatherDataSchema.validate(req.body);
  if (error) {
    logger.warn('Weather data validation failed:', error.details);
    return res.status(400).json({
      success: false,
      error: 'Invalid weather data format',
      details: error.details.map(d => d.message)
    });
  }
  next();
};

const validateQuery = (req, res, next) => {
  const { error } = querySchema.validate(req.query);
  if (error) {
    logger.warn('Query validation failed:', error.details);
    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: error.details.map(d => d.message)
    });
  }
  next();
};

const validateAlert = (req, res, next) => {
  const { error } = alertSchema.validate(req.body);
  if (error) {
    logger.warn('Alert validation failed:', error.details);
    return res.status(400).json({
      success: false,
      error: 'Invalid alert data format',
      details: error.details.map(d => d.message)
    });
  }
  next();
};

module.exports = {
  validateWeatherData,
  validateQuery,
  validateAlert
};