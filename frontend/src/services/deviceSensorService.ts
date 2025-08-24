export interface DeviceMotion {
  acceleration: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
  accelerationIncludingGravity: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
  rotationRate: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  };
  interval: number;
}

export interface DeviceOrientation {
  alpha: number | null; // Z axis
  beta: number | null;  // X axis
  gamma: number | null; // Y axis
  absolute: boolean;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface AmbientLightData {
  illuminance: number; // lux
  timestamp: number;
}

export interface DeviceSensorCapabilities {
  geolocation: boolean;
  deviceMotion: boolean;
  deviceOrientation: boolean;
  ambientLight: boolean;
  battery: boolean;
  networkInformation: boolean;
}

class DeviceSensorService {
  private static instance: DeviceSensorService;
  private capabilities: DeviceSensorCapabilities;
  private isTracking = false;
  private trackingCallbacks: ((data: any) => void)[] = [];

  constructor() {
    this.capabilities = this.detectCapabilities();
  }

  static getInstance(): DeviceSensorService {
    if (!DeviceSensorService.instance) {
      DeviceSensorService.instance = new DeviceSensorService();
    }
    return DeviceSensorService.instance;
  }

  /**
   * Detectar capacidades del dispositivo
   */
  private detectCapabilities(): DeviceSensorCapabilities {
    const capabilities: DeviceSensorCapabilities = {
      geolocation: 'geolocation' in navigator,
      deviceMotion: 'DeviceMotionEvent' in window,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      ambientLight: 'AmbientLightSensor' in window,
      battery: 'getBattery' in navigator,
      networkInformation: 'connection' in navigator,
    };

    console.log('Capacidades del dispositivo detectadas:', capabilities);
    return capabilities;
  }

  /**
   * Obtener capacidades del dispositivo
   */
  getCapabilities(): DeviceSensorCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Solicitar permisos necesarios para sensores
   */
  async requestPermissions(): Promise<{
    geolocation: PermissionState;
    deviceMotion: PermissionState;
    ambientLight: PermissionState;
  }> {
    const results = {
      geolocation: 'denied' as PermissionState,
      deviceMotion: 'denied' as PermissionState,
      ambientLight: 'denied' as PermissionState,
    };

    try {
      // Geolocalización
      if (this.capabilities.geolocation) {
        const geoPermission = await navigator.permissions.query({ name: 'geolocation' });
        results.geolocation = geoPermission.state;
      }

      // Device Motion (iOS 13+ requiere permisos explícitos)
      if (this.capabilities.deviceMotion && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const motionPermission = await (DeviceMotionEvent as any).requestPermission();
          results.deviceMotion = motionPermission === 'granted' ? 'granted' : 'denied';
        } catch (error) {
          console.warn('Error solicitando permisos de DeviceMotion:', error);
        }
      } else if (this.capabilities.deviceMotion) {
        results.deviceMotion = 'granted'; // Asumir granted en dispositivos que no requieren permisos
      }

      // Ambient Light
      if (this.capabilities.ambientLight) {
        try {
          const lightPermission = await navigator.permissions.query({ name: 'ambient-light-sensor' as any });
          results.ambientLight = lightPermission.state;
        } catch (error) {
          // API no soportada o no disponible
          results.ambientLight = 'denied';
        }
      }

    } catch (error) {
      console.error('Error solicitando permisos de sensores:', error);
    }

    return results;
  }

  /**
   * Obtener ubicación actual
   */
  async getCurrentLocation(): Promise<GeolocationData> {
    return new Promise((resolve, reject) => {
      if (!this.capabilities.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          resolve(data);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * Monitorear ubicación en tiempo real
   */
  watchLocation(callback: (location: GeolocationData) => void): number | null {
    if (!this.capabilities.geolocation) {
      console.warn('Geolocalización no soportada');
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const data: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };
        callback(data);
      },
      (error) => console.error('Error monitoreando ubicación:', error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }

  /**
   * Obtener orientación del dispositivo
   */
  async getDeviceOrientation(): Promise<DeviceOrientation | null> {
    return new Promise((resolve) => {
      if (!this.capabilities.deviceOrientation) {
        resolve(null);
        return;
      }

      const handleOrientation = (event: DeviceOrientationEvent) => {
        const data: DeviceOrientation = {
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
          absolute: event.absolute,
        };
        window.removeEventListener('deviceorientation', handleOrientation);
        resolve(data);
      };

      window.addEventListener('deviceorientation', handleOrientation);

      // Timeout después de 5 segundos
      setTimeout(() => {
        window.removeEventListener('deviceorientation', handleOrientation);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Monitorear movimiento del dispositivo
   */
  startMotionTracking(callback: (motion: DeviceMotion) => void): void {
    if (!this.capabilities.deviceMotion) {
      console.warn('DeviceMotion no soportado');
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const data: DeviceMotion = {
        acceleration: {
          x: event.acceleration?.x || null,
          y: event.acceleration?.y || null,
          z: event.acceleration?.z || null,
        },
        accelerationIncludingGravity: {
          x: event.accelerationIncludingGravity?.x || null,
          y: event.accelerationIncludingGravity?.y || null,
          z: event.accelerationIncludingGravity?.z || null,
        },
        rotationRate: {
          alpha: event.rotationRate?.alpha || null,
          beta: event.rotationRate?.beta || null,
          gamma: event.rotationRate?.gamma || null,
        },
        interval: event.interval,
      };
      callback(data);
    };

    window.addEventListener('devicemotion', handleMotion);
    this.isTracking = true;
  }

  /**
   * Detener monitoreo de movimiento
   */
  stopMotionTracking(): void {
    const motionHandlers = this.trackingCallbacks;
    motionHandlers.forEach(handler => {
      window.removeEventListener('devicemotion', handler as any);
    });
    this.trackingCallbacks = [];
    this.isTracking = false;
  }

  /**
   * Obtener información de la batería
   */
  async getBatteryInfo(): Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } | null> {
    if (!this.capabilities.battery) {
      return null;
    }

    try {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    } catch (error) {
      console.error('Error obteniendo información de batería:', error);
      return null;
    }
  }

  /**
   * Obtener información de la conexión de red
   */
  getNetworkInfo(): {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null {
    if (!this.capabilities.networkInformation) {
      return null;
    }

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  /**
   * Obtener luz ambiente (si está disponible)
   */
  async getAmbientLight(): Promise<AmbientLightData | null> {
    if (!this.capabilities.ambientLight) {
      return null;
    }

    try {
      // Usando la nueva API de Ambient Light Sensor
      const sensor = new (window as any).AmbientLightSensor();
      
      return new Promise((resolve) => {
        sensor.addEventListener('reading', () => {
          const data: AmbientLightData = {
            illuminance: sensor.illuminance,
            timestamp: Date.now(),
          };
          sensor.stop();
          resolve(data);
        });

        sensor.addEventListener('error', (error: any) => {
          console.error('Error leyendo sensor de luz ambiente:', error);
          resolve(null);
        });

        sensor.start();

        // Timeout después de 5 segundos
        setTimeout(() => {
          sensor.stop();
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error('Error accediendo al sensor de luz ambiente:', error);
      return null;
    }
  }

  /**
   * Detectar vibración (solo para notificaciones de prueba)
   */
  vibrate(pattern: number | number[]): boolean {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      return true;
    }
    return false;
  }

  /**
   * Obtener todas las lecturas disponibles del dispositivo
   */
  async getAllSensorReadings(): Promise<{
    location?: GeolocationData;
    orientation?: DeviceOrientation;
    battery?: any;
    network?: any;
    ambientLight?: AmbientLightData;
    timestamp: number;
  }> {
    const readings: any = { timestamp: Date.now() };

    try {
      // Intentar obtener ubicación
      if (this.capabilities.geolocation) {
        try {
          readings.location = await this.getCurrentLocation();
        } catch (error) {
          console.warn('No se pudo obtener ubicación:', error);
        }
      }

      // Intentar obtener orientación
      if (this.capabilities.deviceOrientation) {
        readings.orientation = await this.getDeviceOrientation();
      }

      // Intentar obtener información de batería
      if (this.capabilities.battery) {
        readings.battery = await this.getBatteryInfo();
      }

      // Obtener información de red
      if (this.capabilities.networkInformation) {
        readings.network = this.getNetworkInfo();
      }

      // Intentar obtener luz ambiente
      if (this.capabilities.ambientLight) {
        readings.ambientLight = await this.getAmbientLight();
      }

    } catch (error) {
      console.error('Error obteniendo lecturas de sensores:', error);
    }

    return readings;
  }

  /**
   * Inicializar sensores con permisos
   */
  async initialize(): Promise<boolean> {
    try {
      const permissions = await this.requestPermissions();
      console.log('Permisos de sensores:', permissions);
      
      const hasAnyPermission = Object.values(permissions).some(
        permission => permission === 'granted'
      );

      return hasAnyPermission;
    } catch (error) {
      console.error('Error inicializando sensores del dispositivo:', error);
      return false;
    }
  }
}

// Instancia singleton del servicio de sensores
export const deviceSensorService = DeviceSensorService.getInstance();

export default DeviceSensorService;