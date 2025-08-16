const Joi = require('joi');

// Schema para datos de sensores meteorológicos
const weatherDataSchema = Joi.object({
  timestamp: Joi.alternatives()
    .try(
      Joi.string().isoDate(),
      Joi.number().min(0),
      Joi.string().pattern(/^\d+$/)
    )
    .optional(),
  temperature: Joi.number().min(-50).max(60).precision(2).required(),
  humidity: Joi.number().min(0).max(100).precision(2).required(),
  pressure: Joi.number().min(800).max(1200).precision(2).required(),
  wind_speed: Joi.number().min(0).max(200).precision(2).optional(),
  wind_direction: Joi.number().min(0).max(360).precision(2).optional(),
  rainfall: Joi.number().min(0).max(1000).precision(2).optional(),
  uv_index: Joi.number().min(0).max(15).precision(2).optional(),
  light_level: Joi.number().min(0).precision(2).optional(),
  battery_voltage: Joi.number().min(0).max(5).precision(3).optional(),
  signal_strength: Joi.number().min(-100).max(0).optional(),
  uptime: Joi.number().min(0).optional(),
  status: Joi.string().valid('online', 'offline', 'low_battery', 'error').optional()
});

// Schema para datos de estado del dispositivo
const statusDataSchema = Joi.object({
  timestamp: Joi.alternatives()
    .try(
      Joi.string().isoDate(),
      Joi.number().min(0),
      Joi.string().pattern(/^\d+$/)
    )
    .optional(),
  battery_voltage: Joi.number().min(0).max(5).precision(3).required(),
  signal_strength: Joi.number().min(-100).max(0).required(),
  uptime: Joi.number().min(0).required(),
  status: Joi.string().valid('online', 'offline', 'low_battery', 'error').required(),
  memory_usage: Joi.number().min(0).max(100).optional(),
  temperature_internal: Joi.number().min(-10).max(80).optional()
});

// Schema para alertas
const alertDataSchema = Joi.object({
  timestamp: Joi.alternatives()
    .try(
      Joi.string().isoDate(),
      Joi.number().min(0),
      Joi.string().pattern(/^\d+$/)
    )
    .optional(),
  type: Joi.string().valid('temperature', 'humidity', 'pressure', 'wind', 'rainfall', 'battery', 'connectivity').required(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
  message: Joi.string().min(1).max(500).required(),
  value: Joi.number().optional(),
  threshold: Joi.number().optional(),
  acknowledged: Joi.boolean().default(false)
});

// Schema para ID de estación
const stationIdSchema = Joi.string()
  .pattern(/^[A-Z0-9_-]+$/)
  .min(3)
  .max(50)
  .required();

// Schema para parámetros de tiempo en queries
const timeRangeSchema = Joi.string()
  .pattern(/^(\d+[smhd]|last_\d+[smhd])$/)
  .default('30m');

// Schema para configuración de alertas
const alertConfigSchema = Joi.object({
  parameter: Joi.string().valid(
    'temperature', 'humidity', 'pressure', 'wind_speed', 
    'rainfall', 'battery_voltage', 'signal_strength'
  ).required(),
  min_threshold: Joi.number().optional(),
  max_threshold: Joi.number().optional(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
  enabled: Joi.boolean().default(true),
  suppression_minutes: Joi.number().min(1).max(1440).default(60)
});

module.exports = {
  weatherDataSchema,
  statusDataSchema,
  alertDataSchema,
  stationIdSchema,
  timeRangeSchema,
  alertConfigSchema
};