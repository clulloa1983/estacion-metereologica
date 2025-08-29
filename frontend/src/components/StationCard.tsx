import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Collapse,
  Divider,
  Grid,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  LocationOn,
  SignalWifi4Bar,
  SignalWifiOff,
  Battery90,
  BatteryAlert,
  Thermostat,
  WaterDrop,
  Air,
  Speed,
  Visibility,
  ExpandMore,
  ExpandLess,
  Settings,
  Timeline,
  Info,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  StationWithData, 
  WeatherData, 
  StationStatus,
  StationStats 
} from '../types/stationTypes';

dayjs.extend(relativeTime);

interface StationCardProps {
  station: StationWithData;
  currentData?: WeatherData | null;
  stats?: StationStats | null;
  isSelected?: boolean;
  showDetails?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
  onViewCharts?: () => void;
  onViewSettings?: () => void;
  compact?: boolean;
}

const StationCard: React.FC<StationCardProps> = ({
  station,
  currentData,
  stats,
  isSelected = false,
  showDetails = false,
  onSelect,
  onDeselect,
  onViewCharts,
  onViewSettings,
  compact = false
}) => {
  const { t } = useTranslation('dashboard');
  const [expanded, setExpanded] = useState(showDetails);

  // Obtener color según estado
  const getStatusColor = () => {
    switch (station.status) {
      case StationStatus.ACTIVE:
        return 'success';
      case StationStatus.MAINTENANCE:
        return 'warning';
      case StationStatus.ERROR:
        return 'error';
      case StationStatus.INACTIVE:
        return 'default';
      default:
        return 'default';
    }
  };

  // Obtener icono de estado
  const getStatusIcon = () => {
    switch (station.status) {
      case StationStatus.ACTIVE:
        return <CheckCircle color="success" />;
      case StationStatus.MAINTENANCE:
        return <Warning color="warning" />;
      case StationStatus.ERROR:
        return <ErrorIcon color="error" />;
      case StationStatus.INACTIVE:
        return <SignalWifiOff color="disabled" />;
      default:
        return <SignalWifiOff color="disabled" />;
    }
  };

  // Obtener icono de conectividad
  const getConnectivityIcon = () => {
    const isOnline = station.last_seen && 
      dayjs().diff(dayjs(station.last_seen), 'minutes') < 5;
    
    return isOnline ? 
      <SignalWifi4Bar color="success" /> : 
      <SignalWifiOff color="error" />;
  };

  // Obtener icono de batería
  const getBatteryIcon = () => {
    if (!currentData?.battery_voltage) return null;
    
    const voltage = currentData.battery_voltage;
    return voltage > 3.5 ? 
      <Battery90 color="success" /> : 
      <BatteryAlert color="warning" />;
  };

  // Formatear valores de sensores
  const formatSensorValue = (value: number | undefined, unit: string, decimals: number = 1): string => {
    if (value === undefined || value === null) return t('common.noData');
    return `${value.toFixed(decimals)} ${unit}`;
  };

  // Calcular tiempo desde última actualización
  const getLastSeenText = () => {
    if (!station.last_seen) return t('stations.neverSeen');
    return dayjs(station.last_seen).fromNow();
  };

  // Obtener progreso de uptime
  const getUptimeProgress = () => {
    if (!stats?.uptime_percentage) return 0;
    return Math.min(stats.uptime_percentage, 100);
  };

  // Renderizar métricas principales
  const renderMainMetrics = () => {
    if (!currentData) return null;

    const metrics = [
      {
        icon: <Thermostat color="primary" />,
        label: t('weather.temperature'),
        value: formatSensorValue(currentData.temperature, '°C'),
        color: 'primary'
      },
      {
        icon: <WaterDrop color="info" />,
        label: t('weather.humidity'),
        value: formatSensorValue(currentData.humidity, '%', 0),
        color: 'info'
      },
      {
        icon: <Speed color="secondary" />,
        label: t('weather.pressure'),
        value: formatSensorValue(currentData.pressure, 'hPa', 0),
        color: 'secondary'
      },
      {
        icon: <Air color="success" />,
        label: t('weather.windSpeed'),
        value: formatSensorValue(currentData.wind_speed, 'km/h'),
        color: 'success'
      }
    ];

    return (
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {metrics.map((metric, index) => (
          <Grid xs={6} key={index}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {metric.icon}
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {metric.label}
                </Typography>
                <Typography variant="body2" fontWeight="medium" noWrap>
                  {metric.value}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Renderizar métricas detalladas
  const renderDetailedMetrics = () => {
    if (!currentData) return null;

    const detailedMetrics = [
      { label: t('weather.windDirection'), value: formatSensorValue(currentData.wind_direction, '°', 0) },
      { label: t('weather.rainfall'), value: formatSensorValue(currentData.rainfall, 'mm') },
      { label: t('weather.lightIntensity'), value: formatSensorValue(currentData.light_intensity, 'lux', 0) },
      { label: t('weather.coLevel'), value: formatSensorValue(currentData.co_level, 'ppm') },
      { label: t('weather.airQuality'), value: formatSensorValue(currentData.air_quality, '') },
      { label: t('weather.pm25'), value: formatSensorValue(currentData.pm25, 'μg/m³') }
    ].filter(metric => metric.value !== t('common.noData'));

    if (detailedMetrics.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('weather.additionalMetrics')}
        </Typography>
        <Grid container spacing={1}>
          {detailedMetrics.map((metric, index) => (
            <Grid xs={6} key={index}>
              <Typography variant="caption" color="text.secondary">
                {metric.label}:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {metric.value}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Renderizar estadísticas de la estación
  const renderStationStats = () => {
    if (!stats) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('stations.statistics')}
        </Typography>
        
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">
              {t('statistics.uptime')}
            </Typography>
            <Typography variant="caption">
              {stats.uptime_percentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={getUptimeProgress()} 
            color={getUptimeProgress() > 90 ? 'success' : getUptimeProgress() > 70 ? 'warning' : 'error'}
          />
        </Box>

        <Grid container spacing={1}>
          <Grid xs={6}>
            <Typography variant="caption" color="text.secondary">
              {t('statistics.dataPoints')}
            </Typography>
            <Typography variant="body2">
              {stats.data_points_30d.toLocaleString()}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <Typography variant="caption" color="text.secondary">
              {t('stations.sensors')}
            </Typography>
            <Typography variant="body2">
              {stats.sensors_count} {t('stations.active')}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Card 
      variant={isSelected ? "elevation" : "outlined"}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(isSelected && {
          borderColor: 'primary.main',
          borderWidth: 2,
          borderStyle: 'solid'
        })
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: compact ? 1 : 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1, mr: 1 }}>
            <Typography variant="h6" component="h3" noWrap>
              {station.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary" noWrap>
                {station.location.address}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              size="small"
              label={t(`stationStatus.${station.status}`)}
              color={getStatusColor() as any}
              icon={getStatusIcon()}
              variant="outlined"
            />
            {isSelected && (
              <Chip
                size="small"
                label={t('stations.selected')}
                color="primary"
                variant="filled"
              />
            )}
          </Box>
        </Box>

        {/* Connection Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getConnectivityIcon()}
            <Typography variant="caption" color="text.secondary">
              {getLastSeenText()}
            </Typography>
          </Box>
          
          {getBatteryIcon() && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getBatteryIcon()}
              <Typography variant="caption">
                {currentData?.battery_voltage?.toFixed(1)}V
              </Typography>
            </Box>
          )}
        </Box>

        {/* Main Metrics */}
        {currentData ? (
          renderMainMetrics()
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('weather.noCurrentData')}
            </Typography>
          </Box>
        )}

        {/* Expanded Content */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          {renderDetailedMetrics()}
          {renderStationStats()}
        </Collapse>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        <Box>
          {!compact && (
            <Tooltip title={expanded ? t('common.showLess') : t('common.showMore')}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onViewCharts && (
            <Tooltip title={t('stations.viewCharts')}>
              <IconButton size="small" onClick={onViewCharts}>
                <Timeline />
              </IconButton>
            </Tooltip>
          )}
          
          {onViewSettings && (
            <Tooltip title={t('stations.settings')}>
              <IconButton size="small" onClick={onViewSettings}>
                <Settings />
              </IconButton>
            </Tooltip>
          )}

          {isSelected ? (
            <Button
              size="small"
              variant="outlined"
              onClick={onDeselect}
              sx={{ ml: 1 }}
            >
              {t('stations.deselect')}
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={onSelect}
              sx={{ ml: 1 }}
            >
              {t('stations.select')}
            </Button>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default StationCard;