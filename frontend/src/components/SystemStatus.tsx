import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Battery4Bar,
  Battery2Bar,
  Battery1Bar,
  BatteryAlert,
  Wifi,
  WifiOff,
  Schedule,
  LocationOn,
  Memory,
  SignalWifi4Bar,
  SignalWifi2Bar,
  SignalWifiOff
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
  signal_strength?: number;
  free_heap?: number;
  uptime?: number;
  timestamp: string;
}

interface SystemStatusProps {
  data: WeatherData | null;
}

function SystemStatus({ data }: SystemStatusProps) {
  const { t } = useTranslation('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Helper function para evitar errores de hidratación
  const safeT = (key: string, options?: any, fallback?: string) => {
    if (!isHydrated) return fallback || key;
    return t(key, options);
  };
  const getBatteryIcon = (voltage?: number) => {
    if (!voltage) return <BatteryAlert color="error" />;
    
    // Asumiendo batería LiFePO4 de 12V
    const percentage = ((voltage - 10.5) / (13.8 - 10.5)) * 100;
    
    if (percentage > 75) return <Battery4Bar color="success" />;
    if (percentage > 50) return <Battery4Bar color="warning" />;
    if (percentage > 25) return <Battery2Bar color="warning" />;
    if (percentage > 10) return <Battery1Bar color="error" />;
    return <BatteryAlert color="error" />;
  };

  const getBatteryPercentage = (voltage?: number): number => {
    if (!voltage) return 0;
    
    // Conversión para batería LiFePO4 de 12V
    const percentage = ((voltage - 10.5) / (13.8 - 10.5)) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  const getBatteryColor = (voltage?: number): "primary" | "error" | "warning" | "success" => {
    const percentage = getBatteryPercentage(voltage);
    if (percentage > 50) return "success";
    if (percentage > 25) return "warning";
    return "error";
  };

  const getLastUpdateStatus = () => {
    if (!data?.timestamp) return { status: 'offline', text: safeT('systemStatus.statuses.noData', {}, 'Sin datos') };
    
    const lastUpdate = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) return { status: 'online', text: safeT('systemStatus.statuses.online', {}, 'En línea') };
    if (diffMinutes < 10) return { status: 'warning', text: safeT('systemStatus.statuses.delayed', {}, 'Retrasado') };
    return { status: 'offline', text: safeT('systemStatus.statuses.disconnected', {}, 'Desconectado') };
  };

  const getConnectionIcon = () => {
    const status = getLastUpdateStatus();
    return status.status === 'offline' ? <WifiOff color="error" /> : <Wifi color="success" />;
  };

  const formatLastUpdate = () => {
    if (!data?.timestamp) return safeT('systemStatus.statuses.never', {}, 'Nunca');
    
    const lastUpdate = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return safeT('systemStatus.timeFormats.lessThanMinute', {}, 'Hace menos de 1 minuto');
    if (diffMinutes < 60) return safeT('systemStatus.timeFormats.minutesAgo', { count: diffMinutes }, `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`);
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return safeT('systemStatus.timeFormats.hoursAgo', { count: diffHours }, `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`);
    
    const diffDays = Math.floor(diffHours / 24);
    return safeT('systemStatus.timeFormats.daysAgo', { count: diffDays }, `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`);
  };

  const getSignalIcon = (signalStrength?: number) => {
    if (!signalStrength) return <SignalWifiOff color="error" />;
    
    // Clasificación típica de fuerza de señal WiFi (dBm)
    if (signalStrength > -50) return <SignalWifi4Bar color="success" />;
    if (signalStrength > -70) return <SignalWifi4Bar color="warning" />;
    if (signalStrength > -80) return <SignalWifi2Bar color="warning" />;
    return <SignalWifiOff color="error" />;
  };

  const getSignalQuality = (signalStrength?: number): string => {
    if (!signalStrength) return safeT('systemStatus.signalQuality.noSignal', {}, 'Sin señal');
    
    if (signalStrength > -50) return safeT('systemStatus.signalQuality.excellent', {}, 'Excelente');
    if (signalStrength > -70) return safeT('systemStatus.signalQuality.good', {}, 'Buena');
    if (signalStrength > -80) return safeT('systemStatus.signalQuality.weak', {}, 'Débil');
    return safeT('systemStatus.signalQuality.veryWeak', {}, 'Muy débil');
  };

  const formatHeapMemory = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getActiveSensorsCount = () => {
    if (!data) return { active: 0, total: 7 };
    
    const sensors = [
      data.temperature !== undefined && data.temperature !== null,
      data.humidity !== undefined && data.humidity !== null,
      data.pressure !== undefined && data.pressure !== null,
      data.wind_speed !== undefined && data.wind_speed !== null,
      data.wind_direction !== undefined && data.wind_direction !== null,
      data.rainfall !== undefined && data.rainfall !== null,
      data.pm25 !== undefined && data.pm25 !== null
    ];
    
    const activeSensors = sensors.filter(Boolean).length;
    return { active: activeSensors, total: 7 };
  };

  const connectionStatus = getLastUpdateStatus();

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {safeT('systemStatus.title', {}, 'Estado del Sistema')}
        </Typography>

        <List>
          {/* Estado de Conexión */}
          <ListItem>
            <ListItemIcon>
              {getConnectionIcon()}
            </ListItemIcon>
            <ListItemText 
              primary={safeT('systemStatus.connectivity', {}, 'Conectividad')} 
              secondary={connectionStatus.text}
            />
            <ListItemSecondaryAction>
              <Chip 
                label={connectionStatus.status === 'online' ? safeT('systemStatus.statuses.active', {}, 'Activo') : 
                       connectionStatus.status === 'warning' ? safeT('systemStatus.statuses.delayed', {}, 'Retrasado') : safeT('systemStatus.statuses.inactive', {}, 'Inactivo')}
                color={connectionStatus.status === 'online' ? 'success' : 
                       connectionStatus.status === 'warning' ? 'warning' : 'error'}
                size="small"
              />
            </ListItemSecondaryAction>
          </ListItem>

          {/* Batería */}
          {data?.battery_voltage && (
            <ListItem>
              <ListItemIcon>
                {getBatteryIcon(data.battery_voltage)}
              </ListItemIcon>
              <ListItemText 
                primary={safeT('systemStatus.battery', {}, 'Batería')} 
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={getBatteryPercentage(data.battery_voltage)}
                      color={getBatteryColor(data.battery_voltage)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption">
                      {data.battery_voltage.toFixed(2)}V ({getBatteryPercentage(data.battery_voltage).toFixed(0)}%)
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          )}

          {/* Última Actualización */}
          <ListItem>
            <ListItemIcon>
              <Schedule color={connectionStatus.status === 'online' ? 'success' : 'error'} />
            </ListItemIcon>
            <ListItemText 
              primary={safeT('systemStatus.lastUpdate', {}, 'Última actualización')} 
              secondary={formatLastUpdate()}
            />
          </ListItem>

          {/* ID de Estación */}
          <ListItem>
            <ListItemIcon>
              <LocationOn color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary={safeT('systemStatus.stationId', {}, 'ID de Estación')} 
              secondary={data?.station_id || 'N/A'}
            />
          </ListItem>

          {/* Señal WiFi */}
          {data?.signal_strength && (
            <ListItem>
              <ListItemIcon>
                {getSignalIcon(data.signal_strength)}
              </ListItemIcon>
              <ListItemText 
                primary={safeT('systemStatus.wifiSignal', {}, 'Señal WiFi')} 
                secondary={`${data.signal_strength} dBm (${getSignalQuality(data.signal_strength)})`}
              />
            </ListItem>
          )}

          {/* Memoria libre */}
          {data?.free_heap && (
            <ListItem>
              <ListItemIcon>
                <Memory color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={safeT('systemStatus.freeMemory', {}, 'Memoria libre')} 
                secondary={formatHeapMemory(data.free_heap)}
              />
            </ListItem>
          )}

          {/* Uptime */}
          {data?.uptime && (
            <ListItem>
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={safeT('systemStatus.uptime', {}, 'Tiempo funcionamiento')} 
                secondary={formatUptime(data.uptime)}
              />
            </ListItem>
          )}
        </List>

        {/* Información adicional */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {safeT('systemStatus.systemSummary', {}, 'Resumen del sistema:')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {safeT('systemStatus.summary.activeSensors', { 
              active: data ? getActiveSensorsCount().active : 0, 
              total: getActiveSensorsCount().total 
            }, `Sensores activos: ${data ? getActiveSensorsCount().active : 0}/${getActiveSensorsCount().total}`)}<br />
            • {safeT('systemStatus.summary.measurementFrequency', {}, 'Frecuencia de medición: 1 minuto')}<br />
            • {safeT('systemStatus.summary.estimatedUptime', { 
              uptime: connectionStatus.status === 'online' ? '99.5%' : 'N/A' 
            }, `Uptime estimado: ${connectionStatus.status === 'online' ? '99.5%' : 'N/A'}`)}<br />
            {data?.signal_strength && `• ${safeT('systemStatus.summary.wifiSignal', { signal: data.signal_strength }, `Señal WiFi: ${data.signal_strength} dBm`)}`}<br />
            {data?.free_heap && `• ${safeT('systemStatus.summary.freeMemory', { memory: formatHeapMemory(data.free_heap) }, `Memoria libre: ${formatHeapMemory(data.free_heap)}`)}`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default SystemStatus;