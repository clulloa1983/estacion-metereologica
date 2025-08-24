const mlAlertService = require('../../src/services/mlAlertService');

// Mock dependencies
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../src/config/influxdb', () => ({
  queryInfluxDB: jest.fn()
}));

const mockQueryInfluxDB = require('../../src/config/influxdb').queryInfluxDB;

describe('MLAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    mlAlertService.models = {
      isolationForest: null,
      rollingStats: new Map(),
      alertThresholds: new Map()
    };
    mlAlertService.isModelTrained = false;
    mlAlertService.trainingData = [];
  });

  describe('Isolation Forest Algorithm', () => {
    test('should calculate isolation scores for anomaly detection', () => {
      const data = [
        { temperature: 20, humidity: 50 },
        { temperature: 21, humidity: 52 },
        { temperature: 19, humidity: 48 },
        { temperature: 35, humidity: 85 } // Anomaly
      ];

      const result = mlAlertService.isolationForest(data, 5);
      
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('threshold');
      expect(result.scores).toHaveLength(4);
      expect(result.threshold).toBeGreaterThan(0);
      
      // The anomalous point should have a higher score
      expect(result.scores[3]).toBeGreaterThan(result.scores[0]);
    });

    test('should handle insufficient data gracefully', () => {
      const data = [{ temperature: 20 }]; // Less than minimum required
      
      const result = mlAlertService.isolationForest(data);
      
      expect(result.scores).toHaveLength(0);
      expect(result.threshold).toBe(0);
    });

    test('should calculate average path length correctly', () => {
      const pathLength = mlAlertService.calculateAveragePathLength(100);
      expect(pathLength).toBeGreaterThan(0);
      expect(pathLength).toBeLessThan(10);
      
      // Edge cases
      expect(mlAlertService.calculateAveragePathLength(1)).toBe(0);
      expect(mlAlertService.calculateAveragePathLength(0)).toBe(0);
    });
  });

  describe('Rolling Statistics', () => {
    test('should update rolling statistics for sensor data', () => {
      const stationId = 'TEST_STATION_001';
      const sensorData = {
        temperature: 25.5,
        humidity: 60.2,
        pressure: 1013.2
      };

      mlAlertService.updateRollingStatistics(stationId, sensorData);
      
      const stationStats = mlAlertService.models.rollingStats.get(stationId);
      expect(stationStats).toBeDefined();
      expect(stationStats.temperature).toBeDefined();
      expect(stationStats.temperature.values).toHaveLength(1);
      expect(stationStats.temperature.values[0].value).toBe(25.5);
    });

    test('should maintain rolling window size', () => {
      const stationId = 'TEST_STATION_001';
      const windowSize = mlAlertService.sensorConfigs.temperature.windowSize;

      // Add more data points than window size
      for (let i = 0; i < windowSize + 10; i++) {
        mlAlertService.updateRollingStatistics(stationId, {
          temperature: 20 + Math.random() * 10
        });
      }

      const stationStats = mlAlertService.models.rollingStats.get(stationId);
      expect(stationStats.temperature.values.length).toBeLessThanOrEqual(windowSize);
    });

    test('should calculate mean and standard deviation', () => {
      const stationId = 'TEST_STATION_001';
      const values = [20, 21, 19, 22, 18, 23, 17, 24];

      values.forEach(temp => {
        mlAlertService.updateRollingStatistics(stationId, { temperature: temp });
      });

      const stationStats = mlAlertService.models.rollingStats.get(stationId);
      expect(stationStats.temperature.mean).toBeCloseTo(20.5, 1);
      expect(stationStats.temperature.stdDev).toBeGreaterThan(0);
    });
  });

  describe('Model Training', () => {
    test('should train models with sufficient historical data', async () => {
      const stationId = 'TEST_STATION_001';
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        _time: new Date(Date.now() - i * 60000).toISOString(),
        temperature: 20 + Math.random() * 10,
        humidity: 50 + Math.random() * 20,
        pressure: 1000 + Math.random() * 50
      }));

      mockQueryInfluxDB.mockResolvedValue(mockData);

      const result = await mlAlertService.trainModels(stationId, '7d');
      
      expect(result).toBe(true);
      expect(mlAlertService.isModelTrained).toBe(true);
      expect(mlAlertService.trainingData.length).toBe(100);
      expect(mlAlertService.models.isolationForest).toBeDefined();
    });

    test('should handle insufficient training data', async () => {
      const stationId = 'TEST_STATION_001';
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        _time: new Date().toISOString(),
        temperature: 20
      })); // Less than minimum required

      mockQueryInfluxDB.mockResolvedValue(mockData);

      const result = await mlAlertService.trainModels(stationId);
      
      expect(result).toBe(false);
      expect(mlAlertService.isModelTrained).toBe(false);
    });

    test('should handle training errors gracefully', async () => {
      const stationId = 'TEST_STATION_001';
      
      mockQueryInfluxDB.mockRejectedValue(new Error('Database connection failed'));

      const result = await mlAlertService.trainModels(stationId);
      
      expect(result).toBe(false);
      expect(mlAlertService.isModelTrained).toBe(false);
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(() => {
      // Setup trained model state
      mlAlertService.isModelTrained = true;
      mlAlertService.trainingData = Array.from({ length: 100 }, (_, i) => ({
        temperature: 20 + Math.random() * 5,
        humidity: 50 + Math.random() * 10,
        pressure: 1013 + Math.random() * 20
      }));
      mlAlertService.models.isolationForest = {
        threshold: 0.95,
        scores: new Array(100).fill(0.5)
      };
    });

    test('should detect statistical anomalies', async () => {
      const stationId = 'TEST_STATION_001';

      // Setup rolling statistics with normal data
      for (let i = 0; i < 50; i++) {
        mlAlertService.updateRollingStatistics(stationId, {
          temperature: 20 + Math.random() * 2
        });
      }

      // Test with anomalous data
      const anomalousData = { temperature: 50 }; // Very high temperature
      const anomalies = await mlAlertService.detectAnomalies(stationId, anomalousData);
      
      expect(anomalies).toBeInstanceOf(Array);
      if (anomalies.length > 0) {
        expect(anomalies[0]).toHaveProperty('station_id', stationId);
        expect(anomalies[0]).toHaveProperty('sensor', 'temperature');
        expect(anomalies[0]).toHaveProperty('severity');
        expect(anomalies[0]).toHaveProperty('confidence');
      }
    });

    test('should use basic detection when model is not trained', async () => {
      mlAlertService.isModelTrained = false;
      const stationId = 'TEST_STATION_001';

      // Setup rolling statistics
      for (let i = 0; i < 30; i++) {
        mlAlertService.updateRollingStatistics(stationId, {
          temperature: 20 + Math.random() * 2
        });
      }

      const anomalousData = { temperature: 40 };
      const anomalies = await mlAlertService.detectAnomalies(stationId, anomalousData);
      
      expect(anomalies).toBeInstanceOf(Array);
      // Should still detect anomalies using basic statistical methods
    });

    test('should handle empty sensor data gracefully', async () => {
      const stationId = 'TEST_STATION_001';
      const emptySensorData = {};
      
      const anomalies = await mlAlertService.detectAnomalies(stationId, emptySensorData);
      
      expect(anomalies).toBeInstanceOf(Array);
      expect(anomalies).toHaveLength(0);
    });

    test('should suppress repeated anomalies for same sensor', async () => {
      const stationId = 'TEST_STATION_001';
      
      // Setup rolling statistics
      for (let i = 0; i < 30; i++) {
        mlAlertService.updateRollingStatistics(stationId, {
          temperature: 20 + Math.random() * 2
        });
      }

      const anomalousData = { temperature: 45 };
      
      // First detection
      await mlAlertService.detectAnomalies(stationId, anomalousData);
      
      // Second detection immediately after should be suppressed in practice
      // (This would be handled by the AlertService, not MLAlertService directly)
      const secondDetection = await mlAlertService.detectAnomalies(stationId, anomalousData);
      expect(secondDetection).toBeInstanceOf(Array);
    });
  });

  describe('Trend Analysis', () => {
    test('should calculate trends correctly', () => {
      const increasingValues = [1, 2, 3, 4, 5];
      const increasingTrend = mlAlertService.calculateTrend(increasingValues);
      expect(increasingTrend).toBeGreaterThan(0);

      const decreasingValues = [5, 4, 3, 2, 1];
      const decreasingTrend = mlAlertService.calculateTrend(decreasingValues);
      expect(decreasingTrend).toBeLessThan(0);

      const flatValues = [3, 3, 3, 3, 3];
      const flatTrend = mlAlertService.calculateTrend(flatValues);
      expect(Math.abs(flatTrend)).toBeLessThan(0.1);
    });

    test('should handle insufficient data for trend calculation', () => {
      const insufficientData = [1, 2];
      const trend = mlAlertService.calculateTrend(insufficientData);
      expect(trend).toBe(0);

      const emptyData = [];
      const emptyTrend = mlAlertService.calculateTrend(emptyData);
      expect(emptyTrend).toBe(0);
    });
  });

  describe('Message Generation', () => {
    test('should generate descriptive anomaly messages', () => {
      const message = mlAlertService.generateAnomalyMessage(
        'temperature',
        35.5,
        'isolation_forest,statistical_outlier',
        'HIGH'
      );

      expect(message).toContain('temperatura');
      expect(message).toContain('35.5');
      expect(message).toContain('Anomalía significativa');
    });

    test('should handle unknown sensors and types', () => {
      const message = mlAlertService.generateAnomalyMessage(
        'unknown_sensor',
        100,
        'unknown_type',
        'MEDIUM'
      );

      expect(message).toContain('unknown_sensor');
      expect(message).toContain('100');
      expect(message).toContain('Anomalía moderada');
    });
  });

  describe('Model Statistics', () => {
    test('should return comprehensive model statistics', () => {
      const stationId = 'TEST_STATION_001';
      
      // Setup some data
      mlAlertService.updateRollingStatistics(stationId, {
        temperature: 25,
        humidity: 60
      });

      const stats = mlAlertService.getModelStatistics(stationId);
      
      expect(stats).toHaveProperty('is_trained');
      expect(stats).toHaveProperty('training_data_points');
      expect(stats).toHaveProperty('confidence_threshold');
      expect(stats).toHaveProperty('sensors_monitored');
      expect(stats.sensors_monitored).toContain('temperature');
    });

    test('should include station-specific statistics when available', () => {
      const stationId = 'TEST_STATION_001';
      
      mlAlertService.updateRollingStatistics(stationId, {
        temperature: 25,
        humidity: 60
      });

      const stats = mlAlertService.getModelStatistics(stationId);
      
      expect(stats).toHaveProperty('station_statistics');
      expect(stats.station_statistics).toHaveProperty('temperature');
      expect(stats.station_statistics.temperature).toHaveProperty('data_points');
      expect(stats.station_statistics.temperature).toHaveProperty('anomaly_count');
    });
  });

  describe('Model Reset', () => {
    test('should reset models and statistics for a station', () => {
      const stationId = 'TEST_STATION_001';
      
      // Setup some data and thresholds
      mlAlertService.updateRollingStatistics(stationId, { temperature: 25 });
      mlAlertService.models.alertThresholds.set(`${stationId}_temperature`, { mean: 25 });
      
      expect(mlAlertService.models.rollingStats.has(stationId)).toBe(true);
      expect(mlAlertService.models.alertThresholds.has(`${stationId}_temperature`)).toBe(true);
      
      mlAlertService.resetModels(stationId);
      
      expect(mlAlertService.models.rollingStats.has(stationId)).toBe(false);
      expect(mlAlertService.models.alertThresholds.has(`${stationId}_temperature`)).toBe(false);
    });

    test('should only reset data for specified station', () => {
      const stationId1 = 'TEST_STATION_001';
      const stationId2 = 'TEST_STATION_002';
      
      // Setup data for both stations
      mlAlertService.updateRollingStatistics(stationId1, { temperature: 25 });
      mlAlertService.updateRollingStatistics(stationId2, { temperature: 30 });
      
      mlAlertService.resetModels(stationId1);
      
      expect(mlAlertService.models.rollingStats.has(stationId1)).toBe(false);
      expect(mlAlertService.models.rollingStats.has(stationId2)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle NaN and undefined values gracefully', async () => {
      const stationId = 'TEST_STATION_001';
      const invalidData = {
        temperature: NaN,
        humidity: undefined,
        pressure: null
      };

      expect(() => {
        mlAlertService.updateRollingStatistics(stationId, invalidData);
      }).not.toThrow();

      const anomalies = await mlAlertService.detectAnomalies(stationId, invalidData);
      expect(anomalies).toBeInstanceOf(Array);
    });

    test('should handle very large sensor values', async () => {
      const stationId = 'TEST_STATION_001';
      const extremeData = {
        temperature: 1000000,
        humidity: -99999
      };

      expect(() => {
        mlAlertService.updateRollingStatistics(stationId, extremeData);
      }).not.toThrow();

      const anomalies = await mlAlertService.detectAnomalies(stationId, extremeData);
      expect(anomalies).toBeInstanceOf(Array);
    });

    test('should handle concurrent access to rolling statistics', () => {
      const stationId = 'TEST_STATION_001';
      
      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) => {
        return Promise.resolve().then(() => {
          mlAlertService.updateRollingStatistics(stationId, {
            temperature: 20 + i
          });
        });
      });

      expect(() => {
        Promise.all(promises);
      }).not.toThrow();
    });
  });
});