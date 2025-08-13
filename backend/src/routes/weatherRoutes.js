const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { validateWeatherData, validateQuery } = require('../middleware/validation');

router.post('/data', validateWeatherData, weatherController.receiveWeatherData);

router.get('/data/:stationId', validateQuery, weatherController.getWeatherData);

router.get('/data/:stationId/latest', weatherController.getLatestData);

router.get('/data/:stationId/summary', validateQuery, weatherController.getSummary);

router.get('/stations', weatherController.getStations);

router.get('/export/:stationId', validateQuery, weatherController.exportData);

module.exports = router;