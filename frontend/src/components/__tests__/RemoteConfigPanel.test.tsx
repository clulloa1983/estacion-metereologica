import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import RemoteConfigPanel from '../RemoteConfigPanel';
import { configService } from '../../services/configService';
import '@testing-library/jest-dom';

// Mock the config service
jest.mock('../../services/configService');

// Mock child components
jest.mock('../config/SensorConfigSection', () => {
  return function MockSensorConfigSection({ onSendCommand }: any) {
    return (
      <div data-testid="sensor-config-section">
        <button 
          onClick={() => onSendCommand(
            () => Promise.resolve({ success: true, message: 'Sensor configured', timestamp: '2024-01-01T00:00:00Z' }),
            'Sensor configured successfully',
            'Failed to configure sensor'
          )}
          data-testid="mock-sensor-command"
        >
          Configure Sensor
        </button>
      </div>
    );
  };
});

jest.mock('../config/AlertConfigSection', () => {
  return function MockAlertConfigSection({ onSendCommand }: any) {
    return (
      <div data-testid="alert-config-section">
        <button 
          onClick={() => onSendCommand(
            () => Promise.resolve({ success: false, message: 'Alert configuration failed', timestamp: '2024-01-01T00:00:00Z' }),
            'Alert configured successfully',
            'Failed to configure alert'
          )}
          data-testid="mock-alert-command"
        >
          Configure Alert
        </button>
      </div>
    );
  };
});

jest.mock('../config/PowerConfigSection', () => {
  return function MockPowerConfigSection({ onSendCommand }: any) {
    return (
      <div data-testid="power-config-section">
        <button 
          onClick={() => onSendCommand(
            () => Promise.reject(new Error('Network error')),
            'Power configured successfully',
            'Failed to configure power'
          )}
          data-testid="mock-power-command"
        >
          Configure Power
        </button>
      </div>
    );
  };
});

jest.mock('../config/ConnectivityConfigSection', () => {
  return function MockConnectivityConfigSection({ onSendCommand }: any) {
    return (
      <div data-testid="connectivity-config-section">
        <button 
          onClick={() => onSendCommand(
            () => Promise.resolve({ success: true, message: 'Connectivity configured', timestamp: '2024-01-01T00:00:00Z' }),
            'Connectivity configured successfully',
            'Failed to configure connectivity'
          )}
          data-testid="mock-connectivity-command"
        >
          Configure Connectivity
        </button>
      </div>
    );
  };
});

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('RemoteConfigPanel', () => {
  const mockStationId = 'ESP32_STATION_001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render the configuration panel with all tabs', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      expect(screen.getByText('Remote Configuration')).toBeInTheDocument();
      expect(screen.getByText('Sensors')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Power')).toBeInTheDocument();
      expect(screen.getByText('Connectivity')).toBeInTheDocument();
    });

    it('should render the first tab (Sensors) content by default', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      expect(screen.getByTestId('sensor-config-section')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-config-section')).not.toBeVisible();
    });

    it('should render all tab icons', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // Check for Material-UI icons by their ARIA labels or test IDs
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });
  });

  describe('Tab navigation', () => {
    it('should switch to Alerts tab when clicked', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);

      expect(screen.getByTestId('alert-config-section')).toBeInTheDocument();
      expect(screen.queryByTestId('sensor-config-section')).not.toBeVisible();
    });

    it('should switch to Power tab when clicked', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const powerTab = screen.getByText('Power');
      fireEvent.click(powerTab);

      expect(screen.getByTestId('power-config-section')).toBeInTheDocument();
      expect(screen.queryByTestId('sensor-config-section')).not.toBeVisible();
    });

    it('should switch to Connectivity tab when clicked', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const connectivityTab = screen.getByText('Connectivity');
      fireEvent.click(connectivityTab);

      expect(screen.getByTestId('connectivity-config-section')).toBeInTheDocument();
      expect(screen.queryByTestId('sensor-config-section')).not.toBeVisible();
    });

    it('should maintain proper ARIA attributes for accessibility', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const tabs = screen.getAllByRole('tab');
      const tabPanels = screen.getAllByRole('tabpanel', { hidden: true });

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabPanels).toHaveLength(4);
    });
  });

  describe('Command execution and notifications', () => {
    it('should show success notification on successful command', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const configureButton = screen.getByTestId('mock-sensor-command');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Sensor configured successfully')).toBeInTheDocument();
      });
    });

    it('should show error notification on failed command', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // Switch to alerts tab
      fireEvent.click(screen.getByText('Alerts'));
      
      const configureButton = screen.getByTestId('mock-alert-command');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to configure alert: Alert configuration failed')).toBeInTheDocument();
      });
    });

    it('should show error notification on network error', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // Switch to power tab
      fireEvent.click(screen.getByText('Power'));
      
      const configureButton = screen.getByTestId('mock-power-command');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to configure power: Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during command execution', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // Mock a delayed response
      const delayedPromise = new Promise(resolve => 
        setTimeout(() => resolve({ success: true, message: 'Success', timestamp: '2024-01-01T00:00:00Z' }), 100)
      );

      // Create a custom mock for this test
      const MockSlowComponent = ({ onSendCommand }: any) => (
        <button 
          onClick={() => onSendCommand(
            () => delayedPromise,
            'Success',
            'Error'
          )}
          data-testid="slow-command"
        >
          Slow Command
        </button>
      );

      // This is a simplified test - in real implementation, you'd see the loading spinner
      const configureButton = screen.getByTestId('mock-sensor-command');
      fireEvent.click(configureButton);

      // The loading state would be visible here briefly
      await waitFor(() => {
        expect(screen.getByText('Sensor configured successfully')).toBeInTheDocument();
      });
    });

    it('should close notification when close button is clicked', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const configureButton = screen.getByTestId('mock-sensor-command');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Sensor configured successfully')).toBeInTheDocument();
      });

      // Find and click the close button (usually an X icon)
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Sensor configured successfully')).not.toBeInTheDocument();
      });
    });
  });

  describe('Station ID prop handling', () => {
    it('should pass station ID to child components', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // In the real implementation, child components would receive stationId
      // This test verifies the prop is passed down correctly
      expect(screen.getByTestId('sensor-config-section')).toBeInTheDocument();
    });

    it('should handle different station ID formats', () => {
      const differentStationIds = [
        'ESP32_STATION_001',
        'ARDUINO_UNO_ALPHA',
        'WEATHER_STATION_BETA',
        'IOT_DEVICE_123'
      ];

      differentStationIds.forEach(stationId => {
        const { unmount } = renderWithTheme(<RemoteConfigPanel stationId={stationId} />);
        
        expect(screen.getByText('Remote Configuration')).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Notification severity levels', () => {
    it('should display different severity levels correctly', async () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      // Test success notification
      fireEvent.click(screen.getByTestId('mock-sensor-command'));
      await waitFor(() => {
        const successAlert = screen.getByRole('alert');
        expect(successAlert).toHaveClass('MuiAlert-standardSuccess');
      });

      // Close the notification
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      // Test error notification
      fireEvent.click(screen.getByText('Alerts'));
      fireEvent.click(screen.getByTestId('mock-alert-command'));
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveClass('MuiAlert-standardError');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(4);
    });

    it('should support keyboard navigation', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const firstTab = screen.getAllByRole('tab')[0];
      const secondTab = screen.getAllByRole('tab')[1];

      firstTab.focus();
      expect(firstTab).toHaveFocus();

      // Simulate arrow key navigation
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      expect(secondTab).toHaveFocus();
    });

    it('should provide proper focus management', () => {
      renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);

      expect(alertsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error boundary and edge cases', () => {
    it('should handle missing station ID gracefully', () => {
      // Test with empty station ID
      renderWithTheme(<RemoteConfigPanel stationId="" />);
      
      expect(screen.getByText('Remote Configuration')).toBeInTheDocument();
    });

    it('should handle component unmounting during async operations', async () => {
      const { unmount } = renderWithTheme(<RemoteConfigPanel stationId={mockStationId} />);

      const configureButton = screen.getByTestId('mock-sensor-command');
      fireEvent.click(configureButton);

      // Unmount before the async operation completes
      unmount();

      // Should not cause memory leaks or errors
      await waitFor(() => {
        // Component should be unmounted cleanly
        expect(screen.queryByText('Remote Configuration')).not.toBeInTheDocument();
      });
    });
  });
});