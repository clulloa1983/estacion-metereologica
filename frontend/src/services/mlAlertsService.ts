/**
 * Servicio para interactuar con la API de Alertas Inteligentes ML
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

export interface MLAlert {
  timestamp: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  acknowledged: boolean;
  value: number;
  ml_data?: {
    anomaly_type: string;
    confidence: string;
    context: {
      mean?: string;
      stdDev?: string;
      trend?: string;
      isolation_score?: string;
    };
  };
}

export interface MLStatistics {
  ml_enabled: boolean;
  is_trained: boolean;
  training_data_points: number;
  confidence_threshold: number;
  sensors_monitored: string[];
  station_statistics?: {
    [sensor: string]: {
      data_points: number;
      anomaly_count: number;
      last_anomaly: string | null;
      current_mean: string;
      current_stddev: string;
    };
  };
}

export interface MLMetrics {
  total_ml_alerts: number;
  alerts_by_severity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  time_range: string;
  model_statistics: MLStatistics;
}

export interface MLConfig {
  ml_enabled: boolean;
  suppression_time: number;
  supported_sensors: string[];
  algorithm_types: string[];
  severity_levels: string[];
  time_ranges: string[];
}

export interface TrainingResponse {
  success: boolean;
  message: string;
}

export interface ToggleResponse {
  success: boolean;
  message: string;
  ml_enabled: boolean;
}

class MLAlertsService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}/ml-alerts${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ML Alerts API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Entrena los modelos ML para una estación específica
   */
  async trainModel(stationId: string, timeRange: string = '7d'): Promise<TrainingResponse> {
    const response = await this.request<TrainingResponse>(`/train/${stationId}`, {
      method: 'POST',
      body: JSON.stringify({ timeRange })
    });
    return response;
  }

  /**
   * Obtiene estadísticas de rendimiento de los modelos ML
   */
  async getStatistics(stationId: string): Promise<{ success: boolean; data: MLStatistics }> {
    const response = await this.request<{ success: boolean; data: MLStatistics }>(`/statistics/${stationId}`);
    return response;
  }

  /**
   * Reinicia los modelos ML para una estación específica
   */
  async resetModel(stationId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(`/reset/${stationId}`, {
      method: 'POST'
    });
    return response;
  }

  /**
   * Configura el estado de las alertas ML (habilitar/deshabilitar)
   */
  async toggleMLAlerts(enabled: boolean): Promise<ToggleResponse> {
    const response = await this.request<ToggleResponse>('/toggle', {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    return response;
  }

  /**
   * Obtiene la configuración actual de alertas ML
   */
  async getConfig(): Promise<{ success: boolean; data: MLConfig }> {
    const response = await this.request<{ success: boolean; data: MLConfig }>('/config');
    return response;
  }

  /**
   * Obtiene alertas ML recientes para análisis
   */
  async getRecentMLAlerts(
    stationId: string, 
    options: {
      limit?: number;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      sensor?: string;
    } = {}
  ): Promise<{
    success: boolean;
    station_id: string;
    count: number;
    data: MLAlert[];
  }> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.severity) params.append('severity', options.severity);
    if (options.sensor) params.append('sensor', options.sensor);

    const endpoint = `/recent/${stationId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<{
      success: boolean;
      station_id: string;
      count: number;
      data: MLAlert[];
    }>(endpoint);
    return response;
  }

  /**
   * Obtiene métricas de rendimiento de detección ML
   */
  async getMLMetrics(
    stationId: string, 
    timeRange: '1h' | '6h' | '12h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    success: boolean;
    data: MLMetrics;
  }> {
    const response = await this.request<{
      success: boolean;
      data: MLMetrics;
    }>(`/metrics/${stationId}?timeRange=${timeRange}`);
    return response;
  }

  /**
   * Monitorea alertas ML en tiempo real usando polling
   */
  startRealtimeMonitoring(
    stationId: string, 
    callback: (alerts: MLAlert[]) => void,
    intervalMs: number = 30000
  ): () => void {
    let isMonitoring = true;
    
    const poll = async () => {
      if (!isMonitoring) return;
      
      try {
        const response = await this.getRecentMLAlerts(stationId, { limit: 10 });
        if (response.success && response.data.length > 0) {
          callback(response.data);
        }
      } catch (error) {
        console.error('Error polling ML alerts:', error);
      }
      
      if (isMonitoring) {
        setTimeout(poll, intervalMs);
      }
    };

    // Iniciar polling
    poll();

    // Retornar función para detener el monitoring
    return () => {
      isMonitoring = false;
    };
  }

  /**
   * Analiza tendencias de alertas ML
   */
  async analyzeAlertTrends(stationId: string, timeRange: string = '7d'): Promise<{
    trends: {
      sensor: string;
      anomaly_count: number;
      severity_distribution: { [key: string]: number };
      most_common_type: string;
    }[];
    summary: {
      total_alerts: number;
      critical_alerts: number;
      trend_direction: 'increasing' | 'decreasing' | 'stable';
    };
  }> {
    try {
      // Obtener alertas recientes y métricas
      const [alertsResponse, metricsResponse] = await Promise.all([
        this.getRecentMLAlerts(stationId, { limit: 100 }),
        this.getMLMetrics(stationId, timeRange as any)
      ]);

      if (!alertsResponse.success || !metricsResponse.success) {
        throw new Error('Failed to fetch alert data for analysis');
      }

      const alerts = alertsResponse.data;
      const metrics = metricsResponse.data;

      // Agrupar por sensor
      const sensorTrends = alerts.reduce((acc, alert) => {
        const sensor = alert.alert_type.replace('ml_', '');
        if (!acc[sensor]) {
          acc[sensor] = {
            sensor,
            anomaly_count: 0,
            severity_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
            types: {} as { [key: string]: number }
          };
        }
        
        acc[sensor].anomaly_count++;
        acc[sensor].severity_distribution[alert.severity]++;
        
        const type = alert.ml_data?.anomaly_type || 'unknown';
        acc[sensor].types[type] = (acc[sensor].types[type] || 0) + 1;
        
        return acc;
      }, {} as any);

      // Calcular tendencias
      const trends = Object.values(sensorTrends).map((trend: any) => ({
        sensor: trend.sensor,
        anomaly_count: trend.anomaly_count,
        severity_distribution: trend.severity_distribution,
        most_common_type: Object.entries(trend.types)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'unknown'
      }));

      // Resumen general
      const summary = {
        total_alerts: metrics.total_ml_alerts,
        critical_alerts: metrics.alerts_by_severity.CRITICAL,
        trend_direction: 'stable' as 'increasing' | 'decreasing' | 'stable'
        // La dirección de tendencia requeriría datos históricos para calcular
      };

      return { trends, summary };
    } catch (error) {
      console.error('Error analyzing alert trends:', error);
      throw error;
    }
  }

  /**
   * Exporta alertas ML a CSV
   */
  async exportAlertsToCSV(stationId: string, timeRange: string = '7d'): Promise<string> {
    try {
      const response = await this.getRecentMLAlerts(stationId, { limit: 1000 });
      
      if (!response.success) {
        throw new Error('Failed to fetch alerts for export');
      }

      const alerts = response.data;
      
      // Crear CSV
      const headers = [
        'Timestamp',
        'Station ID',
        'Sensor',
        'Severity',
        'Anomaly Type',
        'Value',
        'Confidence',
        'Message',
        'Context Mean',
        'Context StdDev',
        'Isolation Score'
      ];

      const rows = alerts.map(alert => [
        alert.timestamp,
        response.station_id,
        alert.alert_type.replace('ml_', ''),
        alert.severity,
        alert.ml_data?.anomaly_type || '',
        alert.value.toString(),
        alert.ml_data?.confidence || '',
        alert.message,
        alert.ml_data?.context.mean || '',
        alert.ml_data?.context.stdDev || '',
        alert.ml_data?.context.isolation_score || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting alerts to CSV:', error);
      throw error;
    }
  }

  /**
   * Valida la configuración ML
   */
  async validateMLConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const config = await this.getConfig();
      
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (!config.data.ml_enabled) {
        issues.push('ML alerts are currently disabled');
        recommendations.push('Enable ML alerts to start anomaly detection');
      }

      if (config.data.suppression_time < 5) {
        issues.push('Alert suppression time is too low');
        recommendations.push('Consider increasing suppression time to avoid alert spam');
      }

      if (config.data.supported_sensors.length < 3) {
        recommendations.push('Consider adding more sensors for comprehensive monitoring');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error validating ML configuration:', error);
      return {
        valid: false,
        issues: ['Failed to validate configuration'],
        recommendations: ['Check ML service connectivity']
      };
    }
  }
}

// Singleton instance
const mlAlertsService = new MLAlertsService();
export default mlAlertsService;