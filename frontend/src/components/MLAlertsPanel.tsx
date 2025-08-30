import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  SmartToy as SmartToyIcon,
  Analytics as AnalyticsIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';

// Interfaces
interface MLAlert {
  timestamp: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  acknowledged: boolean;
  value: number;
  ml_data?: {
    anomaly_type: string;
    confidence: string;
    context: {
      mean?: string;
      stdDev?: string;
      trend?: string;
      isolation_score?: string;
    };
  };
}

interface MLStatistics {
  ml_enabled: boolean;
  is_trained: boolean;
  training_data_points: number;
  confidence_threshold: number;
  sensors_monitored: string[];
  station_statistics?: {
    [sensor: string]: {
      data_points: number;
      anomaly_count: number;
      last_anomaly: string | null;
      current_mean: string;
      current_stddev: string;
    };
  };
}

interface MLMetrics {
  total_ml_alerts: number;
  alerts_by_severity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  time_range: string;
  model_statistics: MLStatistics;
}

interface MLAlertsPanelProps {
  stationId: string;
}

const MLAlertsPanel: React.FC<MLAlertsPanelProps> = ({ stationId }) => {
  const { t } = useTranslation('dashboard');
  
  // Estado
  const [mlEnabled, setMlEnabled] = useState<boolean>(false);
  const [statistics, setStatistics] = useState<MLStatistics | null>(null);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<MLAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [alertLimit, setAlertLimit] = useState<number>(20);

  // API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

  // Helper function for exponential backoff delays
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Función para hacer requests a la API con retry logic
  const apiRequest = useCallback(async (endpoint: string, options?: RequestInit, retryCount = 0): Promise<any> => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const response = await fetch(`${API_BASE_URL}/ml-alerts${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });

      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount);
        
        console.warn(`ML-Alerts API rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await sleep(delay);
        return apiRequest(endpoint, options, retryCount + 1);
      }

      if (!response.ok) {
        // If we've exhausted retries and still getting rate limited, throw a helpful error
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '300';
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before refreshing.`);
        }
        // Handle server errors (500-599)
        if (response.status >= 500) {
          throw new Error('ML alerts service temporarily unavailable');
        }
        // Handle client errors (400-499)
        if (response.status >= 400) {
          throw new Error(`ML alerts request failed: ${response.status}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ML-Alerts API request error:', error);
      
      // Re-throw rate limit errors with user-friendly message
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }
      
      // Re-throw server unavailable errors  
      if (error instanceof Error && error.message.includes('ML alerts service temporarily unavailable')) {
        throw error;
      }
      
      // For other errors, provide generic message
      throw new Error('Failed to connect to ML-Alerts service. Please try again later.');
    }
  }, [API_BASE_URL]);

  // Cargar configuración y estadísticas iniciales
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to load data with individual error handling for each endpoint
      const results = await Promise.allSettled([
        apiRequest('/config'),
        apiRequest(`/statistics/${stationId}`),
        apiRequest(`/metrics/${stationId}?timeRange=${timeRange}`),
        apiRequest(`/recent/${stationId}?limit=${alertLimit}${severityFilter ? `&severity=${severityFilter}` : ''}`)
      ]);

      // Process config result
      if (results[0].status === 'fulfilled') {
        setMlEnabled(results[0].value.data.ml_enabled);
      } else {
        console.warn('Failed to load ML config:', results[0].reason);
        setMlEnabled(false); // Default to disabled if config fails
      }

      // Process statistics result
      if (results[1].status === 'fulfilled') {
        setStatistics(results[1].value.data);
      } else {
        console.warn('Failed to load ML statistics:', results[1].reason);
        setStatistics({
          ml_enabled: false,
          is_trained: false,
          training_data_points: 0,
          confidence_threshold: 0.95,
          sensors_monitored: []
        });
      }

      // Process metrics result
      if (results[2].status === 'fulfilled') {
        setMetrics(results[2].value.data);
      } else {
        console.warn('Failed to load ML metrics:', results[2].reason);
        setMetrics({
          total_ml_alerts: 0,
          alerts_by_severity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
          time_range: timeRange,
          model_statistics: {
            ml_enabled: false,
            is_trained: false,
            training_data_points: 0,
            confidence_threshold: 0.95,
            sensors_monitored: []
          }
        });
      }

      // Process recent alerts result
      if (results[3].status === 'fulfilled') {
        setRecentAlerts(results[3].value.data);
      } else {
        console.warn('Failed to load recent ML alerts:', results[3].reason);
        setRecentAlerts([]);
      }

      // If all requests failed, show error
      const allFailed = results.every(result => result.status === 'rejected');
      if (allFailed) {
        const firstError = results.find(r => r.status === 'rejected')?.reason;
        const errorMessage = firstError instanceof Error ? firstError.message : 'ML alerts service temporarily unavailable';
        setError(errorMessage);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading ML alerts data';
      setError(errorMessage);
      console.error('Error loading ML data:', error);
      
      // Set defaults for all states
      setMlEnabled(false);
      setStatistics({
        ml_enabled: false,
        is_trained: false,
        training_data_points: 0,
        confidence_threshold: 0.95,
        sensors_monitored: []
      });
      setMetrics({
        total_ml_alerts: 0,
        alerts_by_severity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        time_range: timeRange,
        model_statistics: {
          ml_enabled: false,
          is_trained: false,
          training_data_points: 0,
          confidence_threshold: 0.95,
          sensors_monitored: []
        }
      });
      setRecentAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [stationId, timeRange, alertLimit, severityFilter, apiRequest]);

  // Entrenar modelo
  const trainModel = async (trainingTimeRange: string = '7d') => {
    setTraining(true);
    setError(null);

    try {
      const result = await apiRequest(`/train/${stationId}`, {
        method: 'POST',
        body: JSON.stringify({ timeRange: trainingTimeRange })
      });

      if (result.success) {
        await loadData(); // Recargar datos después del entrenamiento
      } else {
        setError(result.message || 'Error training ML model');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to train ML model';
      setError(errorMessage);
      console.error('Training error:', error);
    } finally {
      setTraining(false);
    }
  };

  // Toggle ML alerts
  const toggleMLAlerts = async () => {
    try {
      const result = await apiRequest('/toggle', {
        method: 'PUT',
        body: JSON.stringify({ enabled: !mlEnabled })
      });

      if (result.success) {
        setMlEnabled(!mlEnabled);
        await loadData();
      }
    } catch (error) {
      setError('Failed to toggle ML alerts');
      console.error('Toggle error:', error);
    }
  };

  // Reiniciar modelo
  const resetModel = async () => {
    try {
      const result = await apiRequest(`/reset/${stationId}`, {
        method: 'POST'
      });

      if (result.success) {
        await loadData();
      }
    } catch (error) {
      setError('Failed to reset ML model');
      console.error('Reset error:', error);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helpers para UI
  const getSeverityColor = (severity: string) => {
    const colors = {
      LOW: 'info',
      MEDIUM: 'warning', 
      HIGH: 'error',
      CRITICAL: 'error'
    } as const;
    return colors[severity as keyof typeof colors] || 'default';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAnomalyTypeIcon = (type: string) => {
    if (type.includes('isolation_forest')) return <PsychologyIcon fontSize="small" />;
    if (type.includes('trend')) return <TrendingUpIcon fontSize="small" />;
    if (type.includes('statistical')) return <AnalyticsIcon fontSize="small" />;
    return <AutoFixHighIcon fontSize="small" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>{t('ml_alerts.loading')}</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // If service is completely unavailable, show a helpful message
  if (error && error.includes('ML alerts service temporarily unavailable')) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <SmartToyIcon color="disabled" />
            <Typography variant="h6" color="text.secondary">
              ML Alerts Service (Under Development)
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Service Status</AlertTitle>
            The Machine Learning alerts service is currently under development. 
            Regular alerts and monitoring are still fully functional. This feature will be available in a future update.
          </Alert>
          <Box display="flex" alignItems="center" gap={1}>
            <Button 
              variant="outlined" 
              onClick={loadData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Retry Connection
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {error && !error.includes('ML alerts service temporarily unavailable') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Partial Service Issue</AlertTitle>
          {error}
          <Button 
            size="small" 
            onClick={loadData} 
            disabled={loading}
            sx={{ mt: 1 }}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Panel de Control Principal */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <SmartToyIcon color="primary" />
              <Typography variant="h6">
                {t('ml_alerts.title')}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mlEnabled}
                    onChange={toggleMLAlerts}
                    color="primary"
                  />
                }
                label={mlEnabled ? t('ml_alerts.enabled') : t('ml_alerts.disabled')}
              />
              <Tooltip title={t('ml_alerts.refreshData')}>
                <IconButton onClick={loadData} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Estado del Modelo */}
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid" borderColor="divider">
                <Typography variant="subtitle2" gutterBottom>
                  {t('ml_alerts.modelStatus.title')}
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      size="small"
                      label={statistics?.is_trained ? t('ml_alerts.modelStatus.trained') : t('ml_alerts.modelStatus.notTrained')}
                      color={statistics?.is_trained ? 'success' : 'warning'}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {t('ml_alerts.modelStatus.trainingData')}: {statistics?.training_data_points || 0} {t('ml_alerts.modelStatus.points')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('ml_alerts.modelStatus.confidence')}: {((statistics?.confidence_threshold || 0) * 100).toFixed(1)}%
                  </Typography>
                </Stack>
              </Box>
            </Grid>

            {/* Métricas de Alertas */}
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid" borderColor="divider">
                <Typography variant="subtitle2" gutterBottom>
                  {t('ml_alerts.alerts.title')} ({timeRange})
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="h4" color="primary">
                    {metrics?.total_ml_alerts || 0}
                  </Typography>
                  <Box display="flex" gap={1}>
                    {Object.entries(metrics?.alerts_by_severity || {}).map(([severity, count]) => (
                      count > 0 && (
                        <Chip
                          key={severity}
                          size="small"
                          label={`${severity}: ${count}`}
                          color={getSeverityColor(severity)}
                        />
                      )
                    ))}
                  </Box>
                </Stack>
              </Box>
            </Grid>

            {/* Acciones */}
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid" borderColor="divider">
                <Typography variant="subtitle2" gutterBottom>
                  {t('ml_alerts.actions.title')}
                </Typography>
                <Stack spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => trainModel('7d')}
                    disabled={training || !mlEnabled}
                    startIcon={training ? <CircularProgress size={16} /> : <PsychologyIcon />}
                  >
                    {training ? t('ml_alerts.actions.training') : t('ml_alerts.actions.trainModel')}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={resetModel}
                    disabled={!mlEnabled}
                    startIcon={<RefreshIcon />}
                  >
                    {t('ml_alerts.actions.resetModel')}
                  </Button>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Estadísticas por Sensor */}
      {statistics?.station_statistics && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2}>
              <AnalyticsIcon />
              <Typography variant="h6">{t('ml_alerts.sensorStatistics.title')}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('ml_alerts.sensorStatistics.sensor')}</TableCell>
                    <TableCell>{t('ml_alerts.sensorStatistics.dataPoints')}</TableCell>
                    <TableCell>{t('ml_alerts.sensorStatistics.anomalies')}</TableCell>
                    <TableCell>{t('ml_alerts.sensorStatistics.currentMean')}</TableCell>
                    <TableCell>{t('ml_alerts.sensorStatistics.stdDev')}</TableCell>
                    <TableCell>{t('ml_alerts.sensorStatistics.lastAnomaly')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(statistics.station_statistics).map(([sensor, stats]) => (
                    <TableRow key={sensor}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {sensor.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>{stats.data_points}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={stats.anomaly_count}
                          color={stats.anomaly_count > 0 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{stats.current_mean}</TableCell>
                      <TableCell>{stats.current_stddev}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {stats.last_anomaly 
                            ? formatTimestamp(stats.last_anomaly)
                            : t('ml_alerts.sensorStatistics.never')
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Alertas Recientes */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={2}>
            <TimelineIcon />
            <Typography variant="h6">{t('ml_alerts.recentAlerts.title')}</Typography>
            <Chip size="small" label={recentAlerts.length} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Filtros */}
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('ml_alerts.recentAlerts.timeRange')}</InputLabel>
              <Select
                value={timeRange}
                label={t('ml_alerts.recentAlerts.timeRange')}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">{t('ml_alerts.timeRanges.1h')}</MenuItem>
                <MenuItem value="6h">{t('ml_alerts.timeRanges.6h')}</MenuItem>
                <MenuItem value="12h">{t('ml_alerts.timeRanges.12h')}</MenuItem>
                <MenuItem value="24h">{t('ml_alerts.timeRanges.24h')}</MenuItem>
                <MenuItem value="7d">{t('ml_alerts.timeRanges.7d')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('ml_alerts.recentAlerts.severity')}</InputLabel>
              <Select
                value={severityFilter}
                label={t('ml_alerts.recentAlerts.severity')}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <MenuItem value="">{t('ml_alerts.severityLevels.all')}</MenuItem>
                <MenuItem value="LOW">{t('ml_alerts.severityLevels.low')}</MenuItem>
                <MenuItem value="MEDIUM">{t('ml_alerts.severityLevels.medium')}</MenuItem>
                <MenuItem value="HIGH">{t('ml_alerts.severityLevels.high')}</MenuItem>
                <MenuItem value="CRITICAL">{t('ml_alerts.severityLevels.critical')}</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="outlined"
              onClick={loadData}
              startIcon={<RefreshIcon />}
            >
              {t('ml_alerts.recentAlerts.applyFilters')}
            </Button>
          </Box>

          {/* Lista de Alertas */}
          {recentAlerts.length === 0 ? (
            <Typography color="textSecondary" align="center" py={3}>
              {t('ml_alerts.recentAlerts.noAlerts')}
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('ml_alerts.recentAlerts.table.time')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.sensor')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.severity')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.anomalyType')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.value')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.confidence')}</TableCell>
                    <TableCell>{t('ml_alerts.recentAlerts.table.message')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentAlerts.map((alert, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimestamp(alert.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {alert.alert_type.replace('ml_', '').toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={alert.severity}
                          color={getSeverityColor(alert.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getAnomalyTypeIcon(alert.ml_data?.anomaly_type || '')}
                          <Typography variant="body2">
                            {alert.ml_data?.anomaly_type.replace(/[,_]/g, ' ') || t('ml_alerts.anomalyTypes.unknown')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alert.value ? alert.value.toFixed(2) : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alert.ml_data?.confidence || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alert.message}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default MLAlertsPanel;