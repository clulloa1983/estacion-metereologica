const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { validateAlert, validateQuery } = require('../middleware/validation');

router.get('/', validateQuery, alertController.getAlerts);

router.get('/:stationId', validateQuery, alertController.getStationAlerts);

router.post('/', validateAlert, alertController.createAlert);

router.put('/:alertId/acknowledge', alertController.acknowledgeAlert);

router.get('/summary/:stationId', alertController.getAlertSummary);

module.exports = router;