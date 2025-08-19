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
  Divider,
  Chip,
  InputAdornment,
  FormHelperText,
  ButtonGroup
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import {
  DeviceThermostat,
  WaterDrop,
  Compress,
  Air,
  WbSunny,
  Speed,
  Refresh,
  PowerSettingsNew,
  CheckCircle,
  RestartAlt
} from '@mui/icons-material';
import { CommandResponse } from '../../services/configService';

interface SensorConfig {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  enabled: boolean;
  calibrationOffset: number;
  unit: string;
  minOffset: number;
  maxOffset: number;
}

interface SensorConfigSectionProps {
  stationId: string;
  onConfigChange: {
    setReadingInterval: (intervalMs: number) => Promise<CommandResponse>;
    toggleSensor: (sensor: string, enabled: boolean) => Promise<CommandResponse>;
    setSensorCalibration: (sensor: string, offset: number) => Promise<CommandResponse>;
  };
  onDeviceControl: {
    restart: () => Promise<CommandResponse>;
    getStatus: () => Promise<CommandResponse>;
    sensorCheck: () => Promise<CommandResponse>;
    wakeUp: () => Promise<CommandResponse>;
  };
}

export default function SensorConfigSection({
  stationId,
  onConfigChange,
  onDeviceControl
}: SensorConfigSectionProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [readingInterval, setReadingInterval] = useState(60); // seconds
  const [sensors, setSensors] = useState<SensorConfig[]>([
    {
      name: 'dht22',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.temperatureHumidity'),
      icon: <DeviceThermostat />,
      enabled: true,
      calibrationOffset: 0,
      unit: '°C / %',
      minOffset: -10,
      maxOffset: 10
    },
    {
      name: 'bmp085',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.pressure'),
      icon: <Compress />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'hPa',
      minOffset: -50,
      maxOffset: 50
    },
    {
      name: 'rain_sensor',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.rainSensor'),
      icon: <WaterDrop />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'mm',
      minOffset: -5,
      maxOffset: 5
    },
    {
      name: 'mq7',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.coSensor'),
      icon: <Air />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'ppm',
      minOffset: -100,
      maxOffset: 100
    },
    {
      name: 'mq135',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.airQuality'),
      icon: <Air />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'AQI',
      minOffset: -50,
      maxOffset: 50
    },
    {
      name: 'dsm501a',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.pm25Dust'),
      icon: <Speed />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'µg/m³',
      minOffset: -20,
      maxOffset: 20
    },
    {
      name: 'bh1750',
      displayName: t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.sensors.lightIntensity'),
      icon: <WbSunny />,
      enabled: true,
      calibrationOffset: 0,
      unit: 'lux',
      minOffset: -1000,
      maxOffset: 1000
    }
  ]);

  const handleIntervalChange = async () => {
    const intervalMs = readingInterval * 1000;
    await onConfigChange.setReadingInterval(intervalMs);
  };

  const handleSensorToggle = async (sensorName: string, enabled: boolean) => {
    setSensors(prev => prev.map(sensor =>
      sensor.name === sensorName ? { ...sensor, enabled } : sensor
    ));
    await onConfigChange.toggleSensor(sensorName, enabled);
  };

  const handleCalibrationChange = async (sensorName: string, offset: number) => {
    setSensors(prev => prev.map(sensor =>
      sensor.name === sensorName ? { ...sensor, calibrationOffset: offset } : sensor
    ));
    await onConfigChange.setSensorCalibration(sensorName, offset);
  };

  const getIntervalPresets = () => [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 }
  ];

  return (
    <Box>
      {/* Reading Interval Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.sensorConfig.readingInterval.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.sensorConfig.readingInterval.description')}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('dashboard:remoteConfig.sensorConfig.readingInterval.label')}
                type="number"
                value={readingInterval}
                onChange={(e) => setReadingInterval(Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{t('dashboard:remoteConfig.sensorConfig.readingInterval.unit')}</InputAdornment>,
                }}
                inputProps={{
                  min: 10,
                  max: 3600
                }}
                fullWidth
                helperText={t('dashboard:remoteConfig.sensorConfig.readingInterval.minimum')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard:remoteConfig.sensorConfig.readingInterval.quickPresets')}
                </Typography>
              </Box>
              <ButtonGroup size="small" variant="outlined">
                {getIntervalPresets().map((preset) => (
                  <Button
                    key={preset.value}
                    onClick={() => setReadingInterval(preset.value)}
                    color={readingInterval === preset.value ? "primary" : "inherit"}
                  >
                    {preset.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleIntervalChange}
                startIcon={<Refresh />}
                fullWidth
              >
                {t('dashboard:remoteConfig.sensorConfig.readingInterval.apply')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sensor Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.description')}
          </Typography>

          <Grid container spacing={2}>
            {sensors.map((sensor) => (
              <Grid item xs={12} key={sensor.name}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {sensor.icon}
                          <Box>
                            <Typography variant="subtitle2">
                              {sensor.displayName}
                            </Typography>
                            <Chip 
                              label={sensor.enabled ? t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.enabled') : t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.disabled')}
                              color={sensor.enabled ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={sensor.enabled}
                              onChange={(e) => handleSensorToggle(sensor.name, e.target.checked)}
                            />
                          }
                          label={t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.enabled')}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label={t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.calibrationOffset')}
                          type="number"
                          value={sensor.calibrationOffset}
                          onChange={(e) => {
                            const offset = Number(e.target.value);
                            if (offset >= sensor.minOffset && offset <= sensor.maxOffset) {
                              handleCalibrationChange(sensor.name, offset);
                            }
                          }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{sensor.unit}</InputAdornment>,
                          }}
                          inputProps={{
                            min: sensor.minOffset,
                            max: sensor.maxOffset,
                            step: sensor.name === 'bh1750' ? 10 : 0.1
                          }}
                          size="small"
                          fullWidth
                          disabled={!sensor.enabled}
                        />
                        <FormHelperText>
                          {t('dashboard:remoteConfig.sensorConfig.sensorConfiguration.range')}: {sensor.minOffset} to {sensor.maxOffset} {sensor.unit}
                        </FormHelperText>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Device Control */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard:remoteConfig.sensorConfig.deviceControl.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard:remoteConfig.sensorConfig.deviceControl.description')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                startIcon={<CheckCircle />}
                onClick={onDeviceControl.getStatus}
                fullWidth
              >
                {t('dashboard:remoteConfig.sensorConfig.deviceControl.getStatus')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                startIcon={<Speed />}
                onClick={onDeviceControl.sensorCheck}
                fullWidth
              >
                {t('dashboard:remoteConfig.sensorConfig.deviceControl.sensorCheck')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                startIcon={<PowerSettingsNew />}
                onClick={onDeviceControl.wakeUp}
                fullWidth
              >
                {t('dashboard:remoteConfig.sensorConfig.deviceControl.wakeUp')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RestartAlt />}
                onClick={onDeviceControl.restart}
                fullWidth
              >
                {t('dashboard:remoteConfig.sensorConfig.deviceControl.restart')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}