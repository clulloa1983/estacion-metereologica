const request = require('supertest');
const express = require('express');
const mlAlertsController = require('../../src/controllers/mlAlertsController');
const alertService = require('../../src/services/alertService');

// Mock dependencies
jest.mock('../../src/services/alertService');
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../src/config/influxdb', () => ({
  queryInfluxDB: jest.fn()
}));

const mockQueryInfluxDB = require('../../src/config/influxdb').queryInfluxDB;

describe('MLAlertsController', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Setup routes
    app.post('/api/ml-alerts/train/:stationId', mlAlertsController.trainModel);
    app.get('/api/ml-alerts/statistics/:stationId', mlAlertsController.getStatistics);
    app.post('/api/ml-alerts/reset/:stationId', mlAlertsController.resetModel);
    app.put('/api/ml-alerts/toggle', mlAlertsController.toggleMLAlerts);
    app.get('/api/ml-alerts/config', mlAlertsController.getConfig);
    app.get('/api/ml-alerts/recent/:stationId', mlAlertsController.getRecentMLAlerts);
    app.get('/api/ml-alerts/metrics/:stationId', mlAlertsController.getMLMetrics);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ml-alerts/train/:stationId', () => {
    test('should train ML model successfully', async () => {
      const mockResult = {
        success: true,
        message: 'ML models trained successfully for station ESP32_STATION_001'
      };

      alertService.trainMLModel.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send({ timeRange: '7d' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(alertService.trainMLModel).toHaveBeenCalledWith('ESP32_STATION_001', '7d');
    });

    test('should handle training failure', async () => {
      const mockResult = {
        success: false,
        message: 'Insufficient data for training'
      };

      alertService.trainMLModel.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send({ timeRange: '7d' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(mockResult);
    });

    test('should validate time range parameter', async () => {
      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send({ timeRange: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid time range');
    });

    test('should use default time range when not provided', async () => {
      const mockResult = { success: true, message: 'Training completed' };
      alertService.trainMLModel.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send({});

      expect(response.status).toBe(200);
      expect(alertService.trainMLModel).toHaveBeenCalledWith('ESP32_STATION_001', '7d');
    });

    test('should handle service errors gracefully', async () => {
      alertService.trainMLModel.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send({ timeRange: '7d' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Internal server error while training ML model');
    });
  });

  describe('GET /api/ml-alerts/statistics/:stationId', () => {
    test('should return ML statistics successfully', async () => {
      const mockStats = {
        ml_enabled: true,
        is_trained: true,
        training_data_points: 150,
        confidence_threshold: 0.95,
        sensors_monitored: ['temperature', 'humidity', 'pressure']
      };

      alertService.getMLStatistics.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/ml-alerts/statistics/ESP32_STATION_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.station_id).toBe('ESP32_STATION_001');
      expect(response.body.data).toEqual(mockStats);
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle statistics retrieval errors', async () => {
      alertService.getMLStatistics.mockImplementation(() => {
        throw new Error('Statistics error');
      });

      const response = await request(app)
        .get('/api/ml-alerts/statistics/ESP32_STATION_001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Internal server error while retrieving ML statistics');
    });
  });

  describe('POST /api/ml-alerts/reset/:stationId', () => {
    test('should reset ML model successfully', async () => {
      alertService.resetMLModel.mockImplementation(() => {});

      const response = await request(app)
        .post('/api/ml-alerts/reset/ESP32_STATION_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
      expect(alertService.resetMLModel).toHaveBeenCalledWith('ESP32_STATION_001');
    });

    test('should handle reset errors gracefully', async () => {
      alertService.resetMLModel.mockImplementation(() => {
        throw new Error('Reset error');
      });

      const response = await request(app)
        .post('/api/ml-alerts/reset/ESP32_STATION_001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Internal server error while resetting ML model');
    });
  });

  describe('PUT /api/ml-alerts/toggle', () => {
    test('should enable ML alerts', async () => {
      alertService.toggleMLAlerts.mockImplementation(() => {});

      const response = await request(app)
        .put('/api/ml-alerts/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ml_enabled).toBe(true);
      expect(response.body.message).toContain('enabled');
      expect(alertService.toggleMLAlerts).toHaveBeenCalledWith(true);
    });

    test('should disable ML alerts', async () => {
      alertService.toggleMLAlerts.mockImplementation(() => {});

      const response = await request(app)
        .put('/api/ml-alerts/toggle')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ml_enabled).toBe(false);
      expect(response.body.message).toContain('disabled');
      expect(alertService.toggleMLAlerts).toHaveBeenCalledWith(false);
    });

    test('should validate enabled parameter', async () => {
      const response = await request(app)
        .put('/api/ml-alerts/toggle')
        .send({ enabled: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Expected: { enabled: boolean }');
    });

    test('should require enabled parameter', async () => {
      const response = await request(app)
        .put('/api/ml-alerts/toggle')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/ml-alerts/config', () => {
    test('should return ML configuration', async () => {
      alertService.mlEnabled = true;
      alertService.suppressionTime = 30 * 60 * 1000; // 30 minutes

      const response = await request(app)
        .get('/api/ml-alerts/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ml_enabled', true);
      expect(response.body.data).toHaveProperty('suppression_time', 30);
      expect(response.body.data).toHaveProperty('supported_sensors');
      expect(response.body.data).toHaveProperty('algorithm_types');
      expect(response.body.data).toHaveProperty('severity_levels');
    });

    test('should handle configuration retrieval errors', async () => {
      // Simulate error by making alertService undefined
      const originalAlertService = alertService.mlEnabled;
      delete alertService.mlEnabled;

      const response = await request(app)
        .get('/api/ml-alerts/config');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);

      // Restore original value
      alertService.mlEnabled = originalAlertService;
    });
  });

  describe('GET /api/ml-alerts/recent/:stationId', () => {
    beforeEach(() => {
      // Mock environment variable
      process.env.INFLUXDB_BUCKET = 'test-bucket';
    });

    test('should return recent ML alerts', async () => {
      const mockAlerts = [
        {
          _time: '2024-01-01T12:00:00Z',
          alert_type: 'ml_temperature',
          severity: 'HIGH',
          message: 'Anomalous temperature detected',
          acknowledged: false,
          value: 35.5,
          ml_data: '{"anomaly_type":"isolation_forest","confidence":"0.98"}'
        }
      ];

      mockQueryInfluxDB.mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.station_id).toBe('ESP32_STATION_001');
      expect(response.body.count).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('timestamp');
      expect(response.body.data[0]).toHaveProperty('alert_type', 'ml_temperature');
    });

    test('should handle query parameters', async () => {
      mockQueryInfluxDB.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001?limit=50&severity=CRITICAL&sensor=temperature');

      expect(response.status).toBe(200);
      expect(response.body.filters_applied).toEqual({
        severity: 'CRITICAL',
        sensor: 'temperature',
        limit: 50
      });
    });

    test('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001?limit=150');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Must be between 1 and 100');
    });

    test('should validate severity parameter', async () => {
      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001?severity=INVALID');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid severity');
    });

    test('should handle database query errors', async () => {
      mockQueryInfluxDB.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Internal server error while retrieving recent ML alerts');
    });
  });

  describe('GET /api/ml-alerts/metrics/:stationId', () => {
    beforeEach(() => {
      process.env.INFLUXDB_BUCKET = 'test-bucket';
    });

    test('should return ML metrics', async () => {
      const mockMetrics = [
        { severity: 'HIGH', _value: 5 },
        { severity: 'MEDIUM', _value: 3 },
        { severity: 'CRITICAL', _value: 2 }
      ];

      mockQueryInfluxDB.mockResolvedValue(mockMetrics);
      
      const mockStats = {
        ml_enabled: true,
        is_trained: true
      };
      alertService.getMLStatistics.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/ml-alerts/metrics/ESP32_STATION_001?timeRange=24h');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_ml_alerts', 10);
      expect(response.body.data).toHaveProperty('alerts_by_severity');
      expect(response.body.data.alerts_by_severity).toHaveProperty('HIGH', 5);
      expect(response.body.data.alerts_by_severity).toHaveProperty('MEDIUM', 3);
      expect(response.body.data.alerts_by_severity).toHaveProperty('CRITICAL', 2);
      expect(response.body.data).toHaveProperty('model_statistics', mockStats);
    });

    test('should validate time range parameter', async () => {
      const response = await request(app)
        .get('/api/ml-alerts/metrics/ESP32_STATION_001?timeRange=invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid time range');
    });

    test('should use default time range when not provided', async () => {
      mockQueryInfluxDB.mockResolvedValue([]);
      alertService.getMLStatistics.mockReturnValue({});

      const response = await request(app)
        .get('/api/ml-alerts/metrics/ESP32_STATION_001');

      expect(response.status).toBe(200);
      expect(response.body.data.time_range).toBe('24h');
    });

    test('should handle empty metrics gracefully', async () => {
      mockQueryInfluxDB.mockResolvedValue([]);
      alertService.getMLStatistics.mockReturnValue({});

      const response = await request(app)
        .get('/api/ml-alerts/metrics/ESP32_STATION_001');

      expect(response.status).toBe(200);
      expect(response.body.data.total_ml_alerts).toBe(0);
      expect(response.body.data.alerts_by_severity.HIGH).toBe(0);
      expect(response.body.data.alerts_by_severity.CRITICAL).toBe(0);
    });

    test('should handle metrics query errors', async () => {
      mockQueryInfluxDB.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get('/api/ml-alerts/metrics/ESP32_STATION_001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Internal server error while retrieving ML metrics');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing station ID in routes', async () => {
      const response = await request(app)
        .get('/api/ml-alerts/statistics/');

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/ml-alerts/train/ESP32_STATION_001')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    test('should handle very long station IDs', async () => {
      const longStationId = 'A'.repeat(1000);
      alertService.getMLStatistics.mockReturnValue({});

      const response = await request(app)
        .get(`/api/ml-alerts/statistics/${longStationId}`);

      expect(response.status).toBe(200);
      expect(alertService.getMLStatistics).toHaveBeenCalledWith(longStationId);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests', async () => {
      alertService.getMLStatistics.mockReturnValue({
        ml_enabled: true,
        is_trained: false
      });

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/ml-alerts/statistics/ESP32_STATION_001')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle large query results efficiently', async () => {
      const largeResult = Array.from({ length: 1000 }, (_, i) => ({
        _time: `2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        alert_type: 'ml_temperature',
        severity: 'MEDIUM',
        message: `Alert ${i}`,
        acknowledged: false,
        value: 20 + Math.random() * 10
      }));

      mockQueryInfluxDB.mockResolvedValue(largeResult);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/ml-alerts/recent/ESP32_STATION_001?limit=100');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(response.body.data).toHaveLength(1000); // Should return all data
    });
  });
});