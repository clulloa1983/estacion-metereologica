import NotificationService, { notificationService } from '../notificationService';

// Mock del navegador
const mockServiceWorker = {
  showNotification: jest.fn().mockResolvedValue(undefined),
  pushManager: {
    getSubscription: jest.fn().mockResolvedValue(null),
    subscribe: jest.fn().mockResolvedValue({
      endpoint: 'mock-endpoint',
      keys: { p256dh: 'mock-key', auth: 'mock-auth' }
    })
  }
};

const mockNavigator = {
  serviceWorker: {
    ready: Promise.resolve(mockServiceWorker),
    addEventListener: jest.fn(),
  },
  permissions: {
    query: jest.fn().mockResolvedValue({ state: 'granted' })
  }
};

const mockNotification = jest.fn();
mockNotification.permission = 'default';
mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');

const mockWindow = {
  Notification: mockNotification,
  PushManager: jest.fn(),
};

// Configurar mocks globales
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true
});

// Mock de fetch
global.fetch = jest.fn();

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = NotificationService.getInstance();
    jest.clearAllMocks();
    
    // Mock de Notification.permission
    Object.defineProperty(mockNotification, 'permission', {
      value: 'default',
      writable: true
    });
    
    // Mock de Notification.requestPermission
    mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the exported singleton instance', () => {
      const instance = NotificationService.getInstance();
      expect(notificationService).toBe(instance);
    });
  });

  describe('Capability Detection', () => {
    it('should detect notification support', () => {
      const isSupported = service.isNotificationSupported();
      expect(isSupported).toBe(true);
    });

    it('should detect when notifications are not supported', () => {
      // Temporarily remove serviceWorker
      const originalSW = (global.navigator as any).serviceWorker;
      delete (global.navigator as any).serviceWorker;
      
      const newService = new (NotificationService as any)();
      expect(newService.isNotificationSupported()).toBe(false);
      
      // Restore
      (global.navigator as any).serviceWorker = originalSW;
    });
  });

  describe('Permission Management', () => {
    it('should request notification permission', async () => {
      const result = await service.requestPermission();
      
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      mockNotification.requestPermission = jest.fn().mockResolvedValue('denied');
      
      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('should return true if permission is already granted', async () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      const newService = new (NotificationService as any)();
      const result = await newService.requestPermission();
      
      expect(result).toBe(true);
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('should handle permission request errors', async () => {
      mockNotification.requestPermission = jest.fn().mockRejectedValue(new Error('Permission error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.requestPermission();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Notification Display', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true
      });
    });

    it('should show basic notification', async () => {
      const options = {
        title: 'Test Title',
        body: 'Test Body',
      };

      await service.showNotification(options);

      expect(mockNavigator.serviceWorker.ready).resolves.toBeDefined();
    });

    it('should not show notification when not enabled', async () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'denied',
        writable: true
      });

      const newService = new (NotificationService as any)();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await newService.showNotification({
        title: 'Test',
        body: 'Test',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Notificaciones no habilitadas');
      consoleSpy.mockRestore();
    });

    it('should show weather alert notification with correct configuration', async () => {
      const alert = {
        id: 'test-alert',
        stationId: 'ESP32_STATION_001',
        parameter: 'temperature',
        value: 35.5,
        threshold: 35,
        severity: 'HIGH' as const,
        message: 'Temperatura alta detectada',
        timestamp: '2024-01-01T12:00:00Z',
      };

      await service.showWeatherAlert(alert);

      // Verify that showNotification was called with service worker
      const registration = await mockNavigator.serviceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '🔴 Alerta HIGH',
        expect.objectContaining({
          body: 'Temperatura alta detectada (temperature: 35.5)',
          tag: 'weather-alert-test-alert',
          requireInteraction: true,
          actions: expect.arrayContaining([
            expect.objectContaining({ action: 'view', title: 'Ver Dashboard' }),
            expect.objectContaining({ action: 'acknowledge', title: 'Reconocer' }),
          ]),
        })
      );
    });

    it('should show system notification', async () => {
      await service.showSystemNotification('System Test', 'Test message', 'success');

      const registration = await mockNavigator.serviceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '✅ System Test',
        expect.objectContaining({
          body: 'Test message',
          tag: 'system-success',
          requireInteraction: false,
        })
      );
    });
  });

  describe('Push Subscription', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should subscribe to server notifications', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5002/api';
      
      const result = await service.subscribeToServerNotifications('ESP32_STATION_001');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/notifications/subscribe',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('ESP32_STATION_001'),
        })
      );
    });

    it('should handle subscription without VAPID key', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await service.subscribeToServerNotifications('ESP32_STATION_001');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Clave VAPID pública no configurada');
      consoleSpy.mockRestore();
    });

    it('should handle subscription errors', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.subscribeToServerNotifications('ESP32_STATION_001');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Test Notifications', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true
      });
    });

    it('should run test notifications', async () => {
      const spy = jest.spyOn(service, 'showSystemNotification');
      
      await service.testNotifications();
      
      expect(spy).toHaveBeenCalledWith(
        'Notificaciones Habilitadas',
        'Las notificaciones push están funcionando correctamente',
        'success'
      );
    });

    it('should handle test notifications when permission denied', async () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'denied',
        writable: true
      });
      mockNotification.requestPermission = jest.fn().mockResolvedValue('denied');

      const newService = new (NotificationService as any)();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await newService.testNotifications();
      
      expect(consoleSpy).toHaveBeenCalledWith('No se pudieron habilitar las notificaciones');
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    it('should convert VAPID key from base64 to Uint8Array', () => {
      const testKey = 'BEl62iUYgUivxIkv69yViEuiBIa25H7m_NPmBvI-mjzZJumlN7ORd94MF1Lnq3GvFcZWQ';
      
      // Access private method through service instance
      const result = (service as any).urlBase64ToUint8Array(testKey);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle notification click data', async () => {
      const testData = {
        action: 'acknowledge',
        alert: { id: 'test-alert' },
      };

      const acknowledgeSpy = jest.spyOn(service as any, 'acknowledgeAlert').mockResolvedValue(undefined);
      
      (service as any).handleNotificationClick(testData);
      
      expect(acknowledgeSpy).toHaveBeenCalledWith('test-alert');
    });
  });
});