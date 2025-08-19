const MQTTService = require('../../src/services/mqttService');
const logger = require('../../src/config/logger');
const mqtt = require('mqtt');

// Mock dependencies
jest.mock('mqtt');
jest.mock('../../src/config/logger');
jest.mock('../../src/config/influxdb');
jest.mock('../../src/services/alertService');

describe('MQTT Commands Integration', () => {
  let mqttService;
  let mockClient;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock logger methods
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
    logger.debug = jest.fn();

    // Create mock MQTT client
    mockClient = {
      connect: jest.fn(),
      on: jest.fn(),
      subscribe: jest.fn(),
      publish: jest.fn(),
      end: jest.fn(),
      connected: true
    };

    // Mock mqtt.connect to return our mock client
    mqtt.connect.mockReturnValue(mockClient);

    // Create new MQTT service instance
    mqttService = new MQTTService();
    mqttService.client = mockClient;
  });

  describe('sendCommand', () => {
    test('should send basic status command successfully', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'status';
      
      const result = await mqttService.sendCommand(stationId, command);
      
      expect(result).toBe(true);
      expect(mockClient.publish).toHaveBeenCalledWith(
        `weather/command/${stationId}`,
        expect.stringContaining('"command":"status"')
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Sending command to ${stationId}:`,
        { command, parameters: null }
      );
    });

    test('should send restart command successfully', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'restart';
      
      const result = await mqttService.sendCommand(stationId, command);
      
      expect(result).toBe(true);
      expect(mockClient.publish).toHaveBeenCalledWith(
        `weather/command/${stationId}`,
        expect.stringContaining('"command":"restart"')
      );
    });

    test('should send set_reading_interval command with parameters', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'set_reading_interval';
      const parameters = { interval_ms: 300000 };
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      expect(publishCall[0]).toBe(`weather/command/${stationId}`);
      
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.command).toBe(command);
      expect(messageData.parameters).toEqual(parameters);
      expect(messageData.timestamp).toBeDefined();
      expect(messageData.id).toBeDefined();
      expect(messageData.id).toMatch(/^cmd_\d+_\w+$/);
    });

    test('should send toggle_sensor command with parameters', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'toggle_sensor';
      const parameters = { sensor: 'dht22', enabled: false };
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.command).toBe(command);
      expect(messageData.parameters).toEqual(parameters);
    });

    test('should send calibration command with offset parameters', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'set_calibration';
      const parameters = { sensor: 'temperature', offset: -2.5 };
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.parameters.offset).toBe(-2.5);
      expect(messageData.parameters.sensor).toBe('temperature');
    });

    test('should send alert threshold configuration', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'set_alert_threshold';
      const parameters = { 
        parameter: 'temperature', 
        min: 10, 
        max: 35 
      };
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.parameters).toEqual(parameters);
    });

    test('should send sleep mode command with duration', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'sleep_mode';
      const parameters = { duration_ms: 3600000 }; // 1 hour
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.parameters.duration_ms).toBe(3600000);
    });

    test('should send WiFi configuration command', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'wifi_config';
      const parameters = { 
        ssid: 'NewNetwork', 
        password: 'SecretPassword123' 
      };
      
      const result = await mqttService.sendCommand(stationId, command, parameters);
      
      expect(result).toBe(true);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      expect(messageData.parameters).toEqual(parameters);
      
      // Should log the command (but not the password for security)
      expect(logger.info).toHaveBeenCalledWith(
        `Sending command to ${stationId}:`,
        { command, parameters }
      );
    });

    test('should fail when MQTT client is not connected', async () => {
      mockClient.connected = false;
      
      const stationId = 'ESP32_STATION_001';
      const command = 'status';
      
      const result = await mqttService.sendCommand(stationId, command);
      
      expect(result).toBe(false);
      expect(mockClient.publish).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to send command to ${stationId} - MQTT not connected`
      );
    });

    test('should fail when MQTT client is null', async () => {
      mqttService.client = null;
      
      const stationId = 'ESP32_STATION_001';
      const command = 'status';
      
      const result = await mqttService.sendCommand(stationId, command);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'MQTT client not connected, cannot publish message'
      );
    });

    test('should handle command sending errors gracefully', async () => {
      const error = new Error('Network timeout');
      mockClient.publish.mockImplementation(() => {
        throw error;
      });
      
      const stationId = 'ESP32_STATION_001';
      const command = 'status';
      
      const result = await mqttService.sendCommand(stationId, command);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error sending command to ${stationId}:`,
        error
      );
    });

    test('should generate unique command IDs', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'status';
      
      // Send multiple commands
      await mqttService.sendCommand(stationId, command);
      await mqttService.sendCommand(stationId, command);
      await mqttService.sendCommand(stationId, command);
      
      expect(mockClient.publish).toHaveBeenCalledTimes(3);
      
      // Extract command IDs from the published messages
      const commandIds = mockClient.publish.mock.calls.map(call => {
        const messageData = JSON.parse(call[1]);
        return messageData.id;
      });
      
      // All IDs should be unique
      const uniqueIds = new Set(commandIds);
      expect(uniqueIds.size).toBe(3);
      
      // All IDs should match the expected format
      commandIds.forEach(id => {
        expect(id).toMatch(/^cmd_\d+_\w+$/);
      });
    });

    test('should include timestamp in every command', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'sensor_check';
      
      const beforeTime = new Date().toISOString();
      await mqttService.sendCommand(stationId, command);
      const afterTime = new Date().toISOString();
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      
      expect(messageData.timestamp).toBeDefined();
      expect(messageData.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(messageData.timestamp >= beforeTime).toBe(true);
      expect(messageData.timestamp <= afterTime).toBe(true);
    });
  });

  describe('isConnected', () => {
    test('should return true when client is connected', () => {
      mockClient.connected = true;
      
      const connected = mqttService.isConnected();
      
      expect(connected).toBe(true);
    });

    test('should return false when client is not connected', () => {
      mockClient.connected = false;
      
      const connected = mqttService.isConnected();
      
      expect(connected).toBe(false);
    });

    test('should return false when client is null', () => {
      mqttService.client = null;
      
      const connected = mqttService.isConnected();
      
      expect(connected).toBe(false);
    });
  });

  describe('publish', () => {
    test('should publish message when connected', () => {
      const topic = 'test/topic';
      const message = { test: 'data' };
      
      const result = mqttService.publish(topic, message);
      
      expect(result).toBe(true);
      expect(mockClient.publish).toHaveBeenCalledWith(
        topic,
        JSON.stringify(message)
      );
    });

    test('should fail to publish when not connected', () => {
      mockClient.connected = false;
      const topic = 'test/topic';
      const message = { test: 'data' };
      
      const result = mqttService.publish(topic, message);
      
      expect(result).toBe(false);
      expect(mockClient.publish).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'MQTT client not connected, cannot publish message'
      );
    });

    test('should fail to publish when client is null', () => {
      mqttService.client = null;
      const topic = 'test/topic';
      const message = { test: 'data' };
      
      const result = mqttService.publish(topic, message);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'MQTT client not connected, cannot publish message'
      );
    });
  });

  describe('Command Message Structure', () => {
    test('should create properly structured command messages', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'set_reading_interval';
      const parameters = { interval_ms: 300000 };
      
      await mqttService.sendCommand(stationId, command, parameters);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      
      // Verify message structure
      expect(messageData).toHaveProperty('command');
      expect(messageData).toHaveProperty('parameters');
      expect(messageData).toHaveProperty('timestamp');
      expect(messageData).toHaveProperty('id');
      
      // Verify message values
      expect(messageData.command).toBe(command);
      expect(messageData.parameters).toEqual(parameters);
      expect(typeof messageData.timestamp).toBe('string');
      expect(typeof messageData.id).toBe('string');
    });

    test('should handle commands without parameters', async () => {
      const stationId = 'ESP32_STATION_001';
      const command = 'wake_up';
      
      await mqttService.sendCommand(stationId, command);
      
      const publishCall = mockClient.publish.mock.calls[0];
      const messageData = JSON.parse(publishCall[1]);
      
      expect(messageData.command).toBe(command);
      expect(messageData.parameters).toBeNull();
    });

    test('should properly format topic for different station IDs', async () => {
      const stationIds = [
        'ESP32_STATION_001',
        'ESP32_STATION_002',
        'ARDUINO_UNO_001',
        'WEATHER_STATION_ALPHA'
      ];
      
      for (const stationId of stationIds) {
        mockClient.publish.mockClear();
        
        await mqttService.sendCommand(stationId, 'status');
        
        expect(mockClient.publish).toHaveBeenCalledWith(
          `weather/command/${stationId}`,
          expect.any(String)
        );
      }
    });
  });
});