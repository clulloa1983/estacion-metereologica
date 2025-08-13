import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  Tabs,
  Tab,
  Button,
  Divider,
  Skeleton
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  NotificationsActive,
  NotificationsOff,
  Refresh,
  MarkEmailRead
} from '@mui/icons-material';
import { weatherService, Alert } from '../services/weatherService';

interface AlertsPanelProps {
  stationId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alerts-tabpanel-${index}`}
      aria-labelledby={`alerts-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ stationId }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [alertSummary, setAlertSummary] = useState<any>(null);

  const fetchAlerts = async () => {
    try {
      const [allAlerts, summary] = await Promise.all([
        weatherService.getAlerts(stationId),
        weatherService.getAlertSummary(stationId)
      ]);
      setAlerts(allAlerts);
      setAlertSummary(summary);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Actualizar alertas cada 30 segundos
    const interval = setInterval(fetchAlerts, 30000);
    
    return () => clearInterval(interval);
  }, [stationId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await weatherService.acknowledgeAlert(alertId);
      await fetchAlerts(); // Refrescar la lista
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <Error color="error" />;
      case 'HIGH':
        return <Warning color="error" />;
      case 'MEDIUM':
        return <Warning color="warning" />;
      case 'LOW':
        return <Info color="info" />;
      default:
        return <Info color="info" />;
    }
  };

  const getAlertColor = (severity: string): "error" | "warning" | "info" | "success" => {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'info';
    }
  };

  const formatAlertTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de 1 minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITICAL' && !alert.acknowledged);

  const renderAlertList = (alertList: Alert[]) => {
    if (alertList.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            No hay alertas en esta categoría
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {alertList.map((alert, index) => (
          <React.Fragment key={alert.id}>
            <ListItem>
              <ListItemIcon>
                {getAlertIcon(alert.severity)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {alert.alert_type}
                    </Typography>
                    <Chip 
                      label={alert.severity} 
                      size="small" 
                      color={getAlertColor(alert.severity)}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatAlertTime(alert.timestamp)}
                    </Typography>
                  </Box>
                }
              />
              {!alert.acknowledged && (
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    color="primary"
                  >
                    <MarkEmailRead />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
            {index < alertList.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Alertas y Notificaciones
          </Typography>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Alertas y Notificaciones
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={fetchAlerts} color="primary">
              <Refresh />
            </IconButton>
            <Badge badgeContent={unacknowledgedAlerts.length} color="error">
              <NotificationsActive color={unacknowledgedAlerts.length > 0 ? 'error' : 'disabled'} />
            </Badge>
          </Box>
        </Box>

        {/* Resumen de alertas */}
        {alertSummary && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Resumen de alertas (últimas 24h):
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Críticas: ${alertSummary.critical || 0}`} 
                color="error" 
                size="small"
              />
              <Chip 
                label={`Altas: ${alertSummary.high || 0}`} 
                color="error" 
                variant="outlined" 
                size="small"
              />
              <Chip 
                label={`Medias: ${alertSummary.medium || 0}`} 
                color="warning" 
                size="small"
              />
              <Chip 
                label={`Bajas: ${alertSummary.low || 0}`} 
                color="info" 
                size="small"
              />
            </Box>
          </Box>
        )}

        {/* Alertas críticas destacadas */}
        {criticalAlerts.length > 0 && (
          <Box sx={{ mb: 2, p: 2, border: 2, borderColor: 'error.main', borderRadius: 1, backgroundColor: 'error.light', color: 'error.contrastText' }}>
            <Typography variant="subtitle2" gutterBottom>
              ⚠️ Alertas Críticas Activas:
            </Typography>
            {criticalAlerts.map(alert => (
              <Typography key={alert.id} variant="body2">
                • {alert.message}
              </Typography>
            ))}
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab 
              label={
                <Badge badgeContent={unacknowledgedAlerts.length} color="error">
                  Pendientes
                </Badge>
              } 
            />
            <Tab label="Reconocidas" />
            <Tab label="Todas" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          {renderAlertList(unacknowledgedAlerts)}
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {renderAlertList(acknowledgedAlerts)}
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {renderAlertList(alerts)}
        </TabPanel>

        {unacknowledgedAlerts.length > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                unacknowledgedAlerts.forEach(alert => handleAcknowledgeAlert(alert.id));
              }}
            >
              Reconocer todas las alertas
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;