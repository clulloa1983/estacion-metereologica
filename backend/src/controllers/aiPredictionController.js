const aiPredictionService = require('../services/aiPredictionService');
const logger = require('../config/logger');

/**
 * AI Prediction Controller
 * Handles AI/ML-based predictions, anomaly detection, and advanced analytics
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AnomalyDetectionResult:
 *       type: object
 *       properties:
 *         hasAnomaly:
 *           type: boolean
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         anomalies:
 *           type: array
 *           items:
 *             type: object
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *         baseline:
 *           type: object
 *     WeatherPrediction:
 *       type: object
 *       properties:
 *         predictions:
 *           type: array
 *           items:
 *             type: object
 *         confidence:
 *           type: number
 *         model_info:
 *           type: object
 *         trends:
 *           type: object
 *     MaintenancePrediction:
 *       type: object
 *       properties:
 *         sensor_health:
 *           type: object
 *         maintenance_schedule:
 *           type: array
 *           items:
 *             type: object
 *         alerts:
 *           type: array
 *           items:
 *             type: object
 *         overall_score:
 *           type: number
 */

/**
 * @swagger
 * /ai/anomaly-detection/{stationId}:
 *   post:
 *     summary: Detect anomalies in weather data using ML
 *     tags: [AI Predictions]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *               threshold:
 *                 type: number
 *                 default: 0.7
 *     responses:
 *       200:
 *         description: Anomaly detection results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   $ref: '#/components/schemas/AnomalyDetectionResult'
 */
const detectAnomalies = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { stationId } = req.params;
    const { data, threshold = 0.7 } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Weather data is required for anomaly detection'
      });
    }

    const result = await aiPredictionService.detectAnomalies(stationId, data, { threshold });

    res.json({
      success: true,
      station_id: stationId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in anomaly detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform anomaly detection',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/weather-prediction/{stationId}:
 *   get:
 *     summary: Get weather predictions using LSTM-based models
 *     tags: [AI Predictions]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *           minimum: 1
 *           maximum: 168
 *       - in: query
 *         name: parameters
 *         schema:
 *           type: string
 *           default: "temperature,humidity,pressure"
 *     responses:
 *       200:
 *         description: Weather predictions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 predictions:
 *                   $ref: '#/components/schemas/WeatherPrediction'
 */
const predictWeather = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { stationId } = req.params;
    const { hours = 24, parameters = 'temperature,humidity,pressure' } = req.query;

    const hoursNum = parseInt(hours);
    if (hoursNum < 1 || hoursNum > 168) {
      return res.status(400).json({
        success: false,
        error: 'Hours must be between 1 and 168 (1 week)'
      });
    }

    const parameterList = parameters.split(',').map(p => p.trim()).filter(Boolean);
    
    const predictions = await aiPredictionService.predictWeather(stationId, {
      hours: hoursNum,
      parameters: parameterList
    });

    res.json({
      success: true,
      station_id: stationId,
      predictions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in weather prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weather predictions',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/maintenance-prediction/{stationId}:
 *   get:
 *     summary: Predict maintenance needs using sensor health analysis
 *     tags: [AI Predictions]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *     responses:
 *       200:
 *         description: Maintenance predictions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 predictions:
 *                   $ref: '#/components/schemas/MaintenancePrediction'
 */
const predictMaintenance = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { stationId } = req.params;
    const { days = 30 } = req.query;

    const daysNum = parseInt(days);
    if (daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }

    const predictions = await aiPredictionService.predictMaintenance(stationId, { days: daysNum });

    res.json({
      success: true,
      station_id: stationId,
      predictions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in maintenance prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate maintenance predictions',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/energy-optimization/{stationId}:
 *   get:
 *     summary: Get energy optimization recommendations
 *     tags: [AI Predictions]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [battery, solar, hybrid]
 *           default: hybrid
 *     responses:
 *       200:
 *         description: Energy optimization recommendations
 */
const optimizeEnergy = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { stationId } = req.params;
    const { mode = 'hybrid' } = req.query;

    if (!['battery', 'solar', 'hybrid'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be: battery, solar, or hybrid'
      });
    }

    const optimization = await aiPredictionService.optimizeEnergy(stationId, { mode });

    res.json({
      success: true,
      station_id: stationId,
      optimization,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in energy optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate energy optimization recommendations',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/regional-interpolation:
 *   post:
 *     summary: Interpolate weather data for regional coverage
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
 *                   type: object
 *               target_location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               parameter:
 *                 type: string
 *                 default: temperature
 *               method:
 *                 type: string
 *                 enum: [idw, kriging]
 *                 default: idw
 *     responses:
 *       200:
 *         description: Interpolated weather data
 */
const interpolateRegionalData = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { stations, target_location, parameter = 'temperature', method = 'idw' } = req.body;

    if (!stations || !Array.isArray(stations) || stations.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 stations are required for interpolation'
      });
    }

    if (!target_location || typeof target_location.lat !== 'number' || typeof target_location.lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid target_location with lat and lng coordinates is required'
      });
    }

    const interpolation = await aiPredictionService.interpolateRegionalData(stations, target_location, {
      parameter,
      method
    });

    res.json({
      success: true,
      interpolation,
      target_location,
      parameter,
      method,
      stations_used: stations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in regional data interpolation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform regional data interpolation',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/model-status:
 *   get:
 *     summary: Get AI model status and capabilities
 *     tags: [AI Predictions]
 *     responses:
 *       200:
 *         description: AI model status information
 */
const getModelStatus = async (req, res) => {
  try {
    const status = await aiPredictionService.getModelStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting model status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model status',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /ai/train-model:
 *   post:
 *     summary: Train or retrain AI models with recent data
 *     tags: [AI Predictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model_type:
 *                 type: string
 *                 enum: [anomaly, weather, maintenance, all]
 *                 default: all
 *               stations:
 *                 type: array
 *                 items:
 *                   type: string
 *               training_days:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       200:
 *         description: Model training initiated
 */
const trainModel = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Validation error',
    //     details: errors.array()
    //   });
    // }

    const { model_type = 'all', stations, training_days = 30 } = req.body;

    const validModelTypes = ['anomaly', 'weather', 'maintenance', 'all'];
    if (!validModelTypes.includes(model_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid model_type. Must be one of: ${validModelTypes.join(', ')}`
      });
    }

    const trainingResult = await aiPredictionService.trainModel({
      model_type,
      stations,
      training_days
    });

    res.json({
      success: true,
      training_result: trainingResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train model',
      details: error.message
    });
  }
};

module.exports = {
  detectAnomalies,
  predictWeather,
  predictMaintenance,
  optimizeEnergy,
  interpolateRegionalData,
  getModelStatus,
  trainModel
};