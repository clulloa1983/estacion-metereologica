import { io, Socket } from 'socket.io-client';
import { WeatherDataPoint, Alert } from './weatherService';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(serverUrl: string = 'http://localhost:5002') {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to weather station server');
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
      console.error('Socket connection error:', error);
      this.emit('connection', { status: 'error', error });
    });
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