const { writeAlert } = require('../config/influxdb');
const logger = require('../config/logger');

const ALERT_RULES = [
  {
    parameter: 'temperature',
    condition: value => value > 40,
    severity: 'HIGH',
    message: 'Temperatura extrema detectada'
  },
  {
    parameter: 'temperature',
    condition: value => value < -10,
    severity: 'HIGH',
    message: 'Temperatura extremadamente baja'
  },
  {
    parameter: 'wind_speed',
    condition: value => value > 60,
    severity: 'CRITICAL',
    message: 'Vientos peligrosos detectados'
  },
  {
    parameter: 'humidity',
    condition: value => value > 95,
    severity: 'MEDIUM',
    message: 'Humedad extremadamente alta'
  },
  {
    parameter: 'pressure',
    condition: value => value < 950,
    severity: 'MEDIUM',
    message: 'Presión atmosférica muy baja'
  },
  {
    parameter: 'battery_voltage',
    condition: value => value < 11.5,
    severity: 'HIGH',
    message: 'Batería baja en estación meteorológica'
  },
  {
    parameter: 'pm25',
    condition: value => value > 150,
    severity: 'HIGH',
    message: 'Calidad del aire peligrosa (PM2.5 elevado)'
  }
];

class AlertService {
  constructor() {
    this.alertHistory = new Map();
    this.suppressionTime = 30 * 60 * 1000; // 30 minutos
  }

  async checkAlerts(stationId, weatherData) {
    for (const rule of ALERT_RULES) {
      const value = weatherData[rule.parameter];
      
      if (value !== undefined && rule.condition(value)) {
        const alertKey = `${stationId}_${rule.parameter}_${rule.severity}`;
        
        if (!this.isAlertSuppressed(alertKey)) {
          await this.createAlert(stationId, rule, value);
          this.setAlertSuppression(alertKey);
        }
      }
    }
  }

  isAlertSuppressed(alertKey) {
    const lastAlert = this.alertHistory.get(alertKey);
    if (!lastAlert) return false;
    
    return (Date.now() - lastAlert) < this.suppressionTime;
  }

  setAlertSuppression(alertKey) {
    this.alertHistory.set(alertKey, Date.now());
  }

  async createAlert(stationId, rule, value) {
    const alert = {
      station_id: stationId,
      alert_type: rule.parameter,
      severity: rule.severity,
      message: `${rule.message} (Valor: ${value})`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      value: value
    };

    try {
      writeAlert(alert);
      logger.warn(`Alert created for station ${stationId}:`, alert);
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async processAlert(alertData) {
    try {
      const alert = {
        station_id: alertData.station_id,
        alert_type: alertData.alert_type || 'custom',
        severity: alertData.severity || 'MEDIUM',
        message: alertData.message,
        timestamp: alertData.timestamp || new Date().toISOString(),
        acknowledged: alertData.acknowledged || false
      };

      writeAlert(alert);
      logger.info(`Custom alert processed for station ${alertData.station_id}`);
      
      return alert;
    } catch (error) {
      logger.error('Error processing alert:', error);
      throw error;
    }
  }

  getSeverityLevel(severity) {
    const levels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    return levels[severity] || 0;
  }
}

module.exports = new AlertService();