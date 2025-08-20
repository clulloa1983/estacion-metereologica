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
import { useTranslation } from 'next-i18next';
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
  const { t } = useTranslation(['common', 'dashboard']);
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
      title: t('dashboard:remoteConfig.connectivityConfig.confirmDialog.wifiTitle'),
      message: t('dashboard:remoteConfig.connectivityConfig.confirmDialog.wifiMessage', { ssid: wifiConfig.ssid })
    });
  };

  const handleMqttConfigSave = () => {
    setConfirmDialog({
      open: true,
      type: 'mqtt',
      title: t('dashboard:remoteConfig.connectivityConfig.confirmDialog.mqttTitle'),
      message: t('dashboard:remoteConfig.connectivityConfig.confirmDialog.mqttMessage', { server: mqttConfig.server, port: mqttConfig.port })
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
    if (!wifiConfig.ssid.trim()) errors.push(t('dashboard:remoteConfig.connectivityConfig.wifiConfig.validation.ssidRequired'));
    if (wifiConfig.ssid.length > 32) errors.push(t('dashboard:remoteConfig.connectivityConfig.wifiConfig.validation.ssidMaxLength'));
    if (wifiConfig.password && wifiConfig.password.length < 8) errors.push(t('dashboard:remoteConfig.connectivityConfig.wifiConfig.validation.passwordMinLength'));
    return errors;
  };

  const validateMqttConfig = () => {
    const errors = [];
    if (!mqttConfig.server.trim()) errors.push(t('dashboard:remoteConfig.connectivityConfig.mqttConfig.validation.serverRequired'));
    if (mqttConfig.port < 1 || mqttConfig.port > 65535) errors.push(t('dashboard:remoteConfig.connectivityConfig.mqttConfig.validation.portRange'));
    return errors;
  };

  const getCommonMqttServers = () => [
    { label: t('dashboard:remoteConfig.connectivityConfig.mqttConfig.brokers.local'), server: 'localhost', port: 1883 },
    { label: t('dashboard:remoteConfig.connectivityConfig.mqttConfig.brokers.eclipseMosquitto'), server: 'test.mosquitto.org', port: 1883 },
    { label: t('dashboard:remoteConfig.connectivityConfig.mqttConfig.brokers.hivemq'), server: 'broker.hivemq.com', port: 1883 },
    { label: t('dashboard:remoteConfig.connectivityConfig.mqttConfig.brokers.emqxCloud'), server: 'broker.emqx.io', port: 1883 }
  ];

  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>{t('dashboard:remoteConfig.connectivityConfig.warningTitle')}</strong> {t('dashboard:remoteConfig.connectivityConfig.warning')}
      </Alert>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.connectivityConfig.connectionStatus.title')}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <Wifi />
                <Typography variant="body2">{t('dashboard:remoteConfig.connectivityConfig.connectionStatus.wifi')}:</Typography>
                <Chip
                  icon={getStatusIcon(connectionStatus.wifi)}
                  label={t(`dashboard:remoteConfig.connectivityConfig.connectionStatus.${connectionStatus.wifi}`)}
                  color={getStatusColor(connectionStatus.wifi)}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <Router />
                <Typography variant="body2">{t('dashboard:remoteConfig.connectivityConfig.connectionStatus.mqtt')}:</Typography>
                <Chip
                  icon={getStatusIcon(connectionStatus.mqtt)}
                  label={t(`dashboard:remoteConfig.connectivityConfig.connectionStatus.${connectionStatus.mqtt}`)}
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
            {t('dashboard:remoteConfig.connectivityConfig.wifiConfig.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.connectivityConfig.wifiConfig.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.wifiConfig.ssid')}
                value={wifiConfig.ssid}
                onChange={(e) => setWifiConfig(prev => ({ ...prev, ssid: e.target.value }))}
                fullWidth
                helperText={t('dashboard:remoteConfig.connectivityConfig.wifiConfig.enterNetworkName')}
                inputProps={{ maxLength: 32 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.wifiConfig.password')}
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
                helperText={t('dashboard:remoteConfig.connectivityConfig.wifiConfig.minimumCharacters')}
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
                {t('dashboard:remoteConfig.connectivityConfig.wifiConfig.updateWifiConfiguration')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* MQTT Configuration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.connectivityConfig.mqttConfig.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.connectivityConfig.mqttConfig.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.server')}
                value={mqttConfig.server}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, server: e.target.value }))}
                fullWidth
                helperText={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.serverHelperText')}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.port')}
                type="number"
                value={mqttConfig.port}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, port: Number(e.target.value) }))}
                inputProps={{ min: 1, max: 65535 }}
                fullWidth
                helperText={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.portHelperText')}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('dashboard:remoteConfig.connectivityConfig.mqttConfig.commonBrokers')}
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
                {t('dashboard:remoteConfig.connectivityConfig.mqttConfig.authentication')}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.username')}
                value={mqttConfig.username}
                onChange={(e) => setMqttConfig(prev => ({ ...prev, username: e.target.value }))}
                fullWidth
                helperText={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.leaveEmpty')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.password')}
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
                helperText={t('dashboard:remoteConfig.connectivityConfig.mqttConfig.leaveEmpty')}
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
                {t('dashboard:remoteConfig.connectivityConfig.mqttConfig.updateMqttConfiguration')}
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Current Configuration Summary */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.title')}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.mqttServer')}: {mqttConfig.server}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.port')}: {mqttConfig.port}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.authentication')}: {mqttConfig.username ? t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.enabled') : t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.disabled')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.connectivityConfig.currentConfiguration.stationId')}: {stationId}
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
            {t('dashboard:remoteConfig.connectivityConfig.confirmDialog.cancel')}
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained"
            color="primary"
          >
            {t('dashboard:remoteConfig.connectivityConfig.confirmDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}