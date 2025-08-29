const logger = require('../config/logger');
const cacheService = require('./cacheService');
const { queryWeatherData, bucket } = require('../config/influxdb');
const { 
  StationStatus, 
  SensorTypes, 
  createDefaultStationMetadata, 
  validateStationMetadata,
  validateLocationBounds 
} = require('../types/stationTypes');

class StationService {
  constructor() {
    // In-memory storage for station metadata
    // In production, this would be stored in a dedicated database
    this.stationMetadata = new Map();
    this.initializeDefaultStations();
  }

  /**
   * Initialize default station metadata for existing stations
   */
  initializeDefaultStations() {
    // Initialize ESP32_STATION_001 with default metadata
    const defaultStation = createDefaultStationMetadata('ESP32_STATION_001');
    defaultStation.name = 'Main Weather Station';
    defaultStation.description = 'Primary ESP32-based weather monitoring station';
    defaultStation.location = {
      lat: -33.443897,
      lng: -70.660126,
      address: 'Santiago, Chile',
      region: 'Metropolitan Region',
      elevation: 520
    };
    
    this.stationMetadata.set('ESP32_STATION_001', defaultStation);
    logger.info('Initialized default station metadata for ESP32_STATION_001');
  }

  /**
   * Get all station metadata
   * @returns {Promise<Array>} Array of station metadata objects
   */
  async getAllStations() {
    try {
      const cacheKey = 'stations:metadata:all';
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      // Get all stations from InfluxDB (active stations that have sent data)
      const activeStations = await this.getActiveStationsFromInflux();
      
      // Merge with metadata, create default metadata for unknown stations
      const stationsWithMetadata = [];
      
      for (const stationId of activeStations) {
        let metadata = this.stationMetadata.get(stationId);
        
        if (!metadata) {
          // Create default metadata for unknown stations
          metadata = createDefaultStationMetadata(stationId);
          this.stationMetadata.set(stationId, metadata);
          logger.info(`Created default metadata for station ${stationId}`);
        }
        
        // Update last_seen from latest data
        const lastSeen = await this.getStationLastSeen(stationId);
        metadata.last_seen = lastSeen;
        
        stationsWithMetadata.push(metadata);
      }

      // Cache the result
      await cacheService.set(cacheKey, stationsWithMetadata, cacheService.constructor.TTL.STATIONS);
      
      return stationsWithMetadata;
    } catch (error) {
      logger.error('Error getting all stations:', error);
      throw error;
    }
  }

  /**
   * Get station metadata by ID
   * @param {string} stationId - Station identifier
   * @returns {Promise<Object|null>} Station metadata or null if not found
   */
  async getStationById(stationId) {
    try {
      const cacheKey = `stations:metadata:${stationId}`;
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      let metadata = this.stationMetadata.get(stationId);
      
      if (!metadata) {
        // Check if station exists in InfluxDB
        const hasData = await this.stationExistsInInflux(stationId);
        
        if (hasData) {
          // Create default metadata for existing station
          metadata = createDefaultStationMetadata(stationId);
          this.stationMetadata.set(stationId, metadata);
        } else {
          return null;
        }
      }
      
      // Update last_seen
      const lastSeen = await this.getStationLastSeen(stationId);
      metadata.last_seen = lastSeen;
      
      // Cache the result
      await cacheService.set(cacheKey, metadata, cacheService.constructor.TTL.STATION_METADATA);
      
      return metadata;
    } catch (error) {
      logger.error(`Error getting station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Update station metadata
   * @param {string} stationId - Station identifier
   * @param {Object} updateData - Metadata fields to update
   * @returns {Promise<Object>} Updated station metadata
   */
  async updateStationMetadata(stationId, updateData) {
    try {
      let metadata = this.stationMetadata.get(stationId);
      
      if (!metadata) {
        // Create new station metadata if it doesn't exist
        metadata = createDefaultStationMetadata(stationId);
      }
      
      // Merge update data with existing metadata
      const updatedMetadata = {
        ...metadata,
        ...updateData,
        station_id: stationId, // Ensure station_id cannot be changed
        location: {
          ...metadata.location,
          ...(updateData.location || {})
        },
        configuration: {
          ...metadata.configuration,
          ...(updateData.configuration || {}),
          calibration: {
            ...metadata.configuration.calibration,
            ...(updateData.configuration?.calibration || {})
          }
        }
      };
      
      // Validate the updated metadata
      const validation = validateStationMetadata(updatedMetadata);
      if (!validation.isValid) {
        throw new Error(`Invalid station metadata: ${validation.errors.join(', ')}`);
      }
      
      // Store the updated metadata
      this.stationMetadata.set(stationId, updatedMetadata);
      
      // Invalidate cache
      await cacheService.invalidatePattern(`stations:metadata:${stationId}*`);
      await cacheService.invalidatePattern('stations:metadata:all');
      
      logger.info(`Updated metadata for station ${stationId}`, { 
        fields: Object.keys(updateData) 
      });
      
      return updatedMetadata;
    } catch (error) {
      logger.error(`Error updating station ${stationId} metadata:`, error);
      throw error;
    }
  }

  /**
   * Get stations within geographic bounds
   * @param {Object} bounds - Geographic bounds {north, south, east, west}
   * @returns {Promise<Array>} Array of stations within bounds
   */
  async getStationsInRegion(bounds) {
    try {
      // Validate bounds
      const validation = validateLocationBounds(bounds);
      if (!validation.isValid) {
        throw new Error(`Invalid bounds: ${validation.errors.join(', ')}`);
      }

      const allStations = await this.getAllStations();
      
      const stationsInRegion = allStations.filter(station => {
        const { lat, lng } = station.location;
        return lat >= bounds.south && lat <= bounds.north &&
               lng >= bounds.west && lng <= bounds.east;
      });
      
      return stationsInRegion;
    } catch (error) {
      logger.error('Error getting stations in region:', error);
      throw error;
    }
  }

  /**
   * Get active stations from InfluxDB
   * @returns {Promise<Array>} Array of station IDs that have sent data
   */
  async getActiveStationsFromInflux() {
    try {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "weather")
          |> group(columns: ["station_id"])
          |> distinct(column: "station_id")
          |> yield(name: "stations")
      `;

      const data = await queryWeatherData(query);
      return [...new Set(data.map(row => row.station_id))];
    } catch (error) {
      logger.error('Error getting active stations from InfluxDB:', error);
      return [];
    }
  }

  /**
   * Check if station exists in InfluxDB
   * @param {string} stationId - Station identifier
   * @returns {Promise<boolean>} True if station has data in InfluxDB
   */
  async stationExistsInInflux(stationId) {
    try {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "weather")
          |> filter(fn: (r) => r.station_id == "${stationId}")
          |> limit(n: 1)
          |> yield(name: "exists")
      `;

      const data = await queryWeatherData(query);
      return data.length > 0;
    } catch (error) {
      logger.error(`Error checking if station ${stationId} exists:`, error);
      return false;
    }
  }

  /**
   * Get last seen timestamp for a station
   * @param {string} stationId - Station identifier
   * @returns {Promise<string|null>} Last seen timestamp or null
   */
  async getStationLastSeen(stationId) {
    try {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: -7d)
          |> filter(fn: (r) => r._measurement == "weather")
          |> filter(fn: (r) => r.station_id == "${stationId}")
          |> last()
          |> limit(n: 1)
          |> yield(name: "last_seen")
      `;

      const data = await queryWeatherData(query);
      return data.length > 0 ? data[0]._time : null;
    } catch (error) {
      logger.error(`Error getting last seen for station ${stationId}:`, error);
      return null;
    }
  }

  /**
   * Update station status
   * @param {string} stationId - Station identifier
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated station metadata
   */
  async updateStationStatus(stationId, status) {
    if (!Object.values(StationStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return this.updateStationMetadata(stationId, { status });
  }

  /**
   * Get station statistics
   * @param {string} stationId - Station identifier
   * @returns {Promise<Object>} Station statistics
   */
  async getStationStats(stationId) {
    try {
      const metadata = await this.getStationById(stationId);
      if (!metadata) {
        throw new Error(`Station ${stationId} not found`);
      }

      // Get data count for last 30 days
      const query = `
        from(bucket: "${bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "weather")
          |> filter(fn: (r) => r.station_id == "${stationId}")
          |> count()
          |> yield(name: "count")
      `;

      const countData = await queryWeatherData(query);
      const dataPoints = countData.length > 0 ? countData[0]._value : 0;

      // Calculate uptime based on expected readings (every 60 seconds)
      const expectedReadings = (30 * 24 * 60) / (metadata.configuration.reading_interval / 60);
      const uptime = Math.min((dataPoints / expectedReadings) * 100, 100);

      return {
        station_id: stationId,
        data_points_30d: dataPoints,
        expected_readings: Math.round(expectedReadings),
        uptime_percentage: Math.round(uptime * 100) / 100,
        last_seen: metadata.last_seen,
        status: metadata.status,
        sensors_count: metadata.sensors.length
      };
    } catch (error) {
      logger.error(`Error getting stats for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete station metadata
   * @param {string} stationId - Station identifier
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteStationMetadata(stationId) {
    try {
      const deleted = this.stationMetadata.delete(stationId);
      
      if (deleted) {
        // Invalidate cache
        await cacheService.invalidatePattern(`stations:metadata:${stationId}*`);
        await cacheService.invalidatePattern('stations:metadata:all');
        
        logger.info(`Deleted metadata for station ${stationId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Error deleting station ${stationId} metadata:`, error);
      throw error;
    }
  }
}

module.exports = new StationService();