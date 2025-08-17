const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { validateAlert, validateQuery, validateParams } = require('../middleware/validation');
const { verifyApiKey, optionalAuth, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all alerts
 *     description: Retrieve alerts across all stations with optional filtering
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter alerts by severity level
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filter by acknowledgment status
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *         description: Time range for alerts (e.g., '1h', '24h', '7d')
 *         example: 24h
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of alerts to return
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 count:
 *                   type: integer
 *                 filters:
 *                   type: object
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', optionalAuth, validateQuery, alertController.getAlerts);

/**
 * @swagger
 * /alerts/{stationId}:
 *   get:
 *     summary: Get alerts for specific station
 *     description: Retrieve alerts for a specific weather station
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station identifier
 *         example: ESP32_STATION_001
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter alerts by severity level
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filter by acknowledgment status
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *         description: Time range for alerts (e.g., '1h', '24h', '7d')
 *         example: 24h
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of alerts to return
 *     responses:
 *       200:
 *         description: Station-specific alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 station_id:
 *                   type: string
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 count:
 *                   type: integer
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:stationId', optionalAuth, validateParams, validateQuery, alertController.getStationAlerts);

/**
 * @swagger
 * /alerts/summary/{stationId}:
 *   get:
 *     summary: Get alert summary statistics
 *     description: Retrieve summary statistics of alerts for a specific station
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station identifier
 *         example: ESP32_STATION_001
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *         description: Time range for summary (e.g., '1h', '24h', '7d', '30d')
 *         example: 24h
 *     responses:
 *       200:
 *         description: Alert summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 station_id:
 *                   type: string
 *                 timeRange:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of alerts
 *                     by_severity:
 *                       type: object
 *                       properties:
 *                         LOW:
 *                           type: integer
 *                         MEDIUM:
 *                           type: integer
 *                         HIGH:
 *                           type: integer
 *                         CRITICAL:
 *                           type: integer
 *                     acknowledged:
 *                       type: integer
 *                       description: Number of acknowledged alerts
 *                     unacknowledged:
 *                       type: integer
 *                       description: Number of unacknowledged alerts
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/summary/:stationId', optionalAuth, validateParams, alertController.getAlertSummary);

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Create new alert
 *     description: Create a new alert (typically used by automated systems or devices)
 *     tags: [Alerts]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Alert'
 *     responses:
 *       201:
 *         description: Alert created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Alert created successfully
 *                 alert:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', verifyApiKey, validateAlert, alertController.createAlert);

/**
 * @swagger
 * /alerts/{alertId}/acknowledge:
 *   put:
 *     summary: Acknowledge an alert
 *     description: Mark an alert as acknowledged by a user
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert identifier
 *         example: alert_123456
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the acknowledgment
 *                 example: Temperature returned to normal levels
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Alert acknowledged successfully
 *                 alert:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:alertId/acknowledge', optionalAuth, requireRole('user'), validateParams, alertController.acknowledgeAlert);

module.exports = router;