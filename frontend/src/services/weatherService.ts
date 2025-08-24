const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api';
const API_BASE_URL_FALLBACK = process.env.NEXT_PUBLIC_API_URL_FALLBACK || 'http://localhost:5002/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'weather-station-device-key-esp32-2024-dev';

export interface WeatherDataPoint {
  station_id: string;
  // Core temperature and humidity
  temperature?: number;
  humidity?: number;
  
  // BMP180 sensors  
  pressure?: number;
  bmp_temperature?: number;
  altitude?: number;
  
  // Rain sensors (MH-RD)
  rain_analog?: number;
  rain_percentage?: number;
  rain_digital?: number;
  rain_detected?: boolean;
  rainfall?: number;
  
  // DFRobots pluviometer
  pluvio_rainfall?: number;
  pluvio_accumulated?: number;
  pluvio_pulses?: number;
  
  // Air quality sensors
  co_level?: number;
  co_raw?: number;
  air_quality_digital?: number;
  dust_pm25?: number;
  
  // Light sensor
  light_level?: number;
  
  // Wind sensors
  wind_speed?: number;
  wind_direction?: number;
  uv_index?: number;
  
  // Legacy fields (kept for compatibility)
  pm25?: number;
  pm10?: number;
  
  // System information
  battery_voltage?: number;
  signal_strength?: number;
  uptime?: number;
  free_heap?: number;
  status?: 'online' | 'offline' | 'low_battery' | 'error' | 'going_to_sleep';
  timestamp: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  alert_type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  acknowledged: boolean;
}

class WeatherService {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    };
  }

  private async fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
    // Try primary URL first (HTTPS via nginx)
    try {
      console.log('Trying primary URL:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });
      
      if (response.ok || response.status === 404) {
        return response;
      }
      
      // If not ok, throw to try fallback
      throw new Error(`Primary URL failed with status: ${response.status}`);
    } catch (primaryError) {
      console.warn('Primary URL failed, trying fallback:', primaryError);
      
      // Try fallback URL (direct backend)
      const fallbackUrl = url.replace(API_BASE_URL, API_BASE_URL_FALLBACK);
      console.log('Trying fallback URL:', fallbackUrl);
      
      const response = await fetch(fallbackUrl, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });
      
      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new Error(`Both primary and fallback URLs failed. Status: ${response.status}, Error: ${errorText}`);
      }
      
      return response;
    }
  }

  async getLatestData(stationId: string): Promise<WeatherDataPoint | null> {
    const response = await this.fetchWithFallback(`${API_BASE_URL}/weather/data/${stationId}/latest`);
    if (response.status === 404) {
      // No recent data available for this station
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch latest data');
    }
    const result = await response.json();
    return {
      ...(result.data || {}),
      station_id: result.station_id || stationId
    };
  }

  async getHistoricalData(
    stationId: string, 
    timeRange: string = '24h',
    parameters?: string[]
  ): Promise<WeatherDataPoint[]> {
    const params = new URLSearchParams({
      timeRange,
      ...(parameters && { parameters: parameters.join(',') })
    });
    
    const url = `${API_BASE_URL}/weather/data/${stationId}?${params}`;
    console.log('Fetching historical data from:', url);
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Headers:', this.getHeaders());
    
    try {
      const response = await this.fetchWithFallback(url);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch historical data: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const result = await response.json();
      console.log('Historical data result:', result);
      return result.data || [];
    } catch (error) {
      console.error('Network error in getHistoricalData:', error);
      throw error;
    }
  }

  async getSummary(stationId: string, timeRange: string = '24h') {
    const params = new URLSearchParams({ timeRange });
    const response = await this.fetchWithFallback(`${API_BASE_URL}/weather/data/${stationId}/summary?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }
    const result = await response.json();
    return result.summary || result;
  }

  async getStations() {
    const response = await this.fetchWithFallback(`${API_BASE_URL}/weather/stations`);
    if (!response.ok) {
      throw new Error('Failed to fetch stations');
    }
    const result = await response.json();
    return result.stations || [];
  }

  async getAlerts(stationId?: string, acknowledged?: boolean): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (stationId) params.append('stationId', stationId);
    if (acknowledged !== undefined) params.append('acknowledged', acknowledged.toString());
    
    const url = stationId 
      ? `${API_BASE_URL}/alerts/${stationId}?${params}`
      : `${API_BASE_URL}/alerts?${params}`;
      
    try {
      const response = await this.fetchWithFallback(url);
      if (!response.ok) {
        console.warn(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
        // Return empty array instead of throwing for alerts
        return [];
      }
      const result = await response.json();
      return result.alerts || result.data || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await this.fetchWithFallback(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PUT'
    });
    if (!response.ok) {
      throw new Error('Failed to acknowledge alert');
    }
  }

  async getAlertSummary(stationId: string) {
    const response = await this.fetchWithFallback(`${API_BASE_URL}/alerts/summary/${stationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch alert summary');
    }
    const result = await response.json();
    return result.summary || result;
  }

  async exportData(stationId: string, format: 'csv' | 'json' = 'csv', timeRange: string = '24h') {
    const params = new URLSearchParams({ format, timeRange });
    const response = await this.fetchWithFallback(`${API_BASE_URL}/weather/export/${stationId}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to export data');
    }
    
    if (format === 'csv') {
      return response.text();
    }
    const result = await response.json();
    return result.data || result;
  }
}

export const weatherService = new WeatherService();