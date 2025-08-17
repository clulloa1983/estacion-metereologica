const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Weather Station API',
      version: '1.0.0',
      description: 'IoT Weather Station API for collecting and serving environmental sensor data',
      contact: {
        name: 'Weather Station Team',
        email: 'support@weatherstation.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5002/api',
        description: 'Development server'
      },
      {
        url: 'https://api.weatherstation.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
          description: 'API key for device authentication'
        }
      },
      schemas: {
        WeatherData: {
          type: 'object',
          required: ['station_id', 'timestamp'],
          properties: {
            station_id: {
              type: 'string',
              description: 'Unique identifier for the weather station',
              example: 'ESP32_STATION_001'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp or Unix timestamp in milliseconds',
              example: '2025-01-15T10:30:00Z'
            },
            temperature: {
              type: 'number',
              format: 'float',
              description: 'Temperature in Celsius',
              example: 23.5,
              minimum: -50,
              maximum: 60
            },
            humidity: {
              type: 'number',
              format: 'float',
              description: 'Relative humidity percentage',
              example: 65.2,
              minimum: 0,
              maximum: 100
            },
            pressure: {
              type: 'number',
              format: 'float',
              description: 'Atmospheric pressure in hPa',
              example: 1013.25,
              minimum: 800,
              maximum: 1200
            },
            wind_speed: {
              type: 'number',
              format: 'float',
              description: 'Wind speed in m/s',
              example: 5.2,
              minimum: 0,
              maximum: 100
            },
            wind_direction: {
              type: 'number',
              format: 'float',
              description: 'Wind direction in degrees (0-360)',
              example: 180,
              minimum: 0,
              maximum: 360
            },
            rainfall: {
              type: 'number',
              format: 'float',
              description: 'Rainfall in mm',
              example: 2.5,
              minimum: 0
            },
            uv_index: {
              type: 'number',
              format: 'float',
              description: 'UV index',
              example: 7.2,
              minimum: 0,
              maximum: 15
            },
            battery_voltage: {
              type: 'number',
              format: 'float',
              description: 'Battery voltage in volts',
              example: 3.7,
              minimum: 0,
              maximum: 5
            },
            signal_strength: {
              type: 'integer',
              description: 'WiFi signal strength in dBm',
              example: -45,
              minimum: -120,
              maximum: 0
            }
          }
        },
        Alert: {
          type: 'object',
          required: ['station_id', 'parameter', 'severity', 'message'],
          properties: {
            id: {
              type: 'string',
              description: 'Alert unique identifier',
              example: 'alert_123456'
            },
            station_id: {
              type: 'string',
              description: 'Weather station identifier',
              example: 'ESP32_STATION_001'
            },
            parameter: {
              type: 'string',
              description: 'Parameter that triggered the alert',
              example: 'temperature',
              enum: ['temperature', 'humidity', 'pressure', 'wind_speed', 'rainfall', 'battery_voltage']
            },
            value: {
              type: 'number',
              description: 'Parameter value that triggered the alert',
              example: 35.8
            },
            threshold: {
              type: 'number',
              description: 'Threshold value that was exceeded',
              example: 35.0
            },
            severity: {
              type: 'string',
              description: 'Alert severity level',
              example: 'HIGH',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            },
            message: {
              type: 'string',
              description: 'Alert description message',
              example: 'High temperature detected: 35.8°C exceeds threshold of 35.0°C'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Alert creation timestamp',
              example: '2025-01-15T10:30:00Z'
            },
            acknowledged: {
              type: 'boolean',
              description: 'Whether the alert has been acknowledged',
              example: false
            },
            acknowledged_by: {
              type: 'string',
              description: 'User who acknowledged the alert',
              example: 'admin@weatherstation.com'
            },
            acknowledged_at: {
              type: 'string',
              format: 'date-time',
              description: 'Alert acknowledgment timestamp',
              example: '2025-01-15T10:35:00Z'
            }
          }
        },
        Station: {
          type: 'object',
          properties: {
            station_id: {
              type: 'string',
              description: 'Station unique identifier',
              example: 'ESP32_STATION_001'
            },
            name: {
              type: 'string',
              description: 'Human-readable station name',
              example: 'Garden Weather Station'
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 40.7128 },
                longitude: { type: 'number', example: -74.0060 },
                altitude: { type: 'number', example: 10 }
              }
            },
            last_seen: {
              type: 'string',
              format: 'date-time',
              description: 'Last data received timestamp',
              example: '2025-01-15T10:30:00Z'
            },
            status: {
              type: 'string',
              description: 'Station operational status',
              example: 'online',
              enum: ['online', 'offline', 'maintenance']
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T10:30:00Z'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 86400
            },
            environment: {
              type: 'string',
              example: 'development'
            },
            cache: {
              type: 'object',
              properties: {
                connected: { type: 'boolean', example: true },
                service: { type: 'string', example: 'Redis' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type or title',
              example: 'Validation Error'
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
              example: 'Invalid station_id format'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling',
              example: 'INVALID_STATION_ID'
            },
            details: {
              type: 'object',
              description: 'Additional error details',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - invalid or missing authentication',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Weather Data',
        description: 'Weather sensor data collection and retrieval endpoints'
      },
      {
        name: 'Alerts',
        description: 'Alert management and notification endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/index.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 30px 0 }
  `,
  customSiteTitle: 'Weather Station API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};