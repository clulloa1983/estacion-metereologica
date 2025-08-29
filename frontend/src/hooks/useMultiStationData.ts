import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StationMetadata, 
  StationWithData, 
  WeatherData, 
  StationStats,
  DashboardConfig 
} from '../types/stationTypes';
import { stationService } from '../services/stationService';
import { weatherService } from '../services/weatherService';

interface UseMultiStationDataProps {
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
  defaultSelectedStations?: string[];
  maxSelectedStations?: number;
}

interface UseMultiStationDataReturn {
  // Station data
  stations: StationMetadata[];
  selectedStations: string[];
  currentData: { [stationId: string]: WeatherData | null };
  stationStats: { [stationId: string]: StationStats | null };
  
  // Loading states
  loading: {
    stations: boolean;
    currentData: boolean;
    stats: boolean;
  };
  
  // Error states
  errors: {
    stations: string | null;
    currentData: string | null;
    stats: string | null;
  };
  
  // Actions
  selectStation: (stationId: string) => void;
  deselectStation: (stationId: string) => void;
  toggleStation: (stationId: string) => void;
  selectMultipleStations: (stationIds: string[]) => void;
  clearSelection: () => void;
  
  // Data refresh
  refreshStations: () => Promise<void>;
  refreshCurrentData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Utility functions
  getStationWithData: (stationId: string) => StationWithData | null;
  getAllStationsWithData: () => StationWithData[];
  getSelectedStationsWithData: () => StationWithData[];
  
  // Config
  dashboardConfig: DashboardConfig;
  updateDashboardConfig: (config: Partial<DashboardConfig>) => void;
}

export const useMultiStationData = ({
  refreshInterval = 60000, // 60 seconds default
  autoRefresh = true,
  defaultSelectedStations = ['ESP32_STATION_001'],
  maxSelectedStations = 10
}: UseMultiStationDataProps = {}): UseMultiStationDataReturn => {
  
  // State
  const [stations, setStations] = useState<StationMetadata[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>(defaultSelectedStations);
  const [currentData, setCurrentData] = useState<{ [stationId: string]: WeatherData | null }>({});
  const [stationStats, setStationStats] = useState<{ [stationId: string]: StationStats | null }>({});
  
  const [loading, setLoading] = useState({
    stations: false,
    currentData: false,
    stats: false
  });
  
  const [errors, setErrors] = useState({
    stations: null as string | null,
    currentData: null as string | null,
    stats: null as string | null
  });

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    selected_stations: defaultSelectedStations,
    view_mode: 'grid',
    time_range: '24h',
    refresh_interval: refreshInterval / 1000, // Convert to seconds
    show_inactive: false,
    map_center: { lat: -33.443897, lng: -70.660126 },
    map_zoom: 10
  });

  // Refs for intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Station management
  const selectStation = useCallback((stationId: string) => {
    setSelectedStations(prev => {
      if (prev.includes(stationId)) return prev;
      const newSelection = [...prev, stationId];
      if (newSelection.length <= maxSelectedStations) {
        return newSelection;
      }
      return prev;
    });
  }, [maxSelectedStations]);

  const deselectStation = useCallback((stationId: string) => {
    setSelectedStations(prev => prev.filter(id => id !== stationId));
  }, []);

  const toggleStation = useCallback((stationId: string) => {
    setSelectedStations(prev => {
      if (prev.includes(stationId)) {
        return prev.filter(id => id !== stationId);
      } else {
        const newSelection = [...prev, stationId];
        return newSelection.length <= maxSelectedStations ? newSelection : prev;
      }
    });
  }, [maxSelectedStations]);

  const selectMultipleStations = useCallback((stationIds: string[]) => {
    const limitedSelection = stationIds.slice(0, maxSelectedStations);
    setSelectedStations(limitedSelection);
  }, [maxSelectedStations]);

  const clearSelection = useCallback(() => {
    setSelectedStations([]);
  }, []);

  // Data fetching functions
  const refreshStations = useCallback(async () => {
    // Cancel previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(prev => ({ ...prev, stations: true }));
    setErrors(prev => ({ ...prev, stations: null }));
    
    try {
      const stationsData = await stationService.getAllStations();
      setStations(stationsData);
      
      // Update selected stations to only include existing ones
      setSelectedStations(prev => 
        prev.filter(id => stationsData.some(station => station.station_id === id))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stations';
      setErrors(prev => ({ ...prev, stations: errorMessage }));
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(prev => ({ ...prev, stations: false }));
    }
  }, []);

  const refreshCurrentData = useCallback(async () => {
    if (selectedStations.length === 0) {
      setCurrentData({});
      return;
    }

    setLoading(prev => ({ ...prev, currentData: true }));
    setErrors(prev => ({ ...prev, currentData: null }));
    
    try {
      const dataPromises = selectedStations.map(async (stationId) => {
        try {
          const data = await weatherService.getLatestData(stationId);
          return { stationId, data };
        } catch (error) {
          console.warn(`Failed to fetch current data for ${stationId}:`, error);
          return { stationId, data: null };
        }
      });

      const results = await Promise.all(dataPromises);
      
      const newCurrentData = results.reduce((acc, { stationId, data }) => {
        acc[stationId] = data;
        return acc;
      }, {} as { [stationId: string]: WeatherData | null });
      
      setCurrentData(newCurrentData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch current data';
      setErrors(prev => ({ ...prev, currentData: errorMessage }));
      console.error('Error fetching current data:', error);
    } finally {
      setLoading(prev => ({ ...prev, currentData: false }));
    }
  }, [selectedStations]);

  const refreshStats = useCallback(async () => {
    if (selectedStations.length === 0) {
      setStationStats({});
      return;
    }

    setLoading(prev => ({ ...prev, stats: true }));
    setErrors(prev => ({ ...prev, stats: null }));
    
    try {
      const statsData = await stationService.getMultipleStationsStats(selectedStations);
      setStationStats(statsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch station stats';
      setErrors(prev => ({ ...prev, stats: errorMessage }));
      console.error('Error fetching station stats:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [selectedStations]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshStations(),
      refreshCurrentData(),
      refreshStats()
    ]);
  }, [refreshStations, refreshCurrentData, refreshStats]);

  // Utility functions
  const getStationWithData = useCallback((stationId: string): StationWithData | null => {
    const station = stations.find(s => s.station_id === stationId);
    if (!station) return null;
    
    return {
      ...station,
      current_data: currentData[stationId] || undefined,
      stats: stationStats[stationId] || undefined
    };
  }, [stations, currentData, stationStats]);

  const getAllStationsWithData = useCallback((): StationWithData[] => {
    return stations.map(station => ({
      ...station,
      current_data: currentData[station.station_id] || undefined,
      stats: stationStats[station.station_id] || undefined
    }));
  }, [stations, currentData, stationStats]);

  const getSelectedStationsWithData = useCallback((): StationWithData[] => {
    return selectedStations
      .map(stationId => getStationWithData(stationId))
      .filter((station): station is StationWithData => station !== null);
  }, [selectedStations, getStationWithData]);

  // Dashboard config management
  const updateDashboardConfig = useCallback((config: Partial<DashboardConfig>) => {
    setDashboardConfig(prev => ({ ...prev, ...config }));
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const startAutoRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        refreshCurrentData();
      }, refreshInterval);
    };

    startAutoRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshCurrentData]);

  // Initial data load
  useEffect(() => {
    refreshStations();
  }, [refreshStations]);

  // Load current data when selected stations change
  useEffect(() => {
    refreshCurrentData();
  }, [refreshCurrentData]);

  // Load stats when selected stations change (with delay to avoid too many requests)
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshStats();
    }, 500);

    return () => clearTimeout(timer);
  }, [refreshStats]);

  // Update dashboard config when selections change
  useEffect(() => {
    updateDashboardConfig({ selected_stations: selectedStations });
  }, [selectedStations, updateDashboardConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Save dashboard config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('weather_dashboard_config', JSON.stringify(dashboardConfig));
    } catch (error) {
      console.warn('Failed to save dashboard config to localStorage:', error);
    }
  }, [dashboardConfig]);

  // Load dashboard config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('weather_dashboard_config');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        setDashboardConfig(prev => ({ ...prev, ...savedConfig }));
        setSelectedStations(savedConfig.selected_stations || defaultSelectedStations);
      }
    } catch (error) {
      console.warn('Failed to load dashboard config from localStorage:', error);
    }
  }, [defaultSelectedStations]);

  return {
    // Data
    stations,
    selectedStations,
    currentData,
    stationStats,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    selectStation,
    deselectStation,
    toggleStation,
    selectMultipleStations,
    clearSelection,
    
    // Data refresh
    refreshStations,
    refreshCurrentData,
    refreshStats,
    refreshAll,
    
    // Utility functions
    getStationWithData,
    getAllStationsWithData,
    getSelectedStationsWithData,
    
    // Config
    dashboardConfig,
    updateDashboardConfig
  };
};