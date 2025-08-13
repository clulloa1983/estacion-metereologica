const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG || 'weather-station';
const bucket = process.env.INFLUXDB_BUCKET || 'weather-data';

const influxDB = new InfluxDB({ url, token });

const writeApi = influxDB.getWriteApi(org, bucket);
writeApi.useDefaultTags({ host: 'weather-station-api' });

const queryApi = influxDB.getQueryApi(org);

const writeWeatherData = (stationId, data) => {
  const point = new Point('weather')
    .tag('station_id', stationId);

  // Handle timestamp - if it's a very large number (microseconds), convert to milliseconds
  if (data.timestamp) {
    let timestamp = data.timestamp;
    if (typeof timestamp === 'number' && !isNaN(timestamp)) {
      // If timestamp is too large (microseconds), convert to milliseconds
      if (timestamp > 9999999999999) {
        timestamp = Math.floor(timestamp / 1000);
      }
      // Validate the resulting timestamp is reasonable
      if (timestamp > 0 && timestamp < 9999999999999) {
        point.timestamp(new Date(timestamp));
      } else {
        point.timestamp(new Date());
      }
    } else if (typeof timestamp === 'string') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        point.timestamp(parsedDate);
      } else {
        point.timestamp(new Date());
      }
    } else {
      point.timestamp(new Date());
    }
  } else {
    point.timestamp(new Date());
  }

  Object.entries(data.measurements || data).forEach(([key, value]) => {
    if (key !== 'timestamp' && typeof value === 'number' && !isNaN(value)) {
      point.floatField(key, value);
    }
  });

  writeApi.writePoint(point);
};

const writeAlert = (alertData) => {
  const point = new Point('alerts')
    .tag('station_id', alertData.station_id)
    .tag('alert_type', alertData.alert_type)
    .tag('severity', alertData.severity)
    .stringField('message', alertData.message)
    .booleanField('acknowledged', alertData.acknowledged || false)
    .timestamp(new Date(alertData.timestamp));

  writeApi.writePoint(point);
};

const flushWrites = async () => {
  try {
    await writeApi.flush();
  } catch (error) {
    console.error('Error flushing writes:', error);
    throw error;
  }
};

const queryWeatherData = async (query) => {
  const rows = [];
  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        rows.push(tableObject);
      },
      error: (error) => {
        console.error('Query error:', error);
        reject(error);
      },
      complete: () => {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  influxDB,
  writeApi,
  queryApi,
  writeWeatherData,
  writeAlert,
  flushWrites,
  queryWeatherData,
  bucket,
  org
};