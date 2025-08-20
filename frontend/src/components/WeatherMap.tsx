import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MyLocation,
  Info,
  Thermostat,
  WaterDrop,
  Air
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

// Componente de carga para el mapa
const MapLoading = () => {
  const { t } = useTranslation('dashboard');
  return (
    <Box sx={{ 
      height: 400, 
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

// Cargar todo el mapa dinámicamente para evitar problemas de SSR
const DynamicMap = dynamic(() => import('./WeatherMapClient'), { 
  ssr: false,
  loading: () => <MapLoading />
});

interface WeatherData {
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

interface WeatherMapProps {
  stationId: string;
  currentData: WeatherData | null;
}

// Configuración por defecto de ubicación (se puede hacer configurable)
const DEFAULT_COORDINATES = {
  lat: -33.443897,  // Santiago, Chile
  lng: -70.660126,
};

function WeatherMap({ stationId, currentData }: WeatherMapProps) {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const [stationCoordinates, setStationCoordinates] = useState(DEFAULT_COORDINATES);
  
  useEffect(() => {
    // Aquí podrías cargar las coordenadas desde una API o configuración
    // Por ahora usamos coordenadas por defecto
  }, [stationId]);

  const handleCenterOnStation = () => {
    // Verificar si la función global está disponible
    if (typeof window !== 'undefined' && (window as any).centerMapOnStation) {
      (window as any).centerMapOnStation();
    }
  };

  const getWindDirectionText = (degrees: number): string => {
    const directions = [
      'Norte', 'Nor-Noreste', 'Noreste', 'Este-Noreste', 
      'Este', 'Este-Sureste', 'Sureste', 'Sur-Sureste',
      'Sur', 'Sur-Suroeste', 'Suroeste', 'Oeste-Suroeste', 
      'Oeste', 'Oeste-Noroeste', 'Noroeste', 'Nor-Noroeste'
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 0) return '#1976d2';
    if (temp < 15) return '#4fc3f7';
    if (temp < 25) return '#4caf50';
    if (temp < 35) return '#ff9800';
    return '#f44336';
  };



  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            {t('weatherMap.title')}
          </Typography>
          <Tooltip title={t('weatherMap.centerOnStation')}>
            <IconButton color="primary" onClick={handleCenterOnStation}>
              <MyLocation />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Información de ubicación */}
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('weatherMap.stationCoordinates')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('weatherMap.latitude')}: {stationCoordinates.lat.toFixed(6)}°
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('weatherMap.longitude')}: {stationCoordinates.lng.toFixed(6)}°
              </Typography>
            </Grid>
            
            {currentData && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<Thermostat />}
                    label={`${currentData?.temperature?.toFixed(1) ?? 'N/A'}°C`}
                    size="small"
                    sx={{ backgroundColor: getTemperatureColor(currentData?.temperature ?? 0), color: 'white' }}
                  />
                  <Chip 
                    icon={<WaterDrop />}
                    label={`${currentData?.humidity?.toFixed(0) ?? 'N/A'}%`}
                    size="small"
                    color="info"
                  />
                  <Chip 
                    icon={<Air />}
                    label={`${currentData?.wind_speed?.toFixed(1) ?? 'N/A'} km/h`}
                    size="small"
                    color="success"
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Mapa */}
        <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
          <DynamicMap 
            coordinates={stationCoordinates}
            stationId={stationId}
            currentData={currentData}
            translations={{
              weatherStation: t('weatherMap.popup.weatherStation'),
              currentConditions: t('weatherMap.popup.currentConditions'),
              stationId: t('weatherMap.popup.stationId'),
              noData: t('weatherMap.popup.noData')
            }}
            locale={router.locale || 'es'}
          />
        </Box>

        {/* Información adicional del mapa */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="info" fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            {t('weatherMap.clickMarkerInfo')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};


export default WeatherMap;