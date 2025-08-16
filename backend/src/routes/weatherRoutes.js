const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { validateWeatherData, validateQuery } = require('../middleware/validation');
const { verifyApiKey, optionalAuth, requireRole } = require('../middleware/auth');

// Device endpoints (require API key)
router.post('/data', verifyApiKey, validateWeatherData, weatherController.receiveWeatherData);

// Read endpoints (require authentication - JWT or API key)
router.get('/data/:stationId', optionalAuth, validateQuery, weatherController.getWeatherData);

router.get('/data/:stationId/latest', optionalAuth, weatherController.getLatestData);

router.get('/data/:stationId/summary', optionalAuth, validateQuery, weatherController.getSummary);

router.get('/stations', optionalAuth, weatherController.getStations);

// Admin endpoints (require user role or higher)
router.get('/export/:stationId', optionalAuth, requireRole('user'), validateQuery, weatherController.exportData);

module.exports = router;