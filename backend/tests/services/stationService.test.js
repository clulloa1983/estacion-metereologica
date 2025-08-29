const stationService = require('../../src/services/stationService');
const { StationStatus, SensorTypes } = require('../../src/types/stationTypes');

// Mock the dependencies
jest.mock('../../src/config/logger');
jest.mock('../../src/services/cacheService');
jest.mock('../../src/config/influxdb');

const mockCacheService = require('../../src/services/cacheService');
const mockInfluxDB = require('../../src/config/influxdb');

describe('StationService', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock cache service methods
    mockCacheService.get = jest.fn().mockResolvedValue(null);
    mockCacheService.set = jest.fn().mockResolvedValue(true);
    mockCacheService.invalidatePattern = jest.fn().mockResolvedValue(true);
    mockCacheService.constructor = {
      TTL: {
        STATIONS: 300,
        STATION_METADATA: 180,
        HISTORICAL_SHORT: 60,
        HISTORICAL_LONG: 300
      }
    };

    // Mock InfluxDB methods
    mockInfluxDB.queryWeatherData = jest.fn();
    mockInfluxDB.bucket = 'test-bucket';
  });

  describe('getAllStations', () => {
    it('should return all stations with metadata', async () => {
      // Mock InfluxDB to return active stations
      mockInfluxDB.queryWeatherData.mockResolvedValue([
        { station_id: 'ESP32_STATION_001' },
        { station_id: 'ESP32_STATION_002' }
      ]);

      const stations = await stationService.getAllStations();

      expect(stations).toHaveLength(2);
      expect(stations[0].station_id).toBe('ESP32_STATION_001');
      expect(stations[0].name).toBe('Main Weather Station');
      expect(stations[0].status).toBe(StationStatus.ACTIVE);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      const cachedStations = [
        {
          station_id: 'ESP32_STATION_001',
          name: 'Cached Station',
          status: StationStatus.ACTIVE
        }
      ];

      mockCacheService.get.mockResolvedValue(cachedStations);

      const stations = await stationService.getAllStations();

      expect(stations).toEqual(cachedStations);
      expect(mockInfluxDB.queryWeatherData).not.toHaveBeenCalled();
    });

    it('should handle InfluxDB query errors gracefully', async () => {
      mockInfluxDB.queryWeatherData.mockRejectedValue(new Error('InfluxDB error'));

      await expect(stationService.getAllStations()).rejects.toThrow('InfluxDB error');
    });
  });

  describe('getStationById', () => {
    it('should return station metadata for existing station', async () => {
      // Mock last seen query
      mockInfluxDB.queryWeatherData.mockResolvedValue([
        { _time: '2024-01-01T12:00:00Z' }
      ]);

      const station = await stationService.getStationById('ESP32_STATION_001');

      expect(station).not.toBeNull();
      expect(station.station_id).toBe('ESP32_STATION_001');
      expect(station.name).toBe('Main Weather Station');
      expect(station.last_seen).toBe('2024-01-01T12:00:00Z');
    });

    it('should return null for non-existent station', async () => {
      // Mock station doesn't exist in InfluxDB
      mockInfluxDB.queryWeatherData
        .mockResolvedValueOnce([]) // stationExistsInInflux query
        .mockResolvedValueOnce([]); // getStationLastSeen query

      const station = await stationService.getStationById('NON_EXISTENT');

      expect(station).toBeNull();
    });

    it('should create default metadata for unknown station with data', async () => {
      // Mock station exists in InfluxDB but no metadata
      mockInfluxDB.queryWeatherData
        .mockResolvedValueOnce([{ station_id: 'ESP32_STATION_002' }]) // stationExistsInInflux
        .mockResolvedValueOnce([{ _time: '2024-01-01T12:00:00Z' }]); // getStationLastSeen

      const station = await stationService.getStationById('ESP32_STATION_002');

      expect(station).not.toBeNull();
      expect(station.station_id).toBe('ESP32_STATION_002');
      expect(station.name).toBe('Weather Station ESP32_STATION_002');
      expect(station.sensors).toContain(SensorTypes.DHT22);
    });
  });

  describe('updateStationMetadata', () => {
    it('should update existing station metadata', async () => {
      const updateData = {
        name: 'Updated Station Name',
        location: {
          lat: -33.5,
          lng: -70.7,
          address: 'Updated Address'
        }
      };

      const updatedStation = await stationService.updateStationMetadata('ESP32_STATION_001', updateData);

      expect(updatedStation.name).toBe('Updated Station Name');
      expect(updatedStation.location.lat).toBe(-33.5);
      expect(updatedStation.location.address).toBe('Updated Address');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('stations:metadata:ESP32_STATION_001*');
    });

    it('should validate updated metadata', async () => {
      const invalidUpdateData = {
        location: {
          lat: 100, // Invalid latitude
          lng: -70.7
        }
      };

      await expect(
        stationService.updateStationMetadata('ESP32_STATION_001', invalidUpdateData)
      ).rejects.toThrow('Invalid station metadata');
    });

    it('should create new station if it does not exist', async () => {
      const newStationData = {
        name: 'New Station',
        location: {
          lat: -33.4,
          lng: -70.6,
          address: 'New Address'
        }
      };

      const newStation = await stationService.updateStationMetadata('ESP32_STATION_NEW', newStationData);

      expect(newStation.station_id).toBe('ESP32_STATION_NEW');
      expect(newStation.name).toBe('New Station');
      expect(newStation.status).toBe(StationStatus.ACTIVE);
    });
  });

  describe('getStationsInRegion', () => {
    it('should return stations within specified bounds', async () => {
      // Mock getAllStations to return test data
      const mockStations = [
        {
          station_id: 'STATION_1',
          location: { lat: -33.4, lng: -70.6 }
        },
        {
          station_id: 'STATION_2',
          location: { lat: -33.5, lng: -70.7 }
        },
        {
          station_id: 'STATION_3',
          location: { lat: -35.0, lng: -72.0 } // Outside bounds
        }
      ];

      jest.spyOn(stationService, 'getAllStations').mockResolvedValue(mockStations);

      const bounds = {
        north: -33.0,
        south: -34.0,
        east: -70.0,
        west: -71.0
      };

      const stationsInRegion = await stationService.getStationsInRegion(bounds);

      expect(stationsInRegion).toHaveLength(2);
      expect(stationsInRegion.map(s => s.station_id)).toContain('STATION_1');
      expect(stationsInRegion.map(s => s.station_id)).toContain('STATION_2');
      expect(stationsInRegion.map(s => s.station_id)).not.toContain('STATION_3');
    });

    it('should validate bounds parameters', async () => {
      const invalidBounds = {
        north: -35.0, // North less than south
        south: -33.0,
        east: -70.0,
        west: -71.0
      };

      await expect(
        stationService.getStationsInRegion(invalidBounds)
      ).rejects.toThrow('Invalid bounds');
    });
  });

  describe('getStationStats', () => {
    it('should return station statistics', async () => {
      // Mock station exists
      jest.spyOn(stationService, 'getStationById').mockResolvedValue({
        station_id: 'ESP32_STATION_001',
        configuration: { reading_interval: 60 },
        sensors: [SensorTypes.DHT22, SensorTypes.BMP085],
        status: StationStatus.ACTIVE,
        last_seen: '2024-01-01T12:00:00Z'
      });

      // Mock data count query
      mockInfluxDB.queryWeatherData.mockResolvedValue([
        { _value: 1000 }
      ]);

      const stats = await stationService.getStationStats('ESP32_STATION_001');

      expect(stats.station_id).toBe('ESP32_STATION_001');
      expect(stats.data_points_30d).toBe(1000);
      expect(stats.uptime_percentage).toBeGreaterThan(0);
      expect(stats.sensors_count).toBe(2);
    });

    it('should throw error for non-existent station', async () => {
      jest.spyOn(stationService, 'getStationById').mockResolvedValue(null);

      await expect(
        stationService.getStationStats('NON_EXISTENT')
      ).rejects.toThrow('Station NON_EXISTENT not found');
    });
  });

  describe('updateStationStatus', () => {
    it('should update station status successfully', async () => {
      jest.spyOn(stationService, 'updateStationMetadata').mockResolvedValue({
        station_id: 'ESP32_STATION_001',
        status: StationStatus.MAINTENANCE
      });

      const updatedStation = await stationService.updateStationStatus('ESP32_STATION_001', StationStatus.MAINTENANCE);

      expect(updatedStation.status).toBe(StationStatus.MAINTENANCE);
      expect(stationService.updateStationMetadata).toHaveBeenCalledWith('ESP32_STATION_001', { 
        status: StationStatus.MAINTENANCE 
      });
    });

    it('should throw error for invalid status', async () => {
      await expect(
        stationService.updateStationStatus('ESP32_STATION_001', 'invalid_status')
      ).rejects.toThrow('Invalid status: invalid_status');
    });
  });

  describe('deleteStationMetadata', () => {
    it('should delete station metadata successfully', async () => {
      const deleted = await stationService.deleteStationMetadata('ESP32_STATION_001');

      expect(deleted).toBe(true);
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('stations:metadata:ESP32_STATION_001*');
    });
  });

  describe('getActiveStationsFromInflux', () => {
    it('should return list of active station IDs', async () => {
      mockInfluxDB.queryWeatherData.mockResolvedValue([
        { station_id: 'ESP32_STATION_001' },
        { station_id: 'ESP32_STATION_001' }, // Duplicate
        { station_id: 'ESP32_STATION_002' }
      ]);

      const activeStations = await stationService.getActiveStationsFromInflux();

      expect(activeStations).toEqual(['ESP32_STATION_001', 'ESP32_STATION_002']);
    });

    it('should handle InfluxDB errors gracefully', async () => {
      mockInfluxDB.queryWeatherData.mockRejectedValue(new Error('Query failed'));

      const activeStations = await stationService.getActiveStationsFromInflux();

      expect(activeStations).toEqual([]);
    });
  });
});