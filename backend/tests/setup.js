// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.INFLUXDB_URL = 'http://localhost:8086';
process.env.INFLUXDB_TOKEN = 'test-token';
process.env.INFLUXDB_ORG = 'test-org';
process.env.INFLUXDB_BUCKET = 'test-bucket';
process.env.MQTT_BROKER_URL = 'mqtt://localhost:1883';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock external services
jest.mock('../src/config/influxdb.js', () => ({
  writeWeatherData: jest.fn(),
  writeAlert: jest.fn(),
  queryWeatherData: jest.fn(),
  flushWrites: jest.fn()
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn()
  }))
}));

jest.mock('mqtt', () => ({
  connect: jest.fn(() => ({
    on: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    end: jest.fn()
  }))
}));