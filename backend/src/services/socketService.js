const logger = require('../config/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.stationSubscriptions = new Map();
  }

  initialize(io) {
    this.io = io;
    this.setupSocketHandlers();
    logger.info('Socket.IO service initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.set(clientId, {
        socket,
        connectedAt: new Date(),
        subscribedStations: new Set()
      });

      logger.info(`Client connected: ${clientId}`);

      // Handle station subscription
      socket.on('subscribe-station', (stationId) => {
        this.subscribeToStation(clientId, stationId);
      });

      // Handle station unsubscription
      socket.on('unsubscribe-station', (stationId) => {
        this.unsubscribeFromStation(clientId, stationId);
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.handleClientDisconnect(clientId);
      });

      // Send connection confirmation
      socket.emit('connection', { 
        status: 'connected', 
        clientId,
        timestamp: new Date().toISOString()
      });
    });
  }

  subscribeToStation(clientId, stationId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    client.subscribedStations.add(stationId);

    // Track station subscriptions for broadcasting
    if (!this.stationSubscriptions.has(stationId)) {
      this.stationSubscriptions.set(stationId, new Set());
    }
    this.stationSubscriptions.get(stationId).add(clientId);

    logger.info(`Client ${clientId} subscribed to station ${stationId}`);

    client.socket.emit('subscription-confirmed', {
      stationId,
      status: 'subscribed',
      timestamp: new Date().toISOString()
    });
  }

  unsubscribeFromStation(clientId, stationId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    client.subscribedStations.delete(stationId);

    if (this.stationSubscriptions.has(stationId)) {
      this.stationSubscriptions.get(stationId).delete(clientId);
      
      // Clean up empty station subscriptions
      if (this.stationSubscriptions.get(stationId).size === 0) {
        this.stationSubscriptions.delete(stationId);
      }
    }

    logger.info(`Client ${clientId} unsubscribed from station ${stationId}`);

    client.socket.emit('subscription-confirmed', {
      stationId,
      status: 'unsubscribed',
      timestamp: new Date().toISOString()
    });
  }

  handleClientDisconnect(clientId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    // Clean up all station subscriptions for this client
    client.subscribedStations.forEach(stationId => {
      if (this.stationSubscriptions.has(stationId)) {
        this.stationSubscriptions.get(stationId).delete(clientId);
        
        if (this.stationSubscriptions.get(stationId).size === 0) {
          this.stationSubscriptions.delete(stationId);
        }
      }
    });

    this.connectedClients.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`);
  }

  // Broadcast weather data to subscribed clients
  broadcastWeatherData(stationId, data) {
    if (!this.stationSubscriptions.has(stationId)) {
      return; // No subscribers for this station
    }

    const subscribers = this.stationSubscriptions.get(stationId);
    const payload = {
      stationId,
      data,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client && client.socket.connected) {
        client.socket.emit('weather-data', payload);
      }
    });

    logger.debug(`Weather data broadcasted to ${subscribers.size} clients for station ${stationId}`);
  }

  // Broadcast new alert to subscribed clients
  broadcastAlert(stationId, alert) {
    if (!this.stationSubscriptions.has(stationId)) {
      return;
    }

    const subscribers = this.stationSubscriptions.get(stationId);
    const payload = {
      stationId,
      alert,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client && client.socket.connected) {
        client.socket.emit('new-alert', payload);
      }
    });

    logger.info(`Alert broadcasted to ${subscribers.size} clients for station ${stationId}`);
  }

  // Broadcast station status updates
  broadcastStationStatus(stationId, status) {
    if (!this.stationSubscriptions.has(stationId)) {
      return;
    }

    const subscribers = this.stationSubscriptions.get(stationId);
    const payload = {
      stationId,
      status,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client && client.socket.connected) {
        client.socket.emit('station-status', payload);
      }
    });

    logger.debug(`Station status broadcasted to ${subscribers.size} clients for station ${stationId}`);
  }

  // Get connection statistics
  getStats() {
    const stats = {
      connectedClients: this.connectedClients.size,
      totalStationSubscriptions: this.stationSubscriptions.size,
      stationDetails: {}
    };

    this.stationSubscriptions.forEach((subscribers, stationId) => {
      stats.stationDetails[stationId] = {
        subscribers: subscribers.size
      };
    });

    return stats;
  }

  // Broadcast system-wide message to all connected clients
  broadcastSystemMessage(message, type = 'info') {
    const payload = {
      type,
      message,
      timestamp: new Date().toISOString()
    };

    this.connectedClients.forEach(client => {
      if (client.socket.connected) {
        client.socket.emit('system-message', payload);
      }
    });

    logger.info(`System message broadcasted to ${this.connectedClients.size} clients`);
  }
}

// Export singleton instance
module.exports = new SocketService();