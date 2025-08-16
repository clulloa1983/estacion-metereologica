# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IoT Weather Station system with Arduino/ESP32 hardware sensors that communicate via MQTT to a Node.js backend API, which stores data in InfluxDB time-series database. The system includes both a custom React/Next.js frontend dashboard and Grafana visualization.

**Architecture Flow**: Arduino/ESP32 → MQTT → Backend API → InfluxDB → Frontend Dashboard + Grafana

**Current Status**: FULLY OPERATIONAL - All system components are running and collecting real-time weather data. Backend API is running on port 5002, frontend dashboard on port 3001, and ESP32_STATION_001 is actively sending weather data via MQTT every ~20 seconds. Complete data pipeline is functional.

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

# Create environment configuration
cp .env.example .env.local
# OR create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:5002/api

# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Service Access Points
- **Frontend Dashboard**: http://localhost:3001 (React/Next.js with TypeScript - ACTIVE)
- **Backend API**: http://localhost:5002/api (Node.js/Express - ACTIVE)
- **InfluxDB UI**: http://localhost:8086 (admin/weather123 - ACTIVE)
- **Grafana Dashboard**: http://localhost:3000 (admin/grafana123 - ACTIVE) 
- **MQTT Broker**: localhost:1883 (WebSocket: 9001 - ACTIVE)

**Current Port Status**: 
- Backend running on port 5002 (ACTIVE - health check passes)
- Frontend running on port 3001 (ACTIVE - auto-assigned, avoids Grafana port 3000)
- All Docker services running and accessible

### Port Configuration
The system uses the following ports:
- **Frontend (Next.js)**: 3001+ (auto-assigns available port, avoids 3000 used by Grafana)
- **Backend API**: 5002 (configured via PORT env var, changed from default 5000)
- **Grafana**: 3000 (Docker service)
- **InfluxDB**: 8086 (Docker service)
- **MQTT**: 1883 (Docker service, WebSocket: 9001)
- **Redis**: 6379 (Docker service)

### Docker Services Port Mapping
```yaml
# From docker-compose.yml
influxdb: 8086:8086
grafana: 3000:3000  
redis: 6379:6379
mosquitto: 1883:1883, 9001:9001
```

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

**Main Server** (`src/index.js`):
- Express.js server with middleware for security, logging, and rate limiting
- Health check endpoint at `/health`
- Graceful shutdown handling for SIGTERM/SIGINT
- Currently configured for port 5002 (changed from default 5000)

**MQTTService** (`src/services/mqttService.js`): 
- Handles MQTT broker connection and message routing
- Processes incoming sensor data and forwards to InfluxDB
- Validates timestamps from Arduino (handles millis() vs real timestamps)
- Manages device status monitoring
- Currently receiving real-time data from ESP32_STATION_001 every ~20 seconds

**AlertService** (`src/services/alertService.js`):
- Evaluates sensor data against predefined thresholds
- Generates alerts with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Implements alert suppression to prevent spam

**InfluxDB Client** (`src/config/influxdb.js`):
- Provides `writeWeatherData()` and `writeAlert()` functions
- Uses Flux query language for data retrieval
- Handles time-series data with automatic field type detection
- Automatically converts Arduino millis() timestamps to server time

### Frontend Architecture

**React/Next.js Dashboard** (`frontend/src/`):
- **Technology Stack**: Next.js 15.4.6, React 19.1.1, TypeScript 5.9.2, Material-UI 7.3.1
- **Pages**: Main dashboard page (`pages/index.tsx`)
- **Components**: Modular UI components for different dashboard sections
  - `CurrentMeasurements.tsx`: Real-time sensor readings display
  - `HistoricalCharts.tsx`: Time-series data visualization with Chart.js
  - `SystemStatus.tsx`: Device status and connectivity monitoring
  - `AlertsPanel.tsx`: Alert management interface
  - `WeatherMap.tsx`: Geographic data visualization (currently has rendering issues)
  - `WeatherMapClient.tsx`: Client-side map component (referenced but may be missing)
- **Services**: API communication layer
  - `weatherService.ts`: Backend API client with TypeScript interfaces
  - `socketService.ts`: WebSocket communication (placeholder)

**Frontend Implementation Status**:
- ✅ WeatherMapClient component properly implemented with Leaflet integration
- ✅ Dynamic import with SSR disabled for map components  
- ✅ Material-UI 7.3.1 components working correctly
- ✅ Frontend dashboard fully operational on port 3001
- ⚠️ Minor viewport meta warning in _document.js (non-critical)
- ✅ Real-time data updates working (30-second polling)

### API Endpoints Structure
- **Weather Data**: `/api/weather/*` - CRUD operations for sensor data
  - `GET /api/weather/data/:stationId/latest` - Current readings (actively used)
  - `GET /api/weather/data/:stationId?timeRange=30m` - Historical data (actively used)
  - `GET /api/weather/data/:stationId/summary` - Statistical summaries
  - `GET /api/weather/stations` - List all stations
  - `POST /api/weather/data` - Receive sensor data (MQTT integration)
  - `GET /api/weather/export/:stationId` - Data export in CSV/JSON
- **Alerts**: `/api/alerts/*` - Alert management and querying
  - `GET /api/alerts/:stationId` - Station-specific alerts (actively used)
  - `GET /api/alerts/summary/:stationId` - Alert summary statistics (actively used)
  - `POST /api/alerts` - Create new alert
  - `PUT /api/alerts/:alertId/acknowledge` - Acknowledge alert
- **Health**: `/health` - API health check

## Arduino/ESP32 Integration

### Current Station Status
- **ESP32_STATION_001**: ACTIVE and transmitting data every ~20 seconds
- **Data Flow**: Arduino → MQTT → Backend → InfluxDB (FULLY OPERATIONAL)
- **Sensor Data**: Temperature, humidity, pressure, wind speed/direction, rainfall
- **Connection Status**: Stable MQTT connection with regular status updates

### Hardware Files Location
- **Arduino Code**: `arduino/weather_station_wemos/weather_station_wemos.ino`
- **Documentation**: `arduino/weather_station_wemos/README.md`
- **Sensor Guide**: `arduino/sensores-microcontroladores.md`

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
- `PORT=5002` - Backend server port (configured)
- InfluxDB connection details (URL, token, org, bucket)
- MQTT broker configuration
- Rate limiting and logging preferences

**Frontend** requires `.env.local` file with:
- `NEXT_PUBLIC_API_URL=http://localhost:5002/api` - Backend API URL (required for API calls)
- `NODE_ENV=development` - Environment mode

**IMPORTANT**: Frontend MUST have `.env.local` file or API calls will fail with "Failed to fetch" errors.

**Docker Services Configuration**:
- All services defined in `docker-compose.yml`
- Default development credentials (change for production)
- Network: `weather-network` bridge for service communication
- Volumes: Persistent data storage for InfluxDB, Grafana, Redis, and MQTT

## Key Integration Points

The system's core integration happens in `mqttService.js` where incoming MQTT messages are:
1. Parsed and validated (including timestamp correction)
2. Written to InfluxDB via `writeWeatherData()`
3. Evaluated for alerts via `alertService.checkAlerts()`
4. Flushed to ensure data persistence

This creates the real-time pipeline from hardware sensors through to database storage and alert generation.

## Common Development Tasks

### System Status Check
- **Backend Health**: `curl http://localhost:5002/health` ✅ ACTIVE
- **Latest Data**: `curl http://localhost:5002/api/weather/data/ESP32_STATION_001/latest` ✅ RECEIVING DATA
- **MQTT Activity**: Check backend logs for "Weather data stored" messages ✅ ACTIVE (~20s intervals)
- **Frontend Status**: http://localhost:3001 ✅ ACTIVE 
- **Docker Services**: `docker ps` to check running containers ✅ ALL RUNNING

### Troubleshooting Data Issues
1. **Check MQTT messages**: `docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/data/+" -v`
2. **Clear InfluxDB data**: `docker exec weather_influxdb influx delete --bucket weather-data --start 1970-01-01T00:00:00Z --stop 2025-12-31T23:59:59Z --org weather-station --token weather-station-token-12345`
3. **Check API health**: `curl http://localhost:5002/health`
4. **Test latest data**: `curl http://localhost:5002/api/weather/data/ESP32_STATION_001/latest`

### System Startup Checklist ✅ COMPLETED
1. **Start Docker Services**: `docker-compose up -d` ✅ RUNNING (InfluxDB, Grafana, MQTT, Redis)
2. **Start Backend**: `cd backend && npm run dev` ✅ RUNNING (port 5002)
3. **Start Frontend**: `cd frontend && npm run dev` ✅ RUNNING (port 3001)
4. **Verify Services**: ✅ ALL SERVICES OPERATIONAL - ESP32 sending data every ~20 seconds

### Port Conflicts Resolution
If ports are in use:
1. **Check running processes**: `netstat -ano | findstr :5002` (backend) or `netstat -ano | findstr :3000` (frontend)
2. **Kill conflicting process**: `cmd /c "taskkill /F /PID <process_id>"`
3. **Or change port**: Update `PORT` in `backend/.env` and `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

**Frontend Port Auto-Assignment**: Next.js automatically assigns available ports (3001, 3002, etc.) avoiding 3000 used by Grafana. Check console output for actual port used.

### Dashboard Development
- **Historical Charts**: Default shows last 30 minutes (`timeRange=30m`)
- **Real-time Updates**: Frontend polls every 60 seconds
- **Material-UI**: Used for consistent styling across components
- **Chart.js**: Used for time-series data visualization

### Common Gotchas
1. **Missing .env.local**: Frontend MUST have `.env.local` with `NEXT_PUBLIC_API_URL` or API calls fail
2. **Timestamp Issues**: Arduino sends `millis()` not real timestamps - backend handles this automatically
3. **Port Mismatches**: Frontend auto-assigns ports, check console for actual port used
4. **Data Persistence**: Always call `flushWrites()` after `writeWeatherData()`
5. **CORS Issues**: Backend enables CORS for frontend development
6. **Docker Port Conflicts**: Grafana (3000) may conflict with Next.js default port
7. **SSR Issues**: Use dynamic imports for client-side only components (like maps)
8. **Material-UI Versions**: Check for breaking changes between v4/v5 and current v7 syntax