/**
 * Frontend types for multi-station weather system
 * TypeScript interfaces and types for weather station management
 */

/**
 * Station status enumeration
 */
export enum StationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

/**
 * Available sensor types
 */
export enum SensorType {
  DHT22 = 'dht22',           // Temperature and humidity
  BMP085 = 'bmp085',         // Barometric pressure
  BH1750 = 'bh1750',         // Light intensity
  MH_RD = 'mh_rd',           // Rain detection
  MQ7 = 'mq7',               // Carbon monoxide
  MQ135 = 'mq135',           // Air quality
  DSM501A = 'dsm501a',       // PM2.5 particles
  WIND = 'wind'              // Wind speed/direction
}

/**
 * Geographic location information
 */
export interface StationLocation {
  lat: number;                // Latitude in decimal degrees (-90 to 90)
  lng: number;                // Longitude in decimal degrees (-180 to 180)
  address: string;            // Human-readable address
  region: string;             // Geographic region/area
  elevation: number;          // Elevation in meters above sea level
}

/**
 * Station configuration settings
 */
export interface StationConfiguration {
  reading_interval: number;   // Reading interval in seconds
  alerts_enabled: boolean;    // Whether alerts are enabled
  calibration: {
    temperature: number;      // Temperature calibration offset
    humidity: number;         // Humidity calibration offset
    pressure: number;         // Pressure calibration offset
    light: number;           // Light calibration offset
  };
}

/**
 * Complete station metadata
 */
export interface StationMetadata {
  station_id: string;         // Unique station identifier
  name: string;               // Human-readable station name
  description: string;        // Station description
  location: StationLocation;  // Geographic location information
  sensors: SensorType[];      // Array of available sensor types
  status: StationStatus;      // Current station status
  hardware_version: string;   // Hardware/firmware version
  created_at: string;         // Station creation timestamp (ISO)
  last_seen: string | null;   // Last communication timestamp (ISO)
  configuration: StationConfiguration; // Station configuration settings
}

/**
 * Station statistics and performance metrics
 */
export interface StationStats {
  station_id: string;         // Station identifier
  data_points_30d: number;    // Number of data points in last 30 days
  expected_readings: number;  // Expected number of readings based on interval
  uptime_percentage: number;  // Station uptime percentage
  last_seen: string | null;   // Last seen timestamp (ISO)
  status: StationStatus;      // Current status
  sensors_count: number;      // Number of configured sensors
}

/**
 * Geographic bounds for region queries
 */
export interface LocationBounds {
  north: number;              // Northern latitude boundary
  south: number;              // Southern latitude boundary
  east: number;               // Eastern longitude boundary
  west: number;               // Western longitude boundary
}

/**
 * Weather data structure (enhanced for multi-station)
 */
export interface WeatherData {
  station_id: string;         // Station identifier
  timestamp: string;          // Data timestamp (ISO)
  temperature?: number;       // Temperature in Celsius
  humidity?: number;          // Relative humidity percentage
  pressure?: number;          // Atmospheric pressure in hPa
  wind_speed?: number;        // Wind speed in km/h
  wind_direction?: number;    // Wind direction in degrees
  rainfall?: number;          // Rainfall amount
  light_intensity?: number;   // Light intensity in lux
  co_level?: number;          // Carbon monoxide level
  air_quality?: number;       // Air quality index
  pm25?: number;              // PM2.5 particles
  pm10?: number;              // PM10 particles
  uv_index?: number;          // UV index
  battery_voltage?: number;   // Battery voltage
}

/**
 * Station with current weather data
 */
export interface StationWithData extends StationMetadata {
  current_data?: WeatherData; // Most recent weather readings
  stats?: StationStats;       // Station performance statistics
}

/**
 * Multi-station dashboard configuration
 */
export interface DashboardConfig {
  selected_stations: string[];     // Currently selected station IDs
  view_mode: 'list' | 'grid' | 'map'; // Dashboard view mode
  time_range: string;              // Default time range for data
  refresh_interval: number;        // Auto-refresh interval in seconds
  show_inactive: boolean;          // Whether to show inactive stations
  map_center: {                    // Map center coordinates
    lat: number;
    lng: number;
  };
  map_zoom: number;               // Map zoom level
}

/**
 * Station comparison data structure
 */
export interface StationComparison {
  stations: StationWithData[];    // Stations being compared
  metric: keyof WeatherData;      // Metric being compared
  time_range: string;             // Time range for comparison
  data: {                         // Comparison data
    [station_id: string]: {
      current: number | null;
      average: number | null;
      min: number | null;
      max: number | null;
    };
  };
}

/**
 * Regional weather data (interpolated)
 */
export interface RegionalWeatherData {
  bounds: LocationBounds;         // Region boundaries
  resolution: number;             // Data grid resolution
  timestamp: string;              // Data timestamp
  interpolated_data: Array<{      // Interpolated data points
    lat: number;
    lng: number;
    temperature?: number;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
    confidence: number;           // Interpolation confidence (0-1)
  }>;
  source_stations: string[];      // Station IDs used for interpolation
}

/**
 * API response wrappers
 */
export interface StationsResponse {
  success: boolean;
  stations: StationMetadata[];
  count: number;
  cached?: boolean;
}

export interface StationResponse {
  success: boolean;
  station: StationMetadata;
  cached?: boolean;
}

export interface StationStatsResponse {
  success: boolean;
  stats: StationStats;
  cached?: boolean;
}

export interface RegionStationsResponse {
  success: boolean;
  stations: StationMetadata[];
  count: number;
  bounds: LocationBounds;
  cached?: boolean;
}

/**
 * Error response structure
 */
export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

/**
 * Station form data for create/update operations
 */
export interface StationFormData {
  name: string;
  description: string;
  location: {
    lat: number | string;
    lng: number | string;
    address: string;
    region: string;
    elevation: number | string;
  };
  sensors: SensorType[];
  configuration: {
    reading_interval: number | string;
    alerts_enabled: boolean;
    calibration: {
      temperature: number | string;
      humidity: number | string;
      pressure: number | string;
      light: number | string;
    };
  };
}

/**
 * Station validation result
 */
export interface StationValidation {
  isValid: boolean;
  errors: {
    [field: string]: string[];
  };
}

/**
 * Map marker data for station display
 */
export interface StationMarker {
  station_id: string;
  position: [number, number];     // [lat, lng]
  metadata: StationMetadata;
  current_data?: WeatherData;
  popup_content?: string;
}

/**
 * Utility type for partial station updates
 */
export type PartialStationMetadata = Partial<Omit<StationMetadata, 'station_id' | 'created_at'>>;