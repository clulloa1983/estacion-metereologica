import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  InputAdornment,
  FormHelperText,
  Slider,
  Alert,
  Divider,
  ButtonGroup,
  LinearProgress
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import {
  Battery3Bar,
  PowerSettingsNew,
  Wifi,
  Schedule,
  BatteryCharging60,
  Save,
  Autorenew,
  Timer
} from '@mui/icons-material';
import { CommandResponse } from '../../services/configService';

interface PowerConfigSectionProps {
  stationId: string;
  onConfigChange: {
    setSleepMode: (enabled: boolean, duration?: number) => Promise<CommandResponse>;
    setWifiPower: (powerLevel: number) => Promise<CommandResponse>;
  };
}

export default function PowerConfigSection({
  stationId,
  onConfigChange
}: PowerConfigSectionProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [sleepModeEnabled, setSleepModeEnabled] = useState(false);
  const [sleepDuration, setSleepDuration] = useState(300); // seconds
  const [wifiPowerLevel, setWifiPowerLevel] = useState(20); // dBm
  const [transmissionInterval, setTransmissionInterval] = useState(60); // seconds
  const [batteryLevel, setBatteryLevel] = useState(85); // percentage (simulated)

  const handleSleepModeToggle = async (enabled: boolean) => {
    setSleepModeEnabled(enabled);
    await onConfigChange.setSleepMode(enabled, enabled ? sleepDuration * 1000 : undefined);
  };

  const handleSleepDurationChange = async () => {
    if (sleepModeEnabled) {
      await onConfigChange.setSleepMode(true, sleepDuration * 1000);
    }
  };

  const handleWifiPowerChange = async () => {
    await onConfigChange.setWifiPower(wifiPowerLevel);
  };

  const getSleepDurationPresets = () => [
    { label: '5m', value: 300 },
    { label: '15m', value: 900 },
    { label: '30m', value: 1800 },
    { label: '1h', value: 3600 },
    { label: '2h', value: 7200 }
  ];

  const getTransmissionPresets = () => [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 },
    { label: '30m', value: 1800 }
  ];

  const getWifiPowerDescription = (power: number) => {
    if (power >= 18) return t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.powerDescriptions.maximum');
    if (power >= 15) return t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.powerDescriptions.high');
    if (power >= 10) return t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.powerDescriptions.medium');
    if (power >= 5) return t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.powerDescriptions.low');
    return t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.powerDescriptions.minimum');
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'success';
    if (level > 30) return 'warning';
    return 'error';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const estimateBatteryLife = () => {
    const baseConsumption = 100; // mA when active
    const sleepConsumption = 10; // µA when sleeping
    const wifiMultiplier = wifiPowerLevel / 20; // Power scaling factor
    
    if (!sleepModeEnabled) {
      return t('dashboard:remoteConfig.powerConfig.batteryStatus.continuousOperation');
    }
    
    const sleepRatio = sleepDuration / (sleepDuration + transmissionInterval);
    const avgConsumption = (baseConsumption * wifiMultiplier * (1 - sleepRatio)) + (sleepConsumption * sleepRatio / 1000);
    const estimatedHours = (3000 / avgConsumption); // Assuming 3000mAh battery
    
    if (estimatedHours > 24) {
      return `~${Math.floor(estimatedHours / 24)} ${t('dashboard:remoteConfig.powerConfig.batteryStatus.days')}`;
    }
    return `~${Math.floor(estimatedHours)} ${t('dashboard:remoteConfig.powerConfig.batteryStatus.hours')}`;
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('dashboard:remoteConfig.powerConfig.description')}
      </Alert>

      {/* Battery Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.powerConfig.batteryStatus.title')}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <BatteryCharging60 color={getBatteryColor(batteryLevel)} />
                <Typography variant="body1">
                  {t('dashboard:remoteConfig.powerConfig.batteryStatus.batteryLevel')}: {batteryLevel}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={batteryLevel} 
                color={getBatteryColor(batteryLevel)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard:remoteConfig.powerConfig.batteryStatus.estimatedBatteryLife')}: {estimateBatteryLife()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sleep Mode Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.powerConfig.deepSleepMode.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.powerConfig.deepSleepMode.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={sleepModeEnabled}
                    onChange={(e) => handleSleepModeToggle(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      {t('dashboard:remoteConfig.powerConfig.deepSleepMode.enableDeepSleep')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard:remoteConfig.powerConfig.deepSleepMode.deviceWillSleep')}
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            {sleepModeEnabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('dashboard:remoteConfig.powerConfig.deepSleepMode.sleepDuration')}
                    type="number"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">{t('dashboard:remoteConfig.powerConfig.deepSleepMode.seconds')}</InputAdornment>,
                    }}
                    inputProps={{
                      min: 30,
                      max: 86400 // 24 hours
                    }}
                    fullWidth
                    helperText={`${t('dashboard:remoteConfig.powerConfig.deepSleepMode.duration')}: ${formatDuration(sleepDuration)}`}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      {t('dashboard:remoteConfig.powerConfig.deepSleepMode.quickPresets')}
                    </Typography>
                    <ButtonGroup size="small" variant="outlined">
                      {getSleepDurationPresets().map((preset) => (
                        <Button
                          key={preset.value}
                          onClick={() => setSleepDuration(preset.value)}
                          color={sleepDuration === preset.value ? "primary" : "inherit"}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSleepDurationChange}
                    startIcon={<Timer />}
                    fullWidth
                  >
                    {t('dashboard:remoteConfig.powerConfig.deepSleepMode.applySleepConfiguration')}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* WiFi Power Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography gutterBottom>
                {t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.wifiPowerLevel')}: {wifiPowerLevel} dBm
              </Typography>
              <Slider
                value={wifiPowerLevel}
                onChange={(e, value) => setWifiPowerLevel(value as number)}
                min={0}
                max={20}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' }
                ]}
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                {getWifiPowerDescription(wifiPowerLevel)}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleWifiPowerChange}
                startIcon={<Wifi />}
                fullWidth
              >
                {t('dashboard:remoteConfig.powerConfig.wifiPowerManagement.applyWifiPowerSettings')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transmission Scheduling */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.powerConfig.transmissionScheduling.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.powerConfig.transmissionScheduling.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.powerConfig.transmissionScheduling.transmissionInterval')}
                type="number"
                value={transmissionInterval}
                onChange={(e) => setTransmissionInterval(Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{t('dashboard:remoteConfig.powerConfig.deepSleepMode.seconds')}</InputAdornment>,
                }}
                inputProps={{
                  min: 10,
                  max: 3600
                }}
                fullWidth
                helperText={`${t('dashboard:remoteConfig.powerConfig.transmissionScheduling.interval')}: ${formatDuration(transmissionInterval)}`}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {t('dashboard:remoteConfig.powerConfig.transmissionScheduling.quickPresets')}
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  {getTransmissionPresets().map((preset) => (
                    <Button
                      key={preset.value}
                      onClick={() => setTransmissionInterval(preset.value)}
                      color={transmissionInterval === preset.value ? "primary" : "inherit"}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Power Consumption Summary */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('dashboard:remoteConfig.powerConfig.powerSummary.title')}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.powerConfig.powerSummary.sleepMode')}: {sleepModeEnabled ? t('dashboard:remoteConfig.powerConfig.powerSummary.enabled') : t('dashboard:remoteConfig.powerConfig.powerSummary.disabled')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.powerConfig.powerSummary.wifiPower')}: {wifiPowerLevel} dBm
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.powerConfig.powerSummary.sleepDuration')}: {formatDuration(sleepDuration)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.powerConfig.powerSummary.txInterval')}: {formatDuration(transmissionInterval)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}