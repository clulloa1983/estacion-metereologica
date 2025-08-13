import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Thermostat,
  WaterDrop,
  Speed,
  Air,
  Navigation,
  WaterOutlined,
  BatteryFull,
  WbSunny
} from '@mui/icons-material';

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

interface CurrentMeasurementsProps {
  data: WeatherData | null;
  loading: boolean;
}

interface MeasurementCardProps {
  title: string;
  value: number | undefined;
  unit: string;
  icon: React.ReactNode;
  color?: string;
  loading: boolean;
}

const MeasurementCard: React.FC<MeasurementCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  color = 'primary',
  loading 
}) => {
  const getTemperatureColor = (temp: number) => {
    if (temp < 0) return '#1976d2'; // Azul
    if (temp < 15) return '#4fc3f7'; // Azul claro
    if (temp < 25) return '#4caf50'; // Verde
    if (temp < 35) return '#ff9800'; // Naranja
    return '#f44336'; // Rojo
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity < 30) return '#ff9800'; // Naranja - muy seco
    if (humidity < 60) return '#4caf50'; // Verde - ideal
    if (humidity < 80) return '#2196f3'; // Azul - húmedo
    return '#3f51b5'; // Azul oscuro - muy húmedo
  };

  const getWindColor = (speed: number) => {
    if (speed < 5) return '#4caf50'; // Verde - calma
    if (speed < 20) return '#ff9800'; // Naranja - moderado
    if (speed < 40) return '#f44336'; // Rojo - fuerte
    return '#9c27b0'; // Púrpura - muy fuerte
  };

  const getCardColor = () => {
    if (title.includes('Temperatura') && value !== undefined) {
      return getTemperatureColor(value);
    }
    if (title.includes('Humedad') && value !== undefined) {
      return getHumidityColor(value);
    }
    if (title.includes('Viento') && value !== undefined) {
      return getWindColor(value);
    }
    return '#1976d2';
  };

  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${getCardColor()}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: getCardColor(), mr: 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
        </Box>
        
        {loading ? (
          <Skeleton variant="text" height={40} />
        ) : (
          <Typography variant="h4" component="div" color={getCardColor()}>
            {value !== undefined ? value.toFixed(1) : '--'}
            <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
              {unit}
            </Typography>
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const getWindDirection = (degrees: number): string => {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const CurrentMeasurements: React.FC<CurrentMeasurementsProps> = ({ data, loading }) => {
  const lastUpdate = data ? new Date(data.timestamp).toLocaleString() : null;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Mediciones Actuales
          </Typography>
          {data && (
            <Chip 
              label={`Última actualización: ${lastUpdate}`}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        
        <Grid container spacing={3}>
          {/* Temperatura */}
          <Grid item xs={12} sm={6} md={3}>
            <MeasurementCard
              title="Temperatura"
              value={data?.temperature}
              unit="°C"
              icon={<Thermostat />}
              loading={loading}
            />
          </Grid>
          
          {/* Humedad */}
          <Grid item xs={12} sm={6} md={3}>
            <MeasurementCard
              title="Humedad"
              value={data?.humidity}
              unit="%"
              icon={<WaterDrop />}
              loading={loading}
            />
          </Grid>
          
          {/* Presión */}
          <Grid item xs={12} sm={6} md={3}>
            <MeasurementCard
              title="Presión"
              value={data?.pressure}
              unit="hPa"
              icon={<Speed />}
              loading={loading}
            />
          </Grid>
          
          {/* Velocidad del Viento */}
          <Grid item xs={12} sm={6} md={3}>
            <MeasurementCard
              title="Viento"
              value={data?.wind_speed}
              unit="km/h"
              icon={<Air />}
              loading={loading}
            />
          </Grid>
          
          {/* Dirección del Viento */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Navigation sx={{ mr: 1, color: '#1976d2' }} />
                  <Typography variant="h6">Dirección</Typography>
                </Box>
                {loading ? (
                  <Skeleton variant="text" height={40} />
                ) : (
                  <Typography variant="h4" color="#1976d2">
                    {data?.wind_direction !== undefined ? 
                      `${getWindDirection(data.wind_direction)} (${data.wind_direction.toFixed(0)}°)` : 
                      '--'
                    }
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Precipitación */}
          <Grid item xs={12} sm={6} md={3}>
            <MeasurementCard
              title="Lluvia"
              value={data?.rainfall}
              unit="mm"
              icon={<WaterOutlined />}
              loading={loading}
            />
          </Grid>
          
          {/* PM2.5 (opcional) */}
          {data?.pm25 !== undefined && (
            <Grid item xs={12} sm={6} md={3}>
              <MeasurementCard
                title="PM2.5"
                value={data.pm25}
                unit="μg/m³"
                icon={<Air />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Índice UV (opcional) */}
          {data?.uv_index !== undefined && (
            <Grid item xs={12} sm={6} md={3}>
              <MeasurementCard
                title="Índice UV"
                value={data.uv_index}
                unit=""
                icon={<WbSunny />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Batería (opcional) */}
          {data?.battery_voltage !== undefined && (
            <Grid item xs={12} sm={6} md={3}>
              <MeasurementCard
                title="Batería"
                value={data.battery_voltage}
                unit="V"
                icon={<BatteryFull />}
                loading={loading}
              />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CurrentMeasurements;