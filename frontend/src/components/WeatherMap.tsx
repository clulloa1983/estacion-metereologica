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

// Cargar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

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

const WeatherMap: React.FC<WeatherMapProps> = ({ stationId, currentData }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [stationCoordinates, setStationCoordinates] = useState(DEFAULT_COORDINATES);
  
  useEffect(() => {
    // Aquí podrías cargar las coordenadas desde una API o configuración
    // Por ahora usamos coordenadas por defecto
    setMapLoaded(true);
  }, [stationId]);

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

  if (!mapLoaded) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Ubicación de la Estación
          </Typography>
          <Box sx={{ 
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'background.default',
            borderRadius: 1
          }}>
            <Typography color="text.secondary">
              Cargando mapa...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Ubicación de la Estación
          </Typography>
          <Tooltip title="Centrar en la estación">
            <IconButton color="primary">
              <MyLocation />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Información de ubicación */}
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Coordenadas de la estación:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latitud: {stationCoordinates.lat.toFixed(6)}°
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Longitud: {stationCoordinates.lng.toFixed(6)}°
              </Typography>
            </Grid>
            
            {currentData && (
              <Grid item xs={12} sm={6}>
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
        <Box sx={{ height: 350, width: '100%', position: 'relative' }}>
          <MapContainer
            center={[stationCoordinates.lat, stationCoordinates.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <Marker position={[stationCoordinates.lat, stationCoordinates.lng]}>
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Estación Meteorológica</strong>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    ID: {stationId}
                  </Typography>
                  
                  {currentData && (
                    <div>
                      <Typography variant="body2" style={{ marginBottom: '8px' }}>
                        <strong>Condiciones actuales:</strong>
                      </Typography>
                      <Typography variant="body2">
                        🌡️ Temperatura: {currentData?.temperature?.toFixed(1) ?? 'N/A'}°C
                      </Typography>
                      <Typography variant="body2">
                        💧 Humedad: {currentData?.humidity?.toFixed(0) ?? 'N/A'}%
                      </Typography>
                      <Typography variant="body2">
                        🌀 Presión: {currentData?.pressure?.toFixed(1) ?? 'N/A'} hPa
                      </Typography>
                      <Typography variant="body2">
                        💨 Viento: {currentData?.wind_speed?.toFixed(1) ?? 'N/A'} km/h ({currentData?.wind_direction ? getWindDirectionText(currentData.wind_direction) : 'N/A'})
                      </Typography>
                      <Typography variant="body2">
                        🌧️ Lluvia: {currentData?.rainfall?.toFixed(1) ?? 'N/A'} mm
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" style={{ marginTop: '8px', display: 'block' }}>
                        Última actualización: {currentData?.timestamp ? new Date(currentData.timestamp).toLocaleString() : 'N/A'}
                      </Typography>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </Box>

        {/* Información adicional del mapa */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="info" fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            Haz clic en el marcador para ver información detallada de la estación
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeatherMap;