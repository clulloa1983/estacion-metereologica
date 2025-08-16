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
const { rateLimiter } = require('./middleware/rateLimiter');

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
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (will be updated to require authentication)
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);

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

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
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