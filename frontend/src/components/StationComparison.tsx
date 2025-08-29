import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Grid,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Timeline,
  BarChart,
  ShowChart,
  TableChart
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import { 
  StationWithData, 
  WeatherData, 
  StationComparison as StationComparisonType,
  StationStatus
} from '../types/stationTypes';
import { weatherService } from '../services/weatherService';

interface StationComparisonProps {
  stations: StationWithData[];
  selectedStations: string[];
  metric: keyof WeatherData;
  timeRange: string;
  onMetricChange: (metric: keyof WeatherData) => void;
  onTimeRangeChange: (timeRange: string) => void;
  showStatistics?: boolean;
  comparisonMode?: 'table' | 'cards' | 'chart';
  onComparisonModeChange?: (mode: 'table' | 'cards' | 'chart') => void;
}

interface StationStatistics {
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  trend: 'up' | 'down' | 'flat' | 'unknown';
}

const StationComparison: React.FC<StationComparisonProps> = ({
  stations,
  selectedStations,
  metric,
  timeRange,
  onMetricChange,
  onTimeRangeChange,
  showStatistics = true,
  comparisonMode = 'table',
  onComparisonModeChange
}) => {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<{ [stationId: string]: StationStatistics }>({});
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Filtrar estaciones seleccionadas y activas si es necesario
  const filteredStations = stations.filter(station => {
    if (!selectedStations.includes(station.station_id)) return false;
    if (showOnlyActive && station.status !== StationStatus.ACTIVE) return false;
    return true;
  });

  // Métricas disponibles para comparación
  const availableMetrics: { value: keyof WeatherData; label: string; unit: string; icon: React.ReactNode }[] = [
    { value: 'temperature', label: t('weather.temperature'), unit: '°C', icon: '🌡️' },
    { value: 'humidity', label: t('weather.humidity'), unit: '%', icon: '💧' },
    { value: 'pressure', label: t('weather.pressure'), unit: 'hPa', icon: '📊' },
    { value: 'wind_speed', label: t('weather.windSpeed'), unit: 'km/h', icon: '💨' },
    { value: 'rainfall', label: t('weather.rainfall'), unit: 'mm', icon: '🌧️' },
    { value: 'light_intensity', label: t('weather.lightIntensity'), unit: 'lux', icon: '☀️' },
    { value: 'co_level', label: t('weather.coLevel'), unit: 'ppm', icon: '🏭' },
    { value: 'air_quality', label: t('weather.airQuality'), unit: '', icon: '🌬️' }
  ];

  // Rangos de tiempo disponibles
  const timeRanges = [
    { value: '1h', label: t('timeRange.1hour') },
    { value: '6h', label: t('timeRange.6hours') },
    { value: '24h', label: t('timeRange.24hours') },
    { value: '7d', label: t('timeRange.7days') },
    { value: '30d', label: t('timeRange.30days') }
  ];

  const selectedMetricInfo = availableMetrics.find(m => m.value === metric);

  // Cargar datos de comparación
  const loadComparisonData = async () => {
    if (filteredStations.length === 0) {
      setComparisonData({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const stationIds = filteredStations.map(s => s.station_id);
      
      // Obtener datos actuales
      const currentDataPromises = stationIds.map(async (stationId) => {
        try {
          const latest = await weatherService.getLatestData(stationId);
          return { stationId, data: latest };
        } catch (err) {
          console.warn(`Failed to get current data for ${stationId}:`, err);
          return { stationId, data: null };
        }
      });

      // Obtener datos históricos para estadísticas
      const historicalDataPromises = stationIds.map(async (stationId) => {
        try {
          const historical = await weatherService.getHistoricalData(stationId, timeRange, [metric]);
          return { stationId, data: historical };
        } catch (err) {
          console.warn(`Failed to get historical data for ${stationId}:`, err);
          return { stationId, data: [] };
        }
      });

      const [currentResults, historicalResults] = await Promise.all([
        Promise.all(currentDataPromises),
        Promise.all(historicalDataPromises)
      ]);

      // Procesar datos y calcular estadísticas
      const newComparisonData: { [stationId: string]: StationStatistics } = {};

      stationIds.forEach((stationId) => {
        const currentResult = currentResults.find(r => r.stationId === stationId);
        const historicalResult = historicalResults.find(r => r.stationId === stationId);

        const current = currentResult?.data?.[metric] as number || null;
        const historicalData = historicalResult?.data || [];
        
        // Calcular estadísticas de datos históricos
        const values = historicalData
          .map(d => d[metric] as number)
          .filter(v => typeof v === 'number' && !isNaN(v));

        let stats: StationStatistics = {
          current,
          average: null,
          min: null,
          max: null,
          count: values.length,
          trend: 'unknown'
        };

        if (values.length > 0) {
          stats.average = values.reduce((sum, v) => sum + v, 0) / values.length;
          stats.min = Math.min(...values);
          stats.max = Math.max(...values);
          
          // Calcular tendencia (comparando primera y segunda mitad del período)
          if (values.length >= 4) {
            const midpoint = Math.floor(values.length / 2);
            const firstHalf = values.slice(0, midpoint);
            const secondHalf = values.slice(midpoint);
            
            const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
            
            const difference = secondAvg - firstAvg;
            const threshold = Math.abs(firstAvg * 0.05); // 5% threshold
            
            if (Math.abs(difference) < threshold) {
              stats.trend = 'flat';
            } else if (difference > 0) {
              stats.trend = 'up';
            } else {
              stats.trend = 'down';
            }
          }
        }

        newComparisonData[stationId] = stats;
      });

      setComparisonData(newComparisonData);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparisonData();
  }, [filteredStations, metric, timeRange]);

  // Formatear valores
  const formatValue = (value: number | null, unit: string): string => {
    if (value === null || value === undefined) return t('common.noData');
    
    const precision = unit === '%' || unit === '°C' ? 1 : unit === 'hPa' ? 0 : 2;
    return `${value.toFixed(precision)} ${unit}`;
  };

  // Obtener icono de tendencia
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" fontSize="small" />;
      case 'down': return <TrendingDown color="error" fontSize="small" />;
      case 'flat': return <TrendingFlat color="info" fontSize="small" />;
      default: return <TrendingFlat color="disabled" fontSize="small" />;
    }
  };

  // Obtener color de comparación
  const getComparisonColor = (value: number | null, allValues: (number | null)[]): 'success' | 'warning' | 'error' | 'default' => {
    if (value === null) return 'default';
    
    const validValues = allValues.filter(v => v !== null) as number[];
    if (validValues.length < 2) return 'default';
    
    const max = Math.max(...validValues);
    const min = Math.min(...validValues);
    
    if (value === max) return 'success';
    if (value === min) return 'error';
    return 'default';
  };

  // Renderizar vista de tabla
  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>{t('stations.station')}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{t('stations.status')}</strong>
            </TableCell>
            <TableCell align="right">
              <strong>{t('stations.current')}</strong>
            </TableCell>
            {showStatistics && (
              <>
                <TableCell align="right">
                  <strong>{t('statistics.average')}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{t('statistics.min')}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{t('statistics.max')}</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>{t('statistics.trend')}</strong>
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStations.map((station) => {
            const stats = comparisonData[station.station_id];
            const allCurrentValues = filteredStations.map(s => comparisonData[s.station_id]?.current);
            const currentColor = getComparisonColor(stats?.current || null, allCurrentValues);
            
            return (
              <TableRow key={station.station_id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {station.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {station.location.address}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={t(`stationStatus.${station.status}`)}
                    color={
                      station.status === StationStatus.ACTIVE ? 'success' :
                      station.status === StationStatus.MAINTENANCE ? 'warning' :
                      station.status === StationStatus.ERROR ? 'error' : 'default'
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={formatValue(stats?.current || null, selectedMetricInfo?.unit || '')}
                    color={currentColor}
                    variant={currentColor === 'default' ? 'outlined' : 'filled'}
                  />
                </TableCell>
                {showStatistics && (
                  <>
                    <TableCell align="right">
                      {formatValue(stats?.average || null, selectedMetricInfo?.unit || '')}
                    </TableCell>
                    <TableCell align="right">
                      {formatValue(stats?.min || null, selectedMetricInfo?.unit || '')}
                    </TableCell>
                    <TableCell align="right">
                      {formatValue(stats?.max || null, selectedMetricInfo?.unit || '')}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={t(`trend.${stats?.trend || 'unknown'}`)}>
                        {getTrendIcon(stats?.trend || 'unknown')}
                      </Tooltip>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Renderizar vista de tarjetas
  const renderCardsView = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {filteredStations.map((station) => {
        const stats = comparisonData[station.station_id];
        const allCurrentValues = filteredStations.map(s => comparisonData[s.station_id]?.current);
        const currentColor = getComparisonColor(stats?.current || null, allCurrentValues);
        
        return (
          <Grid xs={12} sm={6} md={4} key={station.station_id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                    {station.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(`stationStatus.${station.status}`)}
                    color={
                      station.status === StationStatus.ACTIVE ? 'success' :
                      station.status === StationStatus.MAINTENANCE ? 'warning' :
                      station.status === StationStatus.ERROR ? 'error' : 'default'
                    }
                    variant="outlined"
                  />
                </Box>
                
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {station.location.address}
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('stations.current')}:
                  </Typography>
                  <Chip
                    size="small"
                    label={formatValue(stats?.current || null, selectedMetricInfo?.unit || '')}
                    color={currentColor}
                    variant={currentColor === 'default' ? 'outlined' : 'filled'}
                  />
                </Box>
                
                {showStatistics && stats && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">{t('statistics.average')}:</Typography>
                      <Typography variant="caption">
                        {formatValue(stats.average, selectedMetricInfo?.unit || '')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">{t('statistics.range')}:</Typography>
                      <Typography variant="caption">
                        {formatValue(stats.min, selectedMetricInfo?.unit || '')} - {formatValue(stats.max, selectedMetricInfo?.unit || '')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption">{t('statistics.trend')}:</Typography>
                      <Tooltip title={t(`trend.${stats.trend}`)}>
                        {getTrendIcon(stats.trend)}
                      </Tooltip>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  if (filteredStations.length === 0) {
    return (
      <Alert severity="info">
        {t('stations.comparison.noStationsSelected')}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {t('stations.comparison.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('stations.comparison.subtitle', { count: filteredStations.length })}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onComparisonModeChange && (
              <>
                <Tooltip title={t('stations.comparison.tableView')}>
                  <IconButton
                    size="small"
                    color={comparisonMode === 'table' ? 'primary' : 'default'}
                    onClick={() => onComparisonModeChange('table')}
                  >
                    <TableChart />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('stations.comparison.cardsView')}>
                  <IconButton
                    size="small"
                    color={comparisonMode === 'cards' ? 'primary' : 'default'}
                    onClick={() => onComparisonModeChange('cards')}
                  >
                    <BarChart />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title={t('common.refresh')}>
              <IconButton size="small" onClick={loadComparisonData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('weather.metric')}</InputLabel>
            <Select
              value={metric}
              label={t('weather.metric')}
              onChange={(e) => onMetricChange(e.target.value as keyof WeatherData)}
            >
              {availableMetrics.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('common.timeRange')}</InputLabel>
            <Select
              value={timeRange}
              label={t('common.timeRange')}
              onChange={(e) => onTimeRangeChange(e.target.value)}
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showStatistics}
                onChange={(e) => {/* Controlado externamente */}}
                size="small"
                disabled
              />
            }
            label={t('statistics.show')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={!showOnlyActive}
                onChange={(e) => setShowOnlyActive(!e.target.checked)}
                size="small"
              />
            }
            label={t('stations.showInactive')}
          />
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {comparisonMode === 'table' ? renderTableView() : renderCardsView()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StationComparison;