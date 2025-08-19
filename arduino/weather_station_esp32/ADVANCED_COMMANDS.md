# ESP32 Weather Station - Advanced MQTT Commands

## Overview

This document describes the enhanced MQTT command system implemented in **FASE 3: ESP32 - COMANDOS AVANZADOS**. The ESP32 weather station now supports comprehensive remote configuration with security validation and automatic rollback mechanisms.

## Command Structure

All commands follow this JSON structure:
```json
{
  "command": "command_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

Commands are sent to topic: `weather/command/{station_id}`
Responses are received on topics: `weather/status/{station_id}` and `weather/logs/{station_id}`

## Available Commands

### 1. Basic Commands

#### Status Check
```json
{"command": "status"}
```
Returns current system status and sensor availability.

#### System Restart
```json
{"command": "restart"}
```
Performs immediate ESP32 restart.

#### Sensor Discovery
```json
{"command": "sensor_check"}
```
Re-initializes and reports available sensors.

### 2. Reading Interval Control

#### Set Reading Interval
```json
{
  "command": "set_reading_interval",
  "parameters": {
    "interval_ms": 120000
  }
}
```
- **Range**: 30,000ms (30s) to 3,600,000ms (1h)
- **Default**: 60,000ms (1min)
- **Validation**: Automatic rollback if out of range

### 3. Sensor Management

#### Toggle Individual Sensors
```json
{
  "command": "toggle_sensor",
  "parameters": {
    "sensor": "sensor_name",
    "enabled": true/false
  }
}
```

**Supported Sensors:**
- `dht22` - Temperature & Humidity sensor
- `bmp180` or `bmp085` - Pressure sensor
- `bh1750` or `light` - Light intensity sensor
- `rain` or `mh_rd` - Rain sensor (MH-RD)
- `mq7` or `co` - Carbon monoxide sensor
- `mq135` or `air_quality` - Air quality sensor
- `dsm501a` or `dust` - Dust particle sensor

**Examples:**
```json
{"command": "toggle_sensor", "parameters": {"sensor": "dht22", "enabled": false}}
{"command": "toggle_sensor", "parameters": {"sensor": "light", "enabled": true}}
```

### 4. Calibration System

#### Set Sensor Calibration
```json
{
  "command": "set_calibration",
  "parameters": {
    "sensor": "sensor_name",
    "offset": -2.5,
    "scale": 1.2
  }
}
```

**Calibration Parameters:**

| Sensor | Offset Range | Scale Range | Description |
|--------|-------------|------------|-------------|
| `temperature` | -10.0 to 10.0°C | 0.5 to 2.0 | Temperature adjustment |
| `humidity` | -20.0 to 20.0% | N/A | Humidity offset |
| `pressure` | -50.0 to 50.0 hPa | N/A | Pressure offset |
| `light` | -1000 to 1000 lux | 0.1 to 10.0 | Light calibration |
| `rain` | 0.1 to 2.0 mm/pulse | N/A | Rain factor |
| `mq7` | -5.0 to 5.0V | N/A | CO sensor offset |
| `mq135` | -5.0 to 5.0V | N/A | Air quality offset |

**Examples:**
```json
{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -2.5}}
{"command": "set_calibration", "parameters": {"sensor": "light", "offset": 10.0, "scale": 1.2}}
```

### 5. Alert Threshold Configuration

#### Set Alert Thresholds
```json
{
  "command": "set_alert_threshold",
  "parameters": {
    "parameter": "temperature",
    "min": 5.0,
    "max": 35.0,
    "enabled": true
  }
}
```

**Threshold Parameters:**

| Parameter | Min Range | Max Range | Description |
|-----------|-----------|-----------|-------------|
| `temperature` | -50.0 to 50.0°C | -40.0 to 70.0°C | Temperature alerts |
| `humidity` | 0.0 to 90.0% | 10.0 to 100.0% | Humidity alerts |
| `pressure` | 800.0 to 1100.0 hPa | 900.0 to 1200.0 hPa | Pressure alerts |

**Examples:**
```json
{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "min": 0.0, "max": 40.0}}
{"command": "set_alert_threshold", "parameters": {"parameter": "humidity", "max": 85.0}}
{"command": "set_alert_threshold", "parameters": {"parameter": "pressure", "enabled": false}}
```

### 6. Power Management

#### Sleep Mode Control
```json
{
  "command": "sleep_mode",
  "enabled": true,
  "interval_ms": 300000
}
```
- **enabled**: Enable/disable deep sleep mode
- **interval_ms**: Sleep duration (30s to 1h)

#### Wake Up
```json
{"command": "wake_up"}
```
Immediately disables deep sleep mode.

### 7. Connectivity Configuration

#### WiFi Configuration
```json
{
  "command": "wifi_config",
  "parameters": {
    "ssid": "New_Network",
    "password": "new_password123"
  }
}
```
- **SSID**: 1-32 characters
- **Password**: 8-64 characters
- **Security**: Automatic rollback if connection fails

### 8. System Maintenance

#### Factory Reset
```json
{"command": "factory_reset"}
```
⚠️ **WARNING**: Clears all stored configuration and restarts ESP32.

## Security Features

### 1. Command Validation
- All commands validated against whitelist
- Parameter ranges strictly enforced
- JSON structure validation

### 2. Automatic Rollback
- Configuration backed up before changes
- Automatic restoration on validation failure
- Network connectivity preservation

### 3. Parameter Bounds
- All numeric parameters have safety limits
- String parameters have length validation
- Boolean parameters type-checked

### 4. Logging System
- All command executions logged
- Success/failure status tracked
- Audit trail via MQTT logs topic

## Response Messages

### Status Responses
Sent to `weather/status/{station_id}`:
```json
{
  "station_id": "ESP32_STATION_001",
  "status": "online",
  "timestamp": "12345",
  "uptime": 3600,
  "signal_strength": -45,
  "free_heap": 245760,
  "sensors": {
    "dht22": true,
    "bmp180": false,
    "bh1750": true,
    "mh_rd": true,
    "mq7": false,
    "mq135": false,
    "dsm501a": false
  }
}
```

### Log Responses
Sent to `weather/logs/{station_id}`:
```json
{
  "station_id": "ESP32_STATION_001",
  "command": "set_reading_interval",
  "success": true,
  "timestamp": "12345",
  "uptime": 3600
}
```

### Error Messages
Common error status values:
- `command_validation_failed` - Invalid command structure
- `invalid_interval_range` - Reading interval out of bounds
- `unknown_sensor` - Unsupported sensor name
- `calibration_error` - Calibration value out of range
- `threshold_error` - Alert threshold invalid
- `wifi_update_failed` - WiFi connection failed
- `unknown_command` - Command not recognized

## Testing

### Automated Testing
Three test scripts are provided:

1. **Python Script**: `test_mqtt_commands.py`
   - Comprehensive test suite
   - Automatic result analysis
   - Requires: `pip install paho-mqtt`

2. **Bash Script**: `test_commands.sh`
   - Linux/macOS compatible
   - Uses mosquitto-clients
   - Manual result review

3. **Windows Batch**: `test_commands.bat`
   - Windows compatible
   - Uses Docker MQTT tools
   - Manual result review

### Manual Testing
Use MQTT client to send commands:
```bash
# Example using mosquitto_pub
mosquitto_pub -h localhost -t weather/command/ESP32_STATION_001 \
  -m '{"command": "status"}'

# Monitor responses
mosquitto_sub -h localhost -t "weather/+/ESP32_STATION_001"
```

## Configuration Persistence

All configuration changes are automatically saved to ESP32 NVS (Non-Volatile Storage):
- Reading intervals
- Sensor enable/disable states
- Calibration factors
- Alert thresholds
- Power management settings

Configuration survives:
- Power cycles
- Deep sleep modes
- System restarts
- Firmware updates (if NVS partition preserved)

## Best Practices

### 1. Gradual Configuration Changes
- Test one parameter at a time
- Monitor system stability after changes
- Use status checks to verify changes

### 2. Backup Important Settings
- Document working configurations
- Test rollback mechanisms
- Keep factory reset as last resort

### 3. Network Stability
- Ensure stable WiFi before WiFi config changes
- Use wake_up command before major changes
- Monitor signal strength in status responses

### 4. Validation Testing
- Test invalid parameters to verify security
- Confirm automatic rollback functionality
- Verify parameter bounds enforcement

## Troubleshooting

### Command Not Executed
1. Check MQTT broker connectivity
2. Verify station_id matches
3. Confirm JSON syntax
4. Check serial output for error messages

### Configuration Not Saved
1. Verify command shows success in logs
2. Check ESP32 serial output
3. Restart ESP32 to verify persistence
4. Use status command to check current config

### Network Issues After WiFi Change
1. ESP32 automatically reverts to WiFiManager
2. Connect to "WeatherStation-Setup" AP
3. Reconfigure WiFi credentials
4. Factory reset if persistent issues

### Sensor Issues After Toggle
1. Use sensor_check command
2. Physical sensor may be disconnected
3. Check wiring and connections
4. Re-enable sensor if accidentally disabled

## Integration with Backend

The enhanced commands integrate seamlessly with the backend API:
- Commands can be triggered via web dashboard
- Backend validates commands before sending
- Response monitoring via WebSocket
- Historical command logs in database

See PLAN_CONFIGURACION_REMOTA_EJECUTIVO.md for full system integration details.

---

**FASE 3 Implementation Status**: ✅ **COMPLETE**
- ✅ Advanced reading interval control with validation
- ✅ Granular sensor enable/disable (all 7 sensors)
- ✅ Remote calibration system (all sensor types)
- ✅ Alert threshold configuration storage
- ✅ Security validation for all parameters
- ✅ Automatic rollback mechanism
- ✅ Comprehensive testing suite