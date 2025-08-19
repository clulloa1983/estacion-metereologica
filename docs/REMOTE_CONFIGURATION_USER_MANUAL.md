# Remote Configuration User Manual
## Weather Station IoT System

---

### Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Accessing the Configuration Panel](#accessing-the-configuration-panel)
4. [Configuration Categories](#configuration-categories)
5. [Step-by-Step Configuration Guide](#step-by-step-configuration-guide)
6. [Command Reference](#command-reference)
7. [Troubleshooting](#troubleshooting)
8. [Safety Guidelines](#safety-guidelines)
9. [FAQ](#frequently-asked-questions)

---

## Overview

The Remote Configuration System allows you to control and configure your ESP32 weather stations remotely through a web interface, without requiring physical access to the devices. This powerful feature enables you to:

- 🔧 **Adjust sensor settings** - Modify reading intervals and calibration
- ⚡ **Manage power consumption** - Control sleep modes and transmission schedules
- 🚨 **Configure alerts** - Set thresholds for environmental parameters
- 📡 **Update connectivity** - Change WiFi credentials and MQTT settings
- 📊 **Monitor device status** - Check sensor functionality and connectivity

### Key Benefits
- **No Physical Access Required** - Configure devices remotely from anywhere
- **Real-time Feedback** - Immediate confirmation of configuration changes
- **Safe Operations** - Built-in validation prevents invalid configurations
- **Easy Recovery** - Automatic rollback for failed configurations

---

## Getting Started

### Prerequisites
- Weather station system running with backend API (port 5002)
- Frontend dashboard accessible (typically port 3001+)
- ESP32 weather station connected via MQTT
- Valid API credentials (API key or user authentication)

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Network connectivity to the weather station system
- Administrative or user-level access credentials

---

## Accessing the Configuration Panel

### Step 1: Open the Weather Station Dashboard
1. Navigate to your weather station dashboard (typically `http://localhost:3001`)
2. Log in with your credentials if authentication is enabled
3. Ensure your weather station is showing as "Online" in the system status

### Step 2: Access Remote Configuration
1. Look for the **"Remote Configuration"** panel in the dashboard
2. The panel will display tabs for different configuration categories:
   - **Sensors** 🎯 - Sensor settings and calibration
   - **Alerts** 🚨 - Threshold and notification settings
   - **Power** 🔋 - Energy management and sleep modes
   - **Connectivity** 📡 - Network and communication settings

### Visual Guide
```
┌─────────────────────────────────────────────┐
│  Weather Station Dashboard                  │
├─────────────────────────────────────────────┤
│  Current Measurements | Historical Charts   │
├─────────────────────────────────────────────┤
│  📋 Remote Configuration Panel              │
│  ┌─┬─┬─┬─┐                                  │
│  │🎯│🚨│🔋│📡│ <- Configuration Tabs         │
│  └─┴─┴─┴─┘                                  │
│  [Configuration Form Area]                  │
└─────────────────────────────────────────────┘
```

---

## Configuration Categories

### 🎯 Sensors Configuration
Control how your weather station collects environmental data.

**Available Settings:**
- **Reading Interval** - How often sensors take measurements (30 seconds to 1 hour)
- **Sensor Enable/Disable** - Turn individual sensors on or off
- **Calibration Offsets** - Adjust sensor readings for accuracy

**Supported Sensors:**
- DHT22 (Temperature & Humidity)
- BMP085 (Atmospheric Pressure)
- Rain Sensor
- MQ7 (Carbon Monoxide)
- MQ135 (Air Quality)
- DSM501A (PM2.5 Particles)
- BH1750 (Light Intensity)

### 🚨 Alerts Configuration
Set up automated notifications when environmental conditions exceed safe limits.

**Available Settings:**
- **Temperature Alerts** - Min/max temperature thresholds
- **Humidity Alerts** - Humidity level monitoring
- **Pressure Alerts** - Atmospheric pressure changes
- **Air Quality Alerts** - CO levels and air quality index
- **Custom Thresholds** - Parameter-specific alert levels

### 🔋 Power Management
Optimize battery life and power consumption for remote deployments.

**Available Settings:**
- **Sleep Mode** - Deep sleep duration (1 minute to 24 hours)
- **Transmission Schedule** - When to send data to reduce power usage
- **WiFi Power Level** - Adjust signal strength (0-20 dBm)

### 📡 Connectivity Configuration
Manage network connections and communication settings.

**Available Settings:**
- **WiFi Credentials** - Network name (SSID) and password
- **MQTT Settings** - Broker configuration and authentication
- **Connection Timeouts** - Network retry and timeout settings

⚠️ **Warning:** Changing WiFi settings may disconnect the device if new credentials are incorrect.

---

## Step-by-Step Configuration Guide

### Configuring Sensor Reading Interval

1. **Access Sensors Tab**
   - Click on the 🎯 **Sensors** tab in the configuration panel

2. **Set Reading Interval**
   - Locate the "Reading Interval" section
   - Enter desired interval in seconds (minimum: 30, maximum: 3600)
   - Example: Enter `300` for readings every 5 minutes

3. **Apply Configuration**
   - Click **"Apply Interval Setting"** button
   - Wait for confirmation message: ✅ "Reading interval updated successfully"

4. **Verify Changes**
   - Monitor the "Last Reading" timestamp to confirm new interval
   - Check that data updates match your configured interval

### Disabling/Enabling Sensors

1. **Select Sensor**
   - In the Sensors tab, find the "Sensor Control" section
   - Choose the sensor from the dropdown (e.g., "DHT22", "MQ7")

2. **Toggle Sensor State**
   - Use the Enable/Disable toggle switch
   - Green = Enabled, Gray = Disabled

3. **Confirm Action**
   - Click **"Update Sensor Status"**
   - Confirmation: ✅ "DHT22 sensor disabled successfully"

4. **Monitor Impact**
   - Disabled sensors will show "N/A" or missing values in readings
   - Re-enable anytime using the same process

### Setting Up Temperature Alerts

1. **Navigate to Alerts Tab**
   - Click on the 🚨 **Alerts** tab

2. **Configure Temperature Thresholds**
   - Find "Temperature Monitoring" section
   - Set **Minimum Temperature**: e.g., `5°C` (for freeze warnings)
   - Set **Maximum Temperature**: e.g., `35°C` (for heat warnings)

3. **Enable Monitoring**
   - Check the "Enable Temperature Alerts" checkbox
   - Select alert severity level (Low, Medium, High, Critical)

4. **Save Configuration**
   - Click **"Save Alert Settings"**
   - Confirmation: ✅ "Temperature alerts configured successfully"

5. **Test Alerts**
   - Monitor alert notifications in the dashboard
   - Alerts appear when thresholds are exceeded

### Configuring Power Save Mode

1. **Access Power Tab**
   - Click on the 🔋 **Power** tab

2. **Enable Sleep Mode**
   - Toggle "Enable Sleep Mode" switch
   - Set sleep duration (e.g., `3600` seconds = 1 hour)

3. **Schedule Transmissions**
   - Set "Transmission Interval" (how often to wake up and send data)
   - Recommended: 15-30 minutes for battery-powered stations

4. **Apply Power Settings**
   - Click **"Update Power Configuration"**
   - Device will enter sleep mode after confirmation

**⚠️ Important:** Device will be unreachable during sleep periods except at transmission times.

### Updating WiFi Credentials

1. **Access Connectivity Tab**
   - Click on the 📡 **Connectivity** tab

2. **Prepare New Credentials**
   - Ensure new WiFi network is available and credentials are correct
   - Double-check SSID spelling and password

3. **Enter WiFi Information**
   - **Network Name (SSID)**: Enter exactly as it appears in WiFi settings
   - **Password**: Enter WiFi password (minimum 8 characters)

4. **Apply with Caution**
   - Click **"Update WiFi Settings"**
   - ⚠️ Device may disconnect briefly during the switch

5. **Verify Connection**
   - Wait 30-60 seconds for device to connect to new network
   - Check that data continues to arrive from the station
   - If device doesn't reconnect, it may revert to previous settings

---

## Command Reference

### Basic Device Commands

#### Get Device Status
**Purpose:** Check overall device health and sensor functionality
**Usage:** Click "Check Status" in any configuration tab
**Response Time:** 5-10 seconds
**Information Returned:**
- Device uptime and firmware version
- Sensor operational status
- Network connectivity strength
- Battery voltage (if applicable)
- Last configuration change timestamp

#### Restart Device
**Purpose:** Perform a clean restart of the ESP32 device
**Usage:** Available in Connectivity tab under "Device Control"
**Caution:** Device will be offline for 30-60 seconds during restart
**When to Use:**
- After major configuration changes
- When device appears unresponsive
- To apply firmware updates
- To clear temporary errors

#### Sensor Check
**Purpose:** Test all connected sensors for proper operation
**Usage:** Available in Sensors tab
**Duration:** 10-15 seconds
**Results:**
- List of working sensors ✅
- Failed or disconnected sensors ❌
- Sensor reading ranges and accuracy
- Calibration status

### Measurement Commands

#### Set Reading Interval
**Command:** `set_reading_interval`
**Parameters:**
- `interval_ms`: Time between readings in milliseconds
- **Range:** 30,000 (30 sec) to 3,600,000 (1 hour)
- **Default:** 60,000 (1 minute)

**Examples:**
- Every 30 seconds: `30000`
- Every 5 minutes: `300000`
- Every 30 minutes: `1800000`

#### Toggle Sensor
**Command:** `toggle_sensor`
**Parameters:**
- `sensor`: Sensor identifier
- `enabled`: true (on) or false (off)

**Sensor Identifiers:**
- `dht22`: Temperature and humidity sensor
- `bmp085`: Barometric pressure sensor
- `rain`: Rain detection sensor
- `mq7`: Carbon monoxide sensor
- `mq135`: Air quality sensor
- `dsm501a`: PM2.5 particle sensor
- `bh1750`: Light intensity sensor

#### Set Calibration
**Command:** `set_calibration`
**Parameters:**
- `sensor`: Parameter to calibrate
- `offset`: Adjustment value

**Calibration Parameters:**
- `temperature`: Offset in °C (-10 to +10)
- `humidity`: Offset in % (-20 to +20)
- `pressure`: Offset in hPa (-50 to +50)
- `light`: Offset in lux (-1000 to +1000)

**Example:** If temperature reads 2°C high, use offset: `-2.0`

### Alert Commands

#### Set Alert Threshold
**Command:** `set_alert_threshold`
**Parameters:**
- `parameter`: Environmental parameter to monitor
- `min`: Minimum safe value (optional)
- `max`: Maximum safe value (optional)

**Supported Parameters:**
- `temperature`: Temperature monitoring (-40°C to +80°C)
- `humidity`: Humidity monitoring (0% to 100%)
- `pressure`: Pressure monitoring (800 to 1200 hPa)
- `co_level`: Carbon monoxide monitoring (0 to 1000 ppm)
- `air_quality`: Air quality index (0 to 500)

**Examples:**
- Temperature alerts: min: `5`, max: `35` (5°C to 35°C safe range)
- Humidity alerts: max: `85` (alert when humidity exceeds 85%)
- CO monitoring: max: `50` (alert when CO exceeds 50 ppm)

### Power Management Commands

#### Sleep Mode
**Command:** `sleep_mode`
**Parameters:**
- `duration_ms`: Sleep duration in milliseconds
- **Range:** 60,000 (1 min) to 86,400,000 (24 hours)

**Common Sleep Durations:**
- 15 minutes: `900000`
- 1 hour: `3600000`
- 6 hours: `21600000`
- 12 hours: `43200000`

**Power Savings:**
- 15-minute sleep: ~80% power reduction
- 1-hour sleep: ~95% power reduction
- 6-hour sleep: ~98% power reduction

#### Wake Up Device
**Command:** `wake_up`
**Purpose:** Force device to exit sleep mode immediately
**Usage:** Emergency wake-up when urgent configuration needed
**Note:** Device will return to sleep mode after configured duration

### Connectivity Commands

#### WiFi Configuration
**Command:** `wifi_config`
**Parameters:**
- `ssid`: Network name (max 32 characters)
- `password`: Network password (min 8 characters for WPA/WPA2)

**Network Types Supported:**
- WPA/WPA2 Personal (most common)
- WPA3 Personal (newer networks)
- Open networks (not recommended for security)

**Security Considerations:**
- Use strong passwords (12+ characters)
- Avoid public/unsecured networks
- Consider separate IoT network for devices

---

## Troubleshooting

### Common Issues and Solutions

#### Device Not Responding to Commands

**Symptoms:**
- Commands show "sent successfully" but no effect
- Device status shows as offline
- No recent data from device

**Troubleshooting Steps:**
1. **Check Network Connectivity**
   - Verify device shows as "connected" in router
   - Check MQTT broker connectivity status
   - Test network stability and signal strength

2. **Verify MQTT Connection**
   - Check MQTT broker logs for device connection
   - Restart MQTT broker if necessary: `docker-compose restart mosquitto`
   - Verify MQTT credentials are correct

3. **Device Power Cycle**
   - Send restart command through configuration panel
   - If unresponsive, physically reset device (press reset button)
   - Wait 60 seconds for full boot sequence

4. **Check Command Syntax**
   - Verify parameters are within valid ranges
   - Check for typos in command names
   - Review API documentation for correct format

#### WiFi Configuration Failed

**Symptoms:**
- Device disconnects after WiFi update
- No data received after network change
- Device doesn't appear on new network

**Recovery Steps:**
1. **Wait for Auto-Rollback**
   - Device automatically reverts to previous WiFi settings after 5 minutes
   - Monitor for device reconnection with old credentials

2. **Manual Recovery**
   - If device has WiFi Manager: Look for ESP32 hotspot network
   - Connect to hotspot and reconfigure WiFi through web interface
   - Use physical reset button if available

3. **Prevention**
   - Always verify new WiFi credentials before applying
   - Test with another device first
   - Ensure signal strength is adequate at device location

#### Sensor Readings Appear Incorrect

**Symptoms:**
- Temperature consistently off by several degrees
- Humidity readings outside expected range
- Pressure values don't match weather reports

**Calibration Steps:**
1. **Compare with Reference**
   - Use calibrated thermometer/hygrometer
   - Check local weather station data
   - Take multiple readings over time

2. **Apply Calibration Offset**
   - Calculate difference: `actual_value - sensor_reading`
   - Apply offset using calibration command
   - Example: If sensor reads 25°C but actual is 23°C, offset = -2.0

3. **Verify Sensor Placement**
   - Ensure sensors not in direct sunlight
   - Check for heat sources nearby
   - Verify adequate ventilation

#### Power Management Issues

**Symptoms:**
- Battery drains faster than expected
- Device doesn't wake up from sleep
- Inconsistent sleep/wake cycles

**Solutions:**
1. **Optimize Sleep Settings**
   - Increase sleep duration for battery-powered setups
   - Reduce transmission frequency
   - Lower WiFi power levels in good signal areas

2. **Check Wake-up Conditions**
   - Verify wake-up commands are sent correctly
   - Check if device supports remote wake-up
   - Use manual reset if device stuck in sleep

3. **Monitor Power Consumption**
   - Check battery voltage in device status
   - Calculate expected runtime with current settings
   - Consider solar panel or external power for continuous operation

### Error Messages and Solutions

#### "MQTT service unavailable"
**Cause:** Backend cannot connect to MQTT broker
**Solution:** 
- Restart MQTT broker: `docker-compose restart mosquitto`
- Check MQTT broker logs for errors
- Verify MQTT_BROKER_URL in backend configuration

#### "Invalid parameter range"
**Cause:** Command parameter outside acceptable limits
**Solution:**
- Check parameter constraints in documentation
- Use values within specified min/max ranges
- Verify units (seconds vs milliseconds, °C vs °F)

#### "Device authentication failed"
**Cause:** API key or authentication token invalid
**Solution:**
- Refresh browser page to renew session
- Check API key configuration in frontend
- Verify user permissions for configuration access

#### "Command timeout"
**Cause:** Device didn't acknowledge command within timeout period
**Solution:**
- Check device connectivity and signal strength
- Retry command after 30 seconds
- Verify device is not in deep sleep mode

---

## Safety Guidelines

### Configuration Safety Rules

#### 1. Test Before Deploying
- Always test new configurations on development devices first
- Verify critical functions work after configuration changes
- Keep backup of working configuration settings

#### 2. Network Security
- Use strong WiFi passwords (minimum 12 characters)
- Regularly update device firmware
- Monitor for unauthorized configuration changes
- Use VPN for remote access over internet

#### 3. Power Management
- Don't set sleep durations longer than necessary
- Maintain ability to wake devices remotely
- Consider backup power for critical monitoring stations
- Test battery life calculations before remote deployment

#### 4. Environmental Monitoring
- Set conservative alert thresholds initially
- Monitor alert frequency to avoid spam
- Ensure critical alerts reach responsible personnel
- Test alert notification systems regularly

### Emergency Procedures

#### Lost Device Connection
1. Wait 15 minutes for auto-recovery
2. Check physical device status (LED indicators)
3. Use WiFi Manager hotspot if available
4. Perform physical reset as last resort

#### Invalid Configuration Recovery
1. Device should auto-rollback invalid settings
2. Send "restart" command to restore defaults
3. Re-apply known good configuration step by step
4. Contact system administrator if issues persist

#### Critical Alert Response
1. Verify alert accuracy with secondary sources
2. Take immediate safety action if environmental hazard
3. Investigate root cause of alert condition
4. Adjust thresholds if false positives occur

---

## Frequently Asked Questions

### General Configuration

**Q: How often can I send configuration commands?**
A: Commands are rate-limited to prevent flooding. Generally, wait 5-10 seconds between commands. The system allows up to 60 commands per minute.

**Q: Can I configure multiple devices at once?**
A: Currently, configuration is per-device. You must send commands to each station individually. Bulk configuration features may be added in future versions.

**Q: Do configuration changes persist after device restart?**
A: Yes, most configuration changes are saved to non-volatile storage (NVS) and survive power cycles. Temporary commands like "status" or "wake_up" don't persist.

**Q: Can I schedule configuration changes?**
A: Not directly through the web interface. Configuration changes are applied immediately. You can use external automation tools to schedule commands via the API.

### Sensor Configuration

**Q: What happens if I disable all sensors?**
A: The device will continue operating but won't collect environmental data. You can re-enable sensors anytime through the configuration panel.

**Q: How accurate are the sensor calibration offsets?**
A: Calibration accuracy depends on your reference measurement. Use high-quality calibrated instruments for best results. Typical accuracy after calibration: ±0.5°C for temperature, ±3% for humidity.

**Q: Can I add new sensors to existing devices?**
A: Hardware modifications require firmware updates. Contact system administrator for adding new sensor types. Existing sensor configuration supports all currently connected sensors.

### Power Management

**Q: What's the minimum power consumption possible?**
A: With optimized settings (1-hour sleep cycles, minimal sensors), power consumption can be reduced to ~5-10mA average, extending battery life to several months.

**Q: Can I wake up devices manually anytime?**
A: Yes, use the "wake_up" command. However, devices in deep sleep may take 30-60 seconds to respond to network commands.

**Q: How do I calculate battery life?**
A: Use the formula: `Battery_Capacity (mAh) ÷ Average_Current (mA) = Runtime (hours)`. Monitor battery voltage through device status to predict replacement needs.

### Connectivity

**Q: Can devices work without internet connection?**
A: Devices need network connectivity to the local MQTT broker and backend API. Internet connection is not required for basic operation if all services run locally.

**Q: What happens if WiFi network changes?**
A: Update WiFi configuration through the panel. If new credentials fail, devices automatically revert to previous settings after 5 minutes.

**Q: Can I use mobile hotspot for device connectivity?**
A: Yes, but be aware of data usage. Typical usage is 10-50 MB per month per device depending on reporting frequency. Monitor data costs for cellular connections.

### Alerts and Monitoring

**Q: How quickly do alerts trigger?**
A: Alerts are evaluated with each sensor reading. With default 1-minute intervals, alerts typically trigger within 1-2 minutes of threshold breach.

**Q: Can I set different alert levels for day/night?**
A: Not currently supported through the web interface. Consider using external automation tools to adjust thresholds based on time of day.

**Q: Where do alert notifications appear?**
A: Alerts appear in the dashboard alert panel and can be configured to send email/SMS notifications (depending on system configuration).

### Troubleshooting

**Q: Device shows offline but still sends data occasionally**
A: This suggests intermittent connectivity. Check WiFi signal strength, power supply stability, and network infrastructure for reliability issues.

**Q: Commands seem to work but device behavior doesn't change**
A: Verify command parameters are correct and within valid ranges. Check device logs (if accessible) for error messages or validation failures.

**Q: Can I reset device to factory defaults remotely?**
A: Use the "restart" command to reload default configuration. For complete factory reset, physical access to the device is typically required.

---

## Support and Additional Resources

### Documentation Links
- [Technical API Documentation](http://localhost:5002/api-docs) - Swagger/OpenAPI specification
- [Developer Guide](../CLAUDE.md) - System architecture and development information
- [Installation Guide](../README.md) - Initial system setup instructions

### Getting Help
- Check system logs for error messages
- Review this manual for common issues
- Contact system administrator for hardware-related problems
- Report bugs through the project issue tracker

### Best Practices
- Test configuration changes during maintenance windows
- Keep configuration documentation updated
- Monitor device status regularly
- Plan for device recovery scenarios

---

*Weather Station Remote Configuration User Manual v1.0*  
*Last Updated: January 2025*  
*For Weather Station IoT System v1.0*