const alertService = require('../services/alertService');
const logger = require('../config/logger');

/**
 * Controlador para endpoints de Alertas Inteligentes con Machine Learning
 */
class MLAlertsController {
  /**
   * Entrena los modelos ML para una estación específica
   * POST /api/ml-alerts/train/:stationId
   */
  async trainModel(req, res) {
    try {
      const { stationId } = req.params;
      const { timeRange = '7d' } = req.body;

      logger.info(`Training ML model request for station ${stationId} with time range ${timeRange}`);

      // Validar timeRange
      const validRanges = ['1d', '3d', '7d', '14d', '30d'];
      if (!validRanges.includes(timeRange)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time range. Allowed values: 1d, 3d, 7d, 14d, 30d'
        });
      }

      const result = await alertService.trainMLModel(stationId, timeRange);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      logger.error('Error in trainModel endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while training ML model'
      });
    }
  }

  /**
   * Obtiene estadísticas de rendimiento de los modelos ML
   * GET /api/ml-alerts/statistics/:stationId
   */
  async getStatistics(req, res) {
    try {
      const { stationId } = req.params;

      logger.info(`ML statistics request for station ${stationId}`);

      const statistics = alertService.getMLStatistics(stationId);
      
      res.json({
        success: true,
        station_id: stationId,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getStatistics endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving ML statistics'
      });
    }
  }

  /**
   * Reinicia los modelos ML para una estación específica
   * POST /api/ml-alerts/reset/:stationId
   */
  async resetModel(req, res) {
    try {
      const { stationId } = req.params;

      logger.info(`ML model reset request for station ${stationId}`);

      alertService.resetMLModel(stationId);
      
      res.json({
        success: true,
        message: `ML models reset successfully for station ${stationId}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in resetModel endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while resetting ML model'
      });
    }
  }

  /**
   * Configura el estado de las alertas ML (habilitar/deshabilitar)
   * PUT /api/ml-alerts/toggle
   */
  async toggleMLAlerts(req, res) {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected: { enabled: boolean }'
        });
      }

      alertService.toggleMLAlerts(enabled);

      logger.info(`ML alerts toggled to ${enabled ? 'enabled' : 'disabled'}`);
      
      res.json({
        success: true,
        message: `ML alerts ${enabled ? 'enabled' : 'disabled'} successfully`,
        ml_enabled: enabled,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in toggleMLAlerts endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while toggling ML alerts'
      });
    }
  }

  /**
   * Obtiene la configuración actual de alertas ML
   * GET /api/ml-alerts/config
   */
  async getConfig(req, res) {
    try {
      const config = {
        ml_enabled: alertService.mlEnabled,
        suppression_time: alertService.suppressionTime / 1000 / 60, // en minutos
        supported_sensors: [
          'temperature',
          'humidity', 
          'pressure',
          'wind_speed',
          'pm25',
          'co_level'
        ],
        algorithm_types: [
          'isolation_forest',
          'statistical_outlier',
          'z_score',
          'trend_anomaly'
        ],
        severity_levels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        time_ranges: ['1d', '3d', '7d', '14d', '30d']
      };

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getConfig endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving ML config'
      });
    }
  }

  /**
   * Obtiene alertas ML recientes para análisis
   * GET /api/ml-alerts/recent/:stationId?limit=20&severity=HIGH
   */
  async getRecentMLAlerts(req, res) {
    try {
      const { stationId } = req.params;
      const { limit = 20, severity, sensor } = req.query;

      const limitInt = parseInt(limit, 10);
      if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 100'
        });
      }

      // Construir filtros para la consulta
      let filters = [`r.station_id == "${stationId}"`];
      filters.push('r._measurement == "alerts"');
      
      if (severity) {
        const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (!validSeverities.includes(severity)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid severity. Allowed values: LOW, MEDIUM, HIGH, CRITICAL'
          });
        }
        filters.push(`r.severity == "${severity}"`);
      }

      if (sensor) {
        filters.push(`contains(value: "${sensor}", set: r.alert_type)`);
      }

      // Filtrar solo alertas ML
      filters.push('contains(value: "ml_", set: r.alert_type)');

      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -7d)
          |> filter(fn: (r) => ${filters.join(' and ')})
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: ${limitInt})
      `;

      const { queryInfluxDB } = require('../config/influxdb');
      const results = await queryInfluxDB(query);

      res.json({
        success: true,
        station_id: stationId,
        count: results.length,
        data: results.map(alert => ({
          timestamp: alert._time,
          alert_type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          acknowledged: alert.acknowledged,
          value: alert.value,
          ml_data: alert.ml_data ? JSON.parse(alert.ml_data) : null
        })),
        filters_applied: { severity, sensor, limit: limitInt },
        query_timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getRecentMLAlerts endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving recent ML alerts'
      });
    }
  }

  /**
   * Obtiene métricas de rendimiento de detección ML
   * GET /api/ml-alerts/metrics/:stationId
   */
  async getMLMetrics(req, res) {
    try {
      const { stationId } = req.params;
      const { timeRange = '24h' } = req.query;

      const validRanges = ['1h', '6h', '12h', '24h', '7d', '30d'];
      if (!validRanges.includes(timeRange)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time range. Allowed values: 1h, 6h, 12h, 24h, 7d, 30d'
        });
      }

      // Obtener estadísticas de alertas ML
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -${timeRange})
          |> filter(fn: (r) => r._measurement == "alerts")
          |> filter(fn: (r) => r.station_id == "${stationId}")
          |> filter(fn: (r) => contains(value: "ml_", set: r.alert_type))
          |> group(columns: ["severity"])
          |> count(column: "_time")
      `;

      const { queryInfluxDB } = require('../config/influxdb');
      const results = await queryInfluxDB(query);

      // Procesar resultados para métricas
      const metrics = {
        total_ml_alerts: 0,
        alerts_by_severity: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0
        },
        time_range: timeRange,
        station_id: stationId
      };

      results.forEach(result => {
        const severity = result.severity || 'UNKNOWN';
        const count = result._value || 0;
        
        if (metrics.alerts_by_severity.hasOwnProperty(severity)) {
          metrics.alerts_by_severity[severity] = count;
        }
        metrics.total_ml_alerts += count;
      });

      // Agregar estadísticas del modelo
      const modelStats = alertService.getMLStatistics(stationId);
      metrics.model_statistics = modelStats;

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getMLMetrics endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving ML metrics'
      });
    }
  }
}

module.exports = new MLAlertsController();