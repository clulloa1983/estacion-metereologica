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

  // Always use current timestamp - Arduino timestamp is millis since boot, not Unix timestamp
  point.timestamp(new Date());

  // Add all numeric fields except metadata
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'timestamp' && key !== 'station_id' && typeof value === 'number' && !isNaN(value)) {
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