import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  CheckBox,
  CheckBoxOutlineBlank,
  Refresh,
  Map,
  ViewList,
  ViewModule,
  LocationOn,
  SignalWifi4Bar,
  SignalWifiOff
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import { StationMetadata, StationStatus, StationWithData } from '../types/stationTypes';
import { stationService } from '../services/stationService';

interface StationSelectorProps {
  selectedStations: string[];
  onSelectionChange: (stationIds: string[]) => void;
  viewMode: 'list' | 'grid' | 'map';
  onViewModeChange: (mode: 'list' | 'grid' | 'map') => void;
  showInactive?: boolean;
  onToggleInactive?: () => void;
  maxSelection?: number;
}

const StationSelector: React.FC<StationSelectorProps> = ({
  selectedStations,
  onSelectionChange,
  viewMode,
  onViewModeChange,
  showInactive = false,
  onToggleInactive,
  maxSelection = 10
}) => {
  const { t } = useTranslation('dashboard');
  const [stations, setStations] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const stationsData = await stationService.getAllStations();
      setStations(stationsData);
    } catch (err) {
      console.error('Error fetching stations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Filter stations based on showInactive setting
  const filteredStations = stations.filter(station => {
    if (showInactive) return true;
    return station.status === StationStatus.ACTIVE;
  });

  const handleStationToggle = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const stationIds = typeof value === 'string' ? value.split(',') : value;
    
    // Limit selection
    if (stationIds.length <= maxSelection) {
      onSelectionChange(stationIds);
    }
  };

  const handleSelectAll = () => {
    const activeStationIds = filteredStations.map(station => station.station_id);
    const limitedIds = activeStationIds.slice(0, maxSelection);
    onSelectionChange(limitedIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getStatusIcon = (status: StationStatus) => {
    switch (status) {
      case StationStatus.ACTIVE:
        return <SignalWifi4Bar color="success" fontSize="small" />;
      case StationStatus.INACTIVE:
        return <SignalWifiOff color="disabled" fontSize="small" />;
      case StationStatus.MAINTENANCE:
        return <SignalWifi4Bar color="warning" fontSize="small" />;
      case StationStatus.ERROR:
        return <SignalWifiOff color="error" fontSize="small" />;
      default:
        return <SignalWifiOff color="disabled" fontSize="small" />;
    }
  };

  const getStatusColor = (status: StationStatus) => {
    switch (status) {
      case StationStatus.ACTIVE:
        return 'success';
      case StationStatus.INACTIVE:
        return 'default';
      case StationStatus.MAINTENANCE:
        return 'warning';
      case StationStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  const renderStationOption = (station: StationMetadata) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      {getStatusIcon(station.status)}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {station.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {station.location.address}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={t(`stationStatus.${station.status}`)}
        color={getStatusColor(station.status) as any}
        variant="outlined"
      />
    </Box>
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>{t('stations.loading')}</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {t('stations.selector.title')}
          </Typography>
          
          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={t('stations.viewMode.list')}>
              <IconButton
                size="small"
                color={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => onViewModeChange('list')}
              >
                <ViewList />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('stations.viewMode.grid')}>
              <IconButton
                size="small"
                color={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => onViewModeChange('grid')}
              >
                <ViewModule />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('stations.viewMode.map')}>
              <IconButton
                size="small"
                color={viewMode === 'map' ? 'primary' : 'default'}
                onClick={() => onViewModeChange('map')}
              >
                <Map />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('stations.refresh')}>
              <IconButton
                size="small"
                onClick={fetchStations}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Station Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="station-selector-label">
            {t('stations.selector.label')}
          </InputLabel>
          <Select
            labelId="station-selector-label"
            multiple
            value={selectedStations}
            onChange={handleStationToggle}
            input={<OutlinedInput label={t('stations.selector.label')} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((stationId) => {
                  const station = stations.find(s => s.station_id === stationId);
                  return (
                    <Chip
                      key={stationId}
                      label={station?.name || stationId}
                      size="small"
                      color={station ? getStatusColor(station.status) as any : 'default'}
                      onDelete={() => {
                        const newSelection = selectedStations.filter(id => id !== stationId);
                        onSelectionChange(newSelection);
                      }}
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 400,
                  width: 350,
                },
              },
            }}
          >
            {filteredStations.map((station) => (
              <MenuItem key={station.station_id} value={station.station_id}>
                <Checkbox
                  icon={<CheckBoxOutlineBlank fontSize="small" />}
                  checkedIcon={<CheckBox fontSize="small" />}
                  checked={selectedStations.includes(station.station_id)}
                />
                <ListItemText 
                  primary={renderStationOption(station)}
                  sx={{ ml: 1 }}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Selection Info and Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t('stations.selector.selected', { 
              count: selectedStations.length, 
              total: filteredStations.length,
              max: maxSelection 
            })}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {onToggleInactive && (
              <Button
                size="small"
                variant="outlined"
                onClick={onToggleInactive}
                startIcon={showInactive ? <CheckBox /> : <CheckBoxOutlineBlank />}
              >
                {t('stations.showInactive')}
              </Button>
            )}
            
            <Button
              size="small"
              variant="outlined"
              onClick={handleSelectAll}
              disabled={filteredStations.length === 0 || selectedStations.length >= maxSelection}
            >
              {t('stations.selectAll')}
            </Button>
            
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearAll}
              disabled={selectedStations.length === 0}
            >
              {t('stations.clearAll')}
            </Button>
          </Box>
        </Box>

        {/* Station Statistics */}
        {stations.length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('stations.statistics')}:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SignalWifi4Bar color="success" fontSize="small" />
                <Typography variant="caption">
                  {stations.filter(s => s.status === StationStatus.ACTIVE).length} {t('stationStatus.active')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SignalWifi4Bar color="warning" fontSize="small" />
                <Typography variant="caption">
                  {stations.filter(s => s.status === StationStatus.MAINTENANCE).length} {t('stationStatus.maintenance')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SignalWifiOff color="disabled" fontSize="small" />
                <Typography variant="caption">
                  {stations.filter(s => s.status === StationStatus.INACTIVE).length} {t('stationStatus.inactive')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SignalWifiOff color="error" fontSize="small" />
                <Typography variant="caption">
                  {stations.filter(s => s.status === StationStatus.ERROR).length} {t('stationStatus.error')}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StationSelector;