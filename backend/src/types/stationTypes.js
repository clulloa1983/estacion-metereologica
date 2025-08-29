/**
 * Station metadata types and validation schemas
 * Defines the structure for weather station information including location and configuration
 */

/**
 * Weather station status enumeration
 */
const StationStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive', 
  MAINTENANCE: 'maintenance',
  ERROR: 'error'
};

/**
 * Available sensor types for weather stations
 */
const SensorTypes = {
  DHT22: 'dht22',           // Temperature and humidity
  BMP085: 'bmp085',         // Barometric pressure
  BH1750: 'bh1750',         // Light intensity
  MH_RD: 'mh_rd',           // Rain detection
  MQ7: 'mq7',               // Carbon monoxide
  MQ135: 'mq135',           // Air quality
  DSM501A: 'dsm501a',       // PM2.5 particles
  WIND: 'wind'              // Wind speed/direction
};

/**
 * Station metadata structure
 * @typedef {Object} StationMetadata
 * @property {string} station_id - Unique station identifier
 * @property {string} name - Human-readable station name
 * @property {string} description - Station description
 * @property {Object} location - Geographic location information
 * @property {number} location.lat - Latitude in decimal degrees
 * @property {number} location.lng - Longitude in decimal degrees
 * @property {string} location.address - Human-readable address
 * @property {string} location.region - Geographic region/area
 * @property {number} location.elevation - Elevation in meters above sea level
 * @property {string[]} sensors - Array of available sensor types
 * @property {string} status - Current station status
 * @property {string} hardware_version - Hardware/firmware version
 * @property {string} created_at - Station creation timestamp
 * @property {string} last_seen - Last communication timestamp
 * @property {Object} configuration - Station configuration settings
 * @property {number} configuration.reading_interval - Reading interval in seconds
 * @property {boolean} configuration.alerts_enabled - Whether alerts are enabled
 * @property {Object} configuration.calibration - Sensor calibration factors
 */

/**
 * Default station metadata template
 */
const createDefaultStationMetadata = (stationId) => ({
  station_id: stationId,
  name: `Weather Station ${stationId}`,
  description: 'Automatic weather monitoring station',
  location: {
    lat: -33.443897,  // Default to Santiago, Chile
    lng: -70.660126,
    address: 'Location not configured',
    region: 'Unknown',
    elevation: 0
  },
  sensors: [
    SensorTypes.DHT22,
    SensorTypes.BMP085,
    SensorTypes.BH1750,
    SensorTypes.MH_RD,
    SensorTypes.MQ7,
    SensorTypes.MQ135,
    SensorTypes.DSM501A
  ],
  status: StationStatus.ACTIVE,
  hardware_version: 'ESP32-V1.0',
  created_at: new Date().toISOString(),
  last_seen: null,
  configuration: {
    reading_interval: 60, // seconds
    alerts_enabled: true,
    calibration: {
      temperature: 0.0,
      humidity: 0.0,
      pressure: 0.0,
      light: 0.0
    }
  }
});

/**
 * Validate station metadata structure
 * @param {Object} metadata - Station metadata to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
const validateStationMetadata = (metadata) => {
  const errors = [];
  
  // Required fields validation
  if (!metadata.station_id || typeof metadata.station_id !== 'string') {
    errors.push('station_id is required and must be a string');
  }
  
  if (!metadata.name || typeof metadata.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  
  // Location validation
  if (!metadata.location) {
    errors.push('location object is required');
  } else {
    if (typeof metadata.location.lat !== 'number' || 
        metadata.location.lat < -90 || metadata.location.lat > 90) {
      errors.push('location.lat must be a number between -90 and 90');
    }
    
    if (typeof metadata.location.lng !== 'number' || 
        metadata.location.lng < -180 || metadata.location.lng > 180) {
      errors.push('location.lng must be a number between -180 and 180');
    }
  }
  
  // Status validation
  if (metadata.status && !Object.values(StationStatus).includes(metadata.status)) {
    errors.push(`status must be one of: ${Object.values(StationStatus).join(', ')}`);
  }
  
  // Sensors validation
  if (metadata.sensors && Array.isArray(metadata.sensors)) {
    const invalidSensors = metadata.sensors.filter(sensor => 
      !Object.values(SensorTypes).includes(sensor)
    );
    if (invalidSensors.length > 0) {
      errors.push(`Invalid sensor types: ${invalidSensors.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Station location bounds for geographic queries
 * @typedef {Object} LocationBounds
 * @property {number} north - Northern latitude boundary
 * @property {number} south - Southern latitude boundary  
 * @property {number} east - Eastern longitude boundary
 * @property {number} west - Western longitude boundary
 */

/**
 * Validate geographic bounds
 * @param {LocationBounds} bounds - Geographic bounds to validate
 * @returns {Object} Validation result
 */
const validateLocationBounds = (bounds) => {
  const errors = [];
  
  if (!bounds || typeof bounds !== 'object') {
    errors.push('bounds object is required');
    return { isValid: false, errors };
  }
  
  const { north, south, east, west } = bounds;
  
  if (typeof north !== 'number' || north < -90 || north > 90) {
    errors.push('north must be a number between -90 and 90');
  }
  
  if (typeof south !== 'number' || south < -90 || south > 90) {
    errors.push('south must be a number between -90 and 90');
  }
  
  if (typeof east !== 'number' || east < -180 || east > 180) {
    errors.push('east must be a number between -180 and 180');
  }
  
  if (typeof west !== 'number' || west < -180 || west > 180) {
    errors.push('west must be a number between -180 and 180');
  }
  
  if (errors.length === 0) {
    if (north <= south) {
      errors.push('north boundary must be greater than south boundary');
    }
    if (east <= west) {
      errors.push('east boundary must be greater than west boundary');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  StationStatus,
  SensorTypes,
  createDefaultStationMetadata,
  validateStationMetadata,
  validateLocationBounds
};