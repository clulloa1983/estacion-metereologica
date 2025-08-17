const alertService = require('../../src/services/alertService');
const { writeAlert } = require('../../src/config/influxdb');

// Mock the InfluxDB functions
jest.mock('../../src/config/influxdb');
jest.mock('../../src/config/logger');

describe('AlertService', () => {
  beforeEach(() => {
    // Clear mocks and alert history before each test
    jest.clearAllMocks();
    alertService.alertHistory.clear();
  });

  describe('checkAlerts', () => {
    it('should create high temperature alert when temperature > 40', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: 45, humidity: 60 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          station_id: stationId,
          alert_type: 'temperature',
          severity: 'HIGH',
          message: 'Temperatura extrema detectada (Valor: 45)',
          acknowledged: false,
          value: 45
        })
      );
    });

    it('should create low temperature alert when temperature < -10', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: -15 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'temperature',
          severity: 'HIGH',
          message: 'Temperatura extremadamente baja (Valor: -15)',
          value: -15
        })
      );
    });

    it('should create critical wind speed alert when wind_speed > 60', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { wind_speed: 75 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'wind_speed',
          severity: 'CRITICAL',
          message: 'Vientos peligrosos detectados (Valor: 75)',
          value: 75
        })
      );
    });

    it('should create humidity alert when humidity > 95', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { humidity: 98 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'humidity',
          severity: 'MEDIUM',
          message: 'Humedad extremadamente alta (Valor: 98)',
          value: 98
        })
      );
    });

    it('should create pressure alert when pressure < 950', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { pressure: 940 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'pressure',
          severity: 'MEDIUM',
          message: 'Presión atmosférica muy baja (Valor: 940)',
          value: 940
        })
      );
    });

    it('should create battery alert when battery_voltage < 11.5', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { battery_voltage: 11.0 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'battery_voltage',
          severity: 'HIGH',
          message: 'Batería baja en estación meteorológica (Valor: 11)',
          value: 11.0
        })
      );
    });

    it('should create PM2.5 alert when pm25 > 150', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { pm25: 200 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'pm25',
          severity: 'HIGH',
          message: 'Calidad del aire peligrosa (PM2.5 elevado) (Valor: 200)',
          value: 200
        })
      );
    });

    it('should not create alert when values are within normal range', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = {
        temperature: 25,
        humidity: 60,
        pressure: 1013,
        wind_speed: 10,
        battery_voltage: 12.5,
        pm25: 50
      };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).not.toHaveBeenCalled();
    });

    it('should handle multiple alerts in single check', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = {
        temperature: 45,
        wind_speed: 75,
        humidity: 98
      };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).toHaveBeenCalledTimes(3);
    });

    it('should skip alerts for undefined values', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = {
        temperature: undefined,
        humidity: null
      };

      await alertService.checkAlerts(stationId, weatherData);

      expect(writeAlert).not.toHaveBeenCalled();
    });
  });

  describe('Alert Suppression', () => {
    beforeEach(() => {
      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should suppress duplicate alerts within suppression time', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: 45 };

      // First alert
      await alertService.checkAlerts(stationId, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(1);

      // Second alert immediately (should be suppressed)
      await alertService.checkAlerts(stationId, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(1);
    });

    it('should allow alert after suppression time expires', async () => {
      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: 45 };

      // First alert
      await alertService.checkAlerts(stationId, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(1);

      // Mock time after suppression period (30 minutes)
      Date.now.mockReturnValue(1000000 + (31 * 60 * 1000));

      // Second alert after suppression time (should be allowed)
      await alertService.checkAlerts(stationId, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(2);
    });

    it('should track suppression per alert key (station + parameter + severity)', async () => {
      const stationId1 = 'STATION_001';
      const stationId2 = 'STATION_002';
      const weatherData = { temperature: 45 };

      // Alert for station 1
      await alertService.checkAlerts(stationId1, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(1);

      // Alert for station 2 (different station, should not be suppressed)
      await alertService.checkAlerts(stationId2, weatherData);
      expect(writeAlert).toHaveBeenCalledTimes(2);
    });
  });

  describe('processAlert', () => {
    it('should process custom alert with all fields', async () => {
      const alertData = {
        station_id: 'TEST_STATION_001',
        alert_type: 'maintenance',
        severity: 'HIGH',
        message: 'Maintenance required',
        timestamp: '2024-01-01T12:00:00Z',
        acknowledged: false
      };

      const result = await alertService.processAlert(alertData);

      expect(writeAlert).toHaveBeenCalledWith(alertData);
      expect(result).toEqual(alertData);
    });

    it('should use default values for missing fields', async () => {
      const alertData = {
        station_id: 'TEST_STATION_001',
        message: 'Test alert'
      };

      const result = await alertService.processAlert(alertData);

      expect(result).toEqual(
        expect.objectContaining({
          station_id: 'TEST_STATION_001',
          alert_type: 'custom',
          severity: 'MEDIUM',
          message: 'Test alert',
          acknowledged: false,
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle errors gracefully', async () => {
      writeAlert.mockRejectedValueOnce(new Error('Database error'));

      const alertData = {
        station_id: 'TEST_STATION_001',
        message: 'Test alert'
      };

      await expect(alertService.processAlert(alertData)).rejects.toThrow('Database error');
    });
  });

  describe('getSeverityLevel', () => {
    it('should return correct numeric levels for severities', () => {
      expect(alertService.getSeverityLevel('LOW')).toBe(1);
      expect(alertService.getSeverityLevel('MEDIUM')).toBe(2);
      expect(alertService.getSeverityLevel('HIGH')).toBe(3);
      expect(alertService.getSeverityLevel('CRITICAL')).toBe(4);
    });

    it('should return 0 for unknown severity', () => {
      expect(alertService.getSeverityLevel('UNKNOWN')).toBe(0);
      expect(alertService.getSeverityLevel('')).toBe(0);
      expect(alertService.getSeverityLevel(null)).toBe(0);
    });
  });

  describe('Socket Service Integration', () => {
    it('should set socket service correctly', () => {
      const mockSocketService = {
        broadcastAlert: jest.fn()
      };

      alertService.setSocketService(mockSocketService);
      expect(alertService.socketService).toBe(mockSocketService);
    });

    it('should broadcast alert when socket service is available', async () => {
      const mockSocketService = {
        broadcastAlert: jest.fn()
      };
      alertService.setSocketService(mockSocketService);

      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: 45 };

      await alertService.checkAlerts(stationId, weatherData);

      expect(mockSocketService.broadcastAlert).toHaveBeenCalledWith(
        stationId,
        expect.objectContaining({
          alert_type: 'temperature',
          severity: 'HIGH'
        })
      );
    });

    it('should work without socket service', async () => {
      alertService.socketService = null;

      const stationId = 'TEST_STATION_001';
      const weatherData = { temperature: 45 };

      // Should not throw error
      await expect(alertService.checkAlerts(stationId, weatherData)).resolves.not.toThrow();
    });
  });
});