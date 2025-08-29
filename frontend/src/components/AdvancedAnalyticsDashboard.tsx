import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Chip,
  Button,
  Alert,
  Skeleton,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Psychology as AiIcon,
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
  Battery3Bar as BatteryIcon,
  Build as MaintenanceIcon,
  Refresh as RefreshIcon,
  ModelTraining as TrainIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';

import AIPredictionService, {
  AnomalyDetectionResult,
  WeatherPrediction,
  MaintenancePrediction,
  EnergyOptimization,
  ModelStatus
} from '../services/aiPredictionService';
import { WeatherData } from '../types/stationTypes';

interface AdvancedAnalyticsDashboardProps {
  stationId: string;
  currentData?: WeatherData | null;
  selectedStations?: string[];
  onStationSelect?: (stationId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  stationId,
  currentData,
  selectedStations = [],
  onStationSelect
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  // AI analysis results
  const [anomalyResults, setAnomalyResults] = useState<AnomalyDetectionResult | null>(null);
  const [weatherPredictions, setWeatherPredictions] = useState<WeatherPrediction | null>(null);
  const [maintenancePredictions, setMaintenancePredictions] = useState<MaintenancePrediction | null>(null);
  const [energyOptimization, setEnergyOptimization] = useState<EnergyOptimization | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  // Configuration options
  const [predictionHours, setPredictionHours] = useState(24);
  const [maintenanceDays, setMaintenanceDays] = useState(30);
  const [energyMode, setEnergyMode] = useState<'battery' | 'solar' | 'hybrid'>('hybrid');

  // Error handling
  const handleError = useCallback((operation: string, error: Error) => {
    console.error(`${operation} error:`, error);
    setErrors(prev => ({ ...prev, [operation]: error.message }));
    setLoading(prev => ({ ...prev, [operation]: false }));
  }, []);

  // Clear error for specific operation
  const clearError = useCallback((operation: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[operation];
      return newErrors;
    });
  }, []);

  // Anomaly detection
  const detectAnomalies = useCallback(async () => {
    if (!currentData) return;

    setLoading(prev => ({ ...prev, anomaly: true }));
    clearError('anomaly');

    try {
      const result = await AIPredictionService.detectAnomalies(stationId, currentData, {
        threshold: 0.7
      });
      setAnomalyResults(result);
    } catch (error) {
      handleError('anomaly', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, anomaly: false }));
    }
  }, [stationId, currentData, handleError, clearError]);

  // Weather predictions
  const predictWeather = useCallback(async () => {
    setLoading(prev => ({ ...prev, weather: true }));
    clearError('weather');

    try {
      const predictions = await AIPredictionService.predictWeather(stationId, {
        hours: predictionHours,
        parameters: ['temperature', 'humidity', 'pressure', 'wind_speed']
      });
      setWeatherPredictions(predictions);
    } catch (error) {
      handleError('weather', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, weather: false }));
    }
  }, [stationId, predictionHours, handleError, clearError]);

  // Maintenance predictions
  const predictMaintenance = useCallback(async () => {
    setLoading(prev => ({ ...prev, maintenance: true }));
    clearError('maintenance');

    try {
      const predictions = await AIPredictionService.predictMaintenance(stationId, {
        days: maintenanceDays
      });
      setMaintenancePredictions(predictions);
    } catch (error) {
      handleError('maintenance', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, maintenance: false }));
    }
  }, [stationId, maintenanceDays, handleError, clearError]);

  // Energy optimization
  const optimizeEnergy = useCallback(async () => {
    setLoading(prev => ({ ...prev, energy: true }));
    clearError('energy');

    try {
      const optimization = await AIPredictionService.optimizeEnergy(stationId, {
        mode: energyMode
      });
      setEnergyOptimization(optimization);
    } catch (error) {
      handleError('energy', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, energy: false }));
    }
  }, [stationId, energyMode, handleError, clearError]);

  // Get model status
  const getModelStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, status: true }));
    clearError('status');

    try {
      const status = await AIPredictionService.getModelStatus();
      setModelStatus(status);
    } catch (error) {
      handleError('status', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, [handleError, clearError]);

  // Train models
  const trainModels = useCallback(async () => {
    setLoading(prev => ({ ...prev, training: true }));
    clearError('training');

    try {
      await AIPredictionService.trainModel({
        model_type: 'all',
        stations: selectedStations.length > 0 ? selectedStations : [stationId],
        training_days: 30
      });
      
      // Refresh model status after training
      setTimeout(() => getModelStatus(), 2000);
    } catch (error) {
      handleError('training', error as Error);
    } finally {
      setLoading(prev => ({ ...prev, training: false }));
    }
  }, [stationId, selectedStations, handleError, clearError, getModelStatus]);

  // Refresh all data
  const refreshAllData = useCallback(() => {
    detectAnomalies();
    predictWeather();
    predictMaintenance();
    optimizeEnergy();
    getModelStatus();
  }, [detectAnomalies, predictWeather, predictMaintenance, optimizeEnergy, getModelStatus]);

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(refreshAllData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, refreshAllData]);

  // Initial data load
  useEffect(() => {
    getModelStatus();
  }, [getModelStatus]);

  const renderModelStatusCard = () => (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <AiIcon color="primary" />
            <Typography variant="h6">AI Model Status</Typography>
            <IconButton size="small" onClick={getModelStatus} disabled={loading.status}>
              <RefreshIcon />
            </IconButton>
          </Box>
        }
      />
      <CardContent>
        {loading.status ? (
          <Skeleton height={200} />
        ) : errors.status ? (
          <Alert severity="error" onClose={() => clearError('status')}>
            {errors.status}
          </Alert>
        ) : modelStatus ? (
          <Grid container spacing={2}>
            {Object.entries(modelStatus.models).map(([modelType, model]) => (
              <Grid item xs={12} sm={6} md={3} key={modelType}>
                <Box textAlign="center">
                  <Chip
                    label={model.status}
                    color={model.status === 'trained' ? 'success' : 
                           model.status === 'training' ? 'warning' : 'default'}
                    icon={model.status === 'trained' ? <SuccessIcon /> : 
                          model.status === 'error' ? <ErrorIcon /> : undefined}
                  />
                  <Typography variant="body2" sx={{ mt: 1, textTransform: 'capitalize' }}>
                    {modelType}
                  </Typography>
                  {model.accuracy && (
                    <Typography variant="caption" color="text.secondary">
                      Accuracy: {(model.accuracy * 100).toFixed(1)}%
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" gap={2} mt={2}>
                <Button
                  variant="contained"
                  startIcon={<TrainIcon />}
                  onClick={trainModels}
                  disabled={loading.training}
                >
                  {loading.training ? 'Training Models...' : 'Train Models'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refreshAllData}
                >
                  Refresh All
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">No model status available</Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderAnomalyDetection = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                <Typography variant="h6">Anomaly Detection</Typography>
                <Button
                  size="small"
                  onClick={detectAnomalies}
                  disabled={loading.anomaly || !currentData}
                  startIcon={<RefreshIcon />}
                >
                  Analyze
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading.anomaly && <LinearProgress />}
            {errors.anomaly ? (
              <Alert severity="error" onClose={() => clearError('anomaly')}>
                {errors.anomaly}
              </Alert>
            ) : anomalyResults ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={anomalyResults.hasAnomaly ? 'error' : 'success'}>
                      {anomalyResults.hasAnomaly ? 'ANOMALIES DETECTED' : 'NO ANOMALIES'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confidence: {(anomalyResults.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Detected Issues ({anomalyResults.anomalies.length})
                  </Typography>
                  {anomalyResults.anomalies.map((anomaly, index) => (
                    <Chip
                      key={index}
                      label={`${anomaly.sensor}: ${anomaly.message}`}
                      color={anomaly.severity === 'critical' ? 'error' : 
                             anomaly.severity === 'high' ? 'warning' : 'info'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Grid>
                {anomalyResults.recommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Recommendations
                    </Typography>
                    {anomalyResults.recommendations.map((rec, index) => (
                      <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                        • {rec}
                      </Typography>
                    ))}
                  </Grid>
                )}
              </Grid>
            ) : (
              <Typography color="text.secondary">Click Analyze to detect anomalies</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderWeatherPredictions = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <TrendIcon color="primary" />
                <Typography variant="h6">Weather Predictions</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Hours</InputLabel>
                  <Select
                    value={predictionHours}
                    onChange={(e) => setPredictionHours(Number(e.target.value))}
                    label="Hours"
                  >
                    <MenuItem value={12}>12 Hours</MenuItem>
                    <MenuItem value={24}>24 Hours</MenuItem>
                    <MenuItem value={48}>48 Hours</MenuItem>
                    <MenuItem value={72}>72 Hours</MenuItem>
                    <MenuItem value={168}>1 Week</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  onClick={predictWeather}
                  disabled={loading.weather}
                  startIcon={<AnalyticsIcon />}
                >
                  Predict
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading.weather && <LinearProgress />}
            {errors.weather ? (
              <Alert severity="error" onClose={() => clearError('weather')}>
                {errors.weather}
              </Alert>
            ) : weatherPredictions ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Model Information
                  </Typography>
                  <Typography variant="body2">
                    Model: {weatherPredictions.model_info.model_type}
                  </Typography>
                  <Typography variant="body2">
                    Accuracy: {(weatherPredictions.model_info.accuracy * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    Training Points: {weatherPredictions.model_info.training_data_points}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Trends
                  </Typography>
                  {Object.entries(weatherPredictions.trends).map(([param, trend]) => (
                    <Chip
                      key={param}
                      label={`${param}: ${trend.direction}`}
                      color={trend.direction === 'increasing' ? 'success' : 
                             trend.direction === 'decreasing' ? 'warning' : 'default'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Next 6 Predictions
                  </Typography>
                  <Grid container spacing={1}>
                    {weatherPredictions.predictions.slice(0, 6).map((pred, index) => (
                      <Grid item xs={12} sm={6} md={2} key={index}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                          <Typography variant="caption">
                            {new Date(pred.timestamp).toLocaleTimeString()}
                          </Typography>
                          {Object.entries(pred.values).map(([param, value]) => (
                            <Typography key={param} variant="body2">
                              {param}: {value.toFixed(1)}
                            </Typography>
                          ))}
                          <Typography variant="caption" color="text.secondary">
                            Conf: {(pred.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">Click Predict to generate weather forecasts</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderMaintenancePredictions = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <MaintenanceIcon color="info" />
                <Typography variant="h6">Maintenance Predictions</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Days</InputLabel>
                  <Select
                    value={maintenanceDays}
                    onChange={(e) => setMaintenanceDays(Number(e.target.value))}
                    label="Days"
                  >
                    <MenuItem value={7}>1 Week</MenuItem>
                    <MenuItem value={30}>1 Month</MenuItem>
                    <MenuItem value={90}>3 Months</MenuItem>
                    <MenuItem value={180}>6 Months</MenuItem>
                    <MenuItem value={365}>1 Year</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  onClick={predictMaintenance}
                  disabled={loading.maintenance}
                  startIcon={<Build />}
                >
                  Analyze
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading.maintenance && <LinearProgress />}
            {errors.maintenance ? (
              <Alert severity="error" onClose={() => clearError('maintenance')}>
                {errors.maintenance}
              </Alert>
            ) : maintenancePredictions ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Overall Health Score
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LinearProgress
                      variant="determinate"
                      value={maintenancePredictions.overall_score * 100}
                      sx={{ width: 200, height: 10 }}
                      color={maintenancePredictions.overall_score > 0.8 ? 'success' : 
                             maintenancePredictions.overall_score > 0.6 ? 'warning' : 'error'}
                    />
                    <Typography variant="h6">
                      {(maintenancePredictions.overall_score * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Maintenance Tasks ({maintenancePredictions.maintenance_schedule.length})
                  </Typography>
                  {maintenancePredictions.maintenance_schedule.slice(0, 3).map((task, index) => (
                    <Chip
                      key={index}
                      label={`${task.sensor}: ${task.task}`}
                      color={task.priority === 'urgent' ? 'error' : 
                             task.priority === 'high' ? 'warning' : 'info'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Sensor Health
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(maintenancePredictions.sensor_health).map(([sensor, health]) => (
                      <Grid item xs={12} sm={6} md={3} key={sensor}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                          <Typography variant="subtitle2">{sensor}</Typography>
                          <Typography variant="h6" color={
                            health.status === 'excellent' ? 'success.main' :
                            health.status === 'good' ? 'info.main' :
                            health.status === 'warning' ? 'warning.main' : 'error.main'
                          }>
                            {health.status}
                          </Typography>
                          <Typography variant="caption">
                            {health.estimated_life_remaining} days remaining
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">Click Analyze to predict maintenance needs</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEnergyOptimization = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <BatteryIcon color="success" />
                <Typography variant="h6">Energy Optimization</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={energyMode}
                    onChange={(e) => setEnergyMode(e.target.value as 'battery' | 'solar' | 'hybrid')}
                    label="Mode"
                  >
                    <MenuItem value="battery">Battery</MenuItem>
                    <MenuItem value="solar">Solar</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  onClick={optimizeEnergy}
                  disabled={loading.energy}
                  startIcon={<SpeedIcon />}
                >
                  Optimize
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading.energy && <LinearProgress />}
            {errors.energy ? (
              <Alert severity="error" onClose={() => clearError('energy')}>
                {errors.energy}
              </Alert>
            ) : energyOptimization ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Current Consumption
                  </Typography>
                  <Typography variant="body2">
                    Total Power: {energyOptimization.current_consumption.total_power.toFixed(2)}W
                  </Typography>
                  <Typography variant="body2">
                    Efficiency Score: {(energyOptimization.current_consumption.efficiency_score * 100).toFixed(0)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    Battery Life Projection
                  </Typography>
                  <Typography variant="body2">
                    Current: {energyOptimization.projected_battery_life.current.toFixed(1)} hours
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Optimized: {energyOptimization.projected_battery_life.optimized.toFixed(1)} hours
                  </Typography>
                  <Typography variant="body2">
                    Improvement: +{energyOptimization.projected_battery_life.improvement.toFixed(0)}%
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Optimization Recommendations
                  </Typography>
                  {energyOptimization.optimizations.slice(0, 3).map((opt, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1, p: 2 }}>
                      <Box display="flex" justifyContent="between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{opt.category}</Typography>
                          <Typography variant="body2">{opt.description}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Savings: {opt.potential_savings.toFixed(2)}W • 
                            Payback: {opt.payback_period} days • 
                            Difficulty: {opt.implementation_difficulty}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">Click Optimize to analyze energy consumption</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h1">
              Advanced AI Analytics - {stationId}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Interval</InputLabel>
                <Select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  label="Interval"
                  disabled={!autoRefresh}
                >
                  <MenuItem value={60000}>1 Minute</MenuItem>
                  <MenuItem value={300000}>5 Minutes</MenuItem>
                  <MenuItem value={600000}>10 Minutes</MenuItem>
                  <MenuItem value={1800000}>30 Minutes</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={refreshAllData}
                disabled={Object.values(loading).some(Boolean)}
              >
                Refresh All
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Model Status Card */}
      {renderModelStatusCard()}

      {/* Main Analytics Tabs */}
      <Card sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<WarningIcon />}
            label="Anomaly Detection"
            iconPosition="start"
          />
          <Tab
            icon={<TrendIcon />}
            label="Weather Predictions"
            iconPosition="start"
          />
          <Tab
            icon={<MaintenanceIcon />}
            label="Maintenance"
            iconPosition="start"
          />
          <Tab
            icon={<BatteryIcon />}
            label="Energy Optimization"
            iconPosition="start"
          />
        </Tabs>
        
        <TabPanel value={activeTab} index={0}>
          {renderAnomalyDetection()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {renderWeatherPredictions()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          {renderMaintenancePredictions()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          {renderEnergyOptimization()}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;