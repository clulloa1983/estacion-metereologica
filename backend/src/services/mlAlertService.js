const { Matrix } = require('ml-matrix');
const stats = require('simple-statistics');
const _ = require('lodash');
const logger = require('../config/logger');
const { queryInfluxDB } = require('../config/influxdb');

/**
 * Servicio de Alertas Inteligentes con Machine Learning
 * Implementa algoritmos de detección de anomalías para identificar patrones
 * inusuales en los datos de sensores meteorológicos
 */
class MLAlertService {
  constructor() {
    this.models = {
      isolationForest: null,
      rollingStats: new Map(),
      alertThresholds: new Map()
    };
    this.trainingData = [];
    this.isModelTrained = false;
    this.confidenceThreshold = 0.95;
    this.rollingWindowSize = 100; // Ventana de datos para estadísticas móviles
    this.minTrainingData = 50; // Mínimo de puntos para entrenar
    
    // Parámetros ML por sensor
    this.sensorConfigs = {
      temperature: { threshold: 0.93, windowSize: 50, alertWindow: 5 },
      humidity: { threshold: 0.95, windowSize: 75, alertWindow: 3 },
      pressure: { threshold: 0.90, windowSize: 60, alertWindow: 4 },
      wind_speed: { threshold: 0.92, windowSize: 40, alertWindow: 2 },
      pm25: { threshold: 0.97, windowSize: 30, alertWindow: 3 },
      co_level: { threshold: 0.98, windowSize: 25, alertWindow: 2 }
    };
    
    logger.info('ML Alert Service initialized with isolation forest and rolling statistics');
  }

  /**
   * Algoritmo de Isolation Forest simplificado para detección de anomalías
   * Basado en el principio de que las anomalías son más fáciles de aislar
   */
  isolationForest(data, numTrees = 10) {
    if (data.length < 4) { // Lower threshold for testing
      return { scores: [], threshold: 0 };
    }

    const scores = [];
    const avgPathLength = this.calculateAveragePathLength(data.length);

    for (let i = 0; i < data.length; i++) {
      let totalPathLength = 0;
      
      for (let tree = 0; tree < numTrees; tree++) {
        totalPathLength += this.isolationPath(data[i], data, 0, Math.log2(data.length));
      }
      
      const avgPath = totalPathLength / numTrees;
      const anomalyScore = Math.pow(2, -avgPath / avgPathLength);
      scores.push(anomalyScore);
    }

    const threshold = scores.length > 0 ? stats.quantile(scores, this.confidenceThreshold) : 0;
    return { scores, threshold };
  }

  /**
   * Calcula la profundidad de aislamiento para un punto de datos
   */
  isolationPath(point, dataset, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth || dataset.length <= 1) {
      return currentDepth + this.calculateAveragePathLength(dataset.length);
    }

    // Seleccionar aleatoriamente una característica para dividir
    const features = Object.keys(point).filter(key => typeof point[key] === 'number');
    if (features.length === 0) return currentDepth;

    const randomFeature = features[Math.floor(Math.random() * features.length)];
    const values = dataset.map(d => d[randomFeature]).filter(v => typeof v === 'number');
    
    if (values.length === 0) return currentDepth;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const splitValue = min + Math.random() * (max - min);

    const leftSplit = dataset.filter(d => d[randomFeature] < splitValue);
    const rightSplit = dataset.filter(d => d[randomFeature] >= splitValue);

    if (point[randomFeature] < splitValue) {
      return this.isolationPath(point, leftSplit, currentDepth + 1, maxDepth);
    } else {
      return this.isolationPath(point, rightSplit, currentDepth + 1, maxDepth);
    }
  }

  /**
   * Calcula la longitud promedio de camino para un conjunto de datos
   */
  calculateAveragePathLength(n) {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  /**
   * Estadísticas móviles para detección de tendencias anómalas
   */
  updateRollingStatistics(stationId, sensorData) {
    if (!this.models.rollingStats.has(stationId)) {
      this.models.rollingStats.set(stationId, {});
    }

    const stationStats = this.models.rollingStats.get(stationId);

    Object.keys(this.sensorConfigs).forEach(sensor => {
      if (sensorData[sensor] !== undefined) {
        if (!stationStats[sensor]) {
          stationStats[sensor] = {
            values: [],
            mean: 0,
            stdDev: 0,
            trend: 0,
            anomalyCount: 0,
            lastAnomalyTime: null
          };
        }

        const config = this.sensorConfigs[sensor];
        const sensorStats = stationStats[sensor];
        
        // Mantener ventana deslizante
        sensorStats.values.push({
          value: sensorData[sensor],
          timestamp: new Date()
        });

        if (sensorStats.values.length > config.windowSize) {
          sensorStats.values.shift();
        }

        // Calcular estadísticas
        const values = sensorStats.values.map(v => v.value);
        sensorStats.mean = stats.mean(values);
        sensorStats.stdDev = stats.standardDeviation(values);
        
        // Calcular tendencia (regresión lineal simple)
        if (values.length >= 10) {
          const indices = Array.from({length: values.length}, (_, i) => i);
          sensorStats.trend = stats.linearRegressionLine(stats.linearRegression(indices.map((x, i) => [x, values[i]])));
        }
      }
    });

    this.models.rollingStats.set(stationId, stationStats);
  }

  /**
   * Entrena los modelos ML con datos históricos de InfluxDB
   */
  async trainModels(stationId, timeRange = '7d') {
    try {
      logger.info(`Training ML models for station ${stationId} with ${timeRange} of historical data`);
      
      // Consulta de datos históricos
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -${timeRange})
          |> filter(fn: (r) => r._measurement == "weather")
          |> filter(fn: (r) => r.station_id == "${stationId}")
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;

      const result = await queryInfluxDB(query);
      
      if (result.length < this.minTrainingData) {
        logger.warn(`Insufficient training data: ${result.length} points. Need at least ${this.minTrainingData}`);
        return false;
      }

      this.trainingData = result.map(record => ({
        timestamp: new Date(record._time),
        temperature: record.temperature || 0,
        humidity: record.humidity || 0,
        pressure: record.pressure || 0,
        wind_speed: record.wind_speed || 0,
        pm25: record.pm25 || 0,
        co_level: record.co_level || 0
      }));

      // Entrenar modelo de isolation forest
      const isolationResult = this.isolationForest(this.trainingData);
      this.models.isolationForest = isolationResult;

      // Calcular thresholds adaptativos por sensor
      Object.keys(this.sensorConfigs).forEach(sensor => {
        const values = this.trainingData.map(d => d[sensor]).filter(v => v !== undefined && v !== 0);
        if (values.length > 10) {
          const mean = stats.mean(values);
          const stdDev = stats.standardDeviation(values);
          const q1 = stats.quantile(values, 0.25);
          const q3 = stats.quantile(values, 0.75);
          const iqr = q3 - q1;

          this.models.alertThresholds.set(`${stationId}_${sensor}`, {
            mean,
            stdDev,
            q1,
            q3,
            iqr,
            lowerBound: q1 - 1.5 * iqr,
            upperBound: q3 + 1.5 * iqr,
            extremeLowerBound: mean - 3 * stdDev,
            extremeUpperBound: mean + 3 * stdDev
          });
        }
      });

      this.isModelTrained = true;
      logger.info(`ML models trained successfully with ${this.trainingData.length} data points`);
      logger.info(`Isolation Forest threshold: ${isolationResult.threshold.toFixed(4)}`);
      
      return true;
    } catch (error) {
      logger.error('Error training ML models:', error);
      return false;
    }
  }

  /**
   * Detecta anomalías en tiempo real usando los modelos entrenados
   */
  async detectAnomalies(stationId, sensorData) {
    const anomalies = [];
    
    try {
      // Actualizar estadísticas móviles
      this.updateRollingStatistics(stationId, sensorData);
      
      if (!this.isModelTrained) {
        // Si no hay modelo entrenado, usar detección básica
        return this.basicAnomalyDetection(stationId, sensorData);
      }

      // Detección usando isolation forest
      const isolationScore = this.calculateIsolationScore(sensorData);
      const stationStats = this.models.rollingStats.get(stationId);

      Object.keys(this.sensorConfigs).forEach(sensor => {
        if (sensorData[sensor] !== undefined && stationStats && stationStats[sensor]) {
          const value = sensorData[sensor];
          const config = this.sensorConfigs[sensor];
          const sensorStats = stationStats[sensor];
          const thresholds = this.models.alertThresholds.get(`${stationId}_${sensor}`);

          let anomalyDetected = false;
          let anomalyType = '';
          let severity = 'LOW';
          let confidence = 0;

          // 1. Detección por isolation forest
          if (isolationScore > config.threshold) {
            anomalyDetected = true;
            anomalyType = 'isolation_forest';
            confidence = isolationScore;
            severity = isolationScore > 0.98 ? 'CRITICAL' : isolationScore > 0.96 ? 'HIGH' : 'MEDIUM';
          }

          // 2. Detección estadística (outliers)
          if (thresholds) {
            if (value < thresholds.extremeLowerBound || value > thresholds.extremeUpperBound) {
              anomalyDetected = true;
              anomalyType = anomalyType ? `${anomalyType}, statistical_extreme` : 'statistical_extreme';
              severity = 'CRITICAL';
              confidence = Math.max(confidence, 0.99);
            } else if (value < thresholds.lowerBound || value > thresholds.upperBound) {
              anomalyDetected = true;
              anomalyType = anomalyType ? `${anomalyType}, statistical_outlier` : 'statistical_outlier';
              severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
              confidence = Math.max(confidence, 0.95);
            }
          }

          // 3. Detección por Z-score dinámico
          if (sensorStats.stdDev > 0) {
            const zScore = Math.abs((value - sensorStats.mean) / sensorStats.stdDev);
            if (zScore > 3) {
              anomalyDetected = true;
              anomalyType = anomalyType ? `${anomalyType}, z_score` : 'z_score';
              severity = zScore > 4 ? 'CRITICAL' : 'HIGH';
              confidence = Math.max(confidence, Math.min(0.98, 0.8 + zScore * 0.05));
            }
          }

          // 4. Detección de tendencias anómalas
          if (sensorStats.values.length >= config.alertWindow) {
            const recentValues = sensorStats.values.slice(-config.alertWindow).map(v => v.value);
            const recentTrend = this.calculateTrend(recentValues);
            const trendThreshold = sensorStats.stdDev * 2; // Umbral basado en desviación estándar

            if (Math.abs(recentTrend) > trendThreshold) {
              anomalyDetected = true;
              anomalyType = anomalyType ? `${anomalyType}, trend_anomaly` : 'trend_anomaly';
              severity = severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
              confidence = Math.max(confidence, 0.90);
            }
          }

          if (anomalyDetected) {
            anomalies.push({
              station_id: stationId,
              sensor,
              value,
              anomaly_type: anomalyType,
              severity,
              confidence: confidence.toFixed(4),
              message: this.generateAnomalyMessage(sensor, value, anomalyType, severity),
              timestamp: new Date().toISOString(),
              context: {
                mean: sensorStats.mean?.toFixed(2),
                stdDev: sensorStats.stdDev?.toFixed(2),
                trend: sensorStats.trend?.toFixed(4),
                isolation_score: isolationScore.toFixed(4)
              }
            });

            // Actualizar contador de anomalías
            sensorStats.anomalyCount++;
            sensorStats.lastAnomalyTime = new Date();
          }
        }
      });

      if (anomalies.length > 0) {
        logger.info(`ML Anomalies detected for station ${stationId}:`, anomalies);
      }

      return anomalies;
    } catch (error) {
      logger.error('Error detecting ML anomalies:', error);
      return [];
    }
  }

  /**
   * Calcula el score de isolation forest para un punto de datos
   */
  calculateIsolationScore(sensorData) {
    if (!this.models.isolationForest || this.trainingData.length === 0) {
      return 0;
    }

    try {
      const avgPathLength = this.calculateAveragePathLength(this.trainingData.length);
      const pathLength = this.isolationPath(sensorData, this.trainingData, 0, Math.log2(this.trainingData.length));
      return Math.pow(2, -pathLength / avgPathLength);
    } catch (error) {
      logger.error('Error calculating isolation score:', error);
      return 0;
    }
  }

  /**
   * Detección básica de anomalías cuando no hay modelo entrenado
   */
  basicAnomalyDetection(stationId, sensorData) {
    const anomalies = [];
    const stationStats = this.models.rollingStats.get(stationId);

    if (!stationStats) return anomalies;

    Object.keys(this.sensorConfigs).forEach(sensor => {
      if (sensorData[sensor] !== undefined && stationStats[sensor]) {
        const value = sensorData[sensor];
        const sensorStats = stationStats[sensor];

        if (sensorStats.values.length >= 20 && sensorStats.stdDev > 0) {
          const zScore = Math.abs((value - sensorStats.mean) / sensorStats.stdDev);
          
          if (zScore > 2.5) {
            anomalies.push({
              station_id: stationId,
              sensor,
              value,
              anomaly_type: 'basic_statistical',
              severity: zScore > 3.5 ? 'HIGH' : 'MEDIUM',
              confidence: Math.min(0.95, 0.7 + zScore * 0.1).toFixed(4),
              message: `${sensor.toUpperCase()}: Valor anómalo detectado (${value})`,
              timestamp: new Date().toISOString(),
              context: {
                z_score: zScore.toFixed(2),
                mean: sensorStats.mean.toFixed(2),
                stdDev: sensorStats.stdDev.toFixed(2)
              }
            });
          }
        }
      }
    });

    return anomalies;
  }

  /**
   * Calcula la tendencia de una serie de valores
   */
  calculateTrend(values) {
    if (values.length < 3) return 0;
    
    const n = values.length;
    const indices = Array.from({length: n}, (_, i) => i);
    
    try {
      const regression = stats.linearRegression(indices.map((x, i) => [x, values[i]]));
      return regression.m; // Pendiente de la regresión lineal
    } catch (error) {
      return 0;
    }
  }

  /**
   * Genera mensaje descriptivo para la anomalía detectada
   */
  generateAnomalyMessage(sensor, value, anomalyType, severity) {
    const sensorNames = {
      temperature: 'temperatura',
      humidity: 'humedad', 
      pressure: 'presión',
      wind_speed: 'velocidad del viento',
      pm25: 'partículas PM2.5',
      co_level: 'monóxido de carbono'
    };

    const typeDescriptions = {
      isolation_forest: 'patrón inusual',
      statistical_extreme: 'valor extremo',
      statistical_outlier: 'valor atípico',
      z_score: 'desviación significativa',
      trend_anomaly: 'tendencia anómala',
      basic_statistical: 'anomalía estadística'
    };

    const sensorName = sensorNames[sensor] || sensor;
    const types = anomalyType.split(', ').map(t => typeDescriptions[t] || t).join(' y ');
    
    const severityTexts = {
      LOW: 'Anomalía menor',
      MEDIUM: 'Anomalía moderada',
      HIGH: 'Anomalía significativa',
      CRITICAL: 'Anomalía crítica'
    };

    return `${severityTexts[severity]} en ${sensorName}: ${types} detectado (Valor: ${value})`;
  }

  /**
   * Obtiene estadísticas de rendimiento del modelo ML
   */
  getModelStatistics(stationId) {
    const stats = {
      is_trained: this.isModelTrained,
      training_data_points: this.trainingData.length,
      confidence_threshold: this.confidenceThreshold,
      rolling_window_size: this.rollingWindowSize,
      sensors_monitored: Object.keys(this.sensorConfigs)
    };

    const stationStats = this.models.rollingStats.get(stationId);
    if (stationStats) {
      stats.station_statistics = {};
      Object.keys(stationStats).forEach(sensor => {
        const sensorStats = stationStats[sensor];
        stats.station_statistics[sensor] = {
          data_points: sensorStats.values.length,
          anomaly_count: sensorStats.anomalyCount,
          last_anomaly: sensorStats.lastAnomalyTime,
          current_mean: sensorStats.mean?.toFixed(2),
          current_stddev: sensorStats.stdDev?.toFixed(2)
        };
      });
    }

    return stats;
  }

  /**
   * Reinicia los modelos y estadísticas para una estación específica
   */
  resetModels(stationId) {
    this.models.rollingStats.delete(stationId);
    
    // Limpiar thresholds específicos de la estación
    const stationKeys = Array.from(this.models.alertThresholds.keys())
      .filter(key => key.startsWith(`${stationId}_`));
    
    stationKeys.forEach(key => {
      this.models.alertThresholds.delete(key);
    });

    logger.info(`ML models reset for station ${stationId}`);
  }
}

module.exports = new MLAlertService();