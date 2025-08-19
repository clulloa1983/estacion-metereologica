const request = require('supertest');
const express = require('express');
const configController = require('../../src/controllers/configController');
const mqttService = require('../../src/services/mqttService');
const logger = require('../../src/config/logger');

// Mock dependencies
jest.mock('../../src/services/mqttService');
jest.mock('../../src/config/logger');

describe('ConfigController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock logger methods
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  });

  describe('sendCommand', () => {
    beforeEach(() => {
      app.post('/config/command/:stationId', (req, res) => {
        req.params = { stationId: req.params.stationId };
        configController.sendCommand(req, res);
      });
    });

    test('should send command successfully', async () => {
      const mockCommand = 'status';
      const mockStationId = 'ESP32_STATION_001';
      const mockParameters = {};

      mqttService.sendCommand.mockResolvedValue(true);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand,
          parameters: mockParameters
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.command).toBe(mockCommand);
      expect(response.body.message).toBe(`Command "${mockCommand}" sent successfully to station ${mockStationId}`);
      expect(response.body.timestamp).toBeDefined();
      
      expect(mqttService.sendCommand).toHaveBeenCalledWith(mockStationId, mockCommand, mockParameters);
      expect(logger.info).toHaveBeenCalledWith(
        `Sending command "${mockCommand}" to station ${mockStationId}`,
        { parameters: mockParameters }
      );
    });

    test('should handle MQTT service failure', async () => {
      const mockCommand = 'restart';
      const mockStationId = 'ESP32_STATION_001';

      mqttService.sendCommand.mockResolvedValue(false);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MQTT service unavailable or command failed to send');
    });

    test('should handle command with parameters', async () => {
      const mockCommand = 'set_reading_interval';
      const mockStationId = 'ESP32_STATION_001';
      const mockParameters = { interval_ms: 300000 };

      mqttService.sendCommand.mockResolvedValue(true);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand,
          parameters: mockParameters
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.parameters).toEqual(mockParameters);
      expect(mqttService.sendCommand).toHaveBeenCalledWith(mockStationId, mockCommand, mockParameters);
    });

    test('should handle controller errors', async () => {
      const mockCommand = 'status';
      const mockStationId = 'ESP32_STATION_001';
      const mockError = new Error('MQTT connection failed');

      mqttService.sendCommand.mockRejectedValue(mockError);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to send configuration command');
      expect(logger.error).toHaveBeenCalledWith('Error sending configuration command:', mockError);
    });

    test('should handle complex sensor configuration', async () => {
      const mockCommand = 'set_calibration';
      const mockStationId = 'ESP32_STATION_001';
      const mockParameters = {
        sensor: 'temperature',
        offset: -2.5
      };

      mqttService.sendCommand.mockResolvedValue(true);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand,
          parameters: mockParameters
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.parameters).toEqual(mockParameters);
    });

    test('should handle WiFi configuration command', async () => {
      const mockCommand = 'wifi_config';
      const mockStationId = 'ESP32_STATION_001';
      const mockParameters = {
        ssid: 'NewNetwork',
        password: 'SecretPassword123'
      };

      mqttService.sendCommand.mockResolvedValue(true);

      const response = await request(app)
        .post(`/config/command/${mockStationId}`)
        .send({
          command: mockCommand,
          parameters: mockParameters
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.parameters).toEqual(mockParameters);
    });
  });

  describe('getAvailableCommands', () => {
    beforeEach(() => {
      app.get('/config/commands', configController.getAvailableCommands);
    });

    test('should return all available commands', async () => {
      const response = await request(app)
        .get('/config/commands');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.commands).toBeDefined();
      expect(response.body.total).toBeDefined();
      
      // Check command categories
      expect(response.body.commands.basic).toBeDefined();
      expect(response.body.commands.measurement).toBeDefined();
      expect(response.body.commands.alerts).toBeDefined();
      expect(response.body.commands.power).toBeDefined();
      expect(response.body.commands.connectivity).toBeDefined();
      
      // Check total count
      const expectedTotal = 
        response.body.commands.basic.length +
        response.body.commands.measurement.length +
        response.body.commands.alerts.length +
        response.body.commands.power.length +
        response.body.commands.connectivity.length;
      
      expect(response.body.total).toBe(expectedTotal);
    });

    test('should include specific basic commands', async () => {
      const response = await request(app)
        .get('/config/commands');

      const basicCommands = response.body.commands.basic.map(cmd => cmd.command);
      expect(basicCommands).toContain('status');
      expect(basicCommands).toContain('restart');
      expect(basicCommands).toContain('sensor_check');
    });

    test('should include measurement commands with parameters', async () => {
      const response = await request(app)
        .get('/config/commands');

      const measurementCommands = response.body.commands.measurement;
      const intervalCommand = measurementCommands.find(cmd => cmd.command === 'set_reading_interval');
      
      expect(intervalCommand).toBeDefined();
      expect(intervalCommand.parameters).toBeDefined();
      expect(intervalCommand.parameters.interval_ms).toBeDefined();
      expect(intervalCommand.parameters.interval_ms.type).toBe('number');
      expect(intervalCommand.parameters.interval_ms.min).toBe(30000);
      expect(intervalCommand.parameters.interval_ms.max).toBe(3600000);
    });

    test('should include sensor toggle command with enum values', async () => {
      const response = await request(app)
        .get('/config/commands');

      const measurementCommands = response.body.commands.measurement;
      const toggleCommand = measurementCommands.find(cmd => cmd.command === 'toggle_sensor');
      
      expect(toggleCommand).toBeDefined();
      expect(toggleCommand.parameters.sensor.enum).toContain('dht22');
      expect(toggleCommand.parameters.sensor.enum).toContain('bmp085');
      expect(toggleCommand.parameters.enabled.type).toBe('boolean');
    });

    test('should handle controller errors', async () => {
      // Mock an error in the controller
      const originalGetAvailableCommands = configController.getAvailableCommands;
      configController.getAvailableCommands = jest.fn().mockImplementation((req, res) => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/config/commands');

      expect(response.status).toBe(500);
      
      // Restore original function
      configController.getAvailableCommands = originalGetAvailableCommands;
    });
  });

  describe('getConfigStatus', () => {
    beforeEach(() => {
      app.get('/config/status/:stationId', (req, res) => {
        req.params = { stationId: req.params.stationId };
        configController.getConfigStatus(req, res);
      });
    });

    test('should return configuration status when MQTT is connected', async () => {
      const mockStationId = 'ESP32_STATION_001';
      mqttService.isConnected.mockReturnValue(true);

      const response = await request(app)
        .get(`/config/status/${mockStationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.station_id).toBe(mockStationId);
      expect(response.body.mqtt_connected).toBe(true);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.available_commands).toBeDefined();
    });

    test('should return configuration status when MQTT is disconnected', async () => {
      const mockStationId = 'ESP32_STATION_002';
      mqttService.isConnected.mockReturnValue(false);

      const response = await request(app)
        .get(`/config/status/${mockStationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.station_id).toBe(mockStationId);
      expect(response.body.mqtt_connected).toBe(false);
    });

    test('should handle controller errors', async () => {
      const mockStationId = 'ESP32_STATION_001';
      const mockError = new Error('Service unavailable');
      
      mqttService.isConnected.mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app)
        .get(`/config/status/${mockStationId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve configuration status');
      expect(logger.error).toHaveBeenCalledWith('Error getting configuration status:', mockError);
    });

    test('should handle special characters in station ID', async () => {
      const mockStationId = 'ESP32_STATION_001-TEST_v2.0';
      mqttService.isConnected.mockReturnValue(true);

      const response = await request(app)
        .get(`/config/status/${encodeURIComponent(mockStationId)}`);

      expect(response.status).toBe(200);
      expect(response.body.station_id).toBe(mockStationId);
    });
  });
});