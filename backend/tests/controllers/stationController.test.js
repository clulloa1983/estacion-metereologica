const request = require('supertest');
const express = require('express');
const stationController = require('../../src/controllers/stationController');
const stationService = require('../../src/services/stationService');
const { StationStatus, SensorTypes } = require('../../src/types/stationTypes');

// Mock the station service
jest.mock('../../src/services/stationService');
jest.mock('../../src/config/logger');

const app = express();
app.use(express.json());

// Setup routes for testing
app.get('/stations/metadata', stationController.getAllStations);
app.get('/stations/metadata/:stationId', stationController.getStationById);
app.post('/stations/metadata', stationController.createStationMetadata);
app.put('/stations/metadata/:stationId', stationController.updateStationMetadata);
app.delete('/stations/metadata/:stationId', stationController.deleteStationMetadata);
app.get('/stations/region', stationController.getStationsInRegion);
app.get('/stations/:stationId/stats', stationController.getStationStats);
app.put('/stations/:stationId/status', stationController.updateStationStatus);

describe('StationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /stations/metadata', () => {
    it('should return all stations successfully', async () => {
      const mockStations = [
        {
          station_id: 'ESP32_STATION_001',
          name: 'Main Station',
          status: StationStatus.ACTIVE,
          sensors: [SensorTypes.DHT22]
        }
      ];

      stationService.getAllStations.mockResolvedValue(mockStations);

      const response = await request(app)
        .get('/stations/metadata')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stations).toEqual(mockStations);
      expect(response.body.count).toBe(1);
    });

    it('should handle service errors', async () => {
      stationService.getAllStations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/stations/metadata')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve stations');
    });
  });

  describe('GET /stations/metadata/:stationId', () => {
    it('should return station by ID successfully', async () => {
      const mockStation = {
        station_id: 'ESP32_STATION_001',
        name: 'Main Station',
        status: StationStatus.ACTIVE
      };

      stationService.getStationById.mockResolvedValue(mockStation);

      const response = await request(app)
        .get('/stations/metadata/ESP32_STATION_001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.station).toEqual(mockStation);
    });

    it('should return 404 for non-existent station', async () => {
      stationService.getStationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/stations/metadata/NON_EXISTENT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Station NON_EXISTENT not found');
    });
  });

  describe('POST /stations/metadata', () => {
    it('should create new station successfully', async () => {
      const newStationData = {
        station_id: 'ESP32_STATION_002',
        name: 'New Station',
        location: {
          lat: -33.4,
          lng: -70.6,
          address: 'Test Address'
        },
        sensors: [SensorTypes.DHT22]
      };

      const mockCreatedStation = {
        ...newStationData,
        status: StationStatus.ACTIVE,
        created_at: '2024-01-01T12:00:00Z'
      };

      stationService.getStationById.mockResolvedValue(null); // Station doesn't exist
      stationService.updateStationMetadata.mockResolvedValue(mockCreatedStation);

      const response = await request(app)
        .post('/stations/metadata')
        .send(newStationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.station).toEqual(mockCreatedStation);
      expect(response.body.message).toContain('created successfully');
    });

    it('should return 409 if station already exists', async () => {
      const existingStationData = {
        station_id: 'ESP32_STATION_001',
        name: 'Existing Station'
      };

      stationService.getStationById.mockResolvedValue(existingStationData);

      const response = await request(app)
        .post('/stations/metadata')
        .send(existingStationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for missing station_id', async () => {
      const invalidData = {
        name: 'Station without ID'
      };

      const response = await request(app)
        .post('/stations/metadata')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('station_id is required');
    });
  });

  describe('PUT /stations/metadata/:stationId', () => {
    it('should update station successfully', async () => {
      const updateData = {
        name: 'Updated Station Name',
        location: {
          address: 'Updated Address'
        }
      };

      const mockUpdatedStation = {
        station_id: 'ESP32_STATION_001',
        name: 'Updated Station Name',
        status: StationStatus.ACTIVE
      };

      stationService.updateStationMetadata.mockResolvedValue(mockUpdatedStation);

      const response = await request(app)
        .put('/stations/metadata/ESP32_STATION_001')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.station).toEqual(mockUpdatedStation);
      expect(stationService.updateStationMetadata).toHaveBeenCalledWith('ESP32_STATION_001', updateData);
    });

    it('should handle validation errors', async () => {
      const invalidUpdateData = {
        location: { lat: 100 } // Invalid latitude
      };

      stationService.updateStationMetadata.mockRejectedValue(
        new Error('Invalid station metadata: latitude must be between -90 and 90')
      );

      const response = await request(app)
        .put('/stations/metadata/ESP32_STATION_001')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid station metadata');
    });
  });

  describe('GET /stations/region', () => {
    it('should return stations in region successfully', async () => {
      const mockStations = [
        {
          station_id: 'ESP32_STATION_001',
          location: { lat: -33.4, lng: -70.6 }
        }
      ];

      stationService.getStationsInRegion.mockResolvedValue(mockStations);

      const response = await request(app)
        .get('/stations/region')
        .query({
          north: -33.0,
          south: -34.0,
          east: -70.0,
          west: -71.0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stations).toEqual(mockStations);
      expect(response.body.bounds).toEqual({
        north: -33.0,
        south: -34.0,
        east: -70.0,
        west: -71.0
      });
    });

    it('should return 400 for missing bounds parameters', async () => {
      const response = await request(app)
        .get('/stations/region')
        .query({
          north: -33.0,
          south: -34.0
          // Missing east and west
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should handle invalid bounds', async () => {
      stationService.getStationsInRegion.mockRejectedValue(
        new Error('Invalid bounds: north boundary must be greater than south boundary')
      );

      const response = await request(app)
        .get('/stations/region')
        .query({
          north: -35.0, // Invalid: north less than south
          south: -33.0,
          east: -70.0,
          west: -71.0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid bounds');
    });
  });

  describe('GET /stations/:stationId/stats', () => {
    it('should return station statistics successfully', async () => {
      const mockStats = {
        station_id: 'ESP32_STATION_001',
        data_points_30d: 1000,
        uptime_percentage: 98.5,
        sensors_count: 3
      };

      stationService.getStationStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/stations/ESP32_STATION_001/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockStats);
    });

    it('should return 404 for non-existent station', async () => {
      stationService.getStationStats.mockRejectedValue(
        new Error('Station NON_EXISTENT not found')
      );

      const response = await request(app)
        .get('/stations/NON_EXISTENT/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /stations/:stationId/status', () => {
    it('should update station status successfully', async () => {
      const mockUpdatedStation = {
        station_id: 'ESP32_STATION_001',
        status: StationStatus.MAINTENANCE
      };

      stationService.updateStationStatus.mockResolvedValue(mockUpdatedStation);

      const response = await request(app)
        .put('/stations/ESP32_STATION_001/status')
        .send({ status: StationStatus.MAINTENANCE })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.station).toEqual(mockUpdatedStation);
      expect(response.body.message).toContain('status updated to maintenance');
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .put('/stations/ESP32_STATION_001/status')
        .send({}) // No status provided
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });

    it('should handle invalid status values', async () => {
      stationService.updateStationStatus.mockRejectedValue(
        new Error('Invalid status: invalid_status')
      );

      const response = await request(app)
        .put('/stations/ESP32_STATION_001/status')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });
  });

  describe('DELETE /stations/metadata/:stationId', () => {
    it('should delete station successfully', async () => {
      stationService.deleteStationMetadata.mockResolvedValue(true);

      const response = await request(app)
        .delete('/stations/metadata/ESP32_STATION_001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent station', async () => {
      stationService.deleteStationMetadata.mockResolvedValue(false);

      const response = await request(app)
        .delete('/stations/metadata/NON_EXISTENT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});