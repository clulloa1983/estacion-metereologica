import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  MyLocation,
  Info,
  Thermostat,
  WaterDrop,
  Air,
  Speed,
  Visibility,
  ZoomIn,
  ZoomOut,
  Layers
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { 
  StationMetadata, 
  StationWithData, 
  WeatherData, 
  StationStatus,
  StationMarker
} from '../types/stationTypes';

// Componente de carga para el mapa
const MapLoading = () => {
  const { t } = useTranslation('dashboard');
  return (
    <Box sx={{ 
      height: 500, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'background.default',
      borderRadius: 1
    }}>
      <Typography color="text.secondary">
        {t('weatherMap.loading')}
      </Typography>
    </Box>
  );
};

// Cargar el mapa dinámicamente
const DynamicMultiStationMapClient = dynamic(() => import('./MultiStationMapClient'), { 
  ssr: false,
  loading: () => <MapLoading />
});

interface MultiStationMapProps {
  stations: StationWithData[];
  selectedStations: string[];
  onStationSelect: (stationId: string) => void;
  onStationDeselect: (stationId: string) => void;
  currentData?: { [stationId: string]: WeatherData | null };
  showAllStations?: boolean;
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
  onMapCenterChange?: (center: { lat: number; lng: number }) => void;
  onMapZoomChange?: (zoom: number) => void;
}

const MultiStationMap: React.FC<MultiStationMapProps> = ({
  stations,
  selectedStations,
  onStationSelect,
  onStationDeselect,
  currentData = {},
  showAllStations = true,
  mapCenter = { lat: -33.443897, lng: -70.660126 }, // Santiago, Chile por defecto
  mapZoom = 10,
  onMapCenterChange,
  onMapZoomChange
}) => {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const [showMetrics, setShowMetrics] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<keyof WeatherData>('temperature');
  const [showInactiveStations, setShowInactiveStations] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Para forzar re-render del mapa

  // Filtrar estaciones según configuración
  const visibleStations = stations.filter(station => {
    if (!showAllStations && !selectedStations.includes(station.station_id)) {
      return false;
    }
    if (!showInactiveStations && station.status !== StationStatus.ACTIVE) {
      return false;
    }
    return true;
  });

  // Preparar marcadores para el mapa
  const stationMarkers: StationMarker[] = visibleStations.map(station => {
    const stationData = currentData[station.station_id];
    const isSelected = selectedStations.includes(station.station_id);
    
    return {
      station_id: station.station_id,
      position: [station.location.lat, station.location.lng],
      metadata: station,
      current_data: stationData || undefined,
      popup_content: createPopupContent(station, stationData, isSelected)
    };
  });

  // Crear contenido del popup
  function createPopupContent(station: StationMetadata, data?: WeatherData | null, isSelected?: boolean): string {
    const statusColor = getStatusColor(station.status);
    const metricValue = data && selectedMetric in data ? data[selectedMetric] : null;
    
    return `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: #1976d2;">${station.name}</h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${station.location.address}</p>
        
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; background: ${statusColor}; color: white;">
            ${t(`stationStatus.${station.status}`)}
          </span>
          ${isSelected ? `<span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; background: #4caf50; color: white; margin-left: 4px;">${t('stations.selected')}</span>` : ''}
        </div>
        
        ${data ? `
          <div style="border-top: 1px solid #eee; padding-top: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
              ${data.temperature !== undefined ? `<div>🌡️ ${data.temperature.toFixed(1)}°C</div>` : ''}
              ${data.humidity !== undefined ? `<div>💧 ${data.humidity.toFixed(0)}%</div>` : ''}
              ${data.pressure !== undefined ? `<div>📊 ${data.pressure.toFixed(1)} hPa</div>` : ''}
              ${data.wind_speed !== undefined ? `<div>💨 ${data.wind_speed.toFixed(1)} km/h</div>` : ''}
            </div>
            ${metricValue !== null && metricValue !== undefined ? `
              <div style="margin-top: 8px; padding: 4px 8px; background: #f5f5f5; border-radius: 4px;">
                <strong>${t(`weather.${selectedMetric}`)}: ${formatMetricValue(metricValue, selectedMetric)}</strong>
              </div>
            ` : ''}
          </div>
        ` : `
          <div style="color: #999; font-style: italic; font-size: 12px;">
            ${t('weatherMap.popup.noData')}
          </div>
        `}
        
        <div style="margin-top: 8px; font-size: 11px; color: #666;">
          ${t('weatherMap.popup.clickToSelect')}
        </div>
      </div>
    `;
  }

  // Obtener color según estado de la estación
  function getStatusColor(status: StationStatus): string {
    switch (status) {
      case StationStatus.ACTIVE: return '#4caf50';
      case StationStatus.MAINTENANCE: return '#ff9800';
      case StationStatus.ERROR: return '#f44336';
      case StationStatus.INACTIVE: return '#9e9e9e';
      default: return '#9e9e9e';
    }
  }

  // Formatear valor de métrica
  function formatMetricValue(value: any, metric: keyof WeatherData): string {
    if (typeof value !== 'number') return String(value);
    
    switch (metric) {
      case 'temperature':
        return `${value.toFixed(1)}°C`;
      case 'humidity':
        return `${value.toFixed(0)}%`;
      case 'pressure':
        return `${value.toFixed(1)} hPa`;
      case 'wind_speed':
        return `${value.toFixed(1)} km/h`;
      case 'wind_direction':
        return `${value.toFixed(0)}°`;
      case 'rainfall':
        return `${value.toFixed(1)} mm`;
      case 'light_intensity':
        return `${value.toFixed(0)} lux`;
      default:
        return value.toFixed(2);
    }
  }

  // Estadísticas de las estaciones visibles
  const stationStats = {
    total: visibleStations.length,
    active: visibleStations.filter(s => s.status === StationStatus.ACTIVE).length,
    selected: selectedStations.length,
    withData: Object.keys(currentData).filter(id => currentData[id] !== null).length
  };

  // Centrar el mapa en las estaciones seleccionadas o visibles
  const handleCenterOnStations = () => {
    const stationsToCenter = selectedStations.length > 0 
      ? visibleStations.filter(s => selectedStations.includes(s.station_id))
      : visibleStations;
    
    if (stationsToCenter.length === 0) return;
    
    if (stationsToCenter.length === 1) {
      const station = stationsToCenter[0];
      if (onMapCenterChange) {
        onMapCenterChange({ lat: station.location.lat, lng: station.location.lng });
      }
      if (onMapZoomChange) {
        onMapZoomChange(14);
      }
    } else {
      // Calcular el centro de todas las estaciones
      const avgLat = stationsToCenter.reduce((sum, s) => sum + s.location.lat, 0) / stationsToCenter.length;
      const avgLng = stationsToCenter.reduce((sum, s) => sum + s.location.lng, 0) / stationsToCenter.length;
      
      if (onMapCenterChange) {
        onMapCenterChange({ lat: avgLat, lng: avgLng });
      }
      if (onMapZoomChange) {
        onMapZoomChange(12);
      }
    }
    
    // Forzar re-render del mapa
    setMapKey(prev => prev + 1);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h5" component="h2">
            {t('weatherMap.multiStation.title')}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={t('weatherMap.centerOnStations')}>
              <IconButton size="small" onClick={handleCenterOnStations}>
                <MyLocation />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Controles del mapa */}
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Selector de métrica */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('weatherMap.metric')}</InputLabel>
              <Select
                value={selectedMetric}
                label={t('weatherMap.metric')}
                onChange={(e) => setSelectedMetric(e.target.value as keyof WeatherData)}
              >
                <MenuItem value="temperature">{t('weather.temperature')}</MenuItem>
                <MenuItem value="humidity">{t('weather.humidity')}</MenuItem>
                <MenuItem value="pressure">{t('weather.pressure')}</MenuItem>
                <MenuItem value="wind_speed">{t('weather.windSpeed')}</MenuItem>
                <MenuItem value="rainfall">{t('weather.rainfall')}</MenuItem>
              </Select>
            </FormControl>

            {/* Toggles */}
            <FormControlLabel
              control={
                <Switch
                  checked={showMetrics}
                  onChange={(e) => setShowMetrics(e.target.checked)}
                  size="small"
                />
              }
              label={t('weatherMap.showMetrics')}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showInactiveStations}
                  onChange={(e) => setShowInactiveStations(e.target.checked)}
                  size="small"
                />
              }
              label={t('weatherMap.showInactive')}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showAllStations}
                  onChange={() => {}} // Controlado externamente
                  size="small"
                  disabled
                />
              }
              label={t('weatherMap.showAll')}
            />
          </Box>
          
          {/* Estadísticas */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={`${stationStats.total} ${t('stations.total')}`} />
            <Chip size="small" label={`${stationStats.active} ${t('stations.active')}`} color="success" />
            <Chip size="small" label={`${stationStats.selected} ${t('stations.selected')}`} color="primary" />
            <Chip size="small" label={`${stationStats.withData} ${t('stations.withData')}`} color="info" />
          </Box>
        </Paper>

        {/* Mapa */}
        <Box sx={{ height: 500, width: '100%', position: 'relative' }}>
          {visibleStations.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              {t('weatherMap.noStationsVisible')}
            </Alert>
          ) : (
            <DynamicMultiStationMapClient
              key={mapKey}
              stations={stationMarkers}
              center={mapCenter}
              zoom={mapZoom}
              selectedStations={selectedStations}
              selectedMetric={selectedMetric}
              showMetrics={showMetrics}
              onStationClick={(stationId) => {
                if (selectedStations.includes(stationId)) {
                  onStationDeselect(stationId);
                } else {
                  onStationSelect(stationId);
                }
              }}
              onMapMove={onMapCenterChange}
              onMapZoom={onMapZoomChange}
              translations={{
                weatherStation: t('weatherMap.popup.weatherStation'),
                currentConditions: t('weatherMap.popup.currentConditions'),
                stationId: t('weatherMap.popup.stationId'),
                noData: t('weatherMap.popup.noData'),
                clickToSelect: t('weatherMap.popup.clickToSelect'),
                selected: t('stations.selected')
              }}
              locale={router.locale || 'es'}
            />
          )}
        </Box>

        {/* Información adicional del mapa */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="info" fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            {t('weatherMap.multiStation.instructions')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MultiStationMap;