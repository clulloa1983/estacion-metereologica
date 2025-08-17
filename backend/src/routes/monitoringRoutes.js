const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { optionalAuth, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /monitoring/health:
 *   get:
 *     summary: System health status
 *     description: Get comprehensive health status of all system components
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   example: healthy
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy, unknown]
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *                         uptime:
 *                           type: integer
 *                           description: Uptime in seconds
 *                     influxdb:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *                         latency:
 *                           type: integer
 *                           description: Response time in milliseconds
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *                         latency:
 *                           type: integer
 *                     mqtt:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *                         latency:
 *                           type: integer
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/health', optionalAuth, monitoringController.getHealthStatus);

/**
 * @swagger
 * /monitoring/health/{service}:
 *   get:
 *     summary: Individual service health
 *     description: Get detailed health information for a specific service
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [api, influxdb, redis, mqtt]
 *         description: Service name to check
 *         example: influxdb
 *     responses:
 *       200:
 *         description: Service health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                 status:
 *                   type: object
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/health/:service', optionalAuth, monitoringController.getDetailedHealth);

/**
 * @swagger
 * /monitoring/metrics:
 *   get:
 *     summary: System performance metrics
 *     description: Get current system performance and usage metrics
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestsPerMinute:
 *                   type: integer
 *                   description: API requests per minute
 *                   example: 45
 *                 dataPointsPerHour:
 *                   type: integer
 *                   description: Weather data points received per hour
 *                   example: 120
 *                 alertsLast24h:
 *                   type: integer
 *                   description: Number of alerts in last 24 hours
 *                   example: 3
 *                 activeStations:
 *                   type: integer
 *                   description: Number of active weather stations
 *                   example: 1
 *                 systemLoad:
 *                   type: object
 *                   properties:
 *                     cpu:
 *                       type: number
 *                       description: CPU usage percentage
 *                     memory:
 *                       type: number
 *                       description: Memory usage percentage
 *                     disk:
 *                       type: number
 *                       description: Disk usage percentage
 *                 uptime:
 *                   type: integer
 *                   description: System uptime in seconds
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 */
router.get('/metrics', optionalAuth, monitoringController.getMetrics);

/**
 * @swagger
 * /monitoring/services:
 *   get:
 *     summary: Services status summary
 *     description: Get summary of all services status
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Services status summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of services
 *                 healthy:
 *                   type: integer
 *                   description: Number of healthy services
 *                 unhealthy:
 *                   type: integer
 *                   description: Number of unhealthy services
 *                 unknown:
 *                   type: integer
 *                   description: Number of services with unknown status
 *                 healthPercentage:
 *                   type: number
 *                   description: Percentage of healthy services
 *                 services:
 *                   type: object
 *                   description: Individual service statuses
 */
router.get('/services', optionalAuth, monitoringController.getServiceStatus);

/**
 * @swagger
 * /monitoring/dashboard:
 *   get:
 *     summary: Complete monitoring dashboard data
 *     description: Get all monitoring data for dashboard display (admin only)
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Complete dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 health:
 *                   type: object
 *                   description: Health status data
 *                 metrics:
 *                   type: object
 *                   description: Performance metrics
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalServices:
 *                       type: integer
 *                     healthyServices:
 *                       type: integer
 *                     uptime:
 *                       type: integer
 *                     version:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/dashboard', optionalAuth, requireRole('admin'), monitoringController.getDashboard);

module.exports = router;