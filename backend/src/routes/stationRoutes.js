const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { verifyApiKey, optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const { validateParams, validateQuery, validateBody } = require('../middleware/validation');
const { generalRateLimit } = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     StationMetadata:
 *       type: object
 *       required:
 *         - station_id
 *         - name
 *         - location
 *       properties:
 *         station_id:
 *           type: string
 *           description: Unique station identifier
 *           example: ESP32_STATION_001
 *         name:
 *           type: string
 *           description: Human-readable station name
 *           example: Main Weather Station
 *         description:
 *           type: string
 *           description: Station description
 *           example: Primary ESP32-based weather monitoring station
 *         location:
 *           type: object
 *           required:
 *             - lat
 *             - lng
 *           properties:
 *             lat:
 *               type: number
 *               minimum: -90
 *               maximum: 90
 *               description: Latitude in decimal degrees
 *               example: -33.443897
 *             lng:
 *               type: number
 *               minimum: -180
 *               maximum: 180
 *               description: Longitude in decimal degrees
 *               example: -70.660126
 *             address:
 *               type: string
 *               description: Human-readable address
 *               example: Santiago, Chile
 *             region:
 *               type: string
 *               description: Geographic region
 *               example: Metropolitan Region
 *             elevation:
 *               type: number
 *               description: Elevation in meters above sea level
 *               example: 520
 *         sensors:
 *           type: array
 *           items:
 *             type: string
 *             enum: [dht22, bmp085, bh1750, mh_rd, mq7, mq135, dsm501a, wind]
 *           description: Available sensor types
 *           example: [dht22, bmp085, bh1750]
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance, error]
 *           description: Current station status
 *           example: active
 *         hardware_version:
 *           type: string
 *           description: Hardware/firmware version
 *           example: ESP32-V1.0
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Station creation timestamp
 *         last_seen:
 *           type: string
 *           format: date-time
 *           description: Last communication timestamp
 *         configuration:
 *           type: object
 *           properties:
 *             reading_interval:
 *               type: integer
 *               description: Reading interval in seconds
 *               example: 60
 *             alerts_enabled:
 *               type: boolean
 *               description: Whether alerts are enabled
 *               example: true
 *             calibration:
 *               type: object
 *               properties:
 *                 temperature:
 *                   type: number
 *                   description: Temperature calibration offset
 *                   example: 0.0
 *                 humidity:
 *                   type: number
 *                   description: Humidity calibration offset
 *                   example: 0.0
 *                 pressure:
 *                   type: number
 *                   description: Pressure calibration offset
 *                   example: 0.0
 *                 light:
 *                   type: number
 *                   description: Light calibration offset
 *                   example: 0.0
 *     
 *     StationStats:
 *       type: object
 *       properties:
 *         station_id:
 *           type: string
 *           example: ESP32_STATION_001
 *         data_points_30d:
 *           type: integer
 *           description: Number of data points in last 30 days
 *           example: 43200
 *         expected_readings:
 *           type: integer
 *           description: Expected number of readings based on interval
 *           example: 43200
 *         uptime_percentage:
 *           type: number
 *           description: Station uptime percentage
 *           example: 98.5
 *         last_seen:
 *           type: string
 *           format: date-time
 *           description: Last seen timestamp
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance, error]
 *           example: active
 *         sensors_count:
 *           type: integer
 *           description: Number of configured sensors
 *           example: 7
 */

/**
 * @swagger
 * /stations/metadata:
 *   get:
 *     summary: Get all weather stations with metadata
 *     description: Retrieve complete list of weather stations including location and configuration data
 *     tags: [Stations]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of all weather stations with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StationMetadata'
 *                 count:
 *                   type: integer
 *                   description: Number of stations
 *                   example: 3
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/metadata', generalRateLimit, optionalAuth, stationController.getAllStations);

/**
 * @swagger
 * /stations/metadata/{stationId}:
 *   get:
 *     summary: Get station metadata by ID
 *     description: Retrieve complete metadata for a specific weather station
 *     tags: [Stations]
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
 *         description: Station metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 station:
 *                   $ref: '#/components/schemas/StationMetadata'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/metadata/:stationId', generalRateLimit, optionalAuth, validateParams, stationController.getStationById);

/**
 * @swagger
 * /stations/metadata:
 *   post:
 *     summary: Create new station metadata
 *     description: Create metadata for a new weather station
 *     tags: [Stations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StationMetadata'
 *     responses:
 *       201:
 *         description: Station metadata created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Station ESP32_STATION_002 created successfully
 *                 station:
 *                   $ref: '#/components/schemas/StationMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Station already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Station ESP32_STATION_001 already exists
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/metadata', generalRateLimit, verifyToken, requireRole('user'), validateBody, stationController.createStationMetadata);

/**
 * @swagger
 * /stations/metadata/{stationId}:
 *   put:
 *     summary: Update station metadata
 *     description: Update complete or partial metadata for a weather station
 *     tags: [Stations]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StationMetadata'
 *     responses:
 *       200:
 *         description: Station metadata updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Station ESP32_STATION_001 updated successfully
 *                 station:
 *                   $ref: '#/components/schemas/StationMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/metadata/:stationId', generalRateLimit, verifyToken, requireRole('user'), validateParams, validateBody, stationController.updateStationMetadata);

/**
 * @swagger
 * /stations/metadata/{stationId}:
 *   delete:
 *     summary: Delete station metadata
 *     description: Remove metadata for a weather station (does not delete historical data)
 *     tags: [Stations]
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
 *     responses:
 *       200:
 *         description: Station metadata deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Station ESP32_STATION_001 metadata deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/metadata/:stationId', generalRateLimit, verifyToken, requireRole('admin'), validateParams, stationController.deleteStationMetadata);

/**
 * @swagger
 * /stations/region:
 *   get:
 *     summary: Get stations within geographic bounds
 *     description: Retrieve weather stations located within specified geographic boundaries
 *     tags: [Stations]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: north
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Northern latitude boundary
 *         example: -33.0
 *       - in: query
 *         name: south
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Southern latitude boundary
 *         example: -34.0
 *       - in: query
 *         name: east
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Eastern longitude boundary
 *         example: -70.0
 *       - in: query
 *         name: west
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Western longitude boundary
 *         example: -71.0
 *     responses:
 *       200:
 *         description: Stations within specified region
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StationMetadata'
 *                 count:
 *                   type: integer
 *                   description: Number of stations in region
 *                   example: 2
 *                 bounds:
 *                   type: object
 *                   properties:
 *                     north:
 *                       type: number
 *                       example: -33.0
 *                     south:
 *                       type: number
 *                       example: -34.0
 *                     east:
 *                       type: number
 *                       example: -70.0
 *                     west:
 *                       type: number
 *                       example: -71.0
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/region', generalRateLimit, optionalAuth, validateQuery, stationController.getStationsInRegion);

/**
 * @swagger
 * /stations/{stationId}/stats:
 *   get:
 *     summary: Get station statistics
 *     description: Retrieve performance and operational statistics for a weather station
 *     tags: [Stations]
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
 *         description: Station statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   $ref: '#/components/schemas/StationStats'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:stationId/stats', generalRateLimit, optionalAuth, validateParams, stationController.getStationStats);

/**
 * @swagger
 * /stations/{stationId}/status:
 *   put:
 *     summary: Update station status
 *     description: Update the operational status of a weather station
 *     tags: [Stations]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, error]
 *                 description: New station status
 *                 example: maintenance
 *     responses:
 *       200:
 *         description: Station status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Station ESP32_STATION_001 status updated to maintenance
 *                 station:
 *                   $ref: '#/components/schemas/StationMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:stationId/status', generalRateLimit, verifyToken, requireRole('user'), validateParams, validateBody, stationController.updateStationStatus);

module.exports = router;