# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IoT Weather Station system with Arduino/ESP32 hardware sensors that communicate via MQTT to a Node.js backend API, which stores data in InfluxDB time-series database with Grafana visualization.

**Architecture Flow**: Arduino/ESP32 → MQTT → Backend API → InfluxDB + Grafana Dashboard

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

### Service Access Points
- **InfluxDB UI**: http://localhost:8086 (admin/weather123)
- **Grafana Dashboard**: http://localhost:3000 (admin/grafana123) 
- **API Server**: http://localhost:5000
- **MQTT Broker**: localhost:1883

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
- Manages device status monitoring

**AlertService** (`src/services/alertService.js`):
- Evaluates sensor data against predefined thresholds
- Generates alerts with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Implements alert suppression to prevent spam

**InfluxDB Client** (`src/config/influxdb.js`):
- Provides `writeWeatherData()` and `writeAlert()` functions
- Uses Flux query language for data retrieval
- Handles time-series data with automatic field type detection

### API Endpoints Structure
- **Weather Data**: `/api/weather/*` - CRUD operations for sensor data
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

## Development Workflows

### Adding New Sensors
1. **Arduino**: Add sensor reading in `readAndSendData()` function
2. **Backend**: Update validation schema in `src/middleware/validation.js`  
3. **Database**: InfluxDB auto-creates fields, no schema changes needed
4. **Alerts**: Add threshold rules in `alertService.js` if needed

### Alert Rule Configuration
Alert rules are defined in `ALERT_RULES` array in `alertService.js`. Each rule specifies:
- Parameter name to monitor
- Condition function for threshold checking
- Severity level and alert message

### Environment Configuration
Backend requires `.env` file with:
- InfluxDB connection details (URL, token, org, bucket)
- MQTT broker configuration
- Rate limiting and logging preferences

Default Docker services are pre-configured with development credentials. Change these for production deployment.

## Key Integration Points

The system's core integration happens in `mqttService.js` where incoming MQTT messages are:
1. Parsed and validated
2. Written to InfluxDB via `writeWeatherData()`
3. Evaluated for alerts via `alertService.checkAlerts()`
4. Flushed to ensure data persistence

This creates the real-time pipeline from hardware sensors through to database storage and alert generation.