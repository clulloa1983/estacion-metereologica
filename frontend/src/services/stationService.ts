/**
 * Station management service for multi-station weather dashboard
 * Handles API communication for weather station metadata and operations
 */

import { 
  StationMetadata, 
  StationStats, 
  LocationBounds, 
  StationsResponse, 
  StationResponse, 
  StationStatsResponse,
  RegionStationsResponse,
  ApiError,
  StationFormData,
  PartialStationMetadata
} from '../types/stationTypes';

class StationService {
  private baseUrl: string;
  private apiKey?: string;
  private authToken?: string;

  constructor() {
    // Get API URL from environment variables
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    
    // Initialize auth token from localStorage if available
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token') || undefined;
      this.apiKey = localStorage.getItem('api_key') || undefined;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Set API key for device authentication
   */
  setApiKey(key: string): void {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_key', key);
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Handle API response and throw errors if needed
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get all weather stations with metadata
   */
  async getAllStations(): Promise<StationMetadata[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/metadata`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: StationsResponse = await this.handleResponse(response);
      return data.stations;
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  /**
   * Get station metadata by ID
   */
  async getStationById(stationId: string): Promise<StationMetadata | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/metadata/${stationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      const data: StationResponse = await this.handleResponse(response);
      return data.station;
    } catch (error) {
      console.error(`Error fetching station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Create new station metadata
   */
  async createStation(stationData: StationFormData & { station_id: string }): Promise<StationMetadata> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/metadata`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(stationData),
      });

      const data: StationResponse = await this.handleResponse(response);
      return data.station;
    } catch (error) {
      console.error('Error creating station:', error);
      throw error;
    }
  }

  /**
   * Update station metadata
   */
  async updateStation(stationId: string, updateData: PartialStationMetadata): Promise<StationMetadata> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/metadata/${stationId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      });

      const data: StationResponse = await this.handleResponse(response);
      return data.station;
    } catch (error) {
      console.error(`Error updating station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete station metadata
   */
  async deleteStation(stationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/metadata/${stationId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error(`Error deleting station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Get stations within geographic bounds
   */
  async getStationsInRegion(bounds: LocationBounds): Promise<StationMetadata[]> {
    try {
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      });

      const response = await fetch(`${this.baseUrl}/stations/region?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: RegionStationsResponse = await this.handleResponse(response);
      return data.stations;
    } catch (error) {
      console.error('Error fetching stations in region:', error);
      throw error;
    }
  }

  /**
   * Get station statistics
   */
  async getStationStats(stationId: string): Promise<StationStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/${stationId}/stats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: StationStatsResponse = await this.handleResponse(response);
      return data.stats;
    } catch (error) {
      console.error(`Error fetching stats for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Update station status
   */
  async updateStationStatus(stationId: string, status: string): Promise<StationMetadata> {
    try {
      const response = await fetch(`${this.baseUrl}/stations/${stationId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      const data: StationResponse = await this.handleResponse(response);
      return data.station;
    } catch (error) {
      console.error(`Error updating status for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple stations' statistics in parallel
   */
  async getMultipleStationsStats(stationIds: string[]): Promise<{ [stationId: string]: StationStats }> {
    try {
      const promises = stationIds.map(async (stationId) => {
        try {
          const stats = await this.getStationStats(stationId);
          return { stationId, stats };
        } catch (error) {
          console.warn(`Failed to get stats for station ${stationId}:`, error);
          return { stationId, stats: null };
        }
      });

      const results = await Promise.all(promises);
      
      return results.reduce((acc, result) => {
        if (result.stats) {
          acc[result.stationId] = result.stats;
        }
        return acc;
      }, {} as { [stationId: string]: StationStats });
    } catch (error) {
      console.error('Error fetching multiple station stats:', error);
      throw error;
    }
  }

  /**
   * Validate station form data
   */
  validateStationData(data: Partial<StationFormData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Station name is required');
    }

    if (!data.location) {
      errors.push('Location information is required');
    } else {
      const lat = typeof data.location.lat === 'string' ? parseFloat(data.location.lat) : data.location.lat;
      const lng = typeof data.location.lng === 'string' ? parseFloat(data.location.lng) : data.location.lng;

      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push('Latitude must be a number between -90 and 90');
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push('Longitude must be a number between -180 and 180');
      }

      if (!data.location.address || data.location.address.trim().length === 0) {
        errors.push('Address is required');
      }
    }

    if (!data.sensors || data.sensors.length === 0) {
      errors.push('At least one sensor must be selected');
    }

    if (data.configuration) {
      const interval = typeof data.configuration.reading_interval === 'string' 
        ? parseInt(data.configuration.reading_interval) 
        : data.configuration.reading_interval;

      if (isNaN(interval) || interval < 30 || interval > 3600) {
        errors.push('Reading interval must be between 30 and 3600 seconds');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate distance between two geographic points
   * Uses Haversine formula for great-circle distance
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find nearest stations to a given point
   */
  async getNearestStations(lat: number, lng: number, maxDistance: number = 50, limit: number = 5): Promise<Array<StationMetadata & { distance: number }>> {
    try {
      const allStations = await this.getAllStations();
      
      const stationsWithDistance = allStations.map(station => ({
        ...station,
        distance: this.calculateDistance(lat, lng, station.location.lat, station.location.lng)
      }));

      return stationsWithDistance
        .filter(station => station.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding nearest stations:', error);
      throw error;
    }
  }

  /**
   * Get stations by status
   */
  async getStationsByStatus(status: string): Promise<StationMetadata[]> {
    try {
      const allStations = await this.getAllStations();
      return allStations.filter(station => station.status === status);
    } catch (error) {
      console.error(`Error fetching stations with status ${status}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const stationService = new StationService();
export default stationService;