import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, AppBar, Toolbar, Chip, Alert } from '@mui/material';
import { Wifi, WifiOff } from '@mui/icons-material';
import CurrentMeasurements from '../components/CurrentMeasurements';
import HistoricalCharts from '../components/HistoricalCharts';
import WeatherMap from '../components/WeatherMap';
import SystemStatus from '../components/SystemStatus';
import AlertsPanel from '../components/AlertsPanel';
import { weatherService } from '../services/weatherService';
import { socketService } from '../services/socketService';

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

export default function Dashboard() {
  const [currentData, setCurrentData] = useState<WeatherData | null>(null);
  const [stationId] = useState('ESP32_STATION_001'); // Podrías hacer esto configurable
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const getConnectionStatus = () => {
    if (!currentData?.timestamp) return { connected: false, text: 'Sin conexión' };
    
    const lastUpdate = new Date(currentData.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) return { connected: true, text: 'Tiempo Real' };
    if (diffMinutes < 10) return { connected: true, text: 'Conexión lenta' };
    return { connected: false, text: 'Sin conexión en vivo' };
  };

  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const data = await weatherService.getLatestData(stationId);
        if (data) {
          setCurrentData(data);
          setLastUpdate(new Date());
        } else {
          // No hay datos recientes disponibles
          setCurrentData(null);
          console.log('No recent data available for station:', stationId);
        }
      } catch (error) {
        console.error('Error fetching latest data:', error);
      } finally {
        setLoading(false);
      }
    };

    // TODO: Configurar WebSocket cuando esté implementado en el backend
    // const setupSocket = () => {
    //   socketService.connect();
    //   
    //   // Suscribirse a la estación
    //   socketService.subscribeToStation(stationId);
    //   
    //   // Escuchar eventos de conexión
    //   socketService.on('connection', (data: any) => {
    //     setSocketConnected(data.status === 'connected');
    //   });
    //   
    //   // Escuchar datos en tiempo real
    //   socketService.on('weather-data', (data: WeatherData) => {
    //     if (data.station_id === stationId) {
    //       setCurrentData(data);
    //       setLastUpdate(new Date());
    //     }
    //   });
    //   
    //   // Escuchar nuevas alertas
    //   socketService.on('new-alert', (alert: any) => {
    //     console.log('Nueva alerta recibida:', alert);
    //     // Podrías mostrar una notificación aquí
    //   });
    // };

    fetchLatestData();
    // setupSocket(); // Deshabilitado hasta implementar Socket.IO en backend
    
    // Actualizar cada 60 segundos (no hay WebSocket por ahora)
    const interval = setInterval(() => {
      fetchLatestData();
    }, 60000);
    
    return () => {
      clearInterval(interval);
      // socketService.unsubscribeFromStation(stationId);
      // socketService.disconnect();
    };
  }, [stationId]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Estación Meteorológica - Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              icon={getConnectionStatus().connected ? <Wifi /> : <WifiOff />}
              label={getConnectionStatus().text}
              color={getConnectionStatus().connected ? 'success' : 'default'}
              variant="outlined"
              size="small"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            />
            {lastUpdate && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl">
        {!loading && !currentData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No hay datos recientes disponibles para la estación {stationId}. 
            Verifique que el ESP32 esté enviando datos o que los servicios del sistema estén funcionando correctamente.
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Mediciones Actuales */}
          <Grid item xs={12}>
            <CurrentMeasurements data={currentData} loading={loading} />
          </Grid>
          
          {/* Gráficos Históricos */}
          <Grid item xs={12} lg={8}>
            <HistoricalCharts stationId={stationId} />
          </Grid>
          
          {/* Estado del Sistema */}
          <Grid item xs={12} lg={4}>
            <SystemStatus data={currentData} />
          </Grid>
          
          {/* Alertas */}
          <Grid item xs={12} lg={6}>
            <AlertsPanel stationId={stationId} />
          </Grid>
          
          {/* Mapa */}
          <Grid item xs={12} lg={6}>
            <WeatherMap stationId={stationId} currentData={currentData} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}