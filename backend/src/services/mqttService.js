const mqtt = require('mqtt');
const logger = require('../config/logger');
const { writeWeatherData, flushWrites } = require('../config/influxdb');
const alertService = require('./alertService');

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
      // Validate timestamp - if it's not a valid ISO string or epoch timestamp, use server time
      let timestamp;
      if (data.timestamp) {
        // Check if timestamp is a valid ISO string or a reasonable epoch timestamp
        const parsedTime = new Date(data.timestamp);
        const isValidDate = !isNaN(parsedTime.getTime());
        const isReasonableTimestamp = typeof data.timestamp === 'string' && data.timestamp.includes('-');
        
        if (isValidDate && isReasonableTimestamp) {
          timestamp = data.timestamp;
        } else {
          // Invalid timestamp (likely millis() from Arduino), use server time
          timestamp = new Date().toISOString();
        }
      } else {
        timestamp = new Date().toISOString();
      }

      const weatherData = {
        timestamp,
        ...data
      };

      writeWeatherData(stationId, weatherData);
      await flushWrites();

      await alertService.checkAlerts(stationId, weatherData);

      logger.info(`Weather data stored for station ${stationId}`);
    } catch (error) {
      logger.error('Error handling weather data:', error);
    }
  }

  async handleStatusData(stationId, data) {
    try {
      // Validate timestamp - if it's not a valid ISO string or epoch timestamp, use server time
      let timestamp;
      if (data.timestamp) {
        // Check if timestamp is a valid ISO string or a reasonable epoch timestamp
        const parsedTime = new Date(data.timestamp);
        const isValidDate = !isNaN(parsedTime.getTime());
        const isReasonableTimestamp = typeof data.timestamp === 'string' && data.timestamp.includes('-');
        
        if (isValidDate && isReasonableTimestamp) {
          timestamp = data.timestamp;
        } else {
          // Invalid timestamp (likely millis() from Arduino), use server time
          timestamp = new Date().toISOString();
        }
      } else {
        timestamp = new Date().toISOString();
      }

      const statusData = {
        timestamp,
        battery_voltage: data.battery_voltage,
        signal_strength: data.signal_strength,
        uptime: data.uptime,
        status: data.status || 'online'
      };

      writeWeatherData(stationId, statusData);
      await flushWrites();

      logger.info(`Status data stored for station ${stationId}`);
    } catch (error) {
      logger.error('Error handling status data:', error);
    }
  }

  async handleAlertData(stationId, data) {
    try {
      await alertService.processAlert({
        station_id: stationId,
        ...data
      });

      logger.info(`Alert processed for station ${stationId}`);
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