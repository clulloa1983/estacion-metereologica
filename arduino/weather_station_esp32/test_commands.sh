#!/bin/bash
# ESP32 Weather Station - MQTT Commands Test Script
# Tests the enhanced MQTT commands using mosquitto_pub/mosquitto_sub
#
# Prerequisites:
# - MQTT broker running (localhost:1883)
# - ESP32 connected and online
# - mosquitto-clients installed
#
# Usage: ./test_commands.sh

BROKER="localhost"
PORT="1883"
STATION_ID="ESP32_STATION_001"
COMMAND_TOPIC="weather/command/$STATION_ID"
STATUS_TOPIC="weather/status/$STATION_ID"
LOG_TOPIC="weather/logs/$STATION_ID"

echo "🎯 ESP32 Weather Station - MQTT Commands Test"
echo "============================================="

# Function to send command and wait
send_command() {
    local command="$1"
    local description="$2"
    
    echo ""
    echo "🚀 Testing: $description"
    echo "📤 Command: $command"
    
    # Send command
    echo "$command" | mosquitto_pub -h $BROKER -p $PORT -t $COMMAND_TOPIC -s
    
    echo "⏳ Waiting for response..."
    sleep 3
}

# Start status listener in background
echo "📡 Starting status listener..."
mosquitto_sub -h $BROKER -p $PORT -t "$STATUS_TOPIC" -t "$LOG_TOPIC" &
SUB_PID=$!

# Give time for subscription
sleep 2

echo "🔍 Starting command tests..."

# Test 1: Basic Status
send_command '{"command": "status"}' "Basic Status Check"

# Test 2: Valid Reading Interval
send_command '{"command": "set_reading_interval", "parameters": {"interval_ms": 120000}}' "Set Reading Interval (2min)"

# Test 3: Invalid Reading Interval (should fail)
send_command '{"command": "set_reading_interval", "parameters": {"interval_ms": 10000}}' "Invalid Reading Interval (10s)"

# Test 4: Disable DHT22
send_command '{"command": "toggle_sensor", "parameters": {"sensor": "dht22", "enabled": false}}' "Disable DHT22"

# Test 5: Re-enable DHT22
send_command '{"command": "toggle_sensor", "parameters": {"sensor": "dht22", "enabled": true}}' "Re-enable DHT22"

# Test 6: Enable BH1750 Light Sensor
send_command '{"command": "toggle_sensor", "parameters": {"sensor": "bh1750", "enabled": true}}' "Enable Light Sensor"

# Test 7: Temperature Calibration
send_command '{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -2.5}}' "Temperature Calibration"

# Test 8: Invalid Temperature Calibration (should fail)
send_command '{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -15.0}}' "Invalid Temp Calibration"

# Test 9: Light Calibration with Scale
send_command '{"command": "set_calibration", "parameters": {"sensor": "light", "offset": 10.0, "scale": 1.2}}' "Light Calibration"

# Test 10: Temperature Alert Thresholds
send_command '{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "min": 5.0, "max": 35.0, "enabled": true}}' "Temperature Alerts"

# Test 11: Sleep Mode Configuration
send_command '{"command": "sleep_mode", "enabled": false, "interval_ms": 300000}' "Sleep Mode Config"

# Test 12: Unknown Sensor (should fail)
send_command '{"command": "toggle_sensor", "parameters": {"sensor": "unknown", "enabled": true}}' "Unknown Sensor (Should Fail)"

# Test 13: Invalid Command (should fail)
send_command '{"command": "invalid_command", "parameters": {}}' "Invalid Command (Should Fail)"

# Test 14: Final Status
send_command '{"command": "status"}' "Final Status Check"

echo ""
echo "✅ All test commands sent!"
echo "📊 Check the output above for responses"
echo "🔍 Look for SUCCESS/FAILED in the logs"

# Wait a bit more for final responses
sleep 5

# Stop the subscriber
kill $SUB_PID 2>/dev/null

echo ""
echo "🎉 Testing complete!"
echo ""
echo "Expected Results:"
echo "✅ Should PASS: status, valid intervals, sensor toggles, valid calibrations, alerts"
echo "❌ Should FAIL: invalid intervals, invalid calibrations, unknown sensors, invalid commands"
echo ""
echo "If most commands show SUCCESS in logs, FASE 3 implementation is working correctly!"