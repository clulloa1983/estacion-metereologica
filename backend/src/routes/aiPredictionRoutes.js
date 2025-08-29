const express = require('express');
const router = express.Router();
const aiPredictionController = require('../controllers/aiPredictionController');
const { optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const { aiPrediction } = require('../middleware/rateLimiter');
const { validateParams, validateQuery } = require('../middleware/validation');

// Apply authentication and rate limiting to all AI prediction routes
router.use(optionalAuth); // Some endpoints may work without auth for demo purposes
router.use(aiPrediction); // Special rate limit for AI operations

/**
 * Validation middleware for station ID
 */
const validateStationId = param('stationId')
  .notEmpty()
  .withMessage('Station ID is required')
  .isLength({ min: 1, max: 50 })
  .withMessage('Station ID must be between 1 and 50 characters')
  .matches(/^[A-Za-z0-9_-]+$/)
  .withMessage('Station ID can only contain letters, numbers, underscores, and hyphens');

/**
 * @swagger
 * tags:
 *   name: AI Predictions
 *   description: AI/ML-based predictions, anomaly detection, and advanced analytics
 */

/**
 * Anomaly Detection Routes
 */
router.post('/anomaly-detection/:stationId', [
  validateStationId,
  body('data')
    .notEmpty()
    .withMessage('Weather data is required')
    .isObject()
    .withMessage('Data must be a valid object'),
  body('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Threshold must be between 0 and 1')
], aiPredictionController.detectAnomalies);

/**
 * Weather Prediction Routes
 */
router.get('/weather-prediction/:stationId', [
  validateStationId,
  query('hours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Hours must be between 1 and 168'),
  query('parameters')
    .optional()
    .isString()
    .withMessage('Parameters must be a comma-separated string')
    .custom((value) => {
      if (value) {
        const params = value.split(',').map(p => p.trim()).filter(Boolean);
        const validParams = ['temperature', 'humidity', 'pressure', 'wind_speed', 'wind_direction', 'rainfall', 'pm25', 'pm10', 'uv_index'];
        const invalidParams = params.filter(p => !validParams.includes(p));
        if (invalidParams.length > 0) {
          throw new Error(`Invalid parameters: ${invalidParams.join(', ')}. Valid parameters: ${validParams.join(', ')}`);
        }
      }
      return true;
    })
], aiPredictionController.predictWeather);

/**
 * Maintenance Prediction Routes
 */
router.get('/maintenance-prediction/:stationId', [
  validateStationId,
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
], aiPredictionController.predictMaintenance);

/**
 * Energy Optimization Routes
 */
router.get('/energy-optimization/:stationId', [
  validateStationId,
  query('mode')
    .optional()
    .isIn(['battery', 'solar', 'hybrid'])
    .withMessage('Mode must be battery, solar, or hybrid')
], aiPredictionController.optimizeEnergy);

/**
 * Regional Data Interpolation Routes
 */
router.post('/regional-interpolation', [
  body('stations')
    .isArray({ min: 2 })
    .withMessage('At least 2 stations are required for interpolation')
    .custom((stations) => {
      // Validate each station has required fields
      for (const station of stations) {
        if (!station.station_id || typeof station.station_id !== 'string') {
          throw new Error('Each station must have a valid station_id');
        }
        if (!station.location || typeof station.location.lat !== 'number' || typeof station.location.lng !== 'number') {
          throw new Error('Each station must have a valid location with lat and lng coordinates');
        }
        if (!station.data || typeof station.data !== 'object') {
          throw new Error('Each station must have valid weather data');
        }
      }
      return true;
    }),
  body('target_location')
    .isObject()
    .withMessage('Target location must be an object')
    .custom((location) => {
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error('Target location must have valid lat and lng coordinates');
      }
      if (location.lat < -90 || location.lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (location.lng < -180 || location.lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      return true;
    }),
  body('parameter')
    .optional()
    .isString()
    .withMessage('Parameter must be a string')
    .isIn(['temperature', 'humidity', 'pressure', 'wind_speed', 'wind_direction', 'rainfall', 'pm25', 'pm10', 'uv_index'])
    .withMessage('Invalid parameter for interpolation'),
  body('method')
    .optional()
    .isIn(['idw', 'kriging'])
    .withMessage('Method must be idw or kriging')
], aiPredictionController.interpolateRegionalData);

/**
 * Model Management Routes
 */
router.get('/model-status', aiPredictionController.getModelStatus);

router.post('/train-model', [
  body('model_type')
    .optional()
    .isIn(['anomaly', 'weather', 'maintenance', 'all'])
    .withMessage('Model type must be anomaly, weather, maintenance, or all'),
  body('stations')
    .optional()
    .isArray()
    .withMessage('Stations must be an array of station IDs'),
  body('stations.*')
    .optional()
    .isString()
    .withMessage('Each station ID must be a string'),
  body('training_days')
    .optional()
    .isInt({ min: 7, max: 365 })
    .withMessage('Training days must be between 7 and 365')
], aiPredictionController.trainModel);

/**
 * Advanced Analytics Routes - Batch Operations
 */

/**
 * @swagger
 * /ai/batch-analysis:
 *   post:
 *     summary: Perform batch analysis on multiple stations
 *     tags: [AI Predictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stations:
 *                 type: array
 *                 items:
 *                   type: string
 *               analysis_type:
 *                 type: string
 *                 enum: [anomaly, prediction, maintenance, energy]
 *               time_range:
 *                 type: string
 *                 default: 24h
 */
router.post('/batch-analysis', [
  body('stations')
    .isArray({ min: 1, max: 20 })
    .withMessage('Stations must be an array with 1-20 station IDs'),
  body('stations.*')
    .isString()
    .withMessage('Each station ID must be a string'),
  body('analysis_type')
    .isIn(['anomaly', 'prediction', 'maintenance', 'energy'])
    .withMessage('Analysis type must be anomaly, prediction, maintenance, or energy'),
  body('time_range')
    .optional()
    .matches(/^(1h|6h|12h|24h|7d|30d)$/)
    .withMessage('Time range must be 1h, 6h, 12h, 24h, 7d, or 30d')
], async (req, res) => {
  try {
    const { stations, analysis_type, time_range = '24h' } = req.body;
    
    const results = {};
    
    // Process each station based on analysis type
    for (const stationId of stations) {
      try {
        let stationResult;
        
        switch (analysis_type) {
          case 'anomaly':
            // Get recent data and check for anomalies
            const recentData = await require('../services/weatherService').getLatestData(stationId);
            if (recentData) {
              stationResult = await require('../services/aiPredictionService').detectAnomalies(stationId, recentData);
            }
            break;
            
          case 'prediction':
            stationResult = await require('../services/aiPredictionService').predictWeather(stationId, { hours: 24 });
            break;
            
          case 'maintenance':
            stationResult = await require('../services/aiPredictionService').predictMaintenance(stationId, { days: 30 });
            break;
            
          case 'energy':
            stationResult = await require('../services/aiPredictionService').optimizeEnergy(stationId, { mode: 'hybrid' });
            break;
        }
        
        results[stationId] = stationResult;
      } catch (error) {
        results[stationId] = { error: error.message };
      }
    }
    
    res.json({
      success: true,
      analysis_type,
      time_range,
      stations_analyzed: stations.length,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch analysis',
      details: error.message
    });
  }
});

/**
 * Health and Performance Monitoring
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Prediction Service',
    status: 'operational',
    capabilities: [
      'anomaly_detection',
      'weather_prediction',
      'maintenance_prediction',
      'energy_optimization',
      'regional_interpolation',
      'model_training',
      'batch_analysis'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;