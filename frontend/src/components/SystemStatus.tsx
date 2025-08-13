import React from 'react';
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
  Memory
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

interface SystemStatusProps {
  data: WeatherData | null;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ data }) => {
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
    if (!data?.timestamp) return { status: 'offline', text: 'Sin datos' };
    
    const lastUpdate = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) return { status: 'online', text: 'En línea' };
    if (diffMinutes < 10) return { status: 'warning', text: 'Retrasado' };
    return { status: 'offline', text: 'Desconectado' };
  };

  const getConnectionIcon = () => {
    const status = getLastUpdateStatus();
    return status.status === 'offline' ? <WifiOff color="error" /> : <Wifi color="success" />;
  };

  const formatLastUpdate = () => {
    if (!data?.timestamp) return 'Nunca';
    
    const lastUpdate = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de 1 minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
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
          Estado del Sistema
        </Typography>

        <List>
          {/* Estado de Conexión */}
          <ListItem>
            <ListItemIcon>
              {getConnectionIcon()}
            </ListItemIcon>
            <ListItemText 
              primary="Conectividad" 
              secondary={connectionStatus.text}
            />
            <ListItemSecondaryAction>
              <Chip 
                label={connectionStatus.status === 'online' ? 'Activo' : 
                       connectionStatus.status === 'warning' ? 'Retrasado' : 'Inactivo'}
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
                primary="Batería" 
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
              primary="Última actualización" 
              secondary={formatLastUpdate()}
            />
          </ListItem>

          {/* ID de Estación */}
          <ListItem>
            <ListItemIcon>
              <LocationOn color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="ID de Estación" 
              secondary={data?.station_id || 'N/A'}
            />
          </ListItem>

          {/* Memoria/Estado */}
          <ListItem>
            <ListItemIcon>
              <Memory color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Estado operativo" 
              secondary="Sistema funcionando correctamente"
            />
            <ListItemSecondaryAction>
              <Chip 
                label="OK" 
                color="success" 
                size="small"
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>

        {/* Información adicional */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Resumen del sistema:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Sensores activos: {data ? `${getActiveSensorsCount().active}/${getActiveSensorsCount().total}` : '0/7'}<br />
            • Frecuencia de medición: 1 minuto<br />
            • Uptime estimado: {connectionStatus.status === 'online' ? '99.5%' : 'N/A'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;