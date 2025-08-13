# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IoT Weather Station system with Arduino/ESP32 hardware sensors that communicate via MQTT to a Node.js backend API, which stores data in InfluxDB time-series database. The system includes both a custom React/Next.js frontend dashboard and Grafana visualization.

**Architecture Flow**: Arduino/ESP32 → MQTT → Backend API → InfluxDB → Frontend Dashboard + Grafana

## System Components

1. **Hardware**: Arduino/ESP32 with sensors (DHT22, BMP280, etc.)
2. **Backend**: Node.js/Express API with MQTT integration
3. **Frontend**: React/Next.js dashboard with real-time data visualization
4. **Database**: InfluxDB for time-series data storage
5. **Infrastructure**: Docker services (InfluxDB, Grafana, MQTT, Redis)

## Development Commands

### Infrastructure (Docker)
```bash
# Start all services (InfluxDB, Grafana, MQTT, Redis)
docker-compose up -d

# Stop all services
docker-compose down

# View logs from all services
docker-compose logs -f

# Restart specific service
docker-compose restart influxdb
```

### Backend API Development
```bash
cd backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Service Access Points
- **Frontend Dashboard**: http://localhost:3002 (React/Next.js)
- **Backend API**: http://localhost:5001/api
- **InfluxDB UI**: http://localhost:8086 (admin/weather123)
- **Grafana Dashboard**: http://localhost:3000 (admin/grafana123) 
- **MQTT Broker**: localhost:1883

### Port Configuration
The system uses the following ports:
- **Frontend (Next.js)**: 3002 (auto-assigned if 3000 is busy)
- **Backend API**: 5001 (configurable via PORT env var)
- **Grafana**: 3000
- **InfluxDB**: 8086
- **MQTT**: 1883
- **Redis**: 6379

## Architecture & Data Flow

### MQTT Topics Structure
- `weather/data/{stationId}` - Sensor data from Arduino
- `weather/status/{stationId}` - Device status and health
- `weather/alerts/{stationId}` - Alert notifications
- `weather/command/{stationId}` - Remote commands to devices

### InfluxDB Schema
Two main measurements:
- **weather**: Time-series sensor data (temperature, humidity, pressure, wind_speed, etc.)
- **alerts**: Alert records with severity levels and acknowledgment status

Data points use `station_id` as primary tag for device identification.

### Backend Services Architecture

**MQTTService** (`src/services/mqttService.js`): 
- Handles MQTT broker connection and message routing
- Processes incoming sensor data and forwards to InfluxDB
- Validates timestamps from Arduino (handles millis() vs real timestamps)
- Manages device status monitoring

**AlertService** (`src/services/alertService.js`):
- Evaluates sensor data against predefined thresholds
- Generates alerts with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Implements alert suppression to prevent spam

**InfluxDB Client** (`src/config/influxdb.js`):
- Provides `writeWeatherData()` and `writeAlert()` functions
- Uses Flux query language for data retrieval
- Handles time-series data with automatic field type detection

### Frontend Architecture

**React/Next.js Dashboard** (`frontend/src/`):
- **Pages**: Main dashboard page (`pages/index.tsx`)
- **Components**: Modular UI components for different dashboard sections
  - `CurrentMeasurements.tsx`: Real-time sensor readings display
  - `HistoricalCharts.tsx`: Time-series data visualization with Chart.js
  - `SystemStatus.tsx`: Device status and connectivity monitoring
  - `AlertsPanel.tsx`: Alert management interface
  - `WeatherMap.tsx`: Geographic data visualization
- **Services**: API communication layer
  - `weatherService.ts`: Backend API client
  - `socketService.ts`: WebSocket communication (placeholder)

### API Endpoints Structure
- **Weather Data**: `/api/weather/*` - CRUD operations for sensor data
  - `GET /api/weather/data/:stationId/latest` - Current readings
  - `GET /api/weather/data/:stationId?timeRange=30m` - Historical data
  - `POST /api/weather/data` - Receive sensor data
- **Alerts**: `/api/alerts/*` - Alert management and querying
- **Export**: `/api/weather/export/:stationId` - Data export in CSV/JSON

## Arduino/ESP32 Integration

### Sensor Configuration
The ESP32 code handles multiple sensors with interrupt-based wind/rain measurement:
- DHT22: Temperature/humidity on GPIO 4
- BMP280: Pressure via I2C (GPIO 21/22)  
- Anemometer: Pulse counting on GPIO 2
- Rain gauge: Pulse counting on GPIO 3
- Wind vane: Analog reading on A0

### Calibration System
Sensor readings use calibration factors defined in `CalibrationFactors` struct. Modify these values for field calibration without code changes.

### Power Management
ESP32 supports remote sleep commands via MQTT for battery optimization in remote deployments.

### Timestamp Handling
**Important**: Arduino sends `millis()` as timestamp (uptime in milliseconds), but backend automatically converts invalid timestamps to server time to ensure proper time-series data storage.

## Development Workflows

### Adding New Sensors
1. **Arduino**: Add sensor reading in `readAndSendData()` function
2. **Backend**: Update validation schema in `src/middleware/validation.js`  
3. **Frontend**: Add visualization in appropriate dashboard component
4. **Database**: InfluxDB auto-creates fields, no schema changes needed
5. **Alerts**: Add threshold rules in `alertService.js` if needed

### Adding Frontend Components
1. Create new component in `frontend/src/components/`
2. Import and use in main dashboard (`pages/index.tsx`)
3. Add API calls via `weatherService.ts` if needed
4. Style with Material-UI components for consistency

### Alert Rule Configuration
Alert rules are defined in `ALERT_RULES` array in `alertService.js`. Each rule specifies:
- Parameter name to monitor
- Condition function for threshold checking
- Severity level and alert message

### Environment Configuration

**Backend** requires `.env` file with:
- `PORT=5001` - Backend server port
- InfluxDB connection details (URL, token, org, bucket)
- MQTT broker configuration
- Rate limiting and logging preferences

**Frontend** uses environment variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL (defaults to http://localhost:5001/api)

Default Docker services are pre-configured with development credentials. Change these for production deployment.

## Key Integration Points

The system's core integration happens in `mqttService.js` where incoming MQTT messages are:
1. Parsed and validated (including timestamp correction)
2. Written to InfluxDB via `writeWeatherData()`
3. Evaluated for alerts via `alertService.checkAlerts()`
4. Flushed to ensure data persistence

This creates the real-time pipeline from hardware sensors through to database storage and alert generation.

## Common Development Tasks

### Troubleshooting Data Issues
1. **Check MQTT messages**: `docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/data/+" -v`
2. **Clear InfluxDB data**: `docker exec weather_influxdb influx delete --bucket weather-data --start 1970-01-01T00:00:00Z --stop 2025-12-31T23:59:59Z --org weather-station --token weather-station-token-12345`
3. **Check API health**: `curl http://localhost:5001/health`
4. **Test latest data**: `curl http://localhost:5001/api/weather/data/WEMOS_STATION_001/latest`

### Port Conflicts Resolution
If ports are in use:
1. **Check running processes**: `netstat -ano | findstr :5001`
2. **Kill conflicting process**: `taskkill /F /PID <process_id>`
3. **Or change port**: Update `PORT` in `backend/.env` and `API_BASE_URL` in `frontend/src/services/weatherService.ts`

### Dashboard Development
- **Historical Charts**: Default shows last 30 minutes (`timeRange=30m`)
- **Real-time Updates**: Frontend polls every 60 seconds
- **Material-UI**: Used for consistent styling across components
- **Chart.js**: Used for time-series data visualization

### Common Gotchas
1. **Timestamp Issues**: Arduino sends `millis()` not real timestamps - backend handles this automatically
2. **Port Mismatches**: Ensure frontend `weatherService.ts` points to correct backend port
3. **Data Persistence**: Always call `flushWrites()` after `writeWeatherData()`
4. **CORS Issues**: Backend enables CORS for frontend development