import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  InputAdornment,
  FormHelperText,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Wifi,
  Router,
  Save,
  Visibility,
  VisibilityOff,
  TestTube,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import { CommandResponse } from '../../services/configService';

interface ConnectivityConfigSectionProps {
  stationId: string;
  onConfigChange: {
    configureWifi: (ssid: string, password: string) => Promise<CommandResponse>;
    configureMqtt: (server: string, port: number, username?: string, password?: string) => Promise<CommandResponse>;
  };
}

export default function ConnectivityConfigSection({
  stationId,
  onConfigChange
}: ConnectivityConfigSectionProps) {
  const [wifiConfig, setWifiConfig] = useState({
    ssid: '',
    password: '',
    showPassword: false
  });

  const [mqttConfig, setMqttConfig] = useState({
    server: 'localhost',
    port: 1883,
    username: '',
    password: '',
    showPassword: false
  });

  const [connectionStatus, setConnectionStatus] = useState({
    wifi: 'connected',
    mqtt: 'connected'
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: '',
    title: '',
    message: ''
  });

  const handleWifiConfigSave = () => {
    setConfirmDialog({
      open: true,
      type: 'wifi',
      title: 'Confirm WiFi Configuration Change',
      message: `Are you sure you want to change WiFi settings to network "${wifiConfig.ssid}"? The device may temporarily lose connection.`
    });
  };

  const handleMqttConfigSave = () => {
    setConfirmDialog({
      open: true,
      type: 'mqtt',
      title: 'Confirm MQTT Configuration Change',
      message: `Are you sure you want to change MQTT settings to server "${mqttConfig.server}:${mqttConfig.port}"? This may affect data transmission.`
    });
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmDialog.type === 'wifi') {
        await onConfigChange.configureWifi(wifiConfig.ssid, wifiConfig.password);
      } else if (confirmDialog.type === 'mqtt') {
        await onConfigChange.configureMqtt(
          mqttConfig.server,
          mqttConfig.port,
          mqttConfig.username || undefined,
          mqttConfig.password || undefined
        );
      }
    } catch (error) {
      console.error('Configuration error:', error);
    } finally {
      setConfirmDialog({ open: false, type: '', title: '', message: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle />;
      case 'connecting': return <Warning />;
      case 'disconnected': return <Error />;
      default: return null;
    }
  };

  const validateWifiConfig = () => {
    const errors = [];
    if (!wifiConfig.ssid.trim()) errors.push('SSID is required');
    if (wifiConfig.ssid.length > 32) errors.push('SSID must be 32 characters or less');
    if (wifiConfig.password && wifiConfig.password.length < 8) errors.push('Password must be at least 8 characters');
    return errors;
  };

  const validateMqttConfig = () => {
    const errors = [];
    if (!mqttConfig.server.trim()) errors.push('MQTT server is required');
    if (mqttConfig.port < 1 || mqttConfig.port > 65535) errors.push('Port must be between 1 and 65535');
    return errors;
  };

  const getCommonMqttServers = () => [
    { label: 'Local (localhost)', server: 'localhost', port: 1883 },
    { label: 'Eclipse Mosquitto', server: 'test.mosquitto.org', port: 1883 },
    { label: 'HiveMQ', server: 'broker.hivemq.com', port: 1883 },
    { label: 'EMQX Cloud', server: 'broker.emqx.io', port: 1883 }
  ];

  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Warning:</strong> Changing connectivity settings may temporarily disconnect the device. 
        Ensure you have alternative access methods if configuration fails.
      </Alert>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Connection Status
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <Wifi />
                <Typography variant="body2">WiFi:</Typography>
                <Chip
                  icon={getStatusIcon(connectionStatus.wifi)}
                  label={connectionStatus.wifi}
                  color={getStatusColor(connectionStatus.wifi)}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <Router />
                <Typography variant="body2">MQTT:</Typography>
                <Chip
                  icon={getStatusIcon(connectionStatus.mqtt)}
                  label={connectionStatus.mqtt}
                  color={getStatusColor(connectionStatus.mqtt)}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* WiFi Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            WiFi Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure WiFi network credentials for the ESP32 device
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="WiFi Network (SSID)"
                value={wifiConfig.ssid}
                onChange={(e) => setWifiConfig(prev => ({ ...prev, ssid: e.target.value }))}
                fullWidth
                helperText="Enter the WiFi network name"
                inputProps={{ maxLength: 32 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="WiFi Password"
                type={wifiConfig.showPassword ? 'text' : 'password'}
                value={wifiConfig.password}
                onChange={(e) => setWifiConfig(prev => ({ ...prev, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setWifiConfig(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        edge="end"
                      >
                        {wifiConfig.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                fullWidth
                helperText="Minimum 8 characters for WPA/WPA2"
              />
            </Grid>

            {validateWifiConfig().length > 0 && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validateWifiConfig().map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleWifiConfigSave}
                startIcon={<Wifi />}
                disabled={validateWifiConfig().length > 0}
                fullWidth
              >
                Update WiFi Configuration
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* MQTT Configuration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            MQTT Broker Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure MQTT broker settings for data transmission
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="MQTT Server"
                value={mqttConfig.server}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, server: e.target.value }))}
                fullWidth
                helperText="IP address or hostname of MQTT broker"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Port"
                type="number"
                value={mqttConfig.port}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, port: Number(e.target.value) }))}
                inputProps={{ min: 1, max: 65535 }}
                fullWidth
                helperText="Default: 1883"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Common MQTT brokers:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {getCommonMqttServers().map((broker, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant="outlined"
                    onClick={() => setMqttConfig(prev => ({ 
                      ...prev, 
                      server: broker.server, 
                      port: broker.port 
                    }))}
                  >
                    {broker.label}
                  </Button>
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Authentication (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Username"
                value={mqttConfig.username}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, username: e.target.value }))}
                fullWidth
                helperText="Leave empty if not required"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                type={mqttConfig.showPassword ? 'text' : 'password'}
                value={mqttConfig.password}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setMqttConfig(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        edge="end"
                      >
                        {mqttConfig.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                fullWidth
                helperText="Leave empty if not required"
              />
            </Grid>

            {validateMqttConfig().length > 0 && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validateMqttConfig().map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleMqttConfigSave}
                startIcon={<Router />}
                disabled={validateMqttConfig().length > 0}
                fullWidth
              >
                Update MQTT Configuration
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Current Configuration Summary */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Configuration
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  MQTT Server: {mqttConfig.server}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Port: {mqttConfig.port}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Authentication: {mqttConfig.username ? 'Enabled' : 'Disabled'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Station ID: {stationId}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: '', title: '', message: '' })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, type: '', title: '', message: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained"
            color="primary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}