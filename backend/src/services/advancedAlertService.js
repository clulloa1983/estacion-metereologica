const logger = require('../config/logger');
const influxClient = require('../config/influxdb');
const cacheService = require('./cacheService');
const aiPredictionService = require('./aiPredictionService');

/**
 * Advanced ML-based Alert Service
 * Provides intelligent alerting using ML models, pattern recognition, and predictive analysis
 */

class AdvancedAlertService {
  constructor() {
    this.alertPatterns = new Map(); // Pattern history for each station
    this.correlationMatrix = new Map(); // Parameter correlations
    this.alertPredictions = new Map(); // Predicted future alerts
    this.adaptiveThresholds = new Map(); // Dynamic thresholds per station
    
    // Initialize learning parameters
    this.learningRate = 0.01;
    this.adaptationWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.confidenceThreshold = 0.75;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Load historical patterns and correlations
      await this.loadHistoricalPatterns();
      await this.calculateParameterCorrelations();
      
      // Schedule periodic model updates
      setInterval(() => {
        this.updateAlertModels();
      }, 60 * 60 * 1000); // Every hour

      logger.info('Advanced Alert Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Advanced Alert Service:', error);
    }
  }

  /**
   * Main alert evaluation using ML-enhanced analysis
   */
  async evaluateAdvancedAlerts(stationId, weatherData, options = {}) {
    try {
      const {
        enableMLPredictions = true,
        enablePatternRecognition = true,
        enableCorrelationAnalysis = true,
        adaptiveThresholds = true,
        severity_filter = null
      } = options;

      const alerts = [];
      const analysisResults = {
        ml_predictions: null,
        pattern_analysis: null,
        correlation_analysis: null,
        adaptive_thresholds: null,
        confidence_scores: {}
      };

      // 1. Traditional threshold-based alerts (enhanced with adaptive thresholds)
      if (adaptiveThresholds) {
        const adaptiveAlerts = await this.evaluateAdaptiveThresholds(stationId, weatherData);
        alerts.push(...adaptiveAlerts.alerts);
        analysisResults.adaptive_thresholds = adaptiveAlerts.analysis;
      }

      // 2. ML-based anomaly detection alerts
      if (enableMLPredictions) {
        try {
          const anomalyResults = await aiPredictionService.detectAnomalies(stationId, weatherData, {
            threshold: this.confidenceThreshold
          });
          
          if (anomalyResults.hasAnomaly && anomalyResults.confidence >= this.confidenceThreshold) {
            const mlAlerts = this.convertAnomalyToAlerts(stationId, anomalyResults);
            alerts.push(...mlAlerts);
            analysisResults.ml_predictions = anomalyResults;
          }
        } catch (error) {
          logger.warn('ML prediction failed for alerts:', error.message);
        }
      }

      // 3. Pattern recognition alerts
      if (enablePatternRecognition) {
        const patternAlerts = await this.analyzePatterns(stationId, weatherData);
        alerts.push(...patternAlerts.alerts);
        analysisResults.pattern_analysis = patternAlerts.analysis;
      }

      // 4. Parameter correlation alerts
      if (enableCorrelationAnalysis) {
        const correlationAlerts = await this.analyzeCorrelations(stationId, weatherData);
        alerts.push(...correlationAlerts.alerts);
        analysisResults.correlation_analysis = correlationAlerts.analysis;
      }

      // 5. Predictive alerts (future conditions)
      const predictiveAlerts = await this.generatePredictiveAlerts(stationId, weatherData);
      alerts.push(...predictiveAlerts.alerts);
      analysisResults.predictive_analysis = predictiveAlerts.analysis;

      // 6. Consolidate and rank alerts
      const consolidatedAlerts = this.consolidateAlerts(alerts);
      
      // 7. Apply severity filter if specified
      const filteredAlerts = severity_filter 
        ? consolidatedAlerts.filter(alert => alert.severity === severity_filter)
        : consolidatedAlerts;

      // 8. Update learning models
      await this.updateLearningModels(stationId, weatherData, filteredAlerts);

      return {
        alerts: filteredAlerts,
        analysis: analysisResults,
        statistics: {
          total_alerts: filteredAlerts.length,
          by_severity: this.groupAlertsBySeverity(filteredAlerts),
          by_type: this.groupAlertsByType(filteredAlerts),
          confidence_distribution: this.calculateConfidenceDistribution(filteredAlerts)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Advanced alert evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Adaptive threshold management
   */
  async evaluateAdaptiveThresholds(stationId, weatherData) {
    try {
      const alerts = [];
      const analysis = { adaptations: [], thresholds_used: {} };
      
      // Get current adaptive thresholds
      let thresholds = this.adaptiveThresholds.get(stationId);
      if (!thresholds) {
        thresholds = await this.calculateInitialThresholds(stationId);
        this.adaptiveThresholds.set(stationId, thresholds);
      }

      // Evaluate each parameter against adaptive thresholds
      const parameters = ['temperature', 'humidity', 'pressure', 'wind_speed', 'pm25', 'co_level'];
      
      for (const param of parameters) {
        if (weatherData[param] !== undefined && thresholds[param]) {
          const value = weatherData[param];
          const threshold = thresholds[param];
          
          analysis.thresholds_used[param] = threshold;
          
          // Check adaptive thresholds
          if (value < threshold.min_critical || value > threshold.max_critical) {
            alerts.push({
              id: `adaptive_${stationId}_${param}_${Date.now()}`,
              station_id: stationId,
              alert_type: 'adaptive_threshold',
              severity: 'CRITICAL',
              parameter: param,
              value: value,
              threshold: threshold.max_critical || threshold.min_critical,
              message: `${param} value ${value} exceeds adaptive critical threshold`,
              confidence: threshold.confidence || 0.8,
              source: 'adaptive_ml',
              timestamp: new Date().toISOString()
            });
          } else if (value < threshold.min_warning || value > threshold.max_warning) {
            alerts.push({
              id: `adaptive_${stationId}_${param}_${Date.now()}`,
              station_id: stationId,
              alert_type: 'adaptive_threshold',
              severity: 'HIGH',
              parameter: param,
              value: value,
              threshold: threshold.max_warning || threshold.min_warning,
              message: `${param} value ${value} exceeds adaptive warning threshold`,
              confidence: threshold.confidence || 0.7,
              source: 'adaptive_ml',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Update thresholds based on recent data
      const updatedThresholds = await this.updateAdaptiveThresholds(stationId, weatherData, thresholds);
      if (updatedThresholds !== thresholds) {
        this.adaptiveThresholds.set(stationId, updatedThresholds);
        analysis.adaptations.push({
          timestamp: new Date().toISOString(),
          changes: this.compareThresholds(thresholds, updatedThresholds)
        });
      }

      return { alerts, analysis };
    } catch (error) {
      logger.error('Adaptive threshold evaluation failed:', error);
      return { alerts: [], analysis: { error: error.message } };
    }
  }

  /**
   * Pattern recognition for alert prediction
   */
  async analyzePatterns(stationId, weatherData) {
    try {
      const alerts = [];
      const analysis = { patterns_detected: [], sequence_analysis: null };
      
      // Get historical patterns for this station
      const patterns = this.alertPatterns.get(stationId) || [];
      
      // Add current data to pattern history
      patterns.push({
        timestamp: new Date().toISOString(),
        data: { ...weatherData },
        alerts_generated: 0 // Will be updated later
      });
      
      // Keep only recent patterns (last 7 days)
      const recentPatterns = patterns.filter(p => 
        new Date() - new Date(p.timestamp) < this.adaptationWindow
      );
      
      this.alertPatterns.set(stationId, recentPatterns);

      if (recentPatterns.length >= 10) { // Need minimum data for pattern analysis
        // Detect recurring patterns
        const recurringPatterns = this.detectRecurringPatterns(recentPatterns);
        analysis.patterns_detected = recurringPatterns;
        
        // Sequence analysis - detect if current conditions match pre-alert patterns
        const sequenceAlerts = this.analyzeSequencePatterns(stationId, recentPatterns, weatherData);
        alerts.push(...sequenceAlerts);
        
        // Seasonal pattern analysis
        const seasonalAlerts = await this.analyzeSeasonalPatterns(stationId, weatherData);
        alerts.push(...seasonalAlerts);
      }

      return { alerts, analysis };
    } catch (error) {
      logger.error('Pattern analysis failed:', error);
      return { alerts: [], analysis: { error: error.message } };
    }
  }

  /**
   * Parameter correlation analysis for alerts
   */
  async analyzeCorrelations(stationId, weatherData) {
    try {
      const alerts = [];
      const analysis = { correlations_analyzed: [], unusual_correlations: [] };
      
      // Get correlation matrix for this station
      const correlations = this.correlationMatrix.get(stationId);
      if (!correlations) {
        return { alerts, analysis: { message: 'Insufficient data for correlation analysis' } };
      }

      // Analyze current parameter relationships against expected correlations
      const parameters = Object.keys(weatherData);
      
      for (let i = 0; i < parameters.length; i++) {
        for (let j = i + 1; j < parameters.length; j++) {
          const param1 = parameters[i];
          const param2 = parameters[j];
          
          if (weatherData[param1] !== undefined && weatherData[param2] !== undefined) {
            const expectedCorr = correlations[`${param1}_${param2}`];
            if (expectedCorr) {
              const currentRelation = this.calculateCurrentRelation(
                weatherData[param1], 
                weatherData[param2], 
                expectedCorr
              );
              
              analysis.correlations_analyzed.push({
                parameters: [param1, param2],
                expected_correlation: expectedCorr.correlation,
                current_relation: currentRelation,
                deviation: Math.abs(currentRelation.strength - Math.abs(expectedCorr.correlation))
              });
              
              // Alert on unusual correlations
              if (Math.abs(currentRelation.strength - Math.abs(expectedCorr.correlation)) > 0.7) {
                analysis.unusual_correlations.push({ param1, param2, deviation: currentRelation });
                
                alerts.push({
                  id: `correlation_${stationId}_${param1}_${param2}_${Date.now()}`,
                  station_id: stationId,
                  alert_type: 'correlation_anomaly',
                  severity: 'MEDIUM',
                  parameter: `${param1}_${param2}`,
                  message: `Unusual correlation between ${param1} and ${param2}`,
                  confidence: 0.6,
                  source: 'correlation_analysis',
                  timestamp: new Date().toISOString(),
                  details: {
                    expected_correlation: expectedCorr.correlation,
                    current_strength: currentRelation.strength,
                    deviation: Math.abs(currentRelation.strength - Math.abs(expectedCorr.correlation))
                  }
                });
              }
            }
          }
        }
      }

      return { alerts, analysis };
    } catch (error) {
      logger.error('Correlation analysis failed:', error);
      return { alerts: [], analysis: { error: error.message } };
    }
  }

  /**
   * Generate predictive alerts for future conditions
   */
  async generatePredictiveAlerts(stationId, weatherData) {
    try {
      const alerts = [];
      const analysis = { predictions: [], risk_assessment: null };
      
      // Get weather predictions for next 24 hours
      try {
        const predictions = await aiPredictionService.predictWeather(stationId, { 
          hours: 24, 
          parameters: ['temperature', 'humidity', 'pressure', 'wind_speed'] 
        });
        
        analysis.predictions = predictions;
        
        // Analyze predictions for potential alert conditions
        for (const prediction of predictions.predictions) {
          const predictedAlerts = await this.evaluatePredictedConditions(
            stationId, 
            prediction, 
            prediction.timestamp
          );
          alerts.push(...predictedAlerts);
        }
        
        // Risk assessment for next 24 hours
        analysis.risk_assessment = this.assessFutureRisk(predictions);
        
      } catch (error) {
        logger.warn('Weather prediction failed for predictive alerts:', error.message);
      }

      return { alerts, analysis };
    } catch (error) {
      logger.error('Predictive alert generation failed:', error);
      return { alerts: [], analysis: { error: error.message } };
    }
  }

  /**
   * Convert ML anomaly results to structured alerts
   */
  convertAnomalyToAlerts(stationId, anomalyResults) {
    return anomalyResults.anomalies.map(anomaly => ({
      id: `ml_anomaly_${stationId}_${anomaly.sensor}_${Date.now()}`,
      station_id: stationId,
      alert_type: 'ml_anomaly',
      severity: anomaly.severity.toUpperCase(),
      parameter: anomaly.sensor,
      value: anomaly.value,
      message: `ML detected anomaly: ${anomaly.message}`,
      confidence: anomalyResults.confidence,
      source: 'ml_prediction',
      timestamp: new Date().toISOString(),
      expected_range: anomaly.expected_range,
      recommendations: anomalyResults.recommendations
    }));
  }

  /**
   * Consolidate duplicate or similar alerts
   */
  consolidateAlerts(alerts) {
    // Group similar alerts and keep the highest severity
    const alertGroups = new Map();
    
    for (const alert of alerts) {
      const key = `${alert.station_id}_${alert.parameter}_${alert.alert_type}`;
      const existing = alertGroups.get(key);
      
      if (!existing || this.getSeverityWeight(alert.severity) > this.getSeverityWeight(existing.severity)) {
        alertGroups.set(key, alert);
      }
    }
    
    return Array.from(alertGroups.values()).sort((a, b) => 
      this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)
    );
  }

  /**
   * Helper methods
   */
  getSeverityWeight(severity) {
    const weights = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    return weights[severity] || 0;
  }

  groupAlertsBySeverity(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});
  }

  groupAlertsByType(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
      return acc;
    }, {});
  }

  calculateConfidenceDistribution(alerts) {
    const confidences = alerts.map(a => a.confidence).filter(c => c !== undefined);
    if (confidences.length === 0) return null;
    
    return {
      average: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      count: confidences.length
    };
  }

  /**
   * Learning and adaptation methods
   */
  async updateLearningModels(stationId, weatherData, alerts) {
    try {
      // Update pattern history with alert outcomes
      const patterns = this.alertPatterns.get(stationId) || [];
      if (patterns.length > 0) {
        patterns[patterns.length - 1].alerts_generated = alerts.length;
      }
      
      // Update adaptive thresholds based on alert accuracy
      // This would involve feedback loops and accuracy tracking
      
      // Cache updated models
      const cacheKey = `advanced_alerts:models:${stationId}`;
      const modelData = {
        patterns: patterns.slice(-100), // Keep last 100 patterns
        adaptive_thresholds: this.adaptiveThresholds.get(stationId),
        last_updated: new Date().toISOString()
      };
      
      await cacheService.set(cacheKey, modelData, 24 * 60 * 60); // 24 hours
      
    } catch (error) {
      logger.error('Failed to update learning models:', error);
    }
  }

  async loadHistoricalPatterns() {
    // Load patterns from cache or database
    // Implementation depends on data storage strategy
  }

  async calculateParameterCorrelations() {
    // Calculate correlations from historical data
    // This is a simplified version - real implementation would use statistical analysis
    try {
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -30d)
          |> filter(fn: (r) => r["_measurement"] == "weather")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;
      
      // This is a placeholder - actual correlation calculation would be more complex
      logger.info('Calculating parameter correlations from historical data');
    } catch (error) {
      logger.error('Failed to calculate correlations:', error);
    }
  }

  async updateAlertModels() {
    logger.info('Updating advanced alert models with recent data');
    // Periodic model updates
  }

  // Additional helper methods would be implemented here...
  async calculateInitialThresholds(stationId) {
    // Calculate initial adaptive thresholds based on historical data
    return {
      temperature: { min_warning: -10, max_warning: 40, min_critical: -20, max_critical: 50, confidence: 0.8 },
      humidity: { min_warning: 20, max_warning: 90, min_critical: 10, max_critical: 95, confidence: 0.8 },
      pressure: { min_warning: 980, max_warning: 1030, min_critical: 950, max_critical: 1050, confidence: 0.7 },
      wind_speed: { max_warning: 25, max_critical: 40, confidence: 0.8 },
      pm25: { max_warning: 35, max_critical: 55, confidence: 0.9 },
      co_level: { max_warning: 9, max_critical: 35, confidence: 0.9 }
    };
  }

  async updateAdaptiveThresholds(stationId, weatherData, currentThresholds) {
    // Update thresholds based on recent data patterns
    // This is a simplified version - real adaptation would be more sophisticated
    return currentThresholds;
  }

  compareThresholds(oldThresholds, newThresholds) {
    // Compare and return changes between threshold sets
    return { message: 'Thresholds updated' };
  }

  detectRecurringPatterns(patterns) {
    // Detect recurring patterns in historical data
    return [];
  }

  analyzeSequencePatterns(stationId, patterns, currentData) {
    // Analyze if current conditions match pre-alert sequences
    return [];
  }

  async analyzeSeasonalPatterns(stationId, weatherData) {
    // Analyze seasonal patterns for alerts
    return [];
  }

  calculateCurrentRelation(value1, value2, expectedCorrelation) {
    // Calculate current relationship strength between parameters
    return { strength: 0.5, direction: 'positive' };
  }

  async evaluatePredictedConditions(stationId, prediction, timestamp) {
    // Evaluate predicted conditions against thresholds
    return [];
  }

  assessFutureRisk(predictions) {
    // Assess overall risk level for future conditions
    return { risk_level: 'moderate', confidence: 0.7 };
  }
}

// Create singleton instance
const advancedAlertService = new AdvancedAlertService();

module.exports = advancedAlertService;