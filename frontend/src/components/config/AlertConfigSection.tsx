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
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([
    {
      parameter: 'temperature',
      displayName: 'Temperature',
      icon: <DeviceThermostat />,
      unit: '°C',
      enabled: true,
      minValue: -5,
      maxValue: 35,
      severity: 'HIGH',
      description: 'Alert when temperature is outside safe range',
      defaultRange: { min: -10, max: 40 }
    },
    {
      parameter: 'humidity',
      displayName: 'Humidity',
      icon: <WaterDrop />,
      unit: '%',
      enabled: true,
      minValue: 20,
      maxValue: 90,
      severity: 'MEDIUM',
      description: 'Alert when humidity levels are extreme',
      defaultRange: { min: 0, max: 100 }
    },
    {
      parameter: 'pressure',
      displayName: 'Pressure',
      icon: <Compress />,
      unit: 'hPa',
      enabled: true,
      minValue: 980,
      maxValue: 1030,
      severity: 'LOW',
      description: 'Alert for significant pressure changes',
      defaultRange: { min: 950, max: 1050 }
    },
    {
      parameter: 'co',
      displayName: 'Carbon Monoxide',
      icon: <Air />,
      unit: 'ppm',
      enabled: true,
      maxValue: 9,
      severity: 'CRITICAL',
      description: 'Critical alert for dangerous CO levels',
      defaultRange: { min: 0, max: 50 }
    },
    {
      parameter: 'air_quality',
      displayName: 'Air Quality',
      icon: <Air />,
      unit: 'AQI',
      enabled: true,
      maxValue: 150,
      severity: 'HIGH',
      description: 'Alert when air quality is unhealthy',
      defaultRange: { min: 0, max: 500 }
    },
    {
      parameter: 'pm25',
      displayName: 'PM2.5',
      icon: <Speed />,
      unit: 'µg/m³',
      enabled: true,
      maxValue: 35,
      severity: 'HIGH',
      description: 'Alert for unhealthy particulate matter levels',
      defaultRange: { min: 0, max: 100 }
    },
    {
      parameter: 'light',
      displayName: 'Light Intensity',
      icon: <WbSunny />,
      unit: 'lux',
      enabled: false,
      minValue: 10,
      maxValue: 100000,
      severity: 'LOW',
      description: 'Alert for extreme light conditions',
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
        { label: 'Freezing Alert', max: 0 },
        { label: 'Comfort Range', min: 18, max: 26 },
        { label: 'Heat Warning', min: 30 }
      ],
      humidity: [
        { label: 'Dry Air', min: 30 },
        { label: 'Comfort Range', min: 40, max: 60 },
        { label: 'High Humidity', max: 80 }
      ],
      co: [
        { label: 'WHO Safe Level', max: 9 },
        { label: 'EPA Warning', max: 35 },
        { label: 'Dangerous Level', max: 100 }
      ]
    };
    return presets[parameter] || [];
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure alert thresholds for each sensor parameter. Alerts will be triggered when values exceed the specified ranges.
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
                          label={threshold.severity}
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
                        label="Enabled"
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
                          label="Minimum Value"
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
                          helperText="Alert below this value"
                        />
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Maximum Value"
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
                          helperText="Alert above this value"
                        />
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Severity</InputLabel>
                          <Select
                            value={threshold.severity}
                            label="Severity"
                            onChange={(e) => handleThresholdChange(
                              threshold.parameter, 
                              'severity', 
                              e.target.value
                            )}
                          >
                            <MenuItem value="LOW">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Info color="info" fontSize="small" />
                                Low
                              </Box>
                            </MenuItem>
                            <MenuItem value="MEDIUM">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Warning color="warning" fontSize="small" />
                                Medium
                              </Box>
                            </MenuItem>
                            <MenuItem value="HIGH">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Error color="error" fontSize="small" />
                                High
                              </Box>
                            </MenuItem>
                            <MenuItem value="CRITICAL">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Error sx={{ color: '#d32f2f' }} fontSize="small" />
                                Critical
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
                          Save Threshold
                        </Button>
                      </Grid>

                      {/* Common Presets */}
                      {getCommonPresets(threshold.parameter).length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Common presets:
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
                        <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Current alert range: 
                            {threshold.minValue !== undefined && ` Below ${threshold.minValue}${threshold.unit}`}
                            {threshold.minValue !== undefined && threshold.maxValue !== undefined && ' or'}
                            {threshold.maxValue !== undefined && ` Above ${threshold.maxValue}${threshold.unit}`}
                            {!threshold.minValue && !threshold.maxValue && ' No thresholds set'}
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