require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

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

const PORT = 5002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: 'enabled'
  });
});

// Mock API endpoint for latest data
app.get('/api/weather/data/:stationId/latest', (req, res) => {
  const mockData = {
    station_id: req.params.stationId,
    temperature: 22.5 + Math.random() * 5,
    humidity: 60 + Math.random() * 20,
    pressure: 1013 + Math.random() * 20,
    wind_speed: Math.random() * 15,
    wind_direction: Math.random() * 360,
    rainfall: Math.random() * 2,
    timestamp: new Date().toISOString()
  };
  res.json(mockData);
});

// WebSocket setup
const connectedClients = new Map();
const stationSubscriptions = new Map();

io.on('connection', (socket) => {
  const clientId = socket.id;
  console.log(`Cliente WebSocket conectado: ${clientId}`);
  
  connectedClients.set(clientId, {
    socket,
    connectedAt: new Date(),
    subscribedStations: new Set()
  });

  // Handle station subscription
  socket.on('subscribe-station', (stationId) => {
    console.log(`Cliente ${clientId} se suscribió a estación ${stationId}`);
    
    const client = connectedClients.get(clientId);
    if (client) {
      client.subscribedStations.add(stationId);
      
      if (!stationSubscriptions.has(stationId)) {
        stationSubscriptions.set(stationId, new Set());
      }
      stationSubscriptions.get(stationId).add(clientId);
      
      socket.emit('subscription-confirmed', {
        stationId,
        status: 'subscribed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle station unsubscription
  socket.on('unsubscribe-station', (stationId) => {
    console.log(`Cliente ${clientId} se desuscribió de estación ${stationId}`);
    
    const client = connectedClients.get(clientId);
    if (client) {
      client.subscribedStations.delete(stationId);
      
      if (stationSubscriptions.has(stationId)) {
        stationSubscriptions.get(stationId).delete(clientId);
        
        if (stationSubscriptions.get(stationId).size === 0) {
          stationSubscriptions.delete(stationId);
        }
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Cliente WebSocket desconectado: ${clientId}`);
    
    const client = connectedClients.get(clientId);
    if (client) {
      client.subscribedStations.forEach(stationId => {
        if (stationSubscriptions.has(stationId)) {
          stationSubscriptions.get(stationId).delete(clientId);
          
          if (stationSubscriptions.get(stationId).size === 0) {
            stationSubscriptions.delete(stationId);
          }
        }
      });
    }
    connectedClients.delete(clientId);
  });

  // Send connection confirmation
  socket.emit('connection', { 
    status: 'connected', 
    clientId,
    timestamp: new Date().toISOString()
  });
});

// Simulate weather data broadcasting every 20 seconds
setInterval(() => {
  const stationId = 'ESP32_STATION_001';
  
  if (stationSubscriptions.has(stationId) && stationSubscriptions.get(stationId).size > 0) {
    const mockData = {
      station_id: stationId,
      temperature: 22.5 + Math.random() * 5,
      humidity: 60 + Math.random() * 20,
      pressure: 1013 + Math.random() * 20,
      wind_speed: Math.random() * 15,
      wind_direction: Math.random() * 360,
      rainfall: Math.random() * 2,
      timestamp: new Date().toISOString()
    };

    const payload = {
      stationId,
      data: mockData,
      timestamp: new Date().toISOString()
    };

    const subscribers = stationSubscriptions.get(stationId);
    subscribers.forEach(clientId => {
      const client = connectedClients.get(clientId);
      if (client && client.socket.connected) {
        client.socket.emit('weather-data', payload);
      }
    });

    console.log(`Datos simulados enviados a ${subscribers.size} clientes para estación ${stationId}`);
  }
}, 20000);

// Start server
httpServer.listen(PORT, () => {
  console.log(`✅ Servidor de prueba WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`✅ WebSocket habilitado para pruebas`);
  console.log(`✅ Frontend puede conectarse en http://localhost:3000 o 3001`);
  console.log(`✅ Datos simulados se envían cada 20 segundos`);
});