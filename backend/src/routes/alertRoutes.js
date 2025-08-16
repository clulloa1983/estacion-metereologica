const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { validateAlert, validateQuery, validateParams } = require('../middleware/validation');
const { verifyApiKey, optionalAuth, requireRole } = require('../middleware/auth');

// Read endpoints (require authentication)
router.get('/', optionalAuth, validateQuery, alertController.getAlerts);

router.get('/:stationId', optionalAuth, validateParams, validateQuery, alertController.getStationAlerts);

router.get('/summary/:stationId', optionalAuth, validateParams, alertController.getAlertSummary);

// Write endpoints (require API key for devices, user role for web)
router.post('/', verifyApiKey, validateAlert, alertController.createAlert);

// Action endpoints (require user role or higher)
router.put('/:alertId/acknowledge', optionalAuth, requireRole('user'), validateParams, alertController.acknowledgeAlert);

module.exports = router;