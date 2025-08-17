require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

const logger = require('./config/logger');
const influxClient = require('./config/influxdb');
const mqttService = require('./services/mqttService');
const cacheService = require('./services/cacheService');
const socketService = require('./services/socketService');
const weatherRoutes = require('./routes/weatherRoutes');
const alertRoutes = require('./routes/alertRoutes');
const authRoutes = require('./routes/authRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger, addUserContext, errorLogger } = require('./middleware/requestLogger');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 5002;

app.use(helmet());
app.use(cors());
app.use(compression());

// Enhanced request logging (replaces morgan)
app.use(requestLogger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);

// Add user context after authentication middleware
app.use(addUserContext);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (will be updated to require authentication)
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/monitoring', monitoringRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API server and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Server is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    cache: {
      connected: cacheService.isConnected,
      service: 'Redis'
    }
  });
});

// Error logging middleware
app.use(errorLogger);

app.use((err, req, res, next) => {
  // Error is already logged by errorLogger middleware
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { requestId: req.requestId })
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    // Test InfluxDB connection
    await influxClient.queryApi.queryRows('buckets()', {
      next: () => {},
      error: (error) => { throw error; },
      complete: () => {}
    });
    logger.info('Connected to InfluxDB');

    await mqttService.connect();
    logger.info('Connected to MQTT broker');

    await cacheService.connect();
    logger.info('Cache service initialized');

    // Initialize Socket.IO service
    socketService.initialize(io);
    
    // Pass socketService to services for real-time broadcasts
    mqttService.setSocketService(socketService);
    
    // Import and configure alertService
    const alertService = require('./services/alertService');
    alertService.setSocketService(socketService);

    httpServer.listen(PORT, () => {
      logger.info(`Weather Station API running on port ${PORT}`);
      logger.info(`WebSocket server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await cacheService.disconnect();
  process.exit(0);
});

startServer();