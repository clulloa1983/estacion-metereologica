const express = require('express');
const router = express.Router();
const mlAlertsController = require('../controllers/mlAlertsController');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

/**
 * @swagger
 * tags:
 *   name: ML Alerts
 *   description: Machine Learning Alerts API for anomaly detection
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MLTrainingRequest:
 *       type: object
 *       properties:
 *         timeRange:
 *           type: string
 *           enum: [1d, 3d, 7d, 14d, 30d]
 *           default: 7d
 *           description: Time range for training data
 *       example:
 *         timeRange: "7d"
 *     
 *     MLToggleRequest:
 *       type: object
 *       required:
 *         - enabled
 *       properties:
 *         enabled:
 *           type: boolean
 *           description: Enable or disable ML alerts
 *       example:
 *         enabled: true
 *     
 *     MLStatistics:
 *       type: object
 *       properties:
 *         ml_enabled:
 *           type: boolean
 *         is_trained:
 *           type: boolean
 *         training_data_points:
 *           type: number
 *         confidence_threshold:
 *           type: number
 *         sensors_monitored:
 *           type: array
 *           items:
 *             type: string
 */

// Schemas de validación
const trainModelSchema = {
  body: Joi.object({
    timeRange: Joi.string().valid('1d', '3d', '7d', '14d', '30d').default('7d')
  })
};

const toggleMLAlertsSchema = {
  body: Joi.object({
    enabled: Joi.boolean().required()
  }).required()
};

const getRecentAlertsSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    sensor: Joi.string().valid('temperature', 'humidity', 'pressure', 'wind_speed', 'pm25', 'co_level')
  })
};

const getMetricsSchema = {
  query: Joi.object({
    timeRange: Joi.string().valid('1h', '6h', '12h', '24h', '7d', '30d').default('24h')
  })
};

/**
 * @swagger
 * /api/ml-alerts/train/{stationId}:
 *   post:
 *     summary: Train ML models for anomaly detection
 *     tags: [ML Alerts]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MLTrainingRequest'
 *     responses:
 *       200:
 *         description: Model trained successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or training failed
 *       500:
 *         description: Internal server error
 */
router.post('/train/:stationId', validate(trainModelSchema), mlAlertsController.trainModel);

/**
 * @swagger
 * /api/ml-alerts/statistics/{stationId}:
 *   get:
 *     summary: Get ML model statistics and performance metrics
 *     tags: [ML Alerts]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station ID
 *     responses:
 *       200:
 *         description: ML statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 station_id:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MLStatistics'
 *       500:
 *         description: Internal server error
 */
router.get('/statistics/:stationId', mlAlertsController.getStatistics);

/**
 * @swagger
 * /api/ml-alerts/reset/{stationId}:
 *   post:
 *     summary: Reset ML models for a station
 *     tags: [ML Alerts]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station ID
 *     responses:
 *       200:
 *         description: ML models reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/reset/:stationId', mlAlertsController.resetModel);

/**
 * @swagger
 * /api/ml-alerts/toggle:
 *   put:
 *     summary: Enable or disable ML alerts globally
 *     tags: [ML Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MLToggleRequest'
 *     responses:
 *       200:
 *         description: ML alerts toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 ml_enabled:
 *                   type: boolean
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.put('/toggle', validate(toggleMLAlertsSchema), mlAlertsController.toggleMLAlerts);

/**
 * @swagger
 * /api/ml-alerts/config:
 *   get:
 *     summary: Get current ML alerts configuration
 *     tags: [ML Alerts]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ml_enabled:
 *                       type: boolean
 *                     suppression_time:
 *                       type: number
 *                       description: Suppression time in minutes
 *                     supported_sensors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     algorithm_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                     severity_levels:
 *                       type: array
 *                       items:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/config', mlAlertsController.getConfig);

/**
 * @swagger
 * /api/ml-alerts/recent/{stationId}:
 *   get:
 *     summary: Get recent ML alerts for analysis
 *     tags: [ML Alerts]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of alerts to return
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by alert severity
 *       - in: query
 *         name: sensor
 *         schema:
 *           type: string
 *           enum: [temperature, humidity, pressure, wind_speed, pm25, co_level]
 *         description: Filter by sensor type
 *     responses:
 *       200:
 *         description: Recent ML alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                 station_id:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       alert_type:
 *                         type: string
 *                       severity:
 *                         type: string
 *                       message:
 *                         type: string
 *                       acknowledged:
 *                         type: boolean
 *                       value:
 *                         type: number
 *                       ml_data:
 *                         type: object
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/recent/:stationId', validate(getRecentAlertsSchema), mlAlertsController.getRecentMLAlerts);

/**
 * @swagger
 * /api/ml-alerts/metrics/{stationId}:
 *   get:
 *     summary: Get ML performance metrics
 *     tags: [ML Alerts]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station ID
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 12h, 24h, 7d, 30d]
 *           default: "24h"
 *         description: Time range for metrics calculation
 *     responses:
 *       200:
 *         description: ML metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_ml_alerts:
 *                       type: number
 *                     alerts_by_severity:
 *                       type: object
 *                       properties:
 *                         LOW:
 *                           type: number
 *                         MEDIUM:
 *                           type: number
 *                         HIGH:
 *                           type: number
 *                         CRITICAL:
 *                           type: number
 *                     time_range:
 *                       type: string
 *                     model_statistics:
 *                       $ref: '#/components/schemas/MLStatistics'
 *       400:
 *         description: Invalid time range
 *       500:
 *         description: Internal server error
 */
router.get('/metrics/:stationId', validate(getMetricsSchema), mlAlertsController.getMLMetrics);

module.exports = router;