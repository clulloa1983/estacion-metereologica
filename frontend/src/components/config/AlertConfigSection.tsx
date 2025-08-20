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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import {
  DeviceThermostat,
  WaterDrop,
  Compress,
  Air,
  WbSunny,
  Speed,
  Save,
  Warning,
  Info,
  Error,
  CheckCircle
} from '@mui/icons-material';
import { CommandResponse } from '../../services/configService';

interface AlertThreshold {
  parameter: string;
  displayName: string;
  icon: React.ReactNode;
  unit: string;
  enabled: boolean;
  minValue?: number;
  maxValue?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  defaultRange: { min: number; max: number };
}

interface AlertConfigSectionProps {
  stationId: string;
  onConfigChange: {
    setThreshold: (parameter: string, min?: number, max?: number) => Promise<CommandResponse>;
  };
}

export default function AlertConfigSection({
  stationId,
  onConfigChange
}: AlertConfigSectionProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([
    {
      parameter: 'temperature',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.temperature.name'),
      icon: <DeviceThermostat />,
      unit: '°C',
      enabled: true,
      minValue: -5,
      maxValue: 35,
      severity: 'HIGH',
      description: t('dashboard:remoteConfig.alertConfig.parameters.temperature.description'),
      defaultRange: { min: -10, max: 40 }
    },
    {
      parameter: 'humidity',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.humidity.name'),
      icon: <WaterDrop />,
      unit: '%',
      enabled: true,
      minValue: 20,
      maxValue: 90,
      severity: 'MEDIUM',
      description: t('dashboard:remoteConfig.alertConfig.parameters.humidity.description'),
      defaultRange: { min: 0, max: 100 }
    },
    {
      parameter: 'pressure',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.pressure.name'),
      icon: <Compress />,
      unit: 'hPa',
      enabled: true,
      minValue: 980,
      maxValue: 1030,
      severity: 'LOW',
      description: t('dashboard:remoteConfig.alertConfig.parameters.pressure.description'),
      defaultRange: { min: 950, max: 1050 }
    },
    {
      parameter: 'co',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.carbonMonoxide.name'),
      icon: <Air />,
      unit: 'ppm',
      enabled: true,
      maxValue: 9,
      severity: 'CRITICAL',
      description: t('dashboard:remoteConfig.alertConfig.parameters.carbonMonoxide.description'),
      defaultRange: { min: 0, max: 50 }
    },
    {
      parameter: 'air_quality',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.airQuality.name'),
      icon: <Air />,
      unit: 'AQI',
      enabled: true,
      maxValue: 150,
      severity: 'HIGH',
      description: t('dashboard:remoteConfig.alertConfig.parameters.airQuality.description'),
      defaultRange: { min: 0, max: 500 }
    },
    {
      parameter: 'pm25',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.pm25.name'),
      icon: <Speed />,
      unit: 'µg/m³',
      enabled: true,
      maxValue: 35,
      severity: 'HIGH',
      description: t('dashboard:remoteConfig.alertConfig.parameters.pm25.description'),
      defaultRange: { min: 0, max: 100 }
    },
    {
      parameter: 'light',
      displayName: t('dashboard:remoteConfig.alertConfig.parameters.lightIntensity.name'),
      icon: <WbSunny />,
      unit: 'lux',
      enabled: false,
      minValue: 10,
      maxValue: 100000,
      severity: 'LOW',
      description: t('dashboard:remoteConfig.alertConfig.parameters.lightIntensity.description'),
      defaultRange: { min: 0, max: 120000 }
    }
  ]);

  const handleThresholdToggle = async (parameter: string, enabled: boolean) => {
    setThresholds(prev => prev.map(threshold =>
      threshold.parameter === parameter ? { ...threshold, enabled } : threshold
    ));
  };

  const handleThresholdChange = (parameter: string, field: 'minValue' | 'maxValue' | 'severity', value: any) => {
    setThresholds(prev => prev.map(threshold =>
      threshold.parameter === parameter ? { ...threshold, [field]: value } : threshold
    ));
  };

  const handleSaveThreshold = async (threshold: AlertThreshold) => {
    await onConfigChange.setThreshold(
      threshold.parameter,
      threshold.minValue,
      threshold.maxValue
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return <Info color="info" />;
      case 'MEDIUM': return <Warning color="warning" />;
      case 'HIGH': return <Error color="error" />;
      case 'CRITICAL': return <Error sx={{ color: '#d32f2f' }} />;
      default: return <Info />;
    }
  };

  const getSeverityColor = (severity: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (severity) {
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getCommonPresets = (parameter: string) => {
    const presets: Record<string, Array<{ label: string; min?: number; max?: number }>> = {
      temperature: [
        { label: t('dashboard:remoteConfig.alertConfig.presets.freezingAlert'), max: 0 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.comfortRange'), min: 18, max: 26 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.heatWarning'), min: 30 }
      ],
      humidity: [
        { label: t('dashboard:remoteConfig.alertConfig.presets.dryAir'), min: 30 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.comfortRange'), min: 40, max: 60 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.highHumidity'), max: 80 }
      ],
      co: [
        { label: t('dashboard:remoteConfig.alertConfig.presets.whoSafeLevel'), max: 9 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.epaWarning'), max: 35 },
        { label: t('dashboard:remoteConfig.alertConfig.presets.dangerousLevel'), max: 100 }
      ]
    };
    return presets[parameter] || [];
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('dashboard:remoteConfig.alertConfig.description')}
      </Alert>

      <Grid container spacing={2}>
        {thresholds.map((threshold) => (
          <Grid item xs={12} key={threshold.parameter}>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  {/* Header */}
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        {threshold.icon}
                        <Typography variant="h6">
                          {threshold.displayName}
                        </Typography>
                        <Chip
                          icon={getSeverityIcon(threshold.severity)}
                          label={t(`dashboard:remoteConfig.alertConfig.severityLevels.${threshold.severity.toLowerCase()}`)}
                          color={getSeverityColor(threshold.severity)}
                          size="small"
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={threshold.enabled}
                            onChange={(e) => handleThresholdToggle(threshold.parameter, e.target.checked)}
                          />
                        }
                        label={t('dashboard:remoteConfig.alertConfig.enabled')}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {threshold.description}
                    </Typography>
                  </Grid>

                  {threshold.enabled && (
                    <>
                      {/* Threshold Configuration */}
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label={t('dashboard:remoteConfig.alertConfig.minimumValue')}
                          type="number"
                          value={threshold.minValue || ''}
                          onChange={(e) => handleThresholdChange(
                            threshold.parameter, 
                            'minValue', 
                            e.target.value ? Number(e.target.value) : undefined
                          )}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{threshold.unit}</InputAdornment>,
                          }}
                          inputProps={{
                            min: threshold.defaultRange.min,
                            max: threshold.defaultRange.max
                          }}
                          size="small"
                          fullWidth
                          helperText={t('dashboard:remoteConfig.alertConfig.alertBelowValue')}
                        />
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <TextField
                          label={t('dashboard:remoteConfig.alertConfig.maximumValue')}
                          type="number"
                          value={threshold.maxValue || ''}
                          onChange={(e) => handleThresholdChange(
                            threshold.parameter, 
                            'maxValue', 
                            e.target.value ? Number(e.target.value) : undefined
                          )}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{threshold.unit}</InputAdornment>,
                          }}
                          inputProps={{
                            min: threshold.defaultRange.min,
                            max: threshold.defaultRange.max
                          }}
                          size="small"
                          fullWidth
                          helperText={t('dashboard:remoteConfig.alertConfig.alertAboveValue')}
                        />
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>{t('dashboard:remoteConfig.alertConfig.severity')}</InputLabel>
                          <Select
                            value={threshold.severity}
                            label={t('dashboard:remoteConfig.alertConfig.severity')}
                            onChange={(e) => handleThresholdChange(
                              threshold.parameter, 
                              'severity', 
                              e.target.value
                            )}
                          >
                            <MenuItem value="LOW">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Info color="info" fontSize="small" />
                                {t('dashboard:remoteConfig.alertConfig.severityLevels.low')}
                              </Box>
                            </MenuItem>
                            <MenuItem value="MEDIUM">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Warning color="warning" fontSize="small" />
                                {t('dashboard:remoteConfig.alertConfig.severityLevels.medium')}
                              </Box>
                            </MenuItem>
                            <MenuItem value="HIGH">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Error color="error" fontSize="small" />
                                {t('dashboard:remoteConfig.alertConfig.severityLevels.high')}
                              </Box>
                            </MenuItem>
                            <MenuItem value="CRITICAL">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Error sx={{ color: '#d32f2f' }} fontSize="small" />
                                {t('dashboard:remoteConfig.alertConfig.severityLevels.critical')}
                              </Box>
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={() => handleSaveThreshold(threshold)}
                          fullWidth
                          size="small"
                        >
                          {t('dashboard:remoteConfig.alertConfig.saveThreshold')}
                        </Button>
                      </Grid>

                      {/* Common Presets */}
                      {getCommonPresets(threshold.parameter).length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            {t('dashboard:remoteConfig.alertConfig.commonPresets')}
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {getCommonPresets(threshold.parameter).map((preset, index) => (
                              <Button
                                key={index}
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  if (preset.min !== undefined) {
                                    handleThresholdChange(threshold.parameter, 'minValue', preset.min);
                                  }
                                  if (preset.max !== undefined) {
                                    handleThresholdChange(threshold.parameter, 'maxValue', preset.max);
                                  }
                                }}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </Box>
                        </Grid>
                      )}

                      {/* Current Range Display */}
                      <Grid item xs={12}>
                        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard:remoteConfig.alertConfig.currentAlertRange')}
                            {threshold.minValue !== undefined && ` ${t('dashboard:remoteConfig.alertConfig.below')} ${threshold.minValue}${threshold.unit}`}
                            {threshold.minValue !== undefined && threshold.maxValue !== undefined && ` ${t('dashboard:remoteConfig.alertConfig.or')}`}
                            {threshold.maxValue !== undefined && ` ${t('dashboard:remoteConfig.alertConfig.above')} ${threshold.maxValue}${threshold.unit}`}
                            {!threshold.minValue && !threshold.maxValue && ` ${t('dashboard:remoteConfig.alertConfig.noThresholdsSet')}`}
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}