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
  // Core temperature and humidity (optional to allow status-only messages)
  temperature: Joi.number().min(-50).max(60).precision(2).optional(),
  humidity: Joi.number().min(0).max(100).precision(2).optional(),
  
  // BMP180 sensors
  pressure: Joi.number().min(800).max(1200).precision(2).optional(),
  bmp_temperature: Joi.number().min(-50).max(60).precision(2).optional(),
  altitude: Joi.number().min(-500).max(10000).precision(2).optional(),
  
  // Rain sensors (MH-RD)
  rain_analog: Joi.number().min(0).max(4095).optional(),
  rain_percentage: Joi.number().min(0).max(100).optional(),
  rain_digital: Joi.number().valid(0, 1).optional(),
  rain_detected: Joi.boolean().optional(),
  rainfall: Joi.number().min(0).max(1000000).precision(2).optional(),
  
  // DFRobots pluviometer
  pluvio_rainfall: Joi.number().min(0).max(1000000).precision(2).optional(),
  pluvio_accumulated: Joi.number().min(0).max(1000000).precision(2).optional(),
  pluvio_pulses: Joi.number().min(0).max(1000000).optional(),
  
  // Air quality sensors
  co_level: Joi.number().min(0).precision(2).optional(),
  co_raw: Joi.number().min(0).max(4095).optional(),
  air_quality_digital: Joi.number().valid(0, 1).optional(),
  dust_pm25: Joi.number().min(0).precision(2).optional(),
  
  // Light sensor
  light_level: Joi.number().min(0).precision(2).optional(),
  
  // Wind sensors (future)
  wind_speed: Joi.number().min(0).max(200).precision(2).optional(),
  wind_direction: Joi.number().min(0).max(360).precision(2).optional(),
  uv_index: Joi.number().min(0).max(15).precision(2).optional(),
  
  // System information
  battery_voltage: Joi.number().min(0).max(5).precision(3).optional(),
  signal_strength: Joi.number().min(-100).max(0).optional(),
  uptime: Joi.number().min(0).optional(),
  free_heap: Joi.number().min(0).optional(),
  status: Joi.string().valid('online', 'offline', 'low_battery', 'error', 'going_to_sleep').optional()
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
  battery_voltage: Joi.number().min(0).max(5).precision(3).optional(),
  signal_strength: Joi.number().min(-100).max(0).optional(),
  uptime: Joi.number().min(0).optional(),
  status: Joi.string().valid('online', 'offline', 'low_battery', 'error', 'going_to_sleep').optional(),
  memory_usage: Joi.number().min(0).max(100).optional(),
  temperature_internal: Joi.number().min(-10).max(80).optional(),
  free_heap: Joi.number().min(0).optional(),
  sensors: Joi.object({
    dht22: Joi.boolean().optional(),
    bmp180: Joi.boolean().optional(),
    bh1750: Joi.boolean().optional(),
    mh_rd: Joi.boolean().optional(),
    mq7: Joi.boolean().optional(),
    mq135: Joi.boolean().optional(),
    dsm501a: Joi.boolean().optional()
  }).optional()
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

// Schema para comandos de configuración remota
const configCommandSchema = Joi.object({
  command: Joi.string().valid(
    // Comandos básicos
    'status', 'restart', 'sensor_check', 'wake_up',
    // Comandos de medición
    'set_reading_interval', 'toggle_sensor', 'set_calibration',
    // Comandos de alertas
    'set_alert_threshold',
    // Comandos de energía
    'sleep_mode',
    // Comandos de conectividad
    'wifi_config'
  ).required(),
  parameters: Joi.alternatives().conditional('command', [
    // Comandos sin parámetros
    {
      is: Joi.string().valid('status', 'restart', 'sensor_check', 'wake_up'),
      then: Joi.forbidden()
    },
    // set_reading_interval
    {
      is: 'set_reading_interval',
      then: Joi.object({
        interval_ms: Joi.number().min(30000).max(3600000).required()
      }).required()
    },
    // toggle_sensor
    {
      is: 'toggle_sensor',
      then: Joi.object({
        sensor: Joi.string().valid('dht22', 'bmp085', 'rain', 'mq7', 'mq135', 'dsm501a', 'bh1750').required(),
        enabled: Joi.boolean().required()
      }).required()
    },
    // set_calibration
    {
      is: 'set_calibration',
      then: Joi.object({
        sensor: Joi.string().valid('temperature', 'humidity', 'pressure', 'light').required(),
        offset: Joi.number().min(-50).max(50).required()
      }).required()
    },
    // set_alert_threshold
    {
      is: 'set_alert_threshold',
      then: Joi.object({
        parameter: Joi.string().valid('temperature', 'humidity', 'pressure', 'co_level', 'air_quality').required(),
        min: Joi.number().optional(),
        max: Joi.number().optional()
      }).required()
    },
    // sleep_mode
    {
      is: 'sleep_mode',
      then: Joi.object({
        duration_ms: Joi.number().min(60000).max(86400000).required()
      }).required()
    },
    // wifi_config
    {
      is: 'wifi_config',
      then: Joi.object({
        ssid: Joi.string().min(1).max(32).required(),
        password: Joi.string().min(8).max(64).required()
      }).required()
    }
  ]).optional()
});

module.exports = {
  weatherDataSchema,
  statusDataSchema,
  alertDataSchema,
  stationIdSchema,
  timeRangeSchema,
  alertConfigSchema,
  configCommandSchema
};