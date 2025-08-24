import { io, Socket } from 'socket.io-client';
import { WeatherDataPoint, Alert } from './weatherService';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private currentServerUrl: string = '';
  private isRetrying: boolean = false;

  connect(serverUrl?: string) {
    // Try HTTPS first (through nginx), fallback to direct backend
    if (!serverUrl) {
      const baseApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api';
      if (baseApiUrl.includes('https://localhost')) {
        // Using nginx proxy - try WebSocket through nginx first
        serverUrl = 'https://localhost';
      } else {
        // Direct backend access
        serverUrl = baseApiUrl.replace('/api', '');
      }
    }
    if (this.socket?.connected) {
      return;
    }

    this.currentServerUrl = serverUrl;
    console.log('Attempting WebSocket connection to:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 5000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to weather station server:', serverUrl);
      this.isRetrying = false;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from weather station server');
      this.emit('connection', { status: 'disconnected' });
    });

    this.socket.on('weather-data', (data: WeatherDataPoint) => {
      this.emit('weather-data', data);
    });

    this.socket.on('new-alert', (alert: Alert) => {
      this.emit('new-alert', alert);
    });

    this.socket.on('station-status', (status: any) => {
      this.emit('station-status', status);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error to', serverUrl, ':', error);
      this.tryFallbackConnection();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('connection', { status: 'error', error });
    });
  }

  private tryFallbackConnection() {
    if (this.isRetrying) return;
    this.isRetrying = true;

    // If we were trying nginx proxy (https://localhost), try direct backend
    if (this.currentServerUrl === 'https://localhost') {
      console.log('WebSocket via nginx failed, trying direct backend connection...');
      this.disconnect();
      setTimeout(() => {
        this.connect('http://localhost:5002');
      }, 1000);
    } else {
      console.log('WebSocket connection failed, giving up after fallback attempt');
      this.emit('connection', { status: 'error', error: 'WebSocket connection failed' });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Suscribirse a una estación específica
  subscribeToStation(stationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-station', stationId);
    }
  }

  // Desuscribirse de una estación
  unsubscribeFromStation(stationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-station', stationId);
    }
  }

  // Método genérico para escuchar eventos
  on(eventName: string, callback: Function) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback);
  }

  // Método para dejar de escuchar eventos
  off(eventName: string, callback?: Function) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const callbacks = this.listeners.get(eventName)!;
    if (callback) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.set(eventName, []);
    }
  }

  // Emitir eventos a los listeners locales
  private emit(eventName: string, data: any) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket listener for ${eventName}:`, error);
        }
      });
    }
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Obtener el estado de la conexión
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'error';
  }
}

// Exportar una instancia singleton
export const socketService = new SocketService();

// Hook personalizado para React
export const useSocket = () => {
  return {
    socket: socketService,
    isConnected: socketService.isConnected(),
    connectionState: socketService.getConnectionState(),
  };
};