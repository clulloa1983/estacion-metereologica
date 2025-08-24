export interface OfflineAction {
  id: string;
  type: 'acknowledge_alert' | 'config_change' | 'export_data';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  stationId?: string;
}

export interface OfflineData {
  weatherData: any[];
  alerts: any[];
  lastSync: number;
  stationId: string;
}

class OfflineService {
  private static instance: OfflineService;
  private dbName = 'weatherStationOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private syncQueue: OfflineAction[] = [];

  constructor() {
    this.initializeDB();
    this.setupOnlineListener();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Inicializar IndexedDB para almacenamiento offline
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para datos meteorológicos offline
        if (!db.objectStoreNames.contains('weatherData')) {
          const weatherStore = db.createObjectStore('weatherData', { keyPath: 'timestamp' });
          weatherStore.createIndex('stationId', 'stationId', { unique: false });
        }

        // Store para alertas offline
        if (!db.objectStoreNames.contains('alerts')) {
          const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
          alertsStore.createIndex('stationId', 'stationId', { unique: false });
          alertsStore.createIndex('acknowledged', 'acknowledged', { unique: false });
        }

        // Store para acciones pendientes
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para configuración offline
        if (!db.objectStoreNames.contains('offlineConfig')) {
          db.createObjectStore('offlineConfig', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Verificar si estamos online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Configurar listener para eventos de conectividad
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Conexión restaurada - iniciando sincronización');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('Sin conexión - modo offline activado');
    });
  }

  /**
   * Guardar datos meteorológicos offline
   */
  async saveWeatherDataOffline(data: any, stationId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['weatherData'], 'readwrite');
    const store = transaction.objectStore('weatherData');

    const offlineData = {
      ...data,
      stationId,
      timestamp: Date.now(),
      offline: true,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(offlineData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtener datos meteorológicos offline
   */
  async getOfflineWeatherData(stationId: string, limit: number = 50): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['weatherData'], 'readonly');
    const store = transaction.objectStore('weatherData');
    const index = store.index('stationId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(stationId);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guardar alertas offline
   */
  async saveAlertsOffline(alerts: any[], stationId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['alerts'], 'readwrite');
    const store = transaction.objectStore('alerts');

    for (const alert of alerts) {
      const offlineAlert = {
        ...alert,
        stationId,
        savedOffline: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(offlineAlert);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Obtener alertas offline
   */
  async getOfflineAlerts(stationId: string): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['alerts'], 'readonly');
    const store = transaction.objectStore('alerts');
    const index = store.index('stationId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(stationId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Agregar acción pendiente a la cola
   */
  async addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const pendingAction: OfflineAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: action.maxRetries || 3,
    };

    // Agregar a la cola en memoria
    this.syncQueue.push(pendingAction);

    // Guardar en IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');

      await new Promise<void>((resolve, reject) => {
        const request = store.add(pendingAction);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Si estamos online, intentar sincronizar inmediatamente
    if (this.isOnline()) {
      this.syncPendingActions();
    }
  }

  /**
   * Reconocer alerta offline
   */
  async acknowledgeAlertOffline(alertId: string, stationId: string): Promise<void> {
    await this.addPendingAction({
      type: 'acknowledge_alert',
      data: { alertId, stationId },
      maxRetries: 5,
      stationId,
    });

    // Actualizar estado local de la alerta
    if (this.db) {
      const transaction = this.db.transaction(['alerts'], 'readwrite');
      const store = transaction.objectStore('alerts');

      const getRequest = store.get(alertId);
      getRequest.onsuccess = () => {
        const alert = getRequest.result;
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedAt = new Date().toISOString();
          alert.acknowledgedOffline = true;
          store.put(alert);
        }
      };
    }
  }

  /**
   * Enviar cambio de configuración offline
   */
  async sendConfigChangeOffline(command: string, parameters: any, stationId: string): Promise<void> {
    await this.addPendingAction({
      type: 'config_change',
      data: { command, parameters, stationId },
      maxRetries: 3,
      stationId,
    });
  }

  /**
   * Sincronizar acciones pendientes cuando volvemos online
   */
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline()) {
      return;
    }

    this.syncInProgress = true;
    console.log('Iniciando sincronización de acciones pendientes...');

    try {
      // Cargar acciones pendientes desde IndexedDB si la cola está vacía
      if (this.syncQueue.length === 0) {
        await this.loadPendingActionsFromDB();
      }

      const actionsToProcess = [...this.syncQueue];
      const successfulActions: string[] = [];

      for (const action of actionsToProcess) {
        try {
          await this.executeAction(action);
          successfulActions.push(action.id);
          console.log(`Acción sincronizada exitosamente: ${action.type}`);
        } catch (error) {
          console.error(`Error sincronizando acción ${action.type}:`, error);
          
          // Incrementar contador de reintentos
          action.retries++;
          
          if (action.retries >= action.maxRetries) {
            console.warn(`Acción ${action.type} descartada después de ${action.maxRetries} intentos`);
            successfulActions.push(action.id); // Remover de la cola
          }
        }
      }

      // Remover acciones exitosas de la cola
      this.syncQueue = this.syncQueue.filter(action => !successfulActions.includes(action.id));

      // Remover de IndexedDB
      await this.removePendingActions(successfulActions);

      console.log(`Sincronización completada. ${successfulActions.length} acciones procesadas.`);

    } catch (error) {
      console.error('Error durante la sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Ejecutar una acción específica
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dev-device-key-12345';

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    };

    switch (action.type) {
      case 'acknowledge_alert':
        const response = await fetch(`${API_BASE_URL}/alerts/${action.data.alertId}/acknowledge`, {
          method: 'PUT',
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        break;

      case 'config_change':
        const configResponse = await fetch(`${API_BASE_URL}/config/command/${action.data.stationId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            command: action.data.command,
            parameters: action.data.parameters,
          }),
        });
        
        if (!configResponse.ok) {
          throw new Error(`HTTP ${configResponse.status}: ${configResponse.statusText}`);
        }
        break;

      default:
        throw new Error(`Tipo de acción no reconocido: ${action.type}`);
    }
  }

  /**
   * Cargar acciones pendientes desde IndexedDB
   */
  private async loadPendingActionsFromDB(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');

    const actions = await new Promise<OfflineAction[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    this.syncQueue = actions;
  }

  /**
   * Remover acciones pendientes de IndexedDB
   */
  private async removePendingActions(actionIds: string[]): Promise<void> {
    if (!this.db || actionIds.length === 0) return;

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    for (const id of actionIds) {
      store.delete(id);
    }
  }

  /**
   * Limpiar datos offline antiguos
   */
  async cleanupOldData(daysToKeep: number = 7): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const transaction = this.db.transaction(['weatherData', 'alerts'], 'readwrite');

    // Limpiar datos meteorológicos antiguos
    const weatherStore = transaction.objectStore('weatherData');
    const weatherRequest = weatherStore.openCursor();
    
    weatherRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.timestamp < cutoffTime) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // Limpiar alertas reconocidas antiguas
    const alertsStore = transaction.objectStore('alerts');
    const alertsRequest = alertsStore.openCursor();
    
    alertsRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const alert = cursor.value;
        if (alert.acknowledged && alert.savedOffline < cutoffTime) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  /**
   * Obtener estadísticas de almacenamiento offline
   */
  async getStorageStats(): Promise<{
    weatherDataCount: number;
    alertsCount: number;
    pendingActionsCount: number;
    storageUsed: number;
  }> {
    if (!this.db) {
      return { weatherDataCount: 0, alertsCount: 0, pendingActionsCount: 0, storageUsed: 0 };
    }

    const transaction = this.db.transaction(['weatherData', 'alerts', 'pendingActions'], 'readonly');
    
    const weatherCount = await this.getStoreCount(transaction.objectStore('weatherData'));
    const alertsCount = await this.getStoreCount(transaction.objectStore('alerts'));
    const actionsCount = await this.getStoreCount(transaction.objectStore('pendingActions'));

    // Estimar uso de almacenamiento (aproximación)
    const storageEstimate = await navigator.storage?.estimate?.();
    const storageUsed = storageEstimate?.usage || 0;

    return {
      weatherDataCount: weatherCount,
      alertsCount: alertsCount,
      pendingActionsCount: actionsCount,
      storageUsed: Math.round(storageUsed / 1024 / 1024 * 100) / 100, // MB
    };
  }

  /**
   * Obtener número de registros en un store
   */
  private async getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Instancia singleton del servicio offline
export const offlineService = OfflineService.getInstance();

export default OfflineService;