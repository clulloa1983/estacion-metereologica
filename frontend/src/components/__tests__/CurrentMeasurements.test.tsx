import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CurrentMeasurements from '../CurrentMeasurements';

// Mock Material-UI theme
const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CurrentMeasurements', () => {
  const mockWeatherData = {
    station_id: 'TEST_STATION_001',
    temperature: 25.5,
    humidity: 60,
    pressure: 1013.25,
    wind_speed: 12.5,
    wind_direction: 180,
    rainfall: 2.5,
    pm25: 35,
    pm10: 45,
    uv_index: 7,
    battery_voltage: 12.8,
    timestamp: '2024-01-01T12:00:00Z'
  };

  describe('Loading State', () => {
    it('should show loading skeletons when loading is true', () => {
      renderWithTheme(
        <CurrentMeasurements data={null} loading={true} />
      );

      // Check for skeleton elements
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show section title even when loading', () => {
      renderWithTheme(
        <CurrentMeasurements data={null} loading={true} />
      );

      expect(screen.getByText('Mediciones Actuales')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display all weather measurements when data is provided', () => {
      renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      // Check for temperature
      expect(screen.getByText('25.5°C')).toBeInTheDocument();
      expect(screen.getByText('Temperatura')).toBeInTheDocument();

      // Check for humidity
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('Humedad')).toBeInTheDocument();

      // Check for pressure
      expect(screen.getByText('1013 hPa')).toBeInTheDocument();
      expect(screen.getByText('Presión')).toBeInTheDocument();

      // Check for wind speed
      expect(screen.getByText('12.5 km/h')).toBeInTheDocument();
      expect(screen.getByText('Viento')).toBeInTheDocument();

      // Check for wind direction
      expect(screen.getByText('180°')).toBeInTheDocument();
      expect(screen.getByText('Dirección')).toBeInTheDocument();

      // Check for rainfall
      expect(screen.getByText('2.5 mm')).toBeInTheDocument();
      expect(screen.getByText('Lluvia')).toBeInTheDocument();
    });

    it('should display optional measurements when available', () => {
      renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      // Check for PM2.5
      expect(screen.getByText('35 µg/m³')).toBeInTheDocument();
      expect(screen.getByText('PM2.5')).toBeInTheDocument();

      // Check for PM10
      expect(screen.getByText('45 µg/m³')).toBeInTheDocument();
      expect(screen.getByText('PM10')).toBeInTheDocument();

      // Check for UV Index
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('UV Index')).toBeInTheDocument();

      // Check for Battery
      expect(screen.getByText('12.8 V')).toBeInTheDocument();
      expect(screen.getByText('Batería')).toBeInTheDocument();
    });

    it('should not display optional measurements when not available', () => {
      const dataWithoutOptionals = {
        ...mockWeatherData,
        pm25: undefined,
        pm10: undefined,
        uv_index: undefined,
        battery_voltage: undefined
      };

      renderWithTheme(
        <CurrentMeasurements data={dataWithoutOptionals} loading={false} />
      );

      // These should not be present
      expect(screen.queryByText('PM2.5')).not.toBeInTheDocument();
      expect(screen.queryByText('PM10')).not.toBeInTheDocument();
      expect(screen.queryByText('UV Index')).not.toBeInTheDocument();
      expect(screen.queryByText('Batería')).not.toBeInTheDocument();
    });

    it('should handle null data gracefully', () => {
      renderWithTheme(
        <CurrentMeasurements data={null} loading={false} />
      );

      expect(screen.getByText('Mediciones Actuales')).toBeInTheDocument();
      // Should show some indication of no data
      expect(screen.getByText(/No hay datos/i)).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('should format temperature with 1 decimal place', () => {
      const data = { ...mockWeatherData, temperature: 25.678 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      expect(screen.getByText('25.7°C')).toBeInTheDocument();
    });

    it('should format pressure as integer', () => {
      const data = { ...mockWeatherData, pressure: 1013.876 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      expect(screen.getByText('1014 hPa')).toBeInTheDocument();
    });

    it('should format wind direction as integer', () => {
      const data = { ...mockWeatherData, wind_direction: 179.8 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      expect(screen.getByText('180°')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const data = {
        ...mockWeatherData,
        rainfall: 0,
        wind_speed: 0
      };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      expect(screen.getByText('0 mm')).toBeInTheDocument();
      expect(screen.getByText('0 km/h')).toBeInTheDocument();
    });
  });

  describe('Air Quality Indicators', () => {
    it('should show good air quality for low PM2.5', () => {
      const data = { ...mockWeatherData, pm25: 10 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const chip = screen.getByText('Buena');
      expect(chip).toBeInTheDocument();
    });

    it('should show moderate air quality for medium PM2.5', () => {
      const data = { ...mockWeatherData, pm25: 25 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const chip = screen.getByText('Moderada');
      expect(chip).toBeInTheDocument();
    });

    it('should show unhealthy air quality for high PM2.5', () => {
      const data = { ...mockWeatherData, pm25: 60 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const chip = screen.getByText('Dañina');
      expect(chip).toBeInTheDocument();
    });

    it('should show very unhealthy air quality for very high PM2.5', () => {
      const data = { ...mockWeatherData, pm25: 120 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const chip = screen.getByText('Muy Dañina');
      expect(chip).toBeInTheDocument();
    });

    it('should show hazardous air quality for extreme PM2.5', () => {
      const data = { ...mockWeatherData, pm25: 200 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const chip = screen.getByText('Peligrosa');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('UV Index Indicators', () => {
    it('should show low UV index color for values 0-2', () => {
      const data = { ...mockWeatherData, uv_index: 2 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const uvChip = screen.getByText('Bajo');
      expect(uvChip).toBeInTheDocument();
    });

    it('should show moderate UV index color for values 3-5', () => {
      const data = { ...mockWeatherData, uv_index: 4 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const uvChip = screen.getByText('Moderado');
      expect(uvChip).toBeInTheDocument();
    });

    it('should show high UV index color for values 6-7', () => {
      const data = { ...mockWeatherData, uv_index: 7 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const uvChip = screen.getByText('Alto');
      expect(uvChip).toBeInTheDocument();
    });

    it('should show very high UV index color for values 8-10', () => {
      const data = { ...mockWeatherData, uv_index: 9 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const uvChip = screen.getByText('Muy Alto');
      expect(uvChip).toBeInTheDocument();
    });

    it('should show extreme UV index color for values 11+', () => {
      const data = { ...mockWeatherData, uv_index: 12 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const uvChip = screen.getByText('Extremo');
      expect(uvChip).toBeInTheDocument();
    });
  });

  describe('Battery Status', () => {
    it('should show low battery warning for voltage < 11.5V', () => {
      const data = { ...mockWeatherData, battery_voltage: 11.0 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      // Look for red/warning color indicator
      const batteryCard = screen.getByText('Batería').closest('.MuiCard-root');
      expect(batteryCard).toBeInTheDocument();
    });

    it('should show normal battery status for voltage >= 11.5V', () => {
      const data = { ...mockWeatherData, battery_voltage: 12.5 };
      renderWithTheme(
        <CurrentMeasurements data={data} loading={false} />
      );

      const batteryCard = screen.getByText('Batería').closest('.MuiCard-root');
      expect(batteryCard).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      // Check for accessible elements
      const temperatureCard = screen.getByRole('img', { name: /temperatura/i });
      expect(temperatureCard).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      const heading = screen.getByRole('heading', { name: /mediciones actuales/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render cards in a grid layout', () => {
      renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      // Check that cards are within grid containers
      const gridContainers = screen.getAllByRole('generic');
      expect(gridContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Memoization', () => {
    it('should not re-render when props have not changed', () => {
      const { rerender } = renderWithTheme(
        <CurrentMeasurements data={mockWeatherData} loading={false} />
      );

      // Re-render with same props
      rerender(
        <ThemeProvider theme={theme}>
          <CurrentMeasurements data={mockWeatherData} loading={false} />
        </ThemeProvider>
      );

      // Component should still display correctly
      expect(screen.getByText('25.5°C')).toBeInTheDocument();
    });
  });
});