const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export interface WeatherDataPoint {
  station_id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
  pm25?: number;
  pm10?: number;
  uv_index?: number;
  battery_voltage?: number;
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
  async getLatestData(stationId: string): Promise<WeatherDataPoint | null> {
    const response = await fetch(`${API_BASE_URL}/weather/data/${stationId}/latest`);
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
    
    const response = await fetch(`${API_BASE_URL}/weather/data/${stationId}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }
    const result = await response.json();
    return result.data || [];
  }

  async getSummary(stationId: string, timeRange: string = '24h') {
    const params = new URLSearchParams({ timeRange });
    const response = await fetch(`${API_BASE_URL}/weather/data/${stationId}/summary?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }
    const result = await response.json();
    return result.summary || result;
  }

  async getStations() {
    const response = await fetch(`${API_BASE_URL}/weather/stations`);
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
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch alerts');
    }
    const result = await response.json();
    return result.alerts || result.data || [];
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to acknowledge alert');
    }
  }

  async getAlertSummary(stationId: string) {
    const response = await fetch(`${API_BASE_URL}/alerts/summary/${stationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch alert summary');
    }
    const result = await response.json();
    return result.summary || result;
  }

  async exportData(stationId: string, format: 'csv' | 'json' = 'csv', timeRange: string = '24h') {
    const params = new URLSearchParams({ format, timeRange });
    const response = await fetch(`${API_BASE_URL}/weather/export/${stationId}?${params}`);
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