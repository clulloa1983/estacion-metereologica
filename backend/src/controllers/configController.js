const logger = require('../config/logger');
const mqttService = require('../services/mqttService');
const { validateConfigCommand } = require('../middleware/validation');

/**
 * Send remote configuration command to weather station
 */
const sendCommand = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { command, parameters } = req.body;

    logger.info(`Sending command "${command}" to station ${stationId}`, { parameters });

    // Send command via MQTT
    const success = await mqttService.sendCommand(stationId, command, parameters);

    if (success) {
      res.json({
        success: true,
        message: `Command "${command}" sent successfully to station ${stationId}`,
        command,
        parameters,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'MQTT service unavailable or command failed to send'
      });
    }
  } catch (error) {
    logger.error('Error sending configuration command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send configuration command'
    });
  }
};

/**
 * Get available configuration commands
 */
const getAvailableCommands = async (req, res) => {
  try {
    const commands = {
      basic: [
        {
          command: 'status',
          description: 'Get device status and sensor information',
          parameters: null
        },
        {
          command: 'restart',
          description: 'Restart the ESP32 device',
          parameters: null
        },
        {
          command: 'sensor_check',
          description: 'Verify all sensors functionality',
          parameters: null
        }
      ],
      measurement: [
        {
          command: 'set_reading_interval',
          description: 'Set interval between sensor readings (milliseconds)',
          parameters: {
            interval_ms: {
              type: 'number',
              min: 30000,
              max: 3600000,
              default: 60000,
              description: 'Interval in milliseconds (30s - 1h)'
            }
          }
        },
        {
          command: 'toggle_sensor',
          description: 'Enable or disable specific sensor',
          parameters: {
            sensor: {
              type: 'string',
              enum: ['dht22', 'bmp085', 'mh_rd', 'pluviometer', 'rain', 'mq7', 'mq135', 'dsm501a', 'bh1750'],
              description: 'Sensor identifier'
            },
            enabled: {
              type: 'boolean',
              description: 'Enable (true) or disable (false) sensor'
            }
          }
        },
        {
          command: 'set_calibration',
          description: 'Set calibration offset for sensor readings',
          parameters: {
            sensor: {
              type: 'string',
              enum: ['temperature', 'humidity', 'pressure', 'light'],
              description: 'Parameter to calibrate'
            },
            offset: {
              type: 'number',
              min: -50,
              max: 50,
              description: 'Calibration offset value'
            }
          }
        }
      ],
      alerts: [
        {
          command: 'set_alert_threshold',
          description: 'Configure alert thresholds for parameters',
          parameters: {
            parameter: {
              type: 'string',
              enum: ['temperature', 'humidity', 'pressure', 'co_level', 'air_quality'],
              description: 'Parameter to monitor'
            },
            min: {
              type: 'number',
              description: 'Minimum threshold (optional)'
            },
            max: {
              type: 'number',
              description: 'Maximum threshold (optional)'
            }
          }
        }
      ],
      power: [
        {
          command: 'sleep_mode',
          description: 'Enter deep sleep mode for power saving',
          parameters: {
            duration_ms: {
              type: 'number',
              min: 60000,
              max: 86400000,
              description: 'Sleep duration in milliseconds (1min - 24h)'
            }
          }
        },
        {
          command: 'wake_up',
          description: 'Wake up device from sleep mode',
          parameters: null
        }
      ],
      connectivity: [
        {
          command: 'wifi_config',
          description: 'Update WiFi credentials (use with caution)',
          parameters: {
            ssid: {
              type: 'string',
              maxLength: 32,
              description: 'WiFi network name'
            },
            password: {
              type: 'string',
              maxLength: 64,
              description: 'WiFi password'
            }
          }
        }
      ]
    };

    res.json({
      success: true,
      commands,
      total: Object.values(commands).reduce((acc, category) => acc + category.length, 0)
    });
  } catch (error) {
    logger.error('Error getting available commands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve available commands'
    });
  }
};

/**
 * Get configuration status for station
 */
const getConfigStatus = async (req, res) => {
  try {
    const { stationId } = req.params;

    // For now, return basic status info
    // In future, this could query device configuration from cache or database
    res.json({
      success: true,
      station_id: stationId,
      last_command_sent: null,
      mqtt_connected: mqttService.isConnected(),
      available_commands: 'Use /api/config/commands endpoint for command list',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting configuration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration status'
    });
  }
};

module.exports = {
  sendCommand,
  getAvailableCommands,
  getConfigStatus
};