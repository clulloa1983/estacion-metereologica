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

  // Función para hacer requests a la API
  const apiRequest = useCallback(async (endpoint: string, options?: RequestInit) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ml-alerts${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }, [API_BASE_URL]);

  // Cargar configuración y estadísticas iniciales
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [configRes, statsRes, metricsRes, alertsRes] = await Promise.all([
        apiRequest('/config'),
        apiRequest(`/statistics/${stationId}`),
        apiRequest(`/metrics/${stationId}?timeRange=${timeRange}`),
        apiRequest(`/recent/${stationId}?limit=${alertLimit}${severityFilter ? `&severity=${severityFilter}` : ''}`)
      ]);

      setMlEnabled(configRes.data.ml_enabled);
      setStatistics(statsRes.data);
      setMetrics(metricsRes.data);
      setRecentAlerts(alertsRes.data);
    } catch (error) {
      setError('Error loading ML alerts data');
      console.error('Error loading ML data:', error);
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
      setError('Failed to train ML model');
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
            <Typography>Loading ML Alerts...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Panel de Control Principal */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <SmartToyIcon color="primary" />
              <Typography variant="h6">
                {t('ml_alerts.title', 'Intelligent ML Alerts')}
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
                label={mlEnabled ? 'Enabled' : 'Disabled'}
              />
              <Tooltip title="Refresh data">
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
                  Model Status
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      size="small"
                      label={statistics?.is_trained ? 'Trained' : 'Not Trained'}
                      color={statistics?.is_trained ? 'success' : 'warning'}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Training Data: {statistics?.training_data_points || 0} points
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Confidence: {((statistics?.confidence_threshold || 0) * 100).toFixed(1)}%
                  </Typography>
                </Stack>
              </Box>
            </Grid>

            {/* Métricas de Alertas */}
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid" borderColor="divider">
                <Typography variant="subtitle2" gutterBottom>
                  Alerts ({timeRange})
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
                  Actions
                </Typography>
                <Stack spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => trainModel('7d')}
                    disabled={training || !mlEnabled}
                    startIcon={training ? <CircularProgress size={16} /> : <PsychologyIcon />}
                  >
                    {training ? 'Training...' : 'Train Model'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={resetModel}
                    disabled={!mlEnabled}
                    startIcon={<RefreshIcon />}
                  >
                    Reset Model
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
              <Typography variant="h6">Sensor Statistics</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sensor</TableCell>
                    <TableCell>Data Points</TableCell>
                    <TableCell>Anomalies</TableCell>
                    <TableCell>Current Mean</TableCell>
                    <TableCell>Std Dev</TableCell>
                    <TableCell>Last Anomaly</TableCell>
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
                            : 'Never'
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
            <Typography variant="h6">Recent ML Alerts</Typography>
            <Chip size="small" label={recentAlerts.length} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Filtros */}
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">1 Hour</MenuItem>
                <MenuItem value="6h">6 Hours</MenuItem>
                <MenuItem value="12h">12 Hours</MenuItem>
                <MenuItem value="24h">24 Hours</MenuItem>
                <MenuItem value="7d">7 Days</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="outlined"
              onClick={loadData}
              startIcon={<RefreshIcon />}
            >
              Apply Filters
            </Button>
          </Box>

          {/* Lista de Alertas */}
          {recentAlerts.length === 0 ? (
            <Typography color="textSecondary" align="center" py={3}>
              No ML alerts found for the selected criteria
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Sensor</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Anomaly Type</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Message</TableCell>
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
                            {alert.ml_data?.anomaly_type.replace(/[,_]/g, ' ') || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alert.value.toFixed(2)}
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