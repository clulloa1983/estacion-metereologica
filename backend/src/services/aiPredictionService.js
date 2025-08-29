const logger = require('../config/logger');
const { queryWeatherData, bucket } = require('../config/influxdb');
const cacheService = require('./cacheService');

class AIPredictionService {
  constructor() {
    this.modelCache = new Map();
    this.predictionCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize AI models and services
   */
  async initialize() {
    try {
      // In a real implementation, you would load pre-trained models here
      // For now, we'll simulate model initialization
      this.modelCache.set('anomaly_detector', {
        type: 'isolation_forest',
        threshold: 0.95,
        features: ['temperature', 'humidity', 'pressure', 'wind_speed'],
        initialized: true
      });

      this.modelCache.set('weather_predictor', {
        type: 'lstm',
        horizon: 24, // hours
        features: ['temperature', 'humidity', 'pressure'],
        initialized: true
      });

      this.modelCache.set('maintenance_predictor', {
        type: 'random_forest',
        features: ['battery_voltage', 'signal_strength', 'uptime', 'error_rate'],
        threshold: 0.7,
        initialized: true
      });

      this.initialized = true;
      logger.info('AI Prediction Service initialized successfully');
    } catch (error) {
      logger.error('Error initializing AI Prediction Service:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in weather data using isolation forest algorithm
   * @param {string} stationId - Station identifier
   * @param {Object} data - Current weather data
   * @returns {Promise<Object>} Anomaly detection result
   */
  async detectAnomalies(stationId, data) {
    try {
      const cacheKey = `anomaly:${stationId}:${Date.now()}`;
      
      if (!this.initialized) {
        await this.initialize();
      }

      // Get historical data for comparison
      const historicalData = await this.getHistoricalData(stationId, '7d');
      if (historicalData.length < 100) {
        return {
          hasAnomaly: false,
          confidence: 0,
          reason: 'Insufficient historical data for anomaly detection',
          recommendations: []
        };
      }

      // Extract features for analysis
      const features = ['temperature', 'humidity', 'pressure', 'wind_speed'];
      const currentValues = features.map(f => data[f] || 0);
      
      // Calculate statistical baseline from historical data
      const baseline = this.calculateBaseline(historicalData, features);
      
      // Detect anomalies using statistical methods (simulating ML model)
      const anomalies = this.detectStatisticalAnomalies(currentValues, baseline, features);
      
      const result = {
        stationId,
        timestamp: new Date().toISOString(),
        hasAnomaly: anomalies.length > 0,
        confidence: anomalies.length > 0 ? Math.max(...anomalies.map(a => a.confidence)) : 0,
        anomalies,
        baseline,
        currentValues: currentValues.reduce((acc, val, idx) => {
          acc[features[idx]] = val;
          return acc;
        }, {}),
        recommendations: this.generateRecommendations(anomalies)
      };

      // Cache result for 5 minutes
      this.predictionCache.set(cacheKey, result);
      setTimeout(() => this.predictionCache.delete(cacheKey), 5 * 60 * 1000);

      return result;
    } catch (error) {
      logger.error(`Error detecting anomalies for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Predict weather conditions for next N hours
   * @param {string} stationId - Station identifier
   * @param {number} hoursAhead - Hours to predict (1-24)
   * @returns {Promise<Array>} Weather predictions
   */
  async predictWeather(stationId, hoursAhead = 6) {
    try {
      const cacheKey = `weather_prediction:${stationId}:${hoursAhead}h`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      // Get recent data for prediction
      const recentData = await this.getHistoricalData(stationId, '48h');
      if (recentData.length < 48) {
        throw new Error('Insufficient data for weather prediction');
      }

      // Generate predictions using time series analysis (simulating LSTM)
      const predictions = this.generateWeatherPredictions(recentData, hoursAhead);
      
      // Cache predictions for 30 minutes
      await cacheService.set(cacheKey, predictions, 30 * 60);
      
      return predictions;
    } catch (error) {
      logger.error(`Error predicting weather for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Predict maintenance needs for station sensors
   * @param {string} stationId - Station identifier
   * @returns {Promise<Object>} Maintenance predictions
   */
  async predictMaintenance(stationId) {
    try {
      const cacheKey = `maintenance_prediction:${stationId}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get system metrics
      const systemData = await this.getSystemMetrics(stationId);
      
      if (!systemData || systemData.length < 10) {
        return {
          maintenanceNeeded: false,
          confidence: 0,
          reason: 'Insufficient system data',
          recommendations: []
        };
      }

      // Analyze sensor performance trends
      const maintenancePrediction = this.analyzeMaintenanceNeeds(systemData);
      
      // Cache for 1 hour
      await cacheService.set(cacheKey, maintenancePrediction, 60 * 60);
      
      return maintenancePrediction;
    } catch (error) {
      logger.error(`Error predicting maintenance for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Optimize energy consumption patterns
   * @param {string} stationId - Station identifier
   * @returns {Promise<Object>} Energy optimization recommendations
   */
  async optimizeEnergy(stationId) {
    try {
      const systemData = await this.getSystemMetrics(stationId);
      const weatherData = await this.getHistoricalData(stationId, '7d');
      
      const optimization = {
        currentConsumption: this.calculateAverageConsumption(systemData),
        recommendations: [],
        potentialSavings: 0,
        optimizedSchedule: null
      };

      // Analyze power consumption patterns
      if (systemData.length > 0) {
        const avgBatteryVoltage = systemData.reduce((sum, d) => sum + (d.battery_voltage || 0), 0) / systemData.length;
        
        if (avgBatteryVoltage < 3.6) {
          optimization.recommendations.push({
            type: 'power_management',
            priority: 'high',
            action: 'Increase sleep intervals during low-activity periods',
            impact: 'Extend battery life by 20-30%'
          });
        }
      }

      // Weather-based optimization
      if (weatherData.length > 0) {
        const avgLight = weatherData.reduce((sum, d) => sum + (d.light_intensity || 0), 0) / weatherData.length;
        
        if (avgLight > 20000) { // Bright conditions
          optimization.recommendations.push({
            type: 'solar_optimization',
            priority: 'medium',
            action: 'Increase sensor reading frequency during peak solar hours',
            impact: 'Maximize data collection when power is abundant'
          });
        }
      }

      optimization.potentialSavings = optimization.recommendations.length * 15; // Estimate % savings

      return optimization;
    } catch (error) {
      logger.error(`Error optimizing energy for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Interpolate weather data for regional coverage
   * @param {Array} stations - Array of station data with coordinates
   * @param {Object} bounds - Geographic bounds for interpolation
   * @param {number} resolution - Grid resolution for interpolation
   * @returns {Promise<Array>} Interpolated data points
   */
  async interpolateRegionalData(stations, bounds, resolution = 50) {
    try {
      const cacheKey = `regional_interpolation:${JSON.stringify(bounds)}:${resolution}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Filter stations within bounds
      const validStations = stations.filter(station => 
        station.location.lat >= bounds.south &&
        station.location.lat <= bounds.north &&
        station.location.lng >= bounds.west &&
        station.location.lng <= bounds.east &&
        station.current_data
      );

      if (validStations.length < 2) {
        throw new Error('Insufficient stations for interpolation (minimum 2 required)');
      }

      // Generate interpolation grid
      const interpolatedData = this.performIDWInterpolation(validStations, bounds, resolution);
      
      // Cache for 15 minutes
      await cacheService.set(cacheKey, interpolatedData, 15 * 60);
      
      return interpolatedData;
    } catch (error) {
      logger.error('Error interpolating regional data:', error);
      throw error;
    }
  }

  /**
   * Get historical weather data for analysis
   * @private
   */
  async getHistoricalData(stationId, timeRange) {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -${timeRange})
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
    `;

    return await queryWeatherData(query);
  }

  /**
   * Get system metrics for maintenance prediction
   * @private
   */
  async getSystemMetrics(stationId) {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> filter(fn: (r) => r._field == "battery_voltage" or r._field == "signal_strength" or r._field == "uptime" or r._field == "free_heap")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
    `;

    return await queryWeatherData(query);
  }

  /**
   * Calculate statistical baseline from historical data
   * @private
   */
  calculateBaseline(data, features) {
    const baseline = {};
    
    features.forEach(feature => {
      const values = data.map(d => d[feature]).filter(v => v != null && !isNaN(v));
      
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        
        baseline[feature] = {
          mean: values.reduce((sum, v) => sum + v, 0) / values.length,
          median: values[Math.floor(values.length / 2)],
          q1: values[Math.floor(values.length * 0.25)],
          q3: values[Math.floor(values.length * 0.75)],
          min: values[0],
          max: values[values.length - 1],
          std: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - (values.reduce((s, val) => s + val, 0) / values.length), 2), 0) / values.length)
        };
      }
    });
    
    return baseline;
  }

  /**
   * Detect statistical anomalies
   * @private
   */
  detectStatisticalAnomalies(currentValues, baseline, features) {
    const anomalies = [];
    
    features.forEach((feature, index) => {
      const currentValue = currentValues[index];
      const stats = baseline[feature];
      
      if (!stats || currentValue == null) return;
      
      // Z-score based detection
      const zScore = Math.abs(currentValue - stats.mean) / stats.std;
      
      // IQR-based detection
      const iqr = stats.q3 - stats.q1;
      const lowerBound = stats.q1 - 1.5 * iqr;
      const upperBound = stats.q3 + 1.5 * iqr;
      const isOutlier = currentValue < lowerBound || currentValue > upperBound;
      
      if (zScore > 3 || isOutlier) {
        anomalies.push({
          feature,
          currentValue,
          expectedRange: { min: lowerBound, max: upperBound },
          zScore,
          confidence: Math.min(zScore / 3, 1),
          severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          message: `${feature} value ${currentValue.toFixed(2)} is significantly outside normal range`
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Generate recommendations based on detected anomalies
   * @private
   */
  generateRecommendations(anomalies) {
    const recommendations = [];
    
    anomalies.forEach(anomaly => {
      switch (anomaly.feature) {
        case 'temperature':
          if (anomaly.severity === 'critical') {
            recommendations.push({
              type: 'immediate_action',
              message: 'Check sensor calibration and environmental conditions',
              priority: 'high'
            });
          }
          break;
        case 'humidity':
          recommendations.push({
            type: 'maintenance',
            message: 'Verify humidity sensor is not obstructed or damaged',
            priority: anomaly.severity === 'critical' ? 'high' : 'medium'
          });
          break;
        case 'pressure':
          recommendations.push({
            type: 'calibration',
            message: 'Consider recalibrating barometric pressure sensor',
            priority: 'medium'
          });
          break;
        case 'wind_speed':
          recommendations.push({
            type: 'physical_check',
            message: 'Inspect wind sensor for obstructions or mechanical issues',
            priority: 'medium'
          });
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Generate weather predictions using time series analysis
   * @private
   */
  generateWeatherPredictions(recentData, hoursAhead) {
    const predictions = [];
    const features = ['temperature', 'humidity', 'pressure'];
    
    for (let hour = 1; hour <= hoursAhead; hour++) {
      const prediction = {
        timestamp: new Date(Date.now() + hour * 60 * 60 * 1000).toISOString(),
        confidence: Math.max(0.3, 0.9 - (hour * 0.05)), // Decreasing confidence over time
        values: {}
      };
      
      features.forEach(feature => {
        const recentValues = recentData.slice(-24).map(d => d[feature]).filter(v => v != null);
        
        if (recentValues.length > 0) {
          // Simple trend analysis (in real implementation, use LSTM)
          const trend = this.calculateTrend(recentValues);
          const seasonal = this.calculateSeasonalComponent(recentValues, hour);
          const noise = (Math.random() - 0.5) * 0.1;
          
          const lastValue = recentValues[recentValues.length - 1];
          prediction.values[feature] = lastValue + trend * hour + seasonal + noise;
        }
      });
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Calculate trend from time series data
   * @private
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate seasonal component
   * @private
   */
  calculateSeasonalComponent(values, hour) {
    // Simple seasonal approximation based on hour of day
    const hourOfDay = (new Date().getHours() + hour) % 24;
    const seasonalFactor = Math.sin((hourOfDay * Math.PI) / 12) * 0.1;
    
    return seasonalFactor * (values.reduce((sum, val) => sum + val, 0) / values.length);
  }

  /**
   * Analyze maintenance needs from system data
   * @private
   */
  analyzeMaintenanceNeeds(systemData) {
    const issues = [];
    let maxRisk = 0;
    
    // Battery analysis
    const batteryValues = systemData.map(d => d.battery_voltage).filter(v => v != null);
    if (batteryValues.length > 0) {
      const avgBattery = batteryValues.reduce((sum, v) => sum + v, 0) / batteryValues.length;
      const batteryTrend = this.calculateTrend(batteryValues.slice(-10));
      
      if (avgBattery < 3.5) {
        issues.push({
          type: 'battery',
          severity: 'high',
          message: 'Battery voltage critically low',
          recommendation: 'Replace battery or check charging system',
          risk: 0.9
        });
        maxRisk = Math.max(maxRisk, 0.9);
      } else if (batteryTrend < -0.01) {
        issues.push({
          type: 'battery',
          severity: 'medium',
          message: 'Battery voltage declining',
          recommendation: 'Monitor battery health closely',
          risk: 0.6
        });
        maxRisk = Math.max(maxRisk, 0.6);
      }
    }
    
    // Memory analysis
    const memoryValues = systemData.map(d => d.free_heap).filter(v => v != null);
    if (memoryValues.length > 0) {
      const avgMemory = memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length;
      
      if (avgMemory < 1000) { // Less than 1KB free
        issues.push({
          type: 'memory',
          severity: 'high',
          message: 'Low free memory detected',
          recommendation: 'Check for memory leaks or restart device',
          risk: 0.8
        });
        maxRisk = Math.max(maxRisk, 0.8);
      }
    }
    
    return {
      maintenanceNeeded: issues.length > 0,
      confidence: maxRisk,
      overallRisk: maxRisk,
      issues,
      recommendations: issues.map(issue => issue.recommendation),
      nextMaintenanceWindow: this.calculateMaintenanceWindow(maxRisk)
    };
  }

  /**
   * Calculate maintenance window based on risk
   * @private
   */
  calculateMaintenanceWindow(risk) {
    if (risk > 0.8) return '1-3 days';
    if (risk > 0.6) return '1-2 weeks';
    if (risk > 0.4) return '1 month';
    return '3 months';
  }

  /**
   * Calculate average power consumption
   * @private
   */
  calculateAverageConsumption(systemData) {
    const batteryReadings = systemData.map(d => d.battery_voltage).filter(v => v != null);
    
    if (batteryReadings.length < 2) return null;
    
    // Estimate consumption based on battery voltage drop
    const voltageChange = batteryReadings[0] - batteryReadings[batteryReadings.length - 1];
    const timeHours = systemData.length; // Approximate hours
    
    return {
      estimatedDaily: (voltageChange / timeHours) * 24,
      efficiency: batteryReadings[batteryReadings.length - 1] > 3.6 ? 'good' : 'poor',
      averageVoltage: batteryReadings.reduce((sum, v) => sum + v, 0) / batteryReadings.length
    };
  }

  /**
   * Perform Inverse Distance Weighing interpolation
   * @private
   */
  performIDWInterpolation(stations, bounds, resolution) {
    const interpolatedPoints = [];
    const stepLat = (bounds.north - bounds.south) / resolution;
    const stepLng = (bounds.east - bounds.west) / resolution;
    
    for (let lat = bounds.south; lat <= bounds.north; lat += stepLat) {
      for (let lng = bounds.west; lng <= bounds.east; lng += stepLng) {
        const point = this.interpolatePoint(lat, lng, stations);
        if (point) {
          interpolatedPoints.push(point);
        }
      }
    }
    
    return interpolatedPoints;
  }

  /**
   * Interpolate weather values at a specific point
   * @private
   */
  interpolatePoint(lat, lng, stations) {
    const weights = [];
    const values = { temperature: [], humidity: [], pressure: [] };
    
    stations.forEach(station => {
      const distance = this.calculateDistance(lat, lng, station.location.lat, station.location.lng);
      
      if (distance === 0) {
        // Exact match with station location
        return {
          lat,
          lng,
          temperature: station.current_data.temperature,
          humidity: station.current_data.humidity,
          pressure: station.current_data.pressure,
          confidence: 1.0
        };
      }
      
      const weight = 1 / Math.pow(distance, 2); // IDW with power of 2
      weights.push(weight);
      
      if (station.current_data.temperature != null) {
        values.temperature.push(station.current_data.temperature * weight);
      }
      if (station.current_data.humidity != null) {
        values.humidity.push(station.current_data.humidity * weight);
      }
      if (station.current_data.pressure != null) {
        values.pressure.push(station.current_data.pressure * weight);
      }
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight === 0) return null;
    
    return {
      lat,
      lng,
      temperature: values.temperature.reduce((sum, v) => sum + v, 0) / totalWeight,
      humidity: values.humidity.reduce((sum, v) => sum + v, 0) / totalWeight,
      pressure: values.pressure.reduce((sum, v) => sum + v, 0) / totalWeight,
      confidence: Math.min(1, totalWeight / stations.length)
    };
  }

  /**
   * Calculate distance between two geographic points
   * @private
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
}

module.exports = new AIPredictionService();