import React, { memo, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Skeleton,
  Chip
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import {
  Thermostat,
  WaterDrop,
  Speed,
  Air,
  Navigation,
  WaterOutlined,
  BatteryFull,
  WbSunny,
  Landscape,
  Co2,
  LightMode,
  SignalWifi4Bar,
  Memory,
  Timer,
  Cloud
} from '@mui/icons-material';

interface WeatherData {
  station_id: string;
  // Core temperature and humidity
  temperature?: number;
  humidity?: number;
  
  // BMP180 sensors  
  pressure?: number;
  bmp_temperature?: number;
  altitude?: number;
  
  // Rain sensors (MH-RD)
  rain_analog?: number;
  rain_percentage?: number;
  rain_digital?: number;
  rain_detected?: boolean;
  rainfall?: number;
  
  // DFRobots pluviometer
  pluvio_rainfall?: number;
  pluvio_accumulated?: number;
  pluvio_pulses?: number;
  
  // Air quality sensors
  co_level?: number;
  co_raw?: number;
  air_quality_digital?: number;
  dust_pm25?: number;
  
  // Light sensor
  light_level?: number;
  
  // Wind sensors
  wind_speed?: number;
  wind_direction?: number;
  uv_index?: number;
  
  // Legacy fields (kept for compatibility)
  pm25?: number;
  pm10?: number;
  
  // System information
  battery_voltage?: number;
  signal_strength?: number;
  uptime?: number;
  free_heap?: number;
  status?: 'online' | 'offline' | 'low_battery' | 'error' | 'going_to_sleep';
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

const MeasurementCard = memo(function MeasurementCard({ 
  title, 
  value, 
  unit, 
  icon, 
  color = 'primary',
  loading 
}: MeasurementCardProps) {
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

  const cardColor = useMemo(() => {
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
  }, [title, value]);

  return (
    <Card sx={{ 
      height: '100%', 
      borderLeft: `4px solid ${cardColor}`,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3,
        transition: 'all 0.2s ease-in-out'
      }
    }}>
      <CardContent sx={{ 
        p: { xs: 2, sm: 3 },
        '&:last-child': { pb: { xs: 2, sm: 3 } }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: cardColor, mr: 1 }}>
            {icon}
          </Box>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              fontWeight: 500
            }}
          >
            {title}
          </Typography>
        </Box>
        
        {loading ? (
          <Skeleton variant="text" height={40} />
        ) : (
          <Typography 
            variant="h4" 
            component="div" 
            color={cardColor}
            sx={{ 
              fontSize: { xs: '1.8rem', sm: '2.125rem' },
              fontWeight: 600,
              lineHeight: 1.2
            }}
          >
            {value !== undefined ? value.toFixed(1) : '--'}
            <Typography 
              variant="body2" 
              component="span" 
              color="text.secondary" 
              sx={{ 
                ml: 1,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              {unit}
            </Typography>
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

MeasurementCard.displayName = 'MeasurementCard';

const getWindDirection = (degrees: number): string => {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const CurrentMeasurements = memo(function CurrentMeasurements({ data, loading }: CurrentMeasurementsProps) {
  const { t } = useTranslation('dashboard');
  
  const lastUpdate = useMemo(() => 
    data ? new Date(data.timestamp).toLocaleString() : null, 
    [data?.timestamp]
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 },
          mb: { xs: 2, sm: 3 }
        }}>
          <Typography 
            variant="h5" 
            component="h2"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 600
            }}
          >
            {t('currentMeasurements.title')}
          </Typography>
          {data && (
            <Chip 
              label={`${t('currentMeasurements.lastUpdate')}: ${lastUpdate}`}
              variant="outlined"
              size="small"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.75rem' },
                height: { xs: '24px', sm: '32px' }
              }}
            />
          )}
        </Box>
        
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Temperatura */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MeasurementCard
              title={t('currentMeasurements.temperature')}
              value={data?.temperature}
              unit="°C"
              icon={<Thermostat />}
              loading={loading}
            />
          </Grid>
          
          {/* Humedad */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MeasurementCard
              title={t('currentMeasurements.humidity')}
              value={data?.humidity}
              unit="%"
              icon={<WaterDrop />}
              loading={loading}
            />
          </Grid>
          
          {/* Presión */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MeasurementCard
              title={t('currentMeasurements.pressure')}
              value={data?.pressure}
              unit="hPa"
              icon={<Speed />}
              loading={loading}
            />
          </Grid>
          
          {/* Velocidad del Viento */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MeasurementCard
              title={t('currentMeasurements.windSpeed')}
              value={data?.wind_speed}
              unit="km/h"
              icon={<Air />}
              loading={loading}
            />
          </Grid>
          
          {/* Dirección del Viento */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Navigation sx={{ mr: 1, color: '#1976d2' }} />
                  <Typography variant="h6">{t('currentMeasurements.windDirection')}</Typography>
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MeasurementCard
              title={t('currentMeasurements.precipitation')}
              value={data?.rainfall}
              unit="mm"
              icon={<WaterOutlined />}
              loading={loading}
            />
          </Grid>
          
          {/* Dust PM2.5 from DSM501A sensor */}
          {data?.dust_pm25 !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.dustPm25', 'PM2.5')}
                value={data.dust_pm25}
                unit="μg/m³"
                icon={<Air />}
                loading={loading}
              />
            </Grid>
          )}

          {/* PM2.5 (legacy - opcional) */}
          {data?.pm25 !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.pm25')}
                value={data.pm25}
                unit="μg/m³"
                icon={<Air />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Índice UV (opcional) */}
          {data?.uv_index !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.uvIndex', 'Índice UV')}
                value={data.uv_index}
                unit=""
                icon={<WbSunny />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Altitud */}
          {data?.altitude !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.altitude', 'Altitud')}
                value={data.altitude}
                unit="m"
                icon={<Landscape />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Temperatura BMP */}
          {data?.bmp_temperature !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.bmpTemperature', 'Temp. BMP')}
                value={data.bmp_temperature}
                unit="°C"
                icon={<Thermostat />}
                loading={loading}
              />
            </Grid>
          )}
          
          {/* Batería (opcional) */}
          {data?.battery_voltage !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.battery', 'Batería')}
                value={data.battery_voltage}
                unit="V"
                icon={<BatteryFull />}
                loading={loading}
              />
            </Grid>
          )}

          {/* CO Level (Carbon Monoxide) */}
          {data?.co_level !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.coLevel', 'CO')}
                value={data.co_level}
                unit="ppm"
                icon={<Co2 />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Light Level */}
          {data?.light_level !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.lightLevel', 'Luz')}
                value={data.light_level}
                unit="lux"
                icon={<LightMode />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Rain Percentage (MH-RD sensor) */}
          {data?.rain_percentage !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.rainPercentage', 'Lluvia %')}
                value={data.rain_percentage}
                unit="%"
                icon={<WaterDrop />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Pluviometer Accumulated */}
          {data?.pluvio_accumulated !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.pluvioAccumulated', 'Lluvia Acum.')}
                value={data.pluvio_accumulated}
                unit="mm"
                icon={<Cloud />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Signal Strength */}
          {data?.signal_strength !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.signalStrength', 'Señal WiFi')}
                value={data.signal_strength}
                unit="dBm"
                icon={<SignalWifi4Bar />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Free Heap Memory */}
          {data?.free_heap !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.freeHeap', 'Memoria')}
                value={data.free_heap / 1024}
                unit="KB"
                icon={<Memory />}
                loading={loading}
              />
            </Grid>
          )}

          {/* Uptime */}
          {data?.uptime !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MeasurementCard
                title={t('currentMeasurements.uptime', 'Tiempo Activo')}
                value={data.uptime / 3600}
                unit="h"
                icon={<Timer />}
                loading={loading}
              />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
});

CurrentMeasurements.displayName = 'CurrentMeasurements';

export default CurrentMeasurements;