import { WeatherData } from '../types/stationTypes';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
const AI_API_BASE = `${API_BASE_URL}/ai`;

// AI Prediction service interfaces
export interface AnomalyDetectionResult {
  hasAnomaly: boolean;
  confidence: number;
  anomalies: {
    sensor: string;
    value: number;
    expected_range: {
      min: number;
      max: number;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }[];
  recommendations: string[];
  baseline: {
    [key: string]: {
      mean: number;
      std_dev: number;
      range: [number, number];
    };
  };
}

export interface WeatherPrediction {
  predictions: {
    timestamp: string;
    values: {
      [parameter: string]: number;
    };
    confidence: number;
  }[];
  confidence: number;
  model_info: {
    model_type: string;
    training_data_points: number;
    accuracy: number;
    features_used: string[];
  };
  trends: {
    [parameter: string]: {
      direction: 'increasing' | 'decreasing' | 'stable';
      strength: number;
    };
  };
}

export interface MaintenancePrediction {
  sensor_health: {
    [sensor: string]: {
      health_score: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
      estimated_life_remaining: number; // days
      last_maintenance: string | null;
      issues: string[];
    };
  };
  maintenance_schedule: {
    sensor: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    recommended_date: string;
    task: string;
    estimated_cost: number;
    downtime_hours: number;
  }[];
  alerts: {
    sensor: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    action_required: boolean;
  }[];
  overall_score: number;
}

export interface EnergyOptimization {
  current_consumption: {
    total_power: number;
    sensor_breakdown: {
      [sensor: string]: number;
    };
    efficiency_score: number;
  };
  optimizations: {
    category: string;
    description: string;
    potential_savings: number;
    implementation_difficulty: 'easy' | 'medium' | 'hard';
    estimated_cost: number;
    payback_period: number; // days
  }[];
  recommendations: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  projected_battery_life: {
    current: number; // hours
    optimized: number; // hours
    improvement: number; // percentage
  };
}

export interface RegionalInterpolation {
  interpolated_value: number;
  confidence: number;
  method_used: string;
  stations_used: {
    station_id: string;
    distance: number; // km
    weight: number;
    value: number;
  }[];
  quality_metrics: {
    rmse: number;
    mae: number;
    coverage: number; // percentage
  };
}

export interface ModelStatus {
  models: {
    [model_type: string]: {
      status: 'trained' | 'training' | 'not_trained' | 'error';
      last_trained: string | null;
      training_data_points: number;
      accuracy: number | null;
      version: string;
    };
  };
  capabilities: string[];
  system_info: {
    available_memory: number;
    cpu_usage: number;
    last_updated: string;
  };
}

// HTTP client utility
const aiHttpClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${AI_API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  },

  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${AI_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  },
};

// AI Prediction Service
export class AIPredictionService {
  /**
   * Detect anomalies in weather data using ML
   */
  static async detectAnomalies(
    stationId: string,
    data: WeatherData,
    options?: { threshold?: number }
  ): Promise<AnomalyDetectionResult> {
    try {
      const response = await aiHttpClient.post<{ result: AnomalyDetectionResult }>(
        `/anomaly-detection/${stationId}`,
        { data, ...options }
      );
      return response.result;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error(`Failed to detect anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get weather predictions using LSTM-based models
   */
  static async predictWeather(
    stationId: string,
    options?: {
      hours?: number;
      parameters?: string[];
    }
  ): Promise<WeatherPrediction> {
    try {
      const params = new URLSearchParams();
      if (options?.hours) params.append('hours', options.hours.toString());
      if (options?.parameters) params.append('parameters', options.parameters.join(','));

      const endpoint = `/weather-prediction/${stationId}${params.toString() ? `?${params}` : ''}`;
      const response = await aiHttpClient.get<{ predictions: WeatherPrediction }>(endpoint);
      return response.predictions;
    } catch (error) {
      console.error('Error predicting weather:', error);
      throw new Error(`Failed to predict weather: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict maintenance needs using sensor health analysis
   */
  static async predictMaintenance(
    stationId: string,
    options?: { days?: number }
  ): Promise<MaintenancePrediction> {
    try {
      const params = new URLSearchParams();
      if (options?.days) params.append('days', options.days.toString());

      const endpoint = `/maintenance-prediction/${stationId}${params.toString() ? `?${params}` : ''}`;
      const response = await aiHttpClient.get<{ predictions: MaintenancePrediction }>(endpoint);
      return response.predictions;
    } catch (error) {
      console.error('Error predicting maintenance:', error);
      throw new Error(`Failed to predict maintenance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get energy optimization recommendations
   */
  static async optimizeEnergy(
    stationId: string,
    options?: { mode?: 'battery' | 'solar' | 'hybrid' }
  ): Promise<EnergyOptimization> {
    try {
      const params = new URLSearchParams();
      if (options?.mode) params.append('mode', options.mode);

      const endpoint = `/energy-optimization/${stationId}${params.toString() ? `?${params}` : ''}`;
      const response = await aiHttpClient.get<{ optimization: EnergyOptimization }>(endpoint);
      return response.optimization;
    } catch (error) {
      console.error('Error optimizing energy:', error);
      throw new Error(`Failed to optimize energy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Interpolate weather data for regional coverage
   */
  static async interpolateRegionalData(
    stations: Array<{
      station_id: string;
      location: { lat: number; lng: number };
      data: WeatherData;
    }>,
    targetLocation: { lat: number; lng: number },
    options?: {
      parameter?: string;
      method?: 'idw' | 'kriging';
    }
  ): Promise<RegionalInterpolation> {
    try {
      const response = await aiHttpClient.post<{ interpolation: RegionalInterpolation }>(
        '/regional-interpolation',
        {
          stations,
          target_location: targetLocation,
          ...options,
        }
      );
      return response.interpolation;
    } catch (error) {
      console.error('Error interpolating regional data:', error);
      throw new Error(`Failed to interpolate regional data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AI model status and capabilities
   */
  static async getModelStatus(): Promise<ModelStatus> {
    try {
      const response = await aiHttpClient.get<{ status: ModelStatus }>('/model-status');
      return response.status;
    } catch (error) {
      console.error('Error getting model status:', error);
      throw new Error(`Failed to get model status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Train or retrain AI models with recent data
   */
  static async trainModel(options?: {
    model_type?: 'anomaly' | 'weather' | 'maintenance' | 'all';
    stations?: string[];
    training_days?: number;
  }): Promise<{ success: boolean; message: string; training_id: string }> {
    try {
      const response = await aiHttpClient.post<{ 
        success: boolean; 
        message: string; 
        training_result: { training_id: string } 
      }>('/train-model', options);
      
      return {
        success: response.success,
        message: response.message,
        training_id: response.training_result.training_id,
      };
    } catch (error) {
      console.error('Error training model:', error);
      throw new Error(`Failed to train model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform batch analysis on multiple stations
   */
  static async batchAnalysis(
    stations: string[],
    analysisType: 'anomaly' | 'prediction' | 'maintenance' | 'energy',
    options?: { timeRange?: string }
  ): Promise<{ [stationId: string]: any }> {
    try {
      const response = await aiHttpClient.post<{ results: { [stationId: string]: any } }>(
        '/batch-analysis',
        {
          stations,
          analysis_type: analysisType,
          time_range: options?.timeRange || '24h',
        }
      );
      return response.results;
    } catch (error) {
      console.error('Error performing batch analysis:', error);
      throw new Error(`Failed to perform batch analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check AI service health
   */
  static async checkHealth(): Promise<{
    status: string;
    capabilities: string[];
    timestamp: string;
  }> {
    try {
      const response = await aiHttpClient.get<{
        status: string;
        capabilities: string[];
        timestamp: string;
      }>('/health');
      return response;
    } catch (error) {
      console.error('Error checking AI service health:', error);
      throw new Error(`Failed to check AI service health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Default export
export default AIPredictionService;