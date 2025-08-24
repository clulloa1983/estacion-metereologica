import mlAlertsService, { MLAlert, MLStatistics, MLConfig } from '../mlAlertsService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MLAlertsService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set default environment variable
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5002/api';
  });

  describe('trainModel', () => {
    test('should train model successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'ML models trained successfully for station ESP32_STATION_001'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.trainModel('ESP32_STATION_001', '7d');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/train/ESP32_STATION_001',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ timeRange: '7d' })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should use default time range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Training completed' })
      });

      await mlAlertsService.trainModel('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ timeRange: '7d' })
        })
      );
    });

    test('should handle training failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Insufficient training data' })
      });

      await expect(mlAlertsService.trainModel('ESP32_STATION_001'))
        .rejects.toThrow('Insufficient training data');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(mlAlertsService.trainModel('ESP32_STATION_001'))
        .rejects.toThrow('Network error');
    });
  });

  describe('getStatistics', () => {
    test('should return ML statistics', async () => {
      const mockStats: MLStatistics = {
        ml_enabled: true,
        is_trained: true,
        training_data_points: 150,
        confidence_threshold: 0.95,
        sensors_monitored: ['temperature', 'humidity', 'pressure'],
        station_statistics: {
          temperature: {
            data_points: 100,
            anomaly_count: 5,
            last_anomaly: '2024-01-01T12:00:00Z',
            current_mean: '25.5',
            current_stddev: '2.1'
          }
        }
      };

      const mockResponse = {
        success: true,
        data: mockStats
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.getStatistics('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/statistics/ESP32_STATION_001',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle statistics retrieval errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      await expect(mlAlertsService.getStatistics('ESP32_STATION_001'))
        .rejects.toThrow('Internal server error');
    });
  });

  describe('resetModel', () => {
    test('should reset model successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'ML models reset successfully for station ESP32_STATION_001'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.resetModel('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/reset/ESP32_STATION_001',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('toggleMLAlerts', () => {
    test('should enable ML alerts', async () => {
      const mockResponse = {
        success: true,
        message: 'ML alerts enabled successfully',
        ml_enabled: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.toggleMLAlerts(true);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/toggle',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled: true })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should disable ML alerts', async () => {
      const mockResponse = {
        success: true,
        message: 'ML alerts disabled successfully',
        ml_enabled: false
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.toggleMLAlerts(false);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ enabled: false })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getConfig', () => {
    test('should return ML configuration', async () => {
      const mockConfig: MLConfig = {
        ml_enabled: true,
        suppression_time: 30,
        supported_sensors: ['temperature', 'humidity', 'pressure', 'wind_speed', 'pm25', 'co_level'],
        algorithm_types: ['isolation_forest', 'statistical_outlier', 'z_score', 'trend_anomaly'],
        severity_levels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        time_ranges: ['1d', '3d', '7d', '14d', '30d']
      };

      const mockResponse = {
        success: true,
        data: mockConfig
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.getConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/config',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRecentMLAlerts', () => {
    test('should return recent ML alerts', async () => {
      const mockAlerts: MLAlert[] = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          alert_type: 'ml_temperature',
          severity: 'HIGH',
          message: 'Anomalous temperature detected',
          acknowledged: false,
          value: 35.5,
          ml_data: {
            anomaly_type: 'isolation_forest',
            confidence: '0.98',
            context: {
              mean: '25.0',
              stdDev: '2.1',
              isolation_score: '0.98'
            }
          }
        }
      ];

      const mockResponse = {
        success: true,
        station_id: 'ESP32_STATION_001',
        count: 1,
        data: mockAlerts
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.getRecentMLAlerts('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/recent/ESP32_STATION_001',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle query parameters correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          station_id: 'ESP32_STATION_001',
          count: 0,
          data: []
        })
      });

      await mlAlertsService.getRecentMLAlerts('ESP32_STATION_001', {
        limit: 50,
        severity: 'CRITICAL',
        sensor: 'temperature'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/recent/ESP32_STATION_001?limit=50&severity=CRITICAL&sensor=temperature',
        expect.any(Object)
      );
    });

    test('should handle empty options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          station_id: 'ESP32_STATION_001',
          count: 0,
          data: []
        })
      });

      await mlAlertsService.getRecentMLAlerts('ESP32_STATION_001', {});

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/recent/ESP32_STATION_001',
        expect.any(Object)
      );
    });
  });

  describe('getMLMetrics', () => {
    test('should return ML metrics', async () => {
      const mockMetrics = {
        total_ml_alerts: 15,
        alerts_by_severity: {
          LOW: 5,
          MEDIUM: 6,
          HIGH: 3,
          CRITICAL: 1
        },
        time_range: '24h',
        model_statistics: {
          ml_enabled: true,
          is_trained: true,
          training_data_points: 200,
          confidence_threshold: 0.95,
          sensors_monitored: ['temperature', 'humidity']
        }
      };

      const mockResponse = {
        success: true,
        data: mockMetrics
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mlAlertsService.getMLMetrics('ESP32_STATION_001', '24h');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/metrics/ESP32_STATION_001?timeRange=24h',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should use default time range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            total_ml_alerts: 0,
            alerts_by_severity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
            time_range: '24h',
            model_statistics: {}
          }
        })
      });

      await mlAlertsService.getMLMetrics('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/metrics/ESP32_STATION_001?timeRange=24h',
        expect.any(Object)
      );
    });
  });

  describe('startRealtimeMonitoring', () => {
    test('should start monitoring and call callback with alerts', (done) => {
      const mockAlerts: MLAlert[] = [{
        timestamp: '2024-01-01T12:00:00Z',
        alert_type: 'ml_temperature',
        severity: 'HIGH',
        message: 'Test alert',
        acknowledged: false,
        value: 30
      }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAlerts
        })
      });

      const callback = jest.fn();
      const stopMonitoring = mlAlertsService.startRealtimeMonitoring('ESP32_STATION_001', callback, 100);

      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith(mockAlerts);
        stopMonitoring();
        done();
      }, 150);
    });

    test('should handle monitoring errors gracefully', (done) => {
      mockFetch.mockRejectedValue(new Error('Monitoring error'));

      const callback = jest.fn();
      const stopMonitoring = mlAlertsService.startRealtimeMonitoring('ESP32_STATION_001', callback, 100);

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        stopMonitoring();
        done();
      }, 150);
    });

    test('should stop monitoring when stop function is called', (done) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      });

      const callback = jest.fn();
      const stopMonitoring = mlAlertsService.startRealtimeMonitoring('ESP32_STATION_001', callback, 500);

      // Stop immediately
      stopMonitoring();

      setTimeout(() => {
        // Should not have been called since monitoring was stopped
        expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial call
        done();
      }, 600);
    });
  });

  describe('analyzeAlertTrends', () => {
    test('should analyze alert trends successfully', async () => {
      const mockAlerts: MLAlert[] = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          alert_type: 'ml_temperature',
          severity: 'HIGH',
          message: 'Temperature anomaly',
          acknowledged: false,
          value: 35,
          ml_data: {
            anomaly_type: 'isolation_forest',
            confidence: '0.95',
            context: {}
          }
        },
        {
          timestamp: '2024-01-01T12:05:00Z',
          alert_type: 'ml_temperature',
          severity: 'MEDIUM',
          message: 'Another temperature anomaly',
          acknowledged: false,
          value: 32,
          ml_data: {
            anomaly_type: 'statistical_outlier',
            confidence: '0.90',
            context: {}
          }
        }
      ];

      const mockMetrics = {
        total_ml_alerts: 2,
        alerts_by_severity: { LOW: 0, MEDIUM: 1, HIGH: 1, CRITICAL: 0 },
        time_range: '7d',
        model_statistics: {}
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAlerts
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockMetrics
          })
        });

      const result = await mlAlertsService.analyzeAlertTrends('ESP32_STATION_001', '7d');

      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].sensor).toBe('temperature');
      expect(result.trends[0].anomaly_count).toBe(2);
      expect(result.trends[0].most_common_type).toBe('isolation_forest');
      expect(result.summary.total_alerts).toBe(2);
      expect(result.summary.critical_alerts).toBe(0);
    });

    test('should handle analysis errors', async () => {
      mockFetch.mockRejectedValue(new Error('Analysis failed'));

      await expect(mlAlertsService.analyzeAlertTrends('ESP32_STATION_001'))
        .rejects.toThrow('Analysis failed');
    });
  });

  describe('exportAlertsToCSV', () => {
    test('should export alerts to CSV format', async () => {
      const mockAlerts: MLAlert[] = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          alert_type: 'ml_temperature',
          severity: 'HIGH',
          message: 'Temperature anomaly',
          acknowledged: false,
          value: 35.5,
          ml_data: {
            anomaly_type: 'isolation_forest',
            confidence: '0.95',
            context: {
              mean: '25.0',
              stdDev: '2.1',
              isolation_score: '0.95'
            }
          }
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          station_id: 'ESP32_STATION_001',
          data: mockAlerts
        })
      });

      const csv = await mlAlertsService.exportAlertsToCSV('ESP32_STATION_001');

      expect(csv).toContain('Timestamp,Station ID,Sensor,Severity');
      expect(csv).toContain('2024-01-01T12:00:00Z');
      expect(csv).toContain('temperature');
      expect(csv).toContain('HIGH');
      expect(csv).toContain('35.5');
      expect(csv).toContain('0.95');
    });

    test('should handle export errors', async () => {
      mockFetch.mockRejectedValue(new Error('Export failed'));

      await expect(mlAlertsService.exportAlertsToCSV('ESP32_STATION_001'))
        .rejects.toThrow('Export failed');
    });
  });

  describe('validateMLConfiguration', () => {
    test('should validate configuration as valid', async () => {
      const mockConfig: MLConfig = {
        ml_enabled: true,
        suppression_time: 30,
        supported_sensors: ['temperature', 'humidity', 'pressure', 'wind_speed'],
        algorithm_types: ['isolation_forest'],
        severity_levels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        time_ranges: ['1d', '7d']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockConfig
        })
      });

      const result = await mlAlertsService.validateMLConfiguration();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    test('should identify configuration issues', async () => {
      const mockConfig: MLConfig = {
        ml_enabled: false,
        suppression_time: 2,
        supported_sensors: ['temperature', 'humidity'],
        algorithm_types: ['isolation_forest'],
        severity_levels: ['LOW', 'HIGH'],
        time_ranges: ['1d']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockConfig
        })
      });

      const result = await mlAlertsService.validateMLConfiguration();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('ML alerts are currently disabled');
      expect(result.issues).toContain('Alert suppression time is too low');
      expect(result.recommendations).toContain('Enable ML alerts to start anomaly detection');
      expect(result.recommendations).toContain('Consider increasing suppression time to avoid alert spam');
      expect(result.recommendations).toContain('Consider adding more sensors for comprehensive monitoring');
    });

    test('should handle validation errors', async () => {
      mockFetch.mockRejectedValue(new Error('Validation failed'));

      const result = await mlAlertsService.validateMLConfiguration();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Failed to validate configuration');
      expect(result.recommendations).toContain('Check ML service connectivity');
    });
  });

  describe('Error Handling', () => {
    test('should handle HTTP errors with error messages', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' })
      });

      await expect(mlAlertsService.getStatistics('ESP32_STATION_001'))
        .rejects.toThrow('Bad request');
    });

    test('should handle HTTP errors without error messages', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(mlAlertsService.getStatistics('ESP32_STATION_001'))
        .rejects.toThrow('HTTP error! status: 500');
    });

    test('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(mlAlertsService.getStatistics('ESP32_STATION_001'))
        .rejects.toThrow('HTTP error! status: 400');
    });
  });

  describe('Environment Variables', () => {
    test('should use default API URL when environment variable is not set', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await mlAlertsService.getStatistics('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/ml-alerts/statistics/ESP32_STATION_001',
        expect.any(Object)
      );
    });

    test('should use custom API URL from environment variable', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.com/api';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await mlAlertsService.getStatistics('ESP32_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-api.com/api/ml-alerts/statistics/ESP32_STATION_001',
        expect.any(Object)
      );
    });
  });
});