import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PWAManager from '../PWAManager';
import * as notificationService from '../../services/notificationService';
import * as offlineService from '../../services/offlineService';
import * as deviceSensorService from '../../services/deviceSensorService';

// Mock de los servicios
jest.mock('../../services/notificationService', () => ({
  notificationService: {
    isNotificationEnabled: jest.fn(),
    requestPermission: jest.fn(),
    subscribeToServerNotifications: jest.fn(),
    unsubscribeFromServerNotifications: jest.fn(),
    showSystemNotification: jest.fn(),
    showWeatherAlert: jest.fn(),
  }
}));

jest.mock('../../services/offlineService', () => ({
  offlineService: {
    getStorageStats: jest.fn(),
    syncPendingActions: jest.fn(),
    cleanupOldData: jest.fn(),
  }
}));

jest.mock('../../services/deviceSensorService', () => ({
  deviceSensorService: {
    getCapabilities: jest.fn(),
    requestPermissions: jest.fn(),
    getAllSensorReadings: jest.fn(),
    vibrate: jest.fn(),
  }
}));

// Mock del navegador
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('PWAManager', () => {
  const mockNotificationService = notificationService.notificationService as jest.Mocked<typeof notificationService.notificationService>;
  const mockOfflineService = offlineService.offlineService as jest.Mocked<typeof offlineService.offlineService>;
  const mockDeviceSensorService = deviceSensorService.deviceSensorService as jest.Mocked<typeof deviceSensorService.deviceSensorService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockNotificationService.isNotificationEnabled.mockReturnValue(false);
    mockOfflineService.getStorageStats.mockResolvedValue({
      weatherDataCount: 10,
      alertsCount: 5,
      pendingActionsCount: 2,
      storageUsed: 1.5,
    });
    mockDeviceSensorService.getCapabilities.mockReturnValue({
      geolocation: true,
      deviceMotion: true,
      deviceOrientation: true,
      ambientLight: false,
      battery: true,
      networkInformation: true,
    });
    mockDeviceSensorService.requestPermissions.mockResolvedValue({
      geolocation: 'granted',
      deviceMotion: 'granted',
      ambientLight: 'denied',
    });
  });

  describe('Rendering', () => {
    it('should render PWA Manager title', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('PWA Manager')).toBeInTheDocument();
      });
    });

    it('should render connectivity status', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    it('should show offline status when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });
  });

  describe('Notifications Section', () => {
    it('should show notifications as disabled by default', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });
    });

    it('should enable notifications when toggle is clicked', async () => {
      mockNotificationService.requestPermission.mockResolvedValue(true);
      mockNotificationService.subscribeToServerNotifications.mockResolvedValue(true);
      
      render(<PWAManager />);
      
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockNotificationService.requestPermission).toHaveBeenCalled();
        expect(mockNotificationService.subscribeToServerNotifications).toHaveBeenCalledWith('ESP32_STATION_001');
      });
    });

    it('should show test buttons when notifications are enabled', async () => {
      mockNotificationService.isNotificationEnabled.mockReturnValue(true);
      
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Sistema')).toBeInTheDocument();
        expect(screen.getByText('Test Alerta')).toBeInTheDocument();
      });
    });

    it('should execute test notification when button is clicked', async () => {
      mockNotificationService.isNotificationEnabled.mockReturnValue(true);
      
      render(<PWAManager />);
      
      const testButton = await screen.findByText('Test Sistema');
      fireEvent.click(testButton);
      
      expect(mockNotificationService.showSystemNotification).toHaveBeenCalledWith(
        'PWA Test',
        'Las notificaciones están funcionando correctamente',
        'success'
      );
    });

    it('should execute weather alert test when button is clicked', async () => {
      mockNotificationService.isNotificationEnabled.mockReturnValue(true);
      
      render(<PWAManager />);
      
      const testButton = await screen.findByText('Test Alerta');
      fireEvent.click(testButton);
      
      expect(mockNotificationService.showWeatherAlert).toHaveBeenCalledWith({
        id: 'test-alert',
        stationId: 'ESP32_STATION_001',
        parameter: 'temperature',
        value: 35.5,
        threshold: 35,
        severity: 'HIGH',
        message: 'Temperatura alta detectada',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Offline Storage Section', () => {
    it('should display storage statistics', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Datos meteorológicos: 10')).toBeInTheDocument();
        expect(screen.getByText('Alertas: 5')).toBeInTheDocument();
        expect(screen.getByText('Acciones pendientes: 2')).toBeInTheDocument();
        expect(screen.getByText('Almacenamiento usado: 1.5 MB')).toBeInTheDocument();
      });
    });

    it('should sync offline data when button is clicked', async () => {
      render(<PWAManager />);
      
      const syncButton = await screen.findByText('Sincronizar');
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(mockOfflineService.syncPendingActions).toHaveBeenCalled();
      });
    });

    it('should disable sync button when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      render(<PWAManager />);
      
      await waitFor(() => {
        const syncButton = screen.getByText('Sincronizar');
        expect(syncButton).toBeDisabled();
      });
    });

    it('should clear offline data when button is clicked', async () => {
      render(<PWAManager />);
      
      const clearButton = await screen.findByText('Limpiar Datos');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(mockOfflineService.cleanupOldData).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('Device Sensors Section', () => {
    it('should display device capabilities', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Geolocalización')).toBeInTheDocument();
        expect(screen.getByText('Movimiento')).toBeInTheDocument();
        expect(screen.getByText('Batería')).toBeInTheDocument();
        expect(screen.getByText('Información de Red')).toBeInTheDocument();
      });
    });

    it('should show permission status chips', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        const chips = screen.getAllByText('granted');
        expect(chips).toHaveLength(2); // geolocation and deviceMotion
      });
    });

    it('should test device sensors when button is clicked', async () => {
      mockDeviceSensorService.getAllSensorReadings.mockResolvedValue({
        location: { latitude: 40.7128, longitude: -74.0060, timestamp: Date.now() },
        timestamp: Date.now(),
      });
      
      render(<PWAManager />);
      
      const testButton = await screen.findByText('Probar Sensores');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(mockDeviceSensorService.getAllSensorReadings).toHaveBeenCalled();
        expect(mockDeviceSensorService.vibrate).toHaveBeenCalledWith([200, 100, 200]);
        expect(mockNotificationService.showSystemNotification).toHaveBeenCalledWith(
          'Sensores del Dispositivo',
          'Lecturas obtenidas. Ver consola para detalles.',
          'info'
        );
      });
    });
  });

  describe('PWA Information Section', () => {
    it('should display PWA information', async () => {
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Información PWA')).toBeInTheDocument();
        expect(screen.getByText('Instalable')).toBeInTheDocument();
        expect(screen.getByText('Modo Offline')).toBeInTheDocument();
        expect(screen.getByText('Notificaciones')).toBeInTheDocument();
        expect(screen.getByText('Sincronización')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Station ID', () => {
    it('should use custom station ID when provided', async () => {
      const customStationId = 'CUSTOM_STATION_001';
      render(<PWAManager stationId={customStationId} />);
      
      // Enable notifications to trigger subscription
      mockNotificationService.requestPermission.mockResolvedValue(true);
      
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockNotificationService.subscribeToServerNotifications).toHaveBeenCalledWith(customStationId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle notification service errors gracefully', async () => {
      mockNotificationService.requestPermission.mockRejectedValue(new Error('Permission error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PWAManager />);
      
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockNotificationService.requestPermission).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle offline service errors gracefully', async () => {
      mockOfflineService.getStorageStats.mockRejectedValue(new Error('Storage error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PWAManager />);
      
      // Component should still render despite the error
      await waitFor(() => {
        expect(screen.getByText('PWA Manager')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle device sensor service errors gracefully', async () => {
      mockDeviceSensorService.requestPermissions.mockRejectedValue(new Error('Sensor error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PWAManager />);
      
      await waitFor(() => {
        expect(screen.getByText('PWA Manager')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });
  });
});