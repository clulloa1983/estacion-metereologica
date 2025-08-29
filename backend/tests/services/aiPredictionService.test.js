const aiPredictionService = require('../../src/services/aiPredictionService');
const influxClient = require('../../src/config/influxdb');

// Mock InfluxDB client
jest.mock('../../src/config/influxdb', () => ({
  queryApi: {
    queryRows: jest.fn()
  }
}));

describe('AI Prediction Service', () => {
  const mockStationId = 'TEST_STATION_001';
  const mockWeatherData = {
    station_id: mockStationId,
    temperature: 25.5,
    humidity: 65.0,
    pressure: 1013.2,
    wind_speed: 5.2,
    wind_direction: 180,
    rainfall: 0.0,
    pm25: 15.0,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in weather data', async () => {
      // Mock historical data query
      const mockHistoricalData = [
        { temperature: 22.0, humidity: 60.0, pressure: 1010.0, timestamp: '2024-01-01T10:00:00Z' },
        { temperature: 23.5, humidity: 62.0, pressure: 1011.5, timestamp: '2024-01-01T11:00:00Z' },
        { temperature: 24.0, humidity: 63.0, pressure: 1012.0, timestamp: '2024-01-01T12:00:00Z' }
      ];

      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        mockHistoricalData.forEach(record => {
          callbacks.next({ _time: record.timestamp, temperature: record.temperature, humidity: record.humidity }, {
            toObject: () => record
          });
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.detectAnomalies(mockStationId, mockWeatherData);

      expect(result).toHaveProperty('hasAnomaly');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('baseline');
      
      expect(typeof result.hasAnomaly).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.baseline).toBe('object');
    });

    it('should handle insufficient historical data', async () => {
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        // Return only one data point (insufficient)
        callbacks.next({ _time: '2024-01-01T10:00:00Z', temperature: 22.0 }, {
          toObject: () => ({ temperature: 22.0, timestamp: '2024-01-01T10:00:00Z' })
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.detectAnomalies(mockStationId, mockWeatherData);
      
      expect(result.hasAnomaly).toBe(false);
      expect(result.recommendations).toContain('Insufficient historical data for reliable anomaly detection');
    });

    it('should detect extreme temperature anomaly', async () => {
      const extremeWeatherData = { ...mockWeatherData, temperature: 60.0 }; // Extreme temperature
      
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        const normalData = [
          { temperature: 22.0, humidity: 60.0, timestamp: '2024-01-01T10:00:00Z' },
          { temperature: 23.0, humidity: 61.0, timestamp: '2024-01-01T11:00:00Z' },
          { temperature: 24.0, humidity: 62.0, timestamp: '2024-01-01T12:00:00Z' },
          { temperature: 23.5, humidity: 63.0, timestamp: '2024-01-01T13:00:00Z' },
          { temperature: 22.5, humidity: 61.5, timestamp: '2024-01-01T14:00:00Z' }
        ];
        
        normalData.forEach(record => {
          callbacks.next({ _time: record.timestamp, temperature: record.temperature, humidity: record.humidity }, {
            toObject: () => record
          });
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.detectAnomalies(mockStationId, extremeWeatherData);
      
      expect(result.hasAnomaly).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.anomalies.some(a => a.sensor === 'temperature')).toBe(true);
    });
  });

  describe('predictWeather', () => {
    it('should generate weather predictions', async () => {
      // Mock historical data for LSTM model
      const mockTimeSeriesData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - (50 - i) * 60 * 60 * 1000).toISOString(),
        temperature: 20 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
        humidity: 60 + Math.cos(i * 0.15) * 10 + Math.random() * 5,
        pressure: 1013 + Math.sin(i * 0.05) * 10 + Math.random() * 3
      }));

      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        mockTimeSeriesData.forEach(record => {
          callbacks.next({ _time: record.timestamp }, {
            toObject: () => record
          });
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.predictWeather(mockStationId, {
        hours: 24,
        parameters: ['temperature', 'humidity', 'pressure']
      });

      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('model_info');
      expect(result).toHaveProperty('trends');
      
      expect(Array.isArray(result.predictions)).toBe(true);
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions.length).toBeLessThanOrEqual(24);
      
      // Check prediction structure
      const firstPrediction = result.predictions[0];
      expect(firstPrediction).toHaveProperty('timestamp');
      expect(firstPrediction).toHaveProperty('values');
      expect(firstPrediction).toHaveProperty('confidence');
      expect(typeof firstPrediction.values.temperature).toBe('number');
    });

    it('should handle different prediction horizons', async () => {
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        // Mock minimal historical data
        [1, 2, 3, 4, 5].forEach(i => {
          callbacks.next({}, {
            toObject: () => ({
              temperature: 20 + i,
              timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
            })
          });
        });
        callbacks.complete();
      });

      const shortTerm = await aiPredictionService.predictWeather(mockStationId, { hours: 6 });
      const longTerm = await aiPredictionService.predictWeather(mockStationId, { hours: 72 });

      expect(shortTerm.predictions.length).toBeLessThanOrEqual(6);
      expect(longTerm.predictions.length).toBeLessThanOrEqual(72);
      expect(shortTerm.confidence).toBeGreaterThanOrEqual(longTerm.confidence); // Short-term should be more confident
    });
  });

  describe('predictMaintenance', () => {
    it('should predict maintenance needs', async () => {
      // Mock sensor health data
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        const healthData = [
          { sensor: 'dht22', error_rate: 0.02, last_calibration: '2024-01-01T00:00:00Z' },
          { sensor: 'bmp085', error_rate: 0.05, last_calibration: '2024-01-15T00:00:00Z' },
          { sensor: 'mq7', error_rate: 0.10, last_calibration: '2024-02-01T00:00:00Z' }
        ];
        
        healthData.forEach(record => {
          callbacks.next({}, {
            toObject: () => record
          });
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.predictMaintenance(mockStationId, { days: 30 });

      expect(result).toHaveProperty('sensor_health');
      expect(result).toHaveProperty('maintenance_schedule');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('overall_score');
      
      expect(typeof result.sensor_health).toBe('object');
      expect(Array.isArray(result.maintenance_schedule)).toBe(true);
      expect(Array.isArray(result.alerts)).toBe(true);
      expect(typeof result.overall_score).toBe('number');
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
    });

    it('should identify critical maintenance needs', async () => {
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        // Mock critical sensor with high error rate
        const criticalData = [
          { sensor: 'mq7', error_rate: 0.25, last_calibration: '2024-01-01T00:00:00Z' }, // High error rate, old calibration
          { sensor: 'dht22', error_rate: 0.01, last_calibration: '2024-02-15T00:00:00Z' }
        ];
        
        criticalData.forEach(record => {
          callbacks.next({}, {
            toObject: () => record
          });
        });
        callbacks.complete();
      });

      const result = await aiPredictionService.predictMaintenance(mockStationId, { days: 7 });
      
      // Should identify MQ7 as needing urgent maintenance
      const urgentTasks = result.maintenance_schedule.filter(task => task.priority === 'urgent');
      expect(urgentTasks.length).toBeGreaterThan(0);
      
      const mq7Health = result.sensor_health.mq7;
      expect(mq7Health.status).toBe('critical');
      expect(mq7Health.health_score).toBeLessThan(0.5);
    });
  });

  describe('optimizeEnergy', () => {
    it('should provide energy optimization recommendations', async () => {
      const result = await aiPredictionService.optimizeEnergy(mockStationId, { mode: 'hybrid' });

      expect(result).toHaveProperty('current_consumption');
      expect(result).toHaveProperty('optimizations');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('projected_battery_life');
      
      expect(typeof result.current_consumption.total_power).toBe('number');
      expect(typeof result.current_consumption.efficiency_score).toBe('number');
      expect(Array.isArray(result.optimizations)).toBe(true);
      expect(typeof result.recommendations).toBe('object');
      expect(typeof result.projected_battery_life.current).toBe('number');
      expect(typeof result.projected_battery_life.optimized).toBe('number');
    });

    it('should handle different energy modes', async () => {
      const batteryMode = await aiPredictionService.optimizeEnergy(mockStationId, { mode: 'battery' });
      const solarMode = await aiPredictionService.optimizeEnergy(mockStationId, { mode: 'solar' });
      const hybridMode = await aiPredictionService.optimizeEnergy(mockStationId, { mode: 'hybrid' });

      expect(batteryMode.optimizations).toBeDefined();
      expect(solarMode.optimizations).toBeDefined();
      expect(hybridMode.optimizations).toBeDefined();
      
      // Battery mode should focus on power conservation
      const batteryOptimizations = batteryMode.optimizations.map(opt => opt.category);
      expect(batteryOptimizations.some(cat => cat.includes('power') || cat.includes('battery'))).toBe(true);
    });
  });

  describe('interpolateRegionalData', () => {
    it('should interpolate data using IDW method', async () => {
      const stations = [
        {
          station_id: 'STATION_A',
          location: { lat: -33.4, lng: -70.6 },
          data: { temperature: 20.0 }
        },
        {
          station_id: 'STATION_B',
          location: { lat: -33.5, lng: -70.7 },
          data: { temperature: 22.0 }
        },
        {
          station_id: 'STATION_C',
          location: { lat: -33.3, lng: -70.5 },
          data: { temperature: 18.0 }
        }
      ];

      const targetLocation = { lat: -33.45, lng: -70.65 };

      const result = await aiPredictionService.interpolateRegionalData(
        stations, 
        targetLocation, 
        { parameter: 'temperature', method: 'idw' }
      );

      expect(result).toHaveProperty('interpolated_value');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('method_used');
      expect(result).toHaveProperty('stations_used');
      expect(result).toHaveProperty('quality_metrics');
      
      expect(typeof result.interpolated_value).toBe('number');
      expect(result.interpolated_value).toBeGreaterThan(17);
      expect(result.interpolated_value).toBeLessThan(23);
      expect(result.method_used).toBe('idw');
      expect(Array.isArray(result.stations_used)).toBe(true);
      expect(result.stations_used.length).toBe(3);
    });

    it('should calculate appropriate weights based on distance', async () => {
      const stations = [
        {
          station_id: 'NEAR_STATION',
          location: { lat: -33.44, lng: -70.60 }, // Very close
          data: { temperature: 25.0 }
        },
        {
          station_id: 'FAR_STATION',
          location: { lat: -33.50, lng: -70.80 }, // Further away
          data: { temperature: 15.0 }
        }
      ];

      const targetLocation = { lat: -33.443, lng: -70.601 }; // Very close to NEAR_STATION

      const result = await aiPredictionService.interpolateRegionalData(
        stations, 
        targetLocation, 
        { parameter: 'temperature' }
      );

      // Result should be closer to the near station's value
      expect(result.interpolated_value).toBeGreaterThan(20);
      
      // Near station should have higher weight
      const nearStation = result.stations_used.find(s => s.station_id === 'NEAR_STATION');
      const farStation = result.stations_used.find(s => s.station_id === 'FAR_STATION');
      
      expect(nearStation.weight).toBeGreaterThan(farStation.weight);
      expect(nearStation.distance).toBeLessThan(farStation.distance);
    });
  });

  describe('getModelStatus', () => {
    it('should return model status information', async () => {
      const result = await aiPredictionService.getModelStatus();

      expect(result).toHaveProperty('models');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('system_info');
      
      expect(typeof result.models).toBe('object');
      expect(Array.isArray(result.capabilities)).toBe(true);
      expect(typeof result.system_info).toBe('object');
      
      // Check model types
      const expectedModels = ['anomaly_detection', 'weather_prediction', 'maintenance_prediction'];
      expectedModels.forEach(modelType => {
        expect(result.models).toHaveProperty(modelType);
        expect(result.models[modelType]).toHaveProperty('status');
        expect(result.models[modelType]).toHaveProperty('last_trained');
        expect(result.models[modelType]).toHaveProperty('training_data_points');
      });
    });
  });

  describe('error handling', () => {
    it('should handle InfluxDB connection errors', async () => {
      influxClient.queryApi.queryRows.mockImplementation((query, callbacks) => {
        callbacks.error(new Error('Connection failed'));
      });

      await expect(aiPredictionService.detectAnomalies(mockStationId, mockWeatherData))
        .rejects.toThrow('Connection failed');
    });

    it('should handle invalid station data', async () => {
      const invalidData = { invalid: 'data' };

      const result = await aiPredictionService.detectAnomalies(mockStationId, invalidData);
      
      expect(result.hasAnomaly).toBe(false);
      expect(result.recommendations).toContain('Invalid or insufficient sensor data provided');
    });

    it('should handle empty interpolation station list', async () => {
      await expect(
        aiPredictionService.interpolateRegionalData([], { lat: 0, lng: 0 })
      ).rejects.toThrow('At least 2 stations are required for interpolation');
    });
  });
});