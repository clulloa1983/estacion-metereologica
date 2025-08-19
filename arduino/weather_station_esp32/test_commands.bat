@echo off
REM ESP32 Weather Station - MQTT Commands Test Script (Windows)
REM Tests the enhanced MQTT commands using Docker MQTT tools
REM
REM Prerequisites:
REM - Docker with weather station containers running
REM - ESP32 connected and online
REM
REM Usage: test_commands.bat

set STATION_ID=ESP32_STATION_001
set COMMAND_TOPIC=weather/command/%STATION_ID%
set STATUS_TOPIC=weather/status/%STATION_ID%
set LOG_TOPIC=weather/logs/%STATION_ID%

echo 🎯 ESP32 Weather Station - MQTT Commands Test (Windows)
echo ================================================

echo 📡 Testing MQTT connection...
docker exec weather_mosquitto mosquitto_pub -h localhost -t test/connection -m "test"

if %ERRORLEVEL% neq 0 (
    echo ❌ MQTT broker not accessible. Make sure Docker containers are running.
    echo Run: docker-compose up -d
    pause
    exit /b 1
)

echo ✅ MQTT broker accessible

echo.
echo 🔍 Starting command tests...
echo 📋 Monitor responses with: docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/+/%STATION_ID%"
echo.

REM Test 1: Basic Status
echo 🚀 Test 1: Basic Status Check
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"status\"}"
timeout /t 3 /nobreak > nul

REM Test 2: Valid Reading Interval  
echo 🚀 Test 2: Set Reading Interval (2min)
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_reading_interval\", \"parameters\": {\"interval_ms\": 120000}}"
timeout /t 3 /nobreak > nul

REM Test 3: Invalid Reading Interval
echo 🚀 Test 3: Invalid Reading Interval (should fail)
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_reading_interval\", \"parameters\": {\"interval_ms\": 10000}}"
timeout /t 3 /nobreak > nul

REM Test 4: Disable DHT22
echo 🚀 Test 4: Disable DHT22 Sensor
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"toggle_sensor\", \"parameters\": {\"sensor\": \"dht22\", \"enabled\": false}}"
timeout /t 3 /nobreak > nul

REM Test 5: Re-enable DHT22
echo 🚀 Test 5: Re-enable DHT22 Sensor
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"toggle_sensor\", \"parameters\": {\"sensor\": \"dht22\", \"enabled\": true}}"
timeout /t 3 /nobreak > nul

REM Test 6: Enable Light Sensor
echo 🚀 Test 6: Enable BH1750 Light Sensor
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"toggle_sensor\", \"parameters\": {\"sensor\": \"bh1750\", \"enabled\": true}}"
timeout /t 3 /nobreak > nul

REM Test 7: Temperature Calibration
echo 🚀 Test 7: Temperature Calibration
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_calibration\", \"parameters\": {\"sensor\": \"temperature\", \"offset\": -2.5}}"
timeout /t 3 /nobreak > nul

REM Test 8: Invalid Calibration
echo 🚀 Test 8: Invalid Temperature Calibration (should fail)
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_calibration\", \"parameters\": {\"sensor\": \"temperature\", \"offset\": -15.0}}"
timeout /t 3 /nobreak > nul

REM Test 9: Light Calibration
echo 🚀 Test 9: Light Calibration with Scale
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_calibration\", \"parameters\": {\"sensor\": \"light\", \"offset\": 10.0, \"scale\": 1.2}}"
timeout /t 3 /nobreak > nul

REM Test 10: Alert Thresholds
echo 🚀 Test 10: Temperature Alert Thresholds
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"set_alert_threshold\", \"parameters\": {\"parameter\": \"temperature\", \"min\": 5.0, \"max\": 35.0, \"enabled\": true}}"
timeout /t 3 /nobreak > nul

REM Test 11: Sleep Mode
echo 🚀 Test 11: Sleep Mode Configuration
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"sleep_mode\", \"enabled\": false, \"interval_ms\": 300000}"
timeout /t 3 /nobreak > nul

REM Test 12: Unknown Sensor (should fail)
echo 🚀 Test 12: Unknown Sensor Toggle (should fail)
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"toggle_sensor\", \"parameters\": {\"sensor\": \"unknown\", \"enabled\": true}}"
timeout /t 3 /nobreak > nul

REM Test 13: Invalid Command (should fail)
echo 🚀 Test 13: Invalid Command (should fail)
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"invalid_command\", \"parameters\": {}}"
timeout /t 3 /nobreak > nul

REM Test 14: Final Status
echo 🚀 Test 14: Final Status Check
docker exec weather_mosquitto mosquitto_pub -h localhost -t %COMMAND_TOPIC% -m "{\"command\": \"status\"}"
timeout /t 3 /nobreak > nul

echo.
echo ✅ All test commands sent!
echo.
echo 📊 To see responses, run in another window:
echo docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/+/%STATION_ID%"
echo.
echo Expected Results:
echo ✅ Should PASS: status, valid intervals, sensor toggles, valid calibrations, alerts
echo ❌ Should FAIL: invalid intervals, invalid calibrations, unknown sensors, invalid commands
echo.
echo 🎉 If most commands show SUCCESS in ESP32 serial output, FASE 3 implementation is working!

pause