import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AlertsPanel from '../AlertsPanel';
import { weatherService } from '../../services/weatherService';

// Mock the weather service
jest.mock('../../services/weatherService');
const mockWeatherService = weatherService as jest.Mocked<typeof weatherService>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AlertsPanel', () => {
  const mockAlerts = [
    {
      id: '1',
      station_id: 'TEST_STATION_001',
      alert_type: 'temperature',
      severity: 'HIGH' as const,
      message: 'Temperatura extrema detectada (Valor: 45°C)',
      timestamp: '2024-01-01T12:00:00Z',
      acknowledged: false
    },
    {
      id: '2',
      station_id: 'TEST_STATION_001',
      alert_type: 'wind_speed',
      severity: 'CRITICAL' as const,
      message: 'Vientos peligrosos detectados (Valor: 75 km/h)',
      timestamp: '2024-01-01T11:00:00Z',
      acknowledged: false
    },
    {
      id: '3',
      station_id: 'TEST_STATION_001',
      alert_type: 'humidity',
      severity: 'MEDIUM' as const,
      message: 'Humedad alta detectada (Valor: 95%)',
      timestamp: '2024-01-01T10:00:00Z',
      acknowledged: true
    }
  ];

  const mockAlertSummary = {
    station_id: 'TEST_STATION_001',
    total: 3,
    unacknowledged: 2,
    by_severity: {
      CRITICAL: 1,
      HIGH: 1,
      MEDIUM: 1,
      LOW: 0
    },
    latest_alert: '2024-01-01T12:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWeatherService.getAlerts.mockResolvedValue(mockAlerts);
    mockWeatherService.getAlertSummary.mockResolvedValue(mockAlertSummary);
  });

  describe('Initial Loading', () => {
    it('should show loading skeletons while fetching data', async () => {
      mockWeatherService.getAlerts.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      expect(screen.getByText('Alertas')).toBeInTheDocument();
      
      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should fetch alerts and summary on mount', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(mockWeatherService.getAlerts).toHaveBeenCalledWith('TEST_STATION_001');
        expect(mockWeatherService.getAlertSummary).toHaveBeenCalledWith('TEST_STATION_001');
      });
    });
  });

  describe('Alert Display', () => {
    it('should display all alerts in the list', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('Temperatura extrema detectada (Valor: 45°C)')).toBeInTheDocument();
        expect(screen.getByText('Vientos peligrosos detectados (Valor: 75 km/h)')).toBeInTheDocument();
        expect(screen.getByText('Humedad alta detectada (Valor: 95%)')).toBeInTheDocument();
      });
    });

    it('should show correct severity badges', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
        expect(screen.getByText('ALTO')).toBeInTheDocument();
        expect(screen.getByText('MEDIO')).toBeInTheDocument();
      });
    });

    it('should show formatted timestamps', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        // Check for relative time formatting
        expect(screen.getByText(/hace/)).toBeInTheDocument();
      });
    });

    it('should distinguish between acknowledged and unacknowledged alerts', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        // Unacknowledged alerts should have action buttons
        const acknowledgeButtons = screen.getAllByLabelText(/marcar como leída/i);
        expect(acknowledgeButtons).toHaveLength(2); // Only 2 unacknowledged alerts
      });
    });
  });

  describe('Alert Summary', () => {
    it('should display total alert count', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total alerts
      });
    });

    it('should display unacknowledged count badge', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        const badge = screen.getByText('2'); // Unacknowledged count
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show severity breakdown', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
        expect(screen.getByText('ALTO')).toBeInTheDocument();
        expect(screen.getByText('MEDIO')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should have tabs for different alert views', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /todas/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /no leídas/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /resumen/i })).toBeInTheDocument();
      });
    });

    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('Temperatura extrema detectada (Valor: 45°C)')).toBeInTheDocument();
      });

      // Click on unread tab
      const unreadTab = screen.getByRole('tab', { name: /no leídas/i });
      await user.click(unreadTab);

      // Should show only unacknowledged alerts
      await waitFor(() => {
        expect(screen.getByText('Temperatura extrema detectada (Valor: 45°C)')).toBeInTheDocument();
        expect(screen.getByText('Vientos peligrosos detectados (Valor: 75 km/h)')).toBeInTheDocument();
        // Acknowledged alert should not be visible in unread tab
        expect(screen.queryByText('Humedad alta detectada (Valor: 95%)')).not.toBeInTheDocument();
      });
    });

    it('should show summary in summary tab', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(mockWeatherService.getAlerts).toHaveBeenCalled();
      });

      // Click on summary tab
      const summaryTab = screen.getByRole('tab', { name: /resumen/i });
      await user.click(summaryTab);

      await waitFor(() => {
        expect(screen.getByText('Total de alertas')).toBeInTheDocument();
        expect(screen.getByText('Alertas no leídas')).toBeInTheDocument();
      });
    });
  });

  describe('Alert Actions', () => {
    it('should acknowledge an alert when acknowledge button is clicked', async () => {
      const user = userEvent.setup();
      mockWeatherService.acknowledgeAlert.mockResolvedValue(undefined);
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('Temperatura extrema detectada (Valor: 45°C)')).toBeInTheDocument();
      });

      // Click acknowledge button for first alert
      const acknowledgeButton = screen.getAllByLabelText(/marcar como leída/i)[0];
      await user.click(acknowledgeButton);

      expect(mockWeatherService.acknowledgeAlert).toHaveBeenCalledWith('1');
    });

    it('should refresh alerts when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(mockWeatherService.getAlerts).toHaveBeenCalledTimes(1);
      });

      // Find and click refresh button
      const refreshButton = screen.getByLabelText(/actualizar/i);
      await user.click(refreshButton);

      expect(mockWeatherService.getAlerts).toHaveBeenCalledTimes(2);
      expect(mockWeatherService.getAlertSummary).toHaveBeenCalledTimes(2);
    });

    it('should acknowledge all alerts when mark all read button is clicked', async () => {
      const user = userEvent.setup();
      mockWeatherService.acknowledgeAlert.mockResolvedValue(undefined);
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText('Temperatura extrema detectada (Valor: 45°C)')).toBeInTheDocument();
      });

      // Click mark all read button
      const markAllButton = screen.getByText(/marcar todas como leídas/i);
      await user.click(markAllButton);

      // Should call acknowledge for each unacknowledged alert
      expect(mockWeatherService.acknowledgeAlert).toHaveBeenCalledWith('1');
      expect(mockWeatherService.acknowledgeAlert).toHaveBeenCalledWith('2');
      expect(mockWeatherService.acknowledgeAlert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockWeatherService.getAlerts.mockRejectedValue(new Error('API Error'));
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
      });
    });

    it('should handle empty alerts list', async () => {
      mockWeatherService.getAlerts.mockResolvedValue([]);
      mockWeatherService.getAlertSummary.mockResolvedValue({
        station_id: 'TEST_STATION_001',
        total: 0,
        unacknowledged: 0,
        by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        latest_alert: null
      });
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByText(/no hay alertas/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert Severity Icons', () => {
    it('should show correct icons for different severities', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        // Critical alerts should have error icon
        const errorIcons = screen.getAllByTestId('ErrorIcon');
        expect(errorIcons.length).toBeGreaterThan(0);

        // High alerts should have warning icon
        const warningIcons = screen.getAllByTestId('WarningIcon');
        expect(warningIcons.length).toBeGreaterThan(0);

        // Medium alerts should have info icon
        const infoIcons = screen.getAllByTestId('InfoIcon');
        expect(infoIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        // Check for tab panel roles
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
      });
    });

    it('should have accessible button labels', async () => {
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/actualizar alertas/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/marcar como leída/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update alerts periodically', async () => {
      jest.useFakeTimers();
      
      renderWithTheme(<AlertsPanel stationId="TEST_STATION_001" />);

      await waitFor(() => {
        expect(mockWeatherService.getAlerts).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 30 seconds (assuming 30s refresh interval)
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockWeatherService.getAlerts).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });
});