const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { validateConfigCommand, validateParams } = require('../middleware/validation');
const { verifyApiKey, optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const { configRateLimit } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /config/command/{stationId}:
 *   post:
 *     summary: Send remote configuration command to weather station
 *     description: Send configuration command to specific weather station via MQTT
 *     tags: [Configuration]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *                 enum: [status, restart, sensor_check, wake_up, set_reading_interval, toggle_sensor, set_calibration, set_alert_threshold, sleep_mode, wifi_config]
 *                 description: Command to execute
 *               parameters:
 *                 type: object
 *                 description: Command parameters (depends on command type)
 *             required:
 *               - command
 *           examples:
 *             basic_status:
 *               summary: Get device status
 *               value:
 *                 command: status
 *             set_interval:
 *               summary: Set reading interval
 *               value:
 *                 command: set_reading_interval
 *                 parameters:
 *                   interval_ms: 300000
 *             toggle_sensor:
 *               summary: Enable/disable sensor
 *               value:
 *                 command: toggle_sensor
 *                 parameters:
 *                   sensor: mh_rd
 *                   enabled: true
 *             calibration:
 *               summary: Set sensor calibration
 *               value:
 *                 command: set_calibration
 *                 parameters:
 *                   sensor: temperature
 *                   offset: -2.5
 *     responses:
 *       200:
 *         description: Command sent successfully
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
 *                   example: Command "status" sent successfully to station ESP32_STATION_001
 *                 command:
 *                   type: string
 *                   example: status
 *                 parameters:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       503:
 *         description: MQTT service unavailable
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
 *                   example: MQTT service unavailable or command failed to send
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/command/:stationId', verifyToken, requireRole('user'), validateParams, validateConfigCommand, configController.sendCommand);

/**
 * @swagger
 * /config/commands:
 *   get:
 *     summary: Get available configuration commands
 *     description: Retrieve list of all available remote configuration commands with their parameters
 *     tags: [Configuration]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of available commands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 commands:
 *                   type: object
 *                   properties:
 *                     basic:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           command:
 *                             type: string
 *                           description:
 *                             type: string
 *                           parameters:
 *                             type: object
 *                     measurement:
 *                       type: array
 *                       items:
 *                         type: object
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     power:
 *                       type: array
 *                       items:
 *                         type: object
 *                     connectivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of available commands
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/commands', optionalAuth, configController.getAvailableCommands);

/**
 * @swagger
 * /config/status/{stationId}:
 *   get:
 *     summary: Get configuration status for station
 *     description: Get current configuration status and connectivity info for specific weather station
 *     tags: [Configuration]
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
 *         description: Configuration status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 station_id:
 *                   type: string
 *                   example: ESP32_STATION_001
 *                 last_command_sent:
 *                   type: string
 *                   nullable: true
 *                 mqtt_connected:
 *                   type: boolean
 *                   example: true
 *                 available_commands:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status/:stationId', optionalAuth, validateParams, configController.getConfigStatus);

module.exports = router;