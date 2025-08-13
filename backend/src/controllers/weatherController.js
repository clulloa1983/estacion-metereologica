const { queryWeatherData, writeWeatherData, flushWrites, bucket } = require('../config/influxdb');
const logger = require('../config/logger');

const receiveWeatherData = async (req, res) => {
  try {
    const { station_id, ...data } = req.body;
    
    // Validate timestamp - if it's not a valid ISO string, use server time
    let timestamp;
    if (data.timestamp) {
      // Check if timestamp is a valid ISO string or a reasonable epoch timestamp
      const parsedTime = new Date(data.timestamp);
      const isValidDate = !isNaN(parsedTime.getTime());
      const isReasonableTimestamp = typeof data.timestamp === 'string' && data.timestamp.includes('-');
      
      if (isValidDate && isReasonableTimestamp) {
        timestamp = data.timestamp;
      } else {
        // Invalid timestamp (likely millis() from Arduino), use server time
        timestamp = new Date().toISOString();
      }
    } else {
      timestamp = new Date().toISOString();
    }
    
    const weatherData = {
      timestamp,
      ...data
    };

    writeWeatherData(station_id, weatherData);
    await flushWrites();

    logger.info(`Weather data received from station ${station_id}`);
    
    res.status(200).json({
      success: true,
      message: 'Data received successfully',
      timestamp: weatherData.timestamp
    });
  } catch (error) {
    logger.error('Error receiving weather data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store weather data'
    });
  }
};

const getWeatherData = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { start, end, limit = 500, aggregation, timeRange } = req.query;
    
    // Map timeRange to start parameter if timeRange is provided
    let actualStart = start;
    if (timeRange && !start) {
      actualStart = `-${timeRange}`;
    }

    let query = `
      from(bucket: "${bucket}")
        |> range(start: ${actualStart || '-24h'}, stop: ${end || 'now()'})
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
    `;

    if (aggregation) {
      const window = aggregation === 'hourly' ? '1h' : aggregation === 'daily' ? '1d' : '5m';
      query += `
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
      `;
    }

    // For time ranges > 6h, sample data to avoid too many points
    const timeRangeValue = actualStart || '-24h';
    const isLongRange = timeRangeValue.includes('d') || 
                       (timeRangeValue.includes('h') && parseInt(timeRangeValue.replace('-', '').replace('h', '')) > 6);
    
    if (isLongRange && !aggregation) {
      query += `
        |> aggregateWindow(every: 10m, fn: mean, createEmpty: false)
      `;
    }

    query += `
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${parseInt(limit)})
      |> sort(columns: ["_time"], desc: false)
      |> yield(name: "mean")
    `;

    const rawData = await queryWeatherData(query);
    
    // Transformar datos de InfluxDB al formato esperado por el frontend
    const transformedData = [];
    const dataByTime = {};
    
    // Agrupar datos por timestamp
    rawData.forEach(row => {
      const time = row._time;
      if (!dataByTime[time]) {
        dataByTime[time] = {
          timestamp: time,
          station_id: row.station_id
        };
      }
      dataByTime[time][row._field] = row._value;
    });
    
    // Convertir a array
    Object.values(dataByTime).forEach(record => {
      transformedData.push(record);
    });
    
    // Ordenar por timestamp
    transformedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      success: true,
      data: transformedData,
      count: transformedData.length
    });
  } catch (error) {
    logger.error('Error querying weather data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve weather data'
    });
  }
};

const getLatestData = async (req, res) => {
  try {
    const { stationId } = req.params;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> last()
        |> yield(name: "latest")
    `;

    const data = await queryWeatherData(query);
    
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No recent data found for this station'
      });
    }

    const latestData = {};
    data.forEach(row => {
      latestData[row._field] = row._value;
      latestData.timestamp = row._time;
    });

    res.json({
      success: true,
      data: latestData,
      station_id: stationId
    });
  } catch (error) {
    logger.error('Error getting latest data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve latest data'
    });
  }
};

const getSummary = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { start = '-24h', end = 'now()' } = req.query;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> group(columns: ["_field"])
        |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
    `;

    const data = await queryWeatherData(query);
    
    const summary = {
      station_id: stationId,
      period: { start, end },
      measurements: {}
    };

    data.forEach(row => {
      if (!summary.measurements[row._field]) {
        summary.measurements[row._field] = [];
      }
      summary.measurements[row._field].push({
        time: row._time,
        value: row._value
      });
    });

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve summary data'
    });
  }
};

const getStations = async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "weather")
        |> group(columns: ["station_id"])
        |> distinct(column: "station_id")
        |> yield(name: "stations")
    `;

    const data = await queryWeatherData(query);
    const stations = [...new Set(data.map(row => row.station_id))];

    res.json({
      success: true,
      stations: stations
    });
  } catch (error) {
    logger.error('Error getting stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stations'
    });
  }
};

const exportData = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { start = '-7d', end = 'now()', format = 'csv' } = req.query;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r.station_id == "${stationId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> yield(name: "export")
    `;

    const data = await queryWeatherData(query);

    if (format === 'csv') {
      const fields = Object.keys(data[0] || {}).filter(key => !key.startsWith('_'));
      let csv = fields.join(',') + '\n';
      
      data.forEach(row => {
        const values = fields.map(field => row[field] || '');
        csv += values.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${stationId}_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data,
        format: 'json',
        count: data.length
      });
    }
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
};

module.exports = {
  receiveWeatherData,
  getWeatherData,
  getLatestData,
  getSummary,
  getStations,
  exportData
};