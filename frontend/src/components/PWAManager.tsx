import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CloudDownload as OfflineIcon,
  Sensors as SensorsIcon,
  Battery50 as BatteryIcon,
  NetworkWifi as NetworkIcon,
  LocationOn as LocationIcon,
  Vibration as VibrationIcon,
  TestTube as TestIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Importar servicios PWA
import { notificationService } from '../services/notificationService';
import { offlineService } from '../services/offlineService';
import { deviceSensorService } from '../services/deviceSensorService';

interface PWAManagerProps {
  stationId?: string;
}

const PWAManager: React.FC<PWAManagerProps> = ({ stationId = 'ESP32_STATION_001' }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [sensorPermissions, setSensorPermissions] = useState<any>({});
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>({});
  const [storageStats, setStorageStats] = useState<any>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    initializePWAStatus();
    setupOnlineListener();
    
    // Actualizar estadísticas cada 30 segundos
    const interval = setInterval(updateStorageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializePWAStatus = async () => {
    // Verificar notificaciones
    setNotificationsEnabled(notificationService.isNotificationEnabled());
    
    // Obtener capacidades del dispositivo
    const capabilities = deviceSensorService.getCapabilities();
    setDeviceCapabilities(capabilities);
    
    // Verificar permisos de sensores
    try {
      const permissions = await deviceSensorService.requestPermissions();
      setSensorPermissions(permissions);
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
    }
    
    // Obtener estadísticas de almacenamiento
    await updateStorageStats();
  };

  const setupOnlineListener = () => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        setLastSync(new Date());
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const updateStorageStats = async () => {
    try {
      const stats = await offlineService.getStorageStats();
      setStorageStats(stats);
      setOfflineReady(stats.weatherDataCount > 0 || stats.alertsCount > 0);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.subscribeToServerNotifications(stationId);
        setNotificationsEnabled(true);
      }
    } else {
      await notificationService.unsubscribeFromServerNotifications();
      setNotificationsEnabled(false);
    }
  };

  const testNotification = async () => {
    await notificationService.showSystemNotification(
      'PWA Test',
      'Las notificaciones están funcionando correctamente',
      'success'
    );
  };

  const testWeatherAlert = async () => {
    await notificationService.showWeatherAlert({
      id: 'test-alert',
      stationId: stationId,
      parameter: 'temperature',
      value: 35.5,
      threshold: 35,
      severity: 'HIGH',
      message: 'Temperatura alta detectada',
      timestamp: new Date().toISOString(),
    });
  };

  const testDeviceSensors = async () => {
    try {
      const readings = await deviceSensorService.getAllSensorReadings();
      console.log('Lecturas de sensores del dispositivo:', readings);
      
      await notificationService.showSystemNotification(
        'Sensores del Dispositivo',
        `Lecturas obtenidas. Ver consola para detalles.`,
        'info'
      );

      // Vibrar si está disponible
      deviceSensorService.vibrate([200, 100, 200]);
    } catch (error) {
      console.error('Error probando sensores:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      await offlineService.syncPendingActions();
      await updateStorageStats();
      setLastSync(new Date());
      
      await notificationService.showSystemNotification(
        'Sincronización',
        'Datos offline sincronizados exitosamente',
        'success'
      );
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  };

  const clearOfflineData = async () => {
    try {
      await offlineService.cleanupOldData(0); // Eliminar todos los datos
      await updateStorageStats();
      
      await notificationService.showSystemNotification(
        'Limpieza',
        'Datos offline eliminados',
        'info'
      );
    } catch (error) {
      console.error('Error limpiando datos:', error);
    }
  };

  const getStatusColor = (enabled: boolean) => enabled ? 'success' : 'default';
  const getStatusText = (enabled: boolean) => enabled ? 'Habilitado' : 'Deshabilitado';

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon />
        PWA Manager
      </Typography>
      
      {/* Estado de Conectividad */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estado de Conectividad
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip
                icon={<NetworkIcon />}
                label={isOnline ? 'Online' : 'Offline'}
                color={isOnline ? 'success' : 'warning'}
                variant="outlined"
              />
            </Grid>
            <Grid item xs>
              {lastSync && (
                <Typography variant="body2" color="text.secondary">
                  Última sincronización: {lastSync.toLocaleTimeString()}
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Notificaciones Push */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon />
              Notificaciones Push
            </Typography>
            <Chip
              label={getStatusText(notificationsEnabled)}
              color={getStatusColor(notificationsEnabled)}
              size="small"
            />
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
              />
            }
            label="Habilitar notificaciones push"
          />
          
          {notificationsEnabled && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TestIcon />}
                onClick={testNotification}
              >
                Test Sistema
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TestIcon />}
                onClick={testWeatherAlert}
              >
                Test Alerta
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Almacenamiento Offline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OfflineIcon />
              Almacenamiento Offline
            </Typography>
            <Chip
              label={getStatusText(offlineReady)}
              color={getStatusColor(offlineReady)}
              size="small"
            />
          </Box>
          
          <List dense>
            <ListItem>
              <ListItemText
                primary={`Datos meteorológicos: ${storageStats.weatherDataCount || 0}`}
                secondary="Registros almacenados offline"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={`Alertas: ${storageStats.alertsCount || 0}`}
                secondary="Alertas almacenadas offline"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={`Acciones pendientes: ${storageStats.pendingActionsCount || 0}`}
                secondary="Acciones esperando sincronización"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={`Almacenamiento usado: ${storageStats.storageUsed || 0} MB`}
                secondary="Espacio utilizado en el dispositivo"
              />
            </ListItem>
          </List>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={syncOfflineData}
              disabled={!isOnline || storageStats.pendingActionsCount === 0}
            >
              Sincronizar
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={clearOfflineData}
              color="warning"
            >
              Limpiar Datos
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sensores del Dispositivo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SensorsIcon />
            Sensores del Dispositivo
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <LocationIcon color={deviceCapabilities.geolocation ? 'success' : 'disabled'} />
              </ListItemIcon>
              <ListItemText
                primary="Geolocalización"
                secondary={deviceCapabilities.geolocation ? 'Disponible' : 'No disponible'}
              />
              <Chip
                label={sensorPermissions.geolocation || 'unknown'}
                size="small"
                color={sensorPermissions.geolocation === 'granted' ? 'success' : 'default'}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <VibrationIcon color={deviceCapabilities.deviceMotion ? 'success' : 'disabled'} />
              </ListItemIcon>
              <ListItemText
                primary="Movimiento"
                secondary={deviceCapabilities.deviceMotion ? 'Disponible' : 'No disponible'}
              />
              <Chip
                label={sensorPermissions.deviceMotion || 'unknown'}
                size="small"
                color={sensorPermissions.deviceMotion === 'granted' ? 'success' : 'default'}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <BatteryIcon color={deviceCapabilities.battery ? 'success' : 'disabled'} />
              </ListItemIcon>
              <ListItemText
                primary="Batería"
                secondary={deviceCapabilities.battery ? 'Disponible' : 'No disponible'}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <NetworkIcon color={deviceCapabilities.networkInformation ? 'success' : 'disabled'} />
              </ListItemIcon>
              <ListItemText
                primary="Información de Red"
                secondary={deviceCapabilities.networkInformation ? 'Disponible' : 'No disponible'}
              />
            </ListItem>
          </List>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TestIcon />}
              onClick={testDeviceSensors}
            >
              Probar Sensores
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Información PWA */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            Información PWA
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta aplicación es una PWA (Progressive Web App) que funciona offline y puede instalarse en tu dispositivo.
          </Alert>
          
          <List dense>
            <ListItem>
              <ListItemText
                primary="Instalable"
                secondary="Puedes agregar esta app a tu pantalla de inicio"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Modo Offline"
                secondary="Funciona sin conexión a internet con datos almacenados localmente"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Notificaciones"
                secondary="Recibe alertas automáticas sobre condiciones meteorológicas"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Sincronización"
                secondary="Los datos se sincronizan automáticamente cuando hay conexión"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PWAManager;