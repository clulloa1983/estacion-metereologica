export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export interface WeatherAlert {
  id: string;
  stationId: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
}

class NotificationService {
  private static instance: NotificationService;
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';
  private subscription: PushSubscription | null = null;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Verificar si las notificaciones están soportadas
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Verificar si las notificaciones están habilitadas
   */
  isNotificationEnabled(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Solicitar permisos para notificaciones
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notificaciones no soportadas en este navegador');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos de notificación:', error);
      return false;
    }
  }

  /**
   * Mostrar notificación local
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isNotificationEnabled()) {
      console.warn('Notificaciones no habilitadas');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/icon-72x72.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          actions: options.actions || [],
          data: options.data,
          vibrate: [200, 100, 200],
          silent: false,
        });
      } else {
        // Fallback para navegadores sin service worker
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          data: options.data,
        });
      }
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  /**
   * Mostrar notificación de alerta meteorológica
   */
  async showWeatherAlert(alert: WeatherAlert): Promise<void> {
    const severityConfig = {
      LOW: { icon: '🟡', requireInteraction: false },
      MEDIUM: { icon: '🟠', requireInteraction: false },
      HIGH: { icon: '🔴', requireInteraction: true },
      CRITICAL: { icon: '🚨', requireInteraction: true },
    };

    const config = severityConfig[alert.severity];

    await this.showNotification({
      title: `${config.icon} Alerta ${alert.severity}`,
      body: `${alert.message} (${alert.parameter}: ${alert.value})`,
      tag: `weather-alert-${alert.id}`,
      requireInteraction: config.requireInteraction,
      actions: [
        {
          action: 'view',
          title: 'Ver Dashboard',
          icon: '/icons/icon-72x72.png',
        },
        {
          action: 'acknowledge',
          title: 'Reconocer',
          icon: '/icons/icon-72x72.png',
        },
      ],
      data: {
        type: 'weather-alert',
        alert: alert,
        url: '/',
      },
    });
  }

  /**
   * Mostrar notificación de estado del sistema
   */
  async showSystemNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const typeConfig = {
      info: { icon: 'ℹ️', requireInteraction: false },
      success: { icon: '✅', requireInteraction: false },
      warning: { icon: '⚠️', requireInteraction: false },
      error: { icon: '❌', requireInteraction: true },
    };

    const config = typeConfig[type];

    await this.showNotification({
      title: `${config.icon} ${title}`,
      body: message,
      tag: `system-${type}`,
      requireInteraction: config.requireInteraction,
      data: {
        type: 'system-notification',
        notificationType: type,
        url: '/',
      },
    });
  }

  /**
   * Subscribir a notificaciones push del servidor
   */
  async subscribeToServerNotifications(stationId: string): Promise<boolean> {
    if (!this.isNotificationEnabled()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Obtener suscripción existente
      this.subscription = await registration.pushManager.getSubscription();

      if (!this.subscription) {
        // Crear nueva suscripción
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!publicVapidKey) {
          console.warn('Clave VAPID pública no configurada');
          return false;
        }

        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey),
        });
      }

      // Enviar suscripción al servidor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-device-key-12345',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          stationId: stationId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error subscribiendo a notificaciones push:', error);
      return false;
    }
  }

  /**
   * Desuscribir de notificaciones push
   */
  async unsubscribeFromServerNotifications(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }
      return true;
    } catch (error) {
      console.error('Error desuscribiendo de notificaciones:', error);
      return false;
    }
  }

  /**
   * Configurar manejadores de notificaciones en el service worker
   */
  setupNotificationHandlers(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-click') {
          this.handleNotificationClick(event.data);
        }
      });
    }
  }

  /**
   * Manejar clics en notificaciones
   */
  private handleNotificationClick(data: any): void {
    switch (data.action) {
      case 'view':
        window.open(data.url || '/', '_blank');
        break;
      case 'acknowledge':
        if (data.alert) {
          this.acknowledgeAlert(data.alert.id);
        }
        break;
      default:
        window.focus();
        break;
    }
  }

  /**
   * Reconocer alerta
   */
  private async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-device-key-12345',
        },
      });
    } catch (error) {
      console.error('Error reconociendo alerta:', error);
    }
  }

  /**
   * Convertir clave VAPID de base64 a Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Verificar y mostrar notificaciones de prueba
   */
  async testNotifications(): Promise<void> {
    const hasPermission = await this.requestPermission();
    
    if (hasPermission) {
      await this.showSystemNotification(
        'Notificaciones Habilitadas',
        'Las notificaciones push están funcionando correctamente',
        'success'
      );
    } else {
      console.warn('No se pudieron habilitar las notificaciones');
    }
  }
}

// Instancia singleton del servicio
export const notificationService = NotificationService.getInstance();

// Configurar manejadores al cargar
if (typeof window !== 'undefined') {
  notificationService.setupNotificationHandlers();
}

export default NotificationService;