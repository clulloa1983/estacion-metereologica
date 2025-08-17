const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { validateWeatherData, validateQuery, validateParams } = require('../middleware/validation');
const { verifyApiKey, optionalAuth, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /weather/data:
 *   post:
 *     summary: Submit weather data from IoT device
 *     description: Endpoint for weather stations to submit sensor readings
 *     tags: [Weather Data]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WeatherData'
 *     responses:
 *       201:
 *         description: Weather data successfully stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Weather data stored successfully
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/data', verifyApiKey, validateWeatherData, weatherController.receiveWeatherData);

/**
 * @swagger
 * /weather/data/{stationId}:
 *   get:
 *     summary: Get historical weather data
 *     description: Retrieve historical weather data for a specific station with optional time range filtering
 *     tags: [Weather Data]
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
 *         description: Time range for data (e.g., '1h', '24h', '7d', '30d')
 *         example: 24h
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for data range (ISO 8601)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for data range (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           default: 1000
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: Historical weather data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WeatherData'
 *                 count:
 *                   type: integer
 *                   description: Number of records returned
 *                 timeRange:
 *                   type: string
 *                   description: Applied time range
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/data/:stationId', optionalAuth, validateParams, validateQuery, weatherController.getWeatherData);

/**
 * @swagger
 * /weather/data/{stationId}/latest:
 *   get:
 *     summary: Get latest weather reading
 *     description: Retrieve the most recent weather data for a specific station
 *     tags: [Weather Data]
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
 *     responses:
 *       200:
 *         description: Latest weather data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WeatherData'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/data/:stationId/latest', optionalAuth, validateParams, weatherController.getLatestData);

/**
 * @swagger
 * /weather/data/{stationId}/summary:
 *   get:
 *     summary: Get weather data summary statistics
 *     description: Retrieve statistical summary of weather data for a specific station and time period
 *     tags: [Weather Data]
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
 *         description: Weather data summary statistics
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
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *                       avg:
 *                         type: number
 *                       count:
 *                         type: integer
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/data/:stationId/summary', optionalAuth, validateParams, validateQuery, weatherController.getSummary);

/**
 * @swagger
 * /weather/stations:
 *   get:
 *     summary: List all weather stations
 *     description: Get a list of all registered weather stations with their current status
 *     tags: [Weather Data]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of weather stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 *                 count:
 *                   type: integer
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/stations', optionalAuth, weatherController.getStations);

/**
 * @swagger
 * /weather/export/{stationId}:
 *   get:
 *     summary: Export weather data
 *     description: Export weather data in CSV or JSON format for backup or analysis
 *     tags: [Weather Data]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Weather station identifier
 *         example: ESP32_STATION_001
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *         description: Time range for export (e.g., '1h', '24h', '7d', '30d')
 *         example: 7d
 *     responses:
 *       200:
 *         description: Exported weather data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WeatherData'
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
router.get('/export/:stationId', optionalAuth, requireRole('user'), validateParams, validateQuery, weatherController.exportData);

module.exports = router;