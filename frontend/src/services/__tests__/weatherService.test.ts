import { weatherService } from '../weatherService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('WeatherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5002/api';
  });

  describe('getLatestData', () => {
    const mockWeatherData = {
      station_id: 'TEST_STATION_001',
      temperature: 25.5,
      humidity: 60,
      pressure: 1013.25,
      wind_speed: 12.5,
      wind_direction: 180,
      rainfall: 2.5,
      timestamp: '2024-01-01T12:00:00Z'
    };

    it('should fetch latest weather data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData,
      } as Response);

      const result = await weatherService.getLatestData('TEST_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001/latest'
      );
      expect(result).toEqual(mockWeatherData);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(weatherService.getLatestData('NONEXISTENT_STATION')).rejects.toThrow(
        'HTTP error! status: 404'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(weatherService.getLatestData('TEST_STATION_001')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle missing API URL', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      await expect(weatherService.getLatestData('TEST_STATION_001')).rejects.toThrow(
        'API URL not configured'
      );
    });
  });

  describe('getHistoricalData', () => {
    const mockHistoricalData = [
      {
        station_id: 'TEST_STATION_001',
        temperature: 25.0,
        humidity: 55,
        timestamp: '2024-01-01T11:00:00Z'
      },
      {
        station_id: 'TEST_STATION_001',
        temperature: 25.5,
        humidity: 60,
        timestamp: '2024-01-01T12:00:00Z'
      }
    ];

    it('should fetch historical data with default parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoricalData,
      } as Response);

      const result = await weatherService.getHistoricalData('TEST_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001?timeRange=24h'
      );
      expect(result).toEqual(mockHistoricalData);
    });

    it('should fetch historical data with custom parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoricalData,
      } as Response);

      const result = await weatherService.getHistoricalData(
        'TEST_STATION_001',
        '7d',
        'hourly',
        100
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001?timeRange=7d&aggregation=hourly&limit=100'
      );
      expect(result).toEqual(mockHistoricalData);
    });

    it('should handle optional parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoricalData,
      } as Response);

      const result = await weatherService.getHistoricalData(
        'TEST_STATION_001',
        '1h',
        undefined,
        50
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001?timeRange=1h&limit=50'
      );
      expect(result).toEqual(mockHistoricalData);
    });
  });

  describe('getSummary', () => {
    const mockSummary = {
      station_id: 'TEST_STATION_001',
      temperature: { min: 20, max: 30, avg: 25 },
      humidity: { min: 50, max: 70, avg: 60 },
      period: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z'
      }
    };

    it('should fetch summary data with default time range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      } as Response);

      const result = await weatherService.getSummary('TEST_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001/summary?timeRange=24h'
      );
      expect(result).toEqual(mockSummary);
    });

    it('should fetch summary data with custom time range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      } as Response);

      const result = await weatherService.getSummary('TEST_STATION_001', '7d');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/TEST_STATION_001/summary?timeRange=7d'
      );
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getStations', () => {
    const mockStations = [
      {
        station_id: 'STATION_001',
        name: 'Station 1',
        location: 'Location 1',
        last_seen: '2024-01-01T12:00:00Z'
      },
      {
        station_id: 'STATION_002',
        name: 'Station 2',
        location: 'Location 2',
        last_seen: '2024-01-01T11:30:00Z'
      }
    ];

    it('should fetch all stations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStations,
      } as Response);

      const result = await weatherService.getStations();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/stations'
      );
      expect(result).toEqual(mockStations);
    });
  });

  describe('getAlerts', () => {
    const mockAlerts = [
      {
        id: '1',
        station_id: 'TEST_STATION_001',
        alert_type: 'temperature',
        severity: 'HIGH' as const,
        message: 'High temperature detected',
        timestamp: '2024-01-01T12:00:00Z',
        acknowledged: false
      },
      {
        id: '2',
        station_id: 'TEST_STATION_001',
        alert_type: 'wind_speed',
        severity: 'CRITICAL' as const,
        message: 'Dangerous winds detected',
        timestamp: '2024-01-01T11:00:00Z',
        acknowledged: true
      }
    ];

    it('should fetch alerts with default parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      } as Response);

      const result = await weatherService.getAlerts('TEST_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts/TEST_STATION_001'
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should fetch alerts with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts.filter(a => a.severity === 'HIGH'),
      } as Response);

      const result = await weatherService.getAlerts(
        'TEST_STATION_001',
        'HIGH',
        false
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts/TEST_STATION_001?severity=HIGH&acknowledged=false'
      );
    });

    it('should handle optional filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      } as Response);

      const result = await weatherService.getAlerts(
        'TEST_STATION_001',
        undefined,
        false
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts/TEST_STATION_001?acknowledged=false'
      );
    });
  });

  describe('getAlertSummary', () => {
    const mockAlertSummary = {
      station_id: 'TEST_STATION_001',
      total: 5,
      unacknowledged: 2,
      by_severity: {
        CRITICAL: 1,
        HIGH: 2,
        MEDIUM: 1,
        LOW: 1
      },
      latest_alert: '2024-01-01T12:00:00Z'
    };

    it('should fetch alert summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertSummary,
      } as Response);

      const result = await weatherService.getAlertSummary('TEST_STATION_001');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts/summary/TEST_STATION_001'
      );
      expect(result).toEqual(mockAlertSummary);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Alert acknowledged' }),
      } as Response);

      await weatherService.acknowledgeAlert('alert123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts/alert123/acknowledge',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle acknowledgment errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(weatherService.acknowledgeAlert('nonexistent')).rejects.toThrow(
        'HTTP error! status: 404'
      );
    });
  });

  describe('postWeatherData', () => {
    const mockWeatherData = {
      station_id: 'TEST_STATION_001',
      temperature: 25.5,
      humidity: 60,
      pressure: 1013.25,
      timestamp: '2024-01-01T12:00:00Z'
    };

    it('should post weather data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Data stored successfully' }),
      } as Response);

      await weatherService.postWeatherData(mockWeatherData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockWeatherData),
        }
      );
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(weatherService.postWeatherData(mockWeatherData)).rejects.toThrow(
        'HTTP error! status: 400'
      );
    });
  });

  describe('createAlert', () => {
    const mockAlertData = {
      station_id: 'TEST_STATION_001',
      alert_type: 'maintenance',
      severity: 'MEDIUM' as const,
      message: 'Scheduled maintenance required'
    };

    it('should create alert successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Alert created successfully' }),
      } as Response);

      await weatherService.createAlert(mockAlertData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/alerts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockAlertData),
        }
      );
    });
  });

  describe('exportData', () => {
    it('should export data in CSV format', async () => {
      const csvData = 'timestamp,temperature,humidity\n2024-01-01T12:00:00Z,25.5,60';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => csvData,
      } as Response);

      const result = await weatherService.exportData('TEST_STATION_001', 'csv');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/export/TEST_STATION_001?format=csv&timeRange=24h'
      );
      expect(result).toBe(csvData);
    });

    it('should export data in JSON format with custom parameters', async () => {
      const jsonData = { data: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => jsonData,
      } as Response);

      const result = await weatherService.exportData(
        'TEST_STATION_001',
        'json',
        '7d',
        '2024-01-01T00:00:00Z',
        '2024-01-07T23:59:59Z'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/export/TEST_STATION_001?format=json&timeRange=7d&start=2024-01-01T00%3A00%3A00Z&end=2024-01-07T23%3A59%3A59Z'
      );
      expect(result).toEqual(jsonData);
    });
  });

  describe('URL Building', () => {
    it('should build URLs correctly with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await weatherService.getHistoricalData(
        'TEST_STATION_001',
        '1h',
        'hourly',
        100
      );

      const expectedUrl = 'http://localhost:5002/api/weather/data/TEST_STATION_001?timeRange=1h&aggregation=hourly&limit=100';
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should handle special characters in station ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {},
      } as Response);

      await weatherService.getLatestData('STATION_001-TEST');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/weather/data/STATION_001-TEST/latest'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(weatherService.getLatestData('TEST_STATION_001')).rejects.toThrow(
        'Invalid JSON'
      );
    });

    it('should handle fetch failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(weatherService.getLatestData('TEST_STATION_001')).rejects.toThrow(
        'Fetch failed'
      );
    });
  });
});