const { writeAlert } = require('../config/influxdb');
const logger = require('../config/logger');
const mlAlertService = require('./mlAlertService');

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
    this.socketService = null;
    this.mlEnabled = process.env.ML_ALERTS_ENABLED !== 'false'; // Activado por defecto
  }

  setSocketService(socketService) {
    this.socketService = socketService;
    logger.info('Socket service integrated with Alert service');
  }

  async checkAlerts(stationId, weatherData) {
    const allAlerts = [];
    
    // 1. Verificar alertas tradicionales (reglas estáticas)
    for (const rule of ALERT_RULES) {
      const value = weatherData[rule.parameter];
      
      if (value !== undefined && rule.condition(value)) {
        const alertKey = `${stationId}_${rule.parameter}_${rule.severity}`;
        
        if (!this.isAlertSuppressed(alertKey)) {
          const alert = await this.createAlert(stationId, rule, value);
          allAlerts.push(alert);
          this.setAlertSuppression(alertKey);
        }
      }
    }

    // 2. Verificar alertas ML (detección de anomalías) si está habilitado
    if (this.mlEnabled) {
      try {
        const mlAnomalies = await mlAlertService.detectAnomalies(stationId, weatherData);
        
        for (const anomaly of mlAnomalies) {
          const alertKey = `${stationId}_ml_${anomaly.sensor}_${anomaly.severity}`;
          
          if (!this.isAlertSuppressed(alertKey)) {
            const mlAlert = await this.createMLAlert(stationId, anomaly);
            allAlerts.push(mlAlert);
            this.setAlertSuppression(alertKey);
          }
        }
      } catch (error) {
        logger.error('Error processing ML alerts:', error);
      }
    }

    return allAlerts;
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
      
      // Broadcast alert to WebSocket clients
      if (this.socketService) {
        this.socketService.broadcastAlert(stationId, alert);
      }
      
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

  async createMLAlert(stationId, anomaly) {
    const alert = {
      station_id: stationId,
      alert_type: `ml_${anomaly.sensor}`,
      severity: anomaly.severity,
      message: anomaly.message,
      timestamp: anomaly.timestamp,
      acknowledged: false,
      value: anomaly.value,
      ml_data: {
        anomaly_type: anomaly.anomaly_type,
        confidence: anomaly.confidence,
        context: anomaly.context
      }
    };

    try {
      writeAlert(alert);
      logger.warn(`ML Alert created for station ${stationId}:`, alert);
      
      // Broadcast alert to WebSocket clients
      if (this.socketService) {
        this.socketService.broadcastAlert(stationId, alert);
      }
      
      return alert;
    } catch (error) {
      logger.error('Error creating ML alert:', error);
      throw error;
    }
  }

  async trainMLModel(stationId, timeRange = '7d') {
    if (!this.mlEnabled) {
      logger.info('ML alerts are disabled, skipping training');
      return { success: false, message: 'ML alerts disabled' };
    }

    try {
      logger.info(`Initiating ML model training for station ${stationId}`);
      const success = await mlAlertService.trainModels(stationId, timeRange);
      
      return {
        success,
        message: success 
          ? `ML models trained successfully for station ${stationId}` 
          : `Failed to train ML models for station ${stationId}`
      };
    } catch (error) {
      logger.error('Error training ML models:', error);
      return { success: false, message: error.message };
    }
  }

  getMLStatistics(stationId) {
    if (!this.mlEnabled) {
      return { ml_enabled: false };
    }

    return {
      ml_enabled: true,
      ...mlAlertService.getModelStatistics(stationId)
    };
  }

  resetMLModel(stationId) {
    if (this.mlEnabled) {
      mlAlertService.resetModels(stationId);
      logger.info(`ML models reset for station ${stationId}`);
    }
  }

  toggleMLAlerts(enabled) {
    this.mlEnabled = enabled;
    logger.info(`ML alerts ${enabled ? 'enabled' : 'disabled'}`);
  }

  getSeverityLevel(severity) {
    const levels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    return levels[severity] || 0;
  }
}

module.exports = new AlertService();