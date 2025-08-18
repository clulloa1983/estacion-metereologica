# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IoT Weather Station system with Arduino/ESP32 hardware sensors that communicate via MQTT to a Node.js backend API, which stores data in InfluxDB time-series database. The system includes both a custom React/Next.js frontend dashboard and Grafana visualization.

**Architecture Flow**: Arduino/ESP32 → MQTT → Backend API → InfluxDB → Frontend Dashboard + Grafana

**Current Status**: SYSTEM FULLY OPERATIONAL & PRODUCTION-READY ARCHITECTURE - All components integrated and tested. Backend API (port 5002) with comprehensive middleware stack, frontend (port 3001+) with TypeScript and Material-UI 7.3.1, ESP32 DevKit V1 with WiFiManager and 8 sensors, Docker services with health checks. Authentication, caching, and WebSocket systems implemented and ready for activation. Requires only production security configuration for deployment.

## System Components

1. **Hardware**: ESP32 DevKit V1 with 8 environmental sensors and WiFiManager
2. **Backend**: Node.js/Express API with comprehensive middleware, authentication, and monitoring
3. **Frontend**: React 19/Next.js 15 with TypeScript, Material-UI 7.3.1, and theme support
4. **Database**: InfluxDB 2.7 for time-series data with automated field detection
5. **Infrastructure**: Docker Compose with health checks (InfluxDB, Grafana, MQTT, Redis)
6. **Testing**: Jest framework for both backend and frontend with coverage reporting
7. **Documentation**: Swagger/OpenAPI automatic API documentation
8. **Monitoring**: Winston logging with multiple transport levels

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
- Backend configured for port 5002 (UNIFIED - all env files updated)
- Frontend auto-assigns port 3001+ (avoids Grafana port 3000 conflict)
- All environment files synchronized and conflict-free
- Docker services using standard ports (no changes needed)

### Port Configuration
The system uses the following ports (✅ ALL UNIFIED):
- **Frontend (Next.js)**: 3001+ (auto-assigns available port, avoids 3000 used by Grafana)
- **Backend API**: 5002 (STANDARDIZED - all .env files updated to 5002)
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
- Express.js 4.18.2 server with comprehensive middleware stack
- Health check endpoint with detailed service status
- Graceful shutdown handling for SIGTERM/SIGINT
- Configured for port 5002 (unified across all environments)
- **Core Dependencies**: Express ^4.18.2, Helmet ^7.0.0, Compression ^1.7.4, CORS ^2.8.5
- **Security**: Rate limiting, JWT authentication, input validation
- **Documentation**: Swagger/OpenAPI auto-generated docs
- **Logging**: Winston with multiple log levels and file rotation

**MQTTService** (`src/services/mqttService.js`): 
- Handles MQTT broker connection and message routing
- Processes incoming sensor data and forwards to InfluxDB
- Validates timestamps from Arduino (handles millis() vs real timestamps)
- Manages device status monitoring
- Currently receiving real-time data from ESP32_STATION_001 every ~60 seconds
- **Dependencies**: MQTT ^5.0.5

**AlertService** (`src/services/alertService.js`):
- Evaluates sensor data against predefined thresholds
- Generates alerts with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Implements alert suppression to prevent spam

**CacheService** (`src/services/cacheService.js`):
- Redis integration for performance optimization
- **Dependencies**: Redis ^4.6.8

**MonitoringService** (`src/services/monitoringService.js`):
- System health monitoring and metrics collection

**SocketService** (`src/services/socketService.js`):
- WebSocket server implementation for real-time updates
- **Dependencies**: Socket.IO ^4.8.1

**InfluxDB Client** (`src/config/influxdb.js`):
- Provides `writeWeatherData()` and `writeAlert()` functions
- Uses Flux query language for data retrieval
- Handles time-series data with automatic field type detection
- Automatically converts Arduino millis() timestamps to server time
- **Dependencies**: @influxdata/influxdb-client ^1.33.2

### Frontend Architecture

**React/Next.js Dashboard** (`frontend/src/`):
- **Technology Stack**: Next.js ^15.4.6, React ^19.1.1, TypeScript ^5.9.2, Material-UI ^7.3.1
- **Pages**: Main dashboard page (`pages/index.tsx`) with TypeScript support
- **Components**: Modular UI components for different dashboard sections
  - `CurrentMeasurements.tsx`: Real-time sensor readings display with Material-UI cards
  - `HistoricalCharts.tsx`: Time-series data visualization with Chart.js ^4.5.0
  - `SystemStatus.tsx`: Device status and connectivity monitoring
  - `AlertsPanel.tsx`: Alert management interface with acknowledgment features
  - `WeatherMap.tsx`: Geographic data visualization with Leaflet integration
  - `WeatherMapClient.tsx`: Client-side map component with SSR disabled
- **Services**: API communication layer
  - `weatherService.ts`: Backend API client with TypeScript interfaces
  - `socketService.ts`: WebSocket communication (configured for port 5002)
- **Additional Dependencies**: 
  - Chart.js ^4.5.0 with chartjs-adapter-date-fns ^3.0.0
  - Leaflet ^1.9.4 with react-leaflet ^5.0.0
  - Socket.IO Client ^4.8.1
  - Day.js ^1.11.13 for date handling
  - MUI X Date Pickers ^8.10.0

**Frontend Implementation Status**:
- ✅ WeatherMapClient component with Leaflet 1.9.4 integration
- ✅ Dynamic import with SSR disabled for client-side components
- ✅ Material-UI 7.3.1 with @emotion/react styling
- ✅ Theme toggle functionality (dark/light mode)
- ✅ TypeScript 5.9.2 with strict type checking
- ✅ Chart.js 4.5.0 for time-series visualizations
- ✅ Day.js 1.11.13 for date/time manipulation
- ✅ Socket.IO Client 4.8.1 ready for real-time updates
- ✅ Frontend dashboard fully operational on auto-assigned port 3001+
- ✅ Real-time data updates with configurable polling intervals

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
- **Authentication**: `/api/auth/*` - User authentication (configured)
- **Monitoring**: `/api/monitoring/*` - System monitoring endpoints
- **Health**: `/health` - API health check with detailed status
- **API Documentation**: Swagger/OpenAPI documentation configured (swagger-jsdoc ^6.2.8, swagger-ui-express ^5.0.1)

## Arduino/ESP32 Integration

### Current Station Status
- **ESP32_STATION_001**: ACTIVE and transmitting comprehensive sensor data every ~60 seconds
- **Data Flow**: ESP32 → MQTT → Backend → InfluxDB (FULLY OPERATIONAL)
- **Sensor Data**: Temperature, humidity, pressure, light, rainfall, CO levels, air quality, PM2.5
- **Connection Status**: Stable MQTT connection with WiFiManager dynamic configuration
- **Power Management**: Deep sleep support for battery-powered deployments
- **Configuration**: NVS storage for persistent settings

### Hardware Files Location
- **Arduino Code**: `arduino/weather_station_esp32/weather_station_esp32.ino`
- **Documentation**: `arduino/weather_station_wemos/README.md` (legacy)
- **Sensor Guide**: `arduino/sensores-microcontroladores.md`

### Sensor Configuration
The ESP32 DevKit V1 code handles 8 environmental sensors with comprehensive monitoring:
- **DHT22**: Temperature/humidity sensor on GPIO 4 (OneWire protocol)
- **BMP085**: Barometric pressure via I2C (GPIO 21/22 - SDA/SCL)
- **Rain Sensor (MH-RD)**: Digital (GPIO 2) and Analog (GPIO 34) dual-mode detection
- **MQ7**: Carbon monoxide sensor on GPIO 36 (ADC1_CH0, 12-bit resolution)
- **MQ135**: Air quality sensor (digital) on GPIO 12
- **DSM501A**: PM2.5 dust particle sensor on GPIO 13 (PWM measurement)
- **BH1750**: Light intensity sensor via I2C (GPIO 21/22, shared bus)
- **WiFiManager**: Dynamic WiFi configuration portal with fallback AP mode
- **Preferences**: NVS storage for MQTT settings and calibration factors
- **Calibration System**: Runtime adjustable sensor calibration without code changes

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
- **Backend Health**: `curl http://localhost:5002/health` ✅ CONFIGURED
- **Latest Data**: `curl http://localhost:5002/api/weather/data/ESP32_STATION_001/latest` ✅ READY
- **MQTT Activity**: Check backend logs for "Weather data stored" messages ✅ READY
- **Frontend Status**: http://localhost:3001+ ✅ CONFIGURED
- **Docker Services**: `docker ps` to check running containers ✅ READY

### Troubleshooting Data Issues
1. **Check MQTT messages**: `docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/data/+" -v`
2. **Clear InfluxDB data**: `docker exec weather_influxdb influx delete --bucket weather-data --start 1970-01-01T00:00:00Z --stop 2025-12-31T23:59:59Z --org weather-station --token weather-station-token-12345`
3. **Check API health**: `curl http://localhost:5002/health`
4. **Test latest data**: `curl http://localhost:5002/api/weather/data/ESP32_STATION_001/latest`

### System Startup Checklist ✅ PORT-CONFIGURED
1. **Start Docker Services**: `docker-compose up -d` ✅ CONFIGURED (InfluxDB, Grafana, MQTT, Redis)
2. **Start Backend**: `cd backend && npm run dev` ✅ CONFIGURED (port 5002 - unified)
3. **Start Frontend**: `cd frontend && npm run dev` ✅ CONFIGURED (port 3001+ auto-assign)
4. **Verify Services**: ✅ ALL ENVIRONMENTS SYNCHRONIZED - No port conflicts

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
2. **Timestamp Issues**: ESP32 sends `millis()` not real timestamps - backend handles this automatically
3. **Port Mismatches**: ✅ RESOLVED - All environment files synchronized to port 5002
4. **Data Persistence**: Always call `flushWrites()` after `writeWeatherData()`
5. **CORS Issues**: Backend enables CORS for frontend development
6. **Docker Port Conflicts**: ✅ RESOLVED - Frontend auto-assigns ports to avoid Grafana (3000)
7. **SSR Issues**: Use dynamic imports for client-side only components (like maps)
8. **Material-UI v7**: Check for breaking changes from v4/v5, use @emotion/react styling
9. **TypeScript Strict Mode**: All components and services use strict TypeScript checking
10. **Theme Context**: Components must be wrapped in ThemeProvider for dark/light mode
11. **Chart.js Adapters**: Date handling requires chartjs-adapter-date-fns
12. **Test Environment**: Jest requires jsdom environment for frontend component testing

### Port Configuration Summary ✅ UPDATED
**Environment Files Synchronized:**
- `backend/.env`: PORT=5002, InfluxDB, MQTT, Redis, JWT configured ✅
- `backend/.env.example`: PORT=5002 template ✅
- `frontend/.env.local`: NEXT_PUBLIC_API_URL=http://localhost:5002/api ✅
- `frontend/.env.example`: Updated with port 5002 ✅
- `frontend/src/services/socketService.ts`: Default URL updated to port 5002 ✅
- `frontend/README.md`: Documentation updated ✅

**No Port Conflicts:** The system is now fully configured without any port interference between services.

### Test Infrastructure
**Backend Testing:**
- Jest ^29.6.2 with comprehensive test configuration
- Supertest ^6.3.3 for API endpoint testing
- Test structure: `tests/services/` and `tests/integration/`
- Coverage reporting with multiple output formats
- CI/CD ready test scripts (`npm run test:ci`)

**Frontend Testing:**
- Jest ^29.7.0 with jsdom environment
- React Testing Library ^14.1.2 for component testing
- Testing Library Jest DOM ^6.1.4 for DOM assertions
- @testing-library/user-event ^14.5.1 for interaction testing
- Component tests in `src/components/__tests__/`
- Service tests in `src/services/__tests__/`
- Type checking integration with TypeScript
- Test scripts for unit, component, and service testing

### Development & Production Considerations
**Production-Ready Features:**
- ✅ Authentication system (JWT + bcryptjs) implemented and configurable
- ✅ Redis cache service available with client configuration
- ✅ WebSocket service (Socket.IO) implemented and ready for activation
- ✅ Security middleware stack (Helmet, CORS, rate limiting)
- ✅ ESP32 WiFiManager with NVS persistent storage
- ✅ Docker health checks for all services
- ✅ Comprehensive logging with Winston
- ✅ API documentation with Swagger/OpenAPI
- ✅ Testing framework with coverage reporting

**Deployment Considerations:**
- 🔒 SSL/TLS certificates for production endpoints
- 🔑 Environment-specific JWT secrets and tokens
- 📊 Production monitoring and alerting configuration
- 🗄️ Database backup and retention policies
- 🌐 Load balancing for horizontal scaling
- 🔐 Network security and firewall configuration