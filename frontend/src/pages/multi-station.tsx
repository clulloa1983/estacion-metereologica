import React, { useState } from 'react';
import { Container, Box, Typography, AppBar, Toolbar, Fab } from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Grid from '@mui/material/Grid2';
import ErrorBoundary from '../components/ErrorBoundary';
import { LanguageSelector } from '../components/LanguageSelector';
import ThemeToggle from '../components/ThemeToggle';

// Multi-station components
import StationSelector from '../components/StationSelector';
import MultiStationMap from '../components/MultiStationMap';
import StationComparison from '../components/StationComparison';
import StationCard from '../components/StationCard';

// Hooks
import { useMultiStationData } from '../hooks/useMultiStationData';
import { WeatherData } from '../types/stationTypes';

export default function MultiStationDashboard() {
  const { t } = useTranslation(['common', 'dashboard']);
  const router = useRouter();
  
  // Multi-station data management
  const {
    stations,
    selectedStations,
    currentData,
    stationStats,
    loading,
    errors,
    selectStation,
    deselectStation,
    toggleStation,
    selectMultipleStations,
    clearSelection,
    refreshAll,
    getAllStationsWithData,
    getSelectedStationsWithData,
    dashboardConfig,
    updateDashboardConfig
  } = useMultiStationData({
    refreshInterval: 60000, // 1 minute
    autoRefresh: true,
    defaultSelectedStations: ['ESP32_STATION_001'],
    maxSelectedStations: 10
  });

  // View mode and comparison settings
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>(dashboardConfig.view_mode);
  const [showInactive, setShowInactive] = useState(false);
  const [comparisonMetric, setComparisonMetric] = useState<keyof WeatherData>('temperature');
  const [comparisonTimeRange, setComparisonTimeRange] = useState('24h');
  const [comparisonMode, setComparisonMode] = useState<'table' | 'cards' | 'chart'>('table');

  // Handle view mode changes
  const handleViewModeChange = (mode: 'list' | 'grid' | 'map') => {
    setViewMode(mode);
    updateDashboardConfig({ view_mode: mode });
  };

  // Handle station selection changes
  const handleStationSelectionChange = (stationIds: string[]) => {
    selectMultipleStations(stationIds);
  };

  // Handle map interactions
  const handleMapCenterChange = (center: { lat: number; lng: number }) => {
    updateDashboardConfig({ map_center: center });
  };

  const handleMapZoomChange = (zoom: number) => {
    updateDashboardConfig({ map_zoom: zoom });
  };

  // Get stations with data for current view
  const allStationsWithData = getAllStationsWithData();
  const selectedStationsWithData = getSelectedStationsWithData();

  // Navigate back to single station dashboard
  const handleBackToSingleStation = () => {
    router.push('/');
  };

  return (
    <ErrorBoundary>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('dashboard.multiStation.title', 'Multi-Station Weather Dashboard')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ThemeToggle />
            <LanguageSelector />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Station Selector */}
          <Grid xs={12}>
            <StationSelector
              selectedStations={selectedStations}
              onSelectionChange={handleStationSelectionChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              showInactive={showInactive}
              onToggleInactive={() => setShowInactive(!showInactive)}
              maxSelection={10}
            />
          </Grid>

          {/* Main Content Area */}
          {selectedStations.length > 0 && (
            <>
              {viewMode === 'map' && (
                <Grid xs={12}>
                  <MultiStationMap
                    stations={allStationsWithData}
                    selectedStations={selectedStations}
                    onStationSelect={selectStation}
                    onStationDeselect={deselectStation}
                    currentData={currentData}
                    showAllStations={true}
                    mapCenter={dashboardConfig.map_center}
                    mapZoom={dashboardConfig.map_zoom}
                    onMapCenterChange={handleMapCenterChange}
                    onMapZoomChange={handleMapZoomChange}
                  />
                </Grid>
              )}

              {viewMode === 'grid' && (
                <Grid xs={12}>
                  <Grid container spacing={2}>
                    {selectedStationsWithData.map((station) => (
                      <Grid xs={12} sm={6} md={4} lg={3} key={station.station_id}>
                        <StationCard
                          station={station}
                          currentData={currentData[station.station_id]}
                          stats={stationStats[station.station_id]}
                          isSelected={true}
                          showDetails={false}
                          onDeselect={() => deselectStation(station.station_id)}
                          onViewCharts={() => {
                            // TODO: Implement charts view
                            console.log('View charts for', station.station_id);
                          }}
                          onViewSettings={() => {
                            // TODO: Implement settings view
                            console.log('View settings for', station.station_id);
                          }}
                          compact={false}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {viewMode === 'list' && (
                <Grid xs={12}>
                  <Grid container spacing={2}>
                    {selectedStationsWithData.map((station) => (
                      <Grid xs={12} key={station.station_id}>
                        <StationCard
                          station={station}
                          currentData={currentData[station.station_id]}
                          stats={stationStats[station.station_id]}
                          isSelected={true}
                          showDetails={true}
                          onDeselect={() => deselectStation(station.station_id)}
                          onViewCharts={() => {
                            console.log('View charts for', station.station_id);
                          }}
                          onViewSettings={() => {
                            console.log('View settings for', station.station_id);
                          }}
                          compact={false}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {/* Station Comparison */}
              {selectedStations.length >= 2 && (
                <Grid xs={12}>
                  <StationComparison
                    stations={allStationsWithData}
                    selectedStations={selectedStations}
                    metric={comparisonMetric}
                    timeRange={comparisonTimeRange}
                    onMetricChange={setComparisonMetric}
                    onTimeRangeChange={setComparisonTimeRange}
                    showStatistics={true}
                    comparisonMode={comparisonMode}
                    onComparisonModeChange={setComparisonMode}
                  />
                </Grid>
              )}
            </>
          )}

          {/* No stations selected message */}
          {selectedStations.length === 0 && !loading.stations && (
            <Grid xs={12}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 8,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  {t('stations.comparison.noStationsSelected')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('dashboard.multiStation.selectStationsToStart', 'Select one or more stations from the selector above to start monitoring.')}
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Loading state */}
          {loading.stations && (
            <Grid xs={12}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 8
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  {t('stations.loading')}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Floating Action Button to return to single station view */}
      <Fab
        color="primary"
        aria-label="single station"
        onClick={handleBackToSingleStation}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24
        }}
      >
        <DashboardIcon />
      </Fab>
    </ErrorBoundary>
  );
}

// Server-side translations
export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common', 'dashboard'])),
  },
});