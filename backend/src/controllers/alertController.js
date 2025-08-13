const { queryWeatherData, writeAlert, bucket } = require('../config/influxdb');
const logger = require('../config/logger');

const getAlerts = async (req, res) => {
  try {
    const { start = '-7d', end = 'now()', severity, acknowledged, limit = 50 } = req.query;

    let query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "alerts")
    `;

    if (severity) {
      query += `|> filter(fn: (r) => r.severity == "${severity}")`;
    }

    if (acknowledged !== undefined) {
      const ackValue = acknowledged === 'true';
      query += `|> filter(fn: (r) => r.acknowledged == ${ackValue})`;
    }

    query += `
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${parseInt(limit)})
      |> yield(name: "alerts")
    `;

    const data = await queryWeatherData(query);
    
    res.json({
      success: true,
      alerts: data,
      count: data.length
    });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
};

const getStationAlerts = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { start = '-7d', end = 'now()', severity, limit = 50 } = req.query;

    let query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "alerts")
        |> filter(fn: (r) => r.station_id == "${stationId}")
    `;

    if (severity) {
      query += `|> filter(fn: (r) => r.severity == "${severity}")`;
    }

    query += `
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${parseInt(limit)})
      |> yield(name: "station_alerts")
    `;

    const data = await queryWeatherData(query);
    
    res.json({
      success: true,
      station_id: stationId,
      alerts: data,
      count: data.length
    });
  } catch (error) {
    logger.error('Error getting station alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve station alerts'
    });
  }
};

const createAlert = async (req, res) => {
  try {
    const alertData = {
      station_id: req.body.station_id,
      alert_type: req.body.alert_type || 'custom',
      severity: req.body.severity || 'MEDIUM',
      message: req.body.message,
      timestamp: req.body.timestamp || new Date().toISOString(),
      acknowledged: false
    };

    writeAlert(alertData);
    
    logger.info(`Manual alert created for station ${alertData.station_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert: alertData
    });
  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    
    res.status(501).json({
      success: false,
      error: 'Alert acknowledgment not yet implemented'
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
};

const getAlertSummary = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { start = '-7d', end = 'now()' } = req.query;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "alerts")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> group(columns: ["severity"])
        |> count()
        |> yield(name: "alert_summary")
    `;

    const data = await queryWeatherData(query);
    
    const summary = {
      station_id: stationId,
      period: { start, end },
      total: 0,
      by_severity: {}
    };

    data.forEach(row => {
      summary.by_severity[row.severity] = row._value;
      summary.total += row._value;
    });

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Error getting alert summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert summary'
    });
  }
};

module.exports = {
  getAlerts,
  getStationAlerts,
  createAlert,
  acknowledgeAlert,
  getAlertSummary
};