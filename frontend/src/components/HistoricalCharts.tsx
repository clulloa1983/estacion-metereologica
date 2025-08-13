import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Skeleton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { weatherService, WeatherDataPoint } from '../services/weatherService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface HistoricalChartsProps {
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
      id={`chart-tabpanel-${index}`}
      aria-labelledby={`chart-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const HistoricalCharts: React.FC<HistoricalChartsProps> = ({ stationId }) => {
  const [data, setData] = useState<WeatherDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedTab, setSelectedTab] = useState(0);

  const timeRangeOptions = [
    { value: '1h', label: 'Última hora' },
    { value: '6h', label: 'Últimas 6 horas' },
    { value: '24h', label: 'Último día' },
    { value: '7d', label: 'Última semana' },
    { value: '30d', label: 'Último mes' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const historicalData = await weatherService.getHistoricalData(stationId, timeRange);
        // Asegurar que historicalData sea un array
        setData(Array.isArray(historicalData) ? historicalData : []);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setData([]); // Asegurar que data sea un array en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stationId, timeRange]);

  const prepareChartData = (parameter: string, label: string, color: string) => {
    const labels = data.map(d => new Date(d.timestamp));
    const values = data.map(d => (d as any)[parameter] || 0);

    return {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'dd/MM'
          }
        }
      },
      y: {
        beginAtZero: false,
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  const airQualityData = {
    labels: data.map(d => new Date(d.timestamp)),
    datasets: [
      {
        label: 'CO Level (ppm)',
        data: data.map(d => d.co_level || 0),
        borderColor: '#f44336',
        backgroundColor: '#f4433620',
        yAxisID: 'y',
        tension: 0.1,
      },
      {
        label: 'PM2.5 (µg/m³)',
        data: data.map(d => d.dust_pm25 || 0),
        borderColor: '#2196f3',
        backgroundColor: '#2196f320',
        yAxisID: 'y1',
        tension: 0.1,
      }
    ]
  };

  const airQualityOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'CO Level (ppm)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'PM2.5 (µg/m³)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const signalData = {
    labels: data.map(d => new Date(d.timestamp)),
    datasets: [
      {
        label: 'Intensidad de Señal (dBm)',
        data: data.map(d => d.signal_strength || 0),
        borderColor: '#4caf50',
        backgroundColor: '#4caf5020',
        tension: 0.1,
      }
    ]
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Gráficos Históricos
          </Typography>
          <Skeleton variant="rectangular" height={400} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Gráficos Históricos
          </Typography>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Rango de tiempo</InputLabel>
            <Select
              value={timeRange}
              label="Rango de tiempo"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {timeRangeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab label="Temperatura" />
            <Tab label="Humedad" />
            <Tab label="Calidad del Aire" />
            <Tab label="Memoria y Uptime" />
            <Tab label="Señal" />
            <Tab label="Precipitación" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          <Box sx={{ height: 400 }}>
            <Line 
              data={prepareChartData('temperature', 'Temperatura (°C)', '#f44336')} 
              options={chartOptions} 
            />
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          <Box sx={{ height: 400 }}>
            <Line 
              data={prepareChartData('humidity', 'Humedad (%)', '#2196f3')} 
              options={chartOptions} 
            />
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          <Box sx={{ height: 400 }}>
            <Line data={airQualityData} options={airQualityOptions} />
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          <Box sx={{ height: 400 }}>
            <Line 
              data={prepareChartData('free_heap', 'Memoria Libre (bytes)', '#ff9800')} 
              options={chartOptions} 
            />
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          <Box sx={{ height: 400 }}>
            <Line data={signalData} options={chartOptions} />
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={5}>
          <Box sx={{ height: 400 }}>
            <Line 
              data={prepareChartData('rainfall', 'Precipitación (mm)', '#3f51b5')} 
              options={chartOptions} 
            />
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default HistoricalCharts;