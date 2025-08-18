import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  Typography,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress
} from '@mui/material';
import { 
  Sensors, 
  NotificationsActive, 
  Battery3Bar, 
  Wifi 
} from '@mui/icons-material';
import SensorConfigSection from './config/SensorConfigSection';
import AlertConfigSection from './config/AlertConfigSection';
import PowerConfigSection from './config/PowerConfigSection';
import ConnectivityConfigSection from './config/ConnectivityConfigSection';
import { configService, CommandResponse } from '../services/configService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface RemoteConfigPanelProps {
  stationId: string;
}

export default function RemoteConfigPanel({ stationId }: RemoteConfigPanelProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const executeCommand = async (
    commandFn: () => Promise<CommandResponse>,
    successMessage: string,
    errorMessage: string
  ) => {
    setLoading(true);
    try {
      const response = await commandFn();
      if (response.success) {
        showNotification(successMessage, 'success');
      } else {
        showNotification(`${errorMessage}: ${response.message}`, 'error');
      }
      return response;
    } catch (error) {
      console.error('Command execution error:', error);
      showNotification(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSensorConfigChange = {
    setReadingInterval: async (intervalMs: number) => {
      return executeCommand(
        () => configService.setReadingInterval(stationId, intervalMs),
        `Reading interval updated to ${intervalMs / 1000} seconds`,
        'Failed to update reading interval'
      );
    },
    
    toggleSensor: async (sensor: string, enabled: boolean) => {
      return executeCommand(
        () => configService.toggleSensor(stationId, sensor, enabled),
        `Sensor ${sensor} ${enabled ? 'enabled' : 'disabled'}`,
        `Failed to ${enabled ? 'enable' : 'disable'} sensor ${sensor}`
      );
    },
    
    setSensorCalibration: async (sensor: string, offset: number) => {
      return executeCommand(
        () => configService.setSensorCalibration(stationId, sensor, offset),
        `Calibration offset for ${sensor} set to ${offset}`,
        `Failed to set calibration for sensor ${sensor}`
      );
    }
  };

  const handleAlertConfigChange = {
    setThreshold: async (parameter: string, min?: number, max?: number) => {
      return executeCommand(
        () => configService.setAlertThreshold(stationId, parameter, min, max),
        `Alert threshold for ${parameter} updated`,
        `Failed to update alert threshold for ${parameter}`
      );
    }
  };

  const handlePowerConfigChange = {
    setSleepMode: async (enabled: boolean, duration?: number) => {
      return executeCommand(
        () => configService.setSleepMode(stationId, enabled, duration),
        `Sleep mode ${enabled ? 'enabled' : 'disabled'}`,
        'Failed to update sleep mode'
      );
    },
    
    setWifiPower: async (powerLevel: number) => {
      return executeCommand(
        () => configService.setWifiPower(stationId, powerLevel),
        `WiFi power level set to ${powerLevel} dBm`,
        'Failed to update WiFi power level'
      );
    }
  };

  const handleConnectivityConfigChange = {
    configureWifi: async (ssid: string, password: string) => {
      return executeCommand(
        () => configService.configureWifi(stationId, ssid, password),
        'WiFi configuration updated',
        'Failed to update WiFi configuration'
      );
    },
    
    configureMqtt: async (server: string, port: number, username?: string, password?: string) => {
      return executeCommand(
        () => configService.configureMqtt(stationId, server, port, username, password),
        'MQTT configuration updated',
        'Failed to update MQTT configuration'
      );
    }
  };

  const handleDeviceControl = {
    restart: async () => {
      return executeCommand(
        () => configService.restartDevice(stationId),
        'Device restart command sent',
        'Failed to restart device'
      );
    },
    
    getStatus: async () => {
      return executeCommand(
        () => configService.getDeviceStatus(stationId),
        'Device status requested',
        'Failed to get device status'
      );
    },
    
    sensorCheck: async () => {
      return executeCommand(
        () => configService.performSensorCheck(stationId),
        'Sensor check initiated',
        'Failed to perform sensor check'
      );
    },
    
    wakeUp: async () => {
      return executeCommand(
        () => configService.wakeUpDevice(stationId),
        'Wake up command sent',
        'Failed to wake up device'
      );
    }
  };

  const tabs = [
    { label: 'Sensors', icon: <Sensors />, component: SensorConfigSection },
    { label: 'Alerts', icon: <NotificationsActive />, component: AlertConfigSection },
    { label: 'Power', icon: <Battery3Bar />, component: PowerConfigSection },
    { label: 'Connectivity', icon: <Wifi />, component: ConnectivityConfigSection }
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="div">
              Remote Configuration
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Station: {stationId}
            </Typography>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0, height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none'
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ gap: 1 }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
          <TabPanel value={currentTab} index={0}>
            <SensorConfigSection
              stationId={stationId}
              onConfigChange={handleSensorConfigChange}
              onDeviceControl={handleDeviceControl}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={1}>
            <AlertConfigSection
              stationId={stationId}
              onConfigChange={handleAlertConfigChange}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={2}>
            <PowerConfigSection
              stationId={stationId}
              onConfigChange={handlePowerConfigChange}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={3}>
            <ConnectivityConfigSection
              stationId={stationId}
              onConfigChange={handleConnectivityConfigChange}
            />
          </TabPanel>
        </Box>
      </CardContent>

      {/* Loading overlay */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={hideNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}