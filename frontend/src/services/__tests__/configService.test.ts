import { configService, SensorConfig, AlertThreshold, PowerConfig, ConnectivityConfig } from '../configService';

// Mock fetch
global.fetch = jest.fn();

describe('ConfigService', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendCommand', () => {
    it('should send basic command successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Command sent successfully',
        command_id: 'cmd_123',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await configService.sendCommand('ESP32_STATION_001', 'status');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/config/command/ESP32_STATION_001',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'dev-device-key-12345'
          },
          body: JSON.stringify({
            command: 'status',
            station_id: 'ESP32_STATION_001'
          })
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should send command with parameters', async () => {
      const mockResponse = {
        success: true,
        message: 'Command sent successfully',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const parameters = { interval_ms: 300000 };
      await configService.sendCommand('ESP32_STATION_001', 'set_reading_interval', parameters);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/config/command/ESP32_STATION_001',
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_reading_interval',
            parameters,
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should throw error on HTTP failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        configService.sendCommand('ESP32_STATION_001', 'status')
      ).rejects.toThrow('Failed to send command: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        configService.sendCommand('ESP32_STATION_001', 'status')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Sensor configuration commands', () => {
    it('should set reading interval', async () => {
      const mockResponse = { success: true, message: 'Interval set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await configService.setReadingInterval('ESP32_STATION_001', 120000);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/command/ESP32_STATION_001'),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_reading_interval',
            parameters: { interval_ms: 120000 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should toggle sensor state', async () => {
      const mockResponse = { success: true, message: 'Sensor toggled', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.toggleSensor('ESP32_STATION_001', 'dht22', false);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'toggle_sensor',
            parameters: { sensor: 'dht22', enabled: false },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should set sensor calibration', async () => {
      const mockResponse = { success: true, message: 'Calibration set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.setSensorCalibration('ESP32_STATION_001', 'temperature', -2.5);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_calibration',
            parameters: { sensor: 'temperature', offset: -2.5 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });
  });

  describe('Alert configuration commands', () => {
    it('should set alert threshold with min and max', async () => {
      const mockResponse = { success: true, message: 'Threshold set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.setAlertThreshold('ESP32_STATION_001', 'temperature', 10, 35);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_alert_threshold',
            parameters: { parameter: 'temperature', min: 10, max: 35 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should set alert threshold with only max value', async () => {
      const mockResponse = { success: true, message: 'Threshold set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.setAlertThreshold('ESP32_STATION_001', 'humidity', undefined, 80);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_alert_threshold',
            parameters: { parameter: 'humidity', max: 80 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });
  });

  describe('Power management commands', () => {
    it('should set sleep mode with duration', async () => {
      const mockResponse = { success: true, message: 'Sleep mode set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.setSleepMode('ESP32_STATION_001', true, 3600000);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_sleep_mode',
            parameters: { enabled: true, duration_ms: 3600000 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should set WiFi power level', async () => {
      const mockResponse = { success: true, message: 'WiFi power set', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.setWifiPower('ESP32_STATION_001', 15);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'set_wifi_power',
            parameters: { power_level: 15 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });
  });

  describe('Connectivity configuration commands', () => {
    it('should configure WiFi credentials', async () => {
      const mockResponse = { success: true, message: 'WiFi configured', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.configureWifi('ESP32_STATION_001', 'NewNetwork', 'SecretPassword123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'wifi_config',
            parameters: { ssid: 'NewNetwork', password: 'SecretPassword123' },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should configure MQTT with authentication', async () => {
      const mockResponse = { success: true, message: 'MQTT configured', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.configureMqtt('ESP32_STATION_001', 'mqtt.example.com', 1883, 'user', 'pass');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'mqtt_config',
            parameters: { 
              server: 'mqtt.example.com', 
              port: 1883, 
              username: 'user', 
              password: 'pass' 
            },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should configure MQTT without authentication', async () => {
      const mockResponse = { success: true, message: 'MQTT configured', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.configureMqtt('ESP32_STATION_001', 'mqtt.example.com', 1883);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'mqtt_config',
            parameters: { server: 'mqtt.example.com', port: 1883 },
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });
  });

  describe('Device control commands', () => {
    it('should restart device', async () => {
      const mockResponse = { success: true, message: 'Device restarting', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.restartDevice('ESP32_STATION_001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'restart',
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should get device status', async () => {
      const mockResponse = { success: true, message: 'Status retrieved', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.getDeviceStatus('ESP32_STATION_001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'status',
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should perform sensor check', async () => {
      const mockResponse = { success: true, message: 'Sensor check completed', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.performSensorCheck('ESP32_STATION_001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'sensor_check',
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });

    it('should wake up device', async () => {
      const mockResponse = { success: true, message: 'Device waking up', timestamp: '2024-01-01T00:00:00Z' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await configService.wakeUpDevice('ESP32_STATION_001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'wake_up',
            station_id: 'ESP32_STATION_001'
          })
        })
      );
    });
  });

  describe('Validation methods', () => {
    describe('validateSensorConfig', () => {
      it('should pass valid sensor configuration', () => {
        const config: SensorConfig = {
          sensor: 'dht22',
          enabled: true,
          calibration_offset: 2.5,
          reading_interval: 60000
        };

        const errors = configService.validateSensorConfig(config);
        expect(errors).toHaveLength(0);
      });

      it('should fail for empty sensor name', () => {
        const config: SensorConfig = {
          sensor: '',
          enabled: true
        };

        const errors = configService.validateSensorConfig(config);
        expect(errors).toContain('Sensor name is required');
      });

      it('should fail for too short reading interval', () => {
        const config: SensorConfig = {
          sensor: 'dht22',
          enabled: true,
          reading_interval: 5000
        };

        const errors = configService.validateSensorConfig(config);
        expect(errors).toContain('Reading interval must be at least 10 seconds (10000ms)');
      });

      it('should fail for excessive calibration offset', () => {
        const config: SensorConfig = {
          sensor: 'dht22',
          enabled: true,
          calibration_offset: 150
        };

        const errors = configService.validateSensorConfig(config);
        expect(errors).toContain('Calibration offset must be between -100 and 100');
      });
    });

    describe('validateAlertThreshold', () => {
      it('should pass valid alert threshold', () => {
        const threshold: AlertThreshold = {
          parameter: 'temperature',
          min: 10,
          max: 35,
          enabled: true
        };

        const errors = configService.validateAlertThreshold(threshold);
        expect(errors).toHaveLength(0);
      });

      it('should fail for empty parameter name', () => {
        const threshold: AlertThreshold = {
          parameter: '',
          enabled: true
        };

        const errors = configService.validateAlertThreshold(threshold);
        expect(errors).toContain('Parameter name is required');
      });

      it('should fail when min >= max', () => {
        const threshold: AlertThreshold = {
          parameter: 'temperature',
          min: 35,
          max: 30,
          enabled: true
        };

        const errors = configService.validateAlertThreshold(threshold);
        expect(errors).toContain('Minimum value must be less than maximum value');
      });
    });

    describe('validatePowerConfig', () => {
      it('should pass valid power configuration', () => {
        const config: PowerConfig = {
          sleep_mode_enabled: true,
          sleep_duration: 3600000,
          transmission_interval: 300000,
          wifi_power_level: 15
        };

        const errors = configService.validatePowerConfig(config);
        expect(errors).toHaveLength(0);
      });

      it('should fail for too short sleep duration', () => {
        const config: PowerConfig = {
          sleep_mode_enabled: true,
          sleep_duration: 15000
        };

        const errors = configService.validatePowerConfig(config);
        expect(errors).toContain('Sleep duration must be at least 30 seconds (30000ms)');
      });

      it('should fail for too short transmission interval', () => {
        const config: PowerConfig = {
          sleep_mode_enabled: false,
          transmission_interval: 30000
        };

        const errors = configService.validatePowerConfig(config);
        expect(errors).toContain('Transmission interval must be at least 1 minute (60000ms)');
      });

      it('should fail for invalid WiFi power level', () => {
        const config: PowerConfig = {
          sleep_mode_enabled: false,
          wifi_power_level: 25
        };

        const errors = configService.validatePowerConfig(config);
        expect(errors).toContain('WiFi power level must be between 0 and 20 dBm');
      });
    });

    describe('validateConnectivityConfig', () => {
      it('should pass valid connectivity configuration', () => {
        const config: ConnectivityConfig = {
          wifi_ssid: 'MyNetwork',
          wifi_password: 'SecretPassword123',
          mqtt_server: 'mqtt.example.com',
          mqtt_port: 1883,
          mqtt_username: 'user',
          mqtt_password: 'pass'
        };

        const errors = configService.validateConnectivityConfig(config);
        expect(errors).toHaveLength(0);
      });

      it('should fail for too long WiFi SSID', () => {
        const config: ConnectivityConfig = {
          wifi_ssid: 'This is a very long WiFi SSID name that exceeds the maximum allowed length of 32 characters'
        };

        const errors = configService.validateConnectivityConfig(config);
        expect(errors).toContain('WiFi SSID must be 32 characters or less');
      });

      it('should fail for too short WiFi password', () => {
        const config: ConnectivityConfig = {
          wifi_password: '1234567'
        };

        const errors = configService.validateConnectivityConfig(config);
        expect(errors).toContain('WiFi password must be at least 8 characters');
      });

      it('should fail for invalid MQTT port', () => {
        const config: ConnectivityConfig = {
          mqtt_port: 70000
        };

        const errors = configService.validateConnectivityConfig(config);
        expect(errors).toContain('MQTT port must be between 1 and 65535');
      });
    });
  });
});