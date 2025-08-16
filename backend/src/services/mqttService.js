const mqtt = require('mqtt');
const logger = require('../config/logger');
const { writeWeatherData, flushWrites } = require('../config/influxdb');
const alertService = require('./alertService');
const { validateMQTTData, sanitizeTimestamp } = require('../middleware/validation');
const { weatherDataSchema, statusDataSchema, alertDataSchema } = require('../schemas/weatherSchemas');

class MQTTService {
  constructor() {
    this.client = null;
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.topics = {
      weatherData: 'weather/data/+',
      status: 'weather/status/+',
      alerts: 'weather/alerts/+'
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `weather-api-${Date.now()}`,
        clean: true,
        connectTimeout: 4000,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 1000
      });

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.subscribeToTopics();
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error);
        reject(error);
      });

      this.client.on('message', this.handleMessage.bind(this));

      this.client.on('reconnect', () => {
        logger.info('Reconnecting to MQTT broker...');
      });

      this.client.on('offline', () => {
        logger.warn('MQTT client offline');
      });
    });
  }

  subscribeToTopics() {
    Object.values(this.topics).forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          logger.info(`Subscribed to ${topic}`);
        }
      });
    });
  }

  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      const stationId = this.extractStationId(topic);

      logger.debug(`Received message from ${topic}:`, data);

      if (topic.includes('weather/data/')) {
        await this.handleWeatherData(stationId, data);
      } else if (topic.includes('weather/status/')) {
        await this.handleStatusData(stationId, data);
      } else if (topic.includes('weather/alerts/')) {
        await this.handleAlertData(stationId, data);
      }

    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  }

  extractStationId(topic) {
    const parts = topic.split('/');
    return parts[parts.length - 1];
  }

  async handleWeatherData(stationId, data) {
    try {
      // Validar estructura de datos de sensores
      const validation = validateMQTTData(data, weatherDataSchema);
      
      if (!validation.isValid) {
        logger.error(`Invalid weather data from station ${stationId}:`, validation.errors);
        return; // Rechazar datos inválidos
      }

      // Sanitizar timestamp (convierte millis() de Arduino a timestamp real)
      const timestamp = sanitizeTimestamp(validation.data.timestamp);

      const weatherData = {
        timestamp,
        ...validation.data
      };

      writeWeatherData(stationId, weatherData);
      await flushWrites();

      await alertService.checkAlerts(stationId, weatherData);

      logger.info(`Valid weather data stored for station ${stationId}`, {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure
      });
    } catch (error) {
      logger.error('Error handling weather data:', error);
    }
  }

  async handleStatusData(stationId, data) {
    try {
      // Validar estructura de datos de estado
      const validation = validateMQTTData(data, statusDataSchema);
      
      if (!validation.isValid) {
        logger.error(`Invalid status data from station ${stationId}:`, validation.errors);
        return;
      }

      // Sanitizar timestamp
      const timestamp = sanitizeTimestamp(validation.data.timestamp);

      const statusData = {
        timestamp,
        ...validation.data
      };

      writeWeatherData(stationId, statusData);
      await flushWrites();

      logger.info(`Valid status data stored for station ${stationId}`, {
        status: statusData.status,
        battery_voltage: statusData.battery_voltage,
        signal_strength: statusData.signal_strength
      });
    } catch (error) {
      logger.error('Error handling status data:', error);
    }
  }

  async handleAlertData(stationId, data) {
    try {
      // Validar estructura de datos de alerta
      const validation = validateMQTTData(data, alertDataSchema);
      
      if (!validation.isValid) {
        logger.error(`Invalid alert data from station ${stationId}:`, validation.errors);
        return;
      }

      // Sanitizar timestamp
      const timestamp = sanitizeTimestamp(validation.data.timestamp);

      const alertData = {
        station_id: stationId,
        timestamp,
        ...validation.data
      };

      await alertService.processAlert(alertData);

      logger.info(`Valid alert processed for station ${stationId}`, {
        type: alertData.type,
        severity: alertData.severity,
        message: alertData.message
      });
    } catch (error) {
      logger.error('Error handling alert data:', error);
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(message));
    } else {
      logger.warn('MQTT client not connected, cannot publish message');
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = new MQTTService();