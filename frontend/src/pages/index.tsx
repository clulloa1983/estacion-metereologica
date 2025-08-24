import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, AppBar, Toolbar, Chip, Alert } from '@mui/material';
import { Wifi, WifiOff } from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CurrentMeasurements from '../components/CurrentMeasurements';
import HistoricalCharts from '../components/HistoricalCharts';
import WeatherMap from '../components/WeatherMap';
import SystemStatus from '../components/SystemStatus';
import AlertsPanel from '../components/AlertsPanel';
import RemoteConfigPanel from '../components/RemoteConfigPanel';
import MLAlertsPanel from '../components/MLAlertsPanel';
import { LanguageSelector } from '../components/LanguageSelector';
import { weatherService } from '../services/weatherService';
import { socketService } from '../services/socketService';
import ThemeToggle from '../components/ThemeToggle';

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
  const { t } = useTranslation(['common', 'dashboard']);
  const [currentData, setCurrentData] = useState<WeatherData | null>(null);
  const [stationId] = useState('ESP32_STATION_001'); // Podrías hacer esto configurable
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const getConnectionStatus = () => {
    if (!currentData?.timestamp) return { connected: false, text: t('status.offline') };
    
    const lastUpdate = new Date(currentData.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) return { connected: true, text: t('status.online') };
    if (diffMinutes < 10) return { connected: true, text: t('status.connecting') };
    return { connected: false, text: t('status.offline') };
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

    // WebSocket setup - ¡Ahora implementado en el backend!
    const setupSocket = () => {
      socketService.connect();
      
      // Suscribirse a la estación
      socketService.subscribeToStation(stationId);
      
      // Escuchar eventos de conexión
      socketService.on('connection', (data: any) => {
        setSocketConnected(data.status === 'connected');
        console.log('WebSocket conectado:', data);
      });
      
      // Escuchar datos en tiempo real
      socketService.on('weather-data', (payload: any) => {
        if (payload.stationId === stationId) {
          setCurrentData(payload.data);
          setLastUpdate(new Date());
          console.log('Datos en tiempo real recibidos:', payload.data);
        }
      });
      
      // Escuchar nuevas alertas
      socketService.on('new-alert', (payload: any) => {
        console.log('Nueva alerta recibida:', payload.alert);
        // Podrías mostrar una notificación aquí
      });

      // Escuchar estado de la estación
      socketService.on('station-status', (payload: any) => {
        console.log('Estado de estación actualizado:', payload.status);
      });
    };

    fetchLatestData();
    setupSocket(); // ¡Habilitado! Socket.IO implementado en backend
    
    // Mantener polling cada 60 segundos como fallback
    const interval = setInterval(() => {
      if (!socketConnected) {
        fetchLatestData();
      }
    }, 60000);
    
    return () => {
      clearInterval(interval);
      socketService.unsubscribeFromStation(stationId);
      socketService.disconnect();
    };
  }, [stationId]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="sticky" sx={{ mb: 2, top: 0, zIndex: 1100 }}>
        <Toolbar sx={{ minHeight: { xs: '56px', sm: '64px' } }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 600
            }}
          >
            {t('title')}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 }, 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <LanguageSelector variant="icon" />
            <Chip
              icon={getConnectionStatus().connected ? <Wifi /> : <WifiOff />}
              label={getConnectionStatus().text}
              color={getConnectionStatus().connected ? 'success' : 'default'}
              variant="outlined"
              size="small"
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.5)',
                fontSize: { xs: '0.75rem', sm: '0.8125rem' }
              }}
            />
            {lastUpdate && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255,255,255,0.8)',
                  display: { xs: 'none', sm: 'block' },
                  fontSize: '0.75rem'
                }}
              >
                {t('dashboard:currentMeasurements.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <ThemeToggle color="inherit" sx={{ ml: { xs: 0, sm: 1 } }} />
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {!loading && !currentData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('status.noData')} {stationId}. 
            {t('dashboard:systemStatus.connectionStatus')}.
          </Alert>
        )}
        
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Mediciones Actuales */}
          <Grid size={{ xs: 12 }}>
            <CurrentMeasurements data={currentData} loading={loading} />
          </Grid>
          
          {/* Gráficos Históricos */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <HistoricalCharts stationId={stationId} />
          </Grid>
          
          {/* Estado del Sistema */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <SystemStatus data={currentData} />
          </Grid>
          
          {/* Alertas */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <AlertsPanel stationId={stationId} />
          </Grid>
          
          {/* Mapa */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <WeatherMap stationId={stationId} currentData={currentData} />
          </Grid>
          
          {/* Panel de Alertas Inteligentes ML */}
          <Grid size={{ xs: 12 }}>
            <MLAlertsPanel stationId={stationId} />
          </Grid>
          
          {/* Panel de Configuración Remota */}
          <Grid size={{ xs: 12 }}>
            <RemoteConfigPanel stationId={stationId} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'es', ['common', 'dashboard'])),
    },
  };
};