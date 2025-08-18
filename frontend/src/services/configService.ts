const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dev-device-key-12345';

export interface SensorConfig {
  sensor: string;
  enabled: boolean;
  calibration_offset?: number;
  reading_interval?: number;
}

export interface AlertThreshold {
  parameter: string;
  min?: number;
  max?: number;
  enabled: boolean;
}

export interface PowerConfig {
  sleep_mode_enabled: boolean;
  sleep_duration?: number;
  transmission_interval?: number;
  wifi_power_level?: number;
}

export interface ConnectivityConfig {
  wifi_ssid?: string;
  wifi_password?: string;
  mqtt_server?: string;
  mqtt_port?: number;
  mqtt_username?: string;
  mqtt_password?: string;
}

export interface RemoteCommand {
  command: string;
  parameters?: Record<string, any>;
  station_id: string;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  command_id?: string;
  timestamp: string;
}

class ConfigService {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    };
  }

  async sendCommand(stationId: string, command: string, parameters?: Record<string, any>): Promise<CommandResponse> {
    const payload: RemoteCommand = {
      command,
      parameters,
      station_id: stationId
    };

    const response = await fetch(`${API_BASE_URL}/config/command/${stationId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to send command: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Sensor configuration commands
  async setReadingInterval(stationId: string, intervalMs: number): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'set_reading_interval', { interval_ms: intervalMs });
  }

  async toggleSensor(stationId: string, sensor: string, enabled: boolean): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'toggle_sensor', { sensor, enabled });
  }

  async setSensorCalibration(stationId: string, sensor: string, offset: number): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'set_calibration', { sensor, offset });
  }

  // Alert configuration commands
  async setAlertThreshold(stationId: string, parameter: string, min?: number, max?: number): Promise<CommandResponse> {
    const parameters: Record<string, any> = { parameter };
    if (min !== undefined) parameters.min = min;
    if (max !== undefined) parameters.max = max;
    
    return this.sendCommand(stationId, 'set_alert_threshold', parameters);
  }

  // Power management commands
  async setSleepMode(stationId: string, enabled: boolean, duration?: number): Promise<CommandResponse> {
    const parameters: Record<string, any> = { enabled };
    if (duration !== undefined) parameters.duration_ms = duration;
    
    return this.sendCommand(stationId, 'set_sleep_mode', parameters);
  }

  async setWifiPower(stationId: string, powerLevel: number): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'set_wifi_power', { power_level: powerLevel });
  }

  // Connectivity configuration commands
  async configureWifi(stationId: string, ssid: string, password: string): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'wifi_config', { ssid, password });
  }

  async configureMqtt(stationId: string, server: string, port: number, username?: string, password?: string): Promise<CommandResponse> {
    const parameters: Record<string, any> = { server, port };
    if (username) parameters.username = username;
    if (password) parameters.password = password;
    
    return this.sendCommand(stationId, 'mqtt_config', parameters);
  }

  // Device control commands
  async restartDevice(stationId: string): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'restart');
  }

  async getDeviceStatus(stationId: string): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'status');
  }

  async performSensorCheck(stationId: string): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'sensor_check');
  }

  async wakeUpDevice(stationId: string): Promise<CommandResponse> {
    return this.sendCommand(stationId, 'wake_up');
  }

  // Utility methods for configuration validation
  validateSensorConfig(config: SensorConfig): string[] {
    const errors: string[] = [];
    
    if (!config.sensor || config.sensor.trim() === '') {
      errors.push('Sensor name is required');
    }
    
    if (config.reading_interval !== undefined && config.reading_interval < 10000) {
      errors.push('Reading interval must be at least 10 seconds (10000ms)');
    }
    
    if (config.calibration_offset !== undefined && Math.abs(config.calibration_offset) > 100) {
      errors.push('Calibration offset must be between -100 and 100');
    }
    
    return errors;
  }

  validateAlertThreshold(threshold: AlertThreshold): string[] {
    const errors: string[] = [];
    
    if (!threshold.parameter || threshold.parameter.trim() === '') {
      errors.push('Parameter name is required');
    }
    
    if (threshold.min !== undefined && threshold.max !== undefined && threshold.min >= threshold.max) {
      errors.push('Minimum value must be less than maximum value');
    }
    
    return errors;
  }

  validatePowerConfig(config: PowerConfig): string[] {
    const errors: string[] = [];
    
    if (config.sleep_duration !== undefined && config.sleep_duration < 30000) {
      errors.push('Sleep duration must be at least 30 seconds (30000ms)');
    }
    
    if (config.transmission_interval !== undefined && config.transmission_interval < 60000) {
      errors.push('Transmission interval must be at least 1 minute (60000ms)');
    }
    
    if (config.wifi_power_level !== undefined && (config.wifi_power_level < 0 || config.wifi_power_level > 20)) {
      errors.push('WiFi power level must be between 0 and 20 dBm');
    }
    
    return errors;
  }

  validateConnectivityConfig(config: ConnectivityConfig): string[] {
    const errors: string[] = [];
    
    if (config.wifi_ssid && config.wifi_ssid.length > 32) {
      errors.push('WiFi SSID must be 32 characters or less');
    }
    
    if (config.wifi_password && config.wifi_password.length < 8) {
      errors.push('WiFi password must be at least 8 characters');
    }
    
    if (config.mqtt_port !== undefined && (config.mqtt_port < 1 || config.mqtt_port > 65535)) {
      errors.push('MQTT port must be between 1 and 65535');
    }
    
    return errors;
  }
}

export const configService = new ConfigService();