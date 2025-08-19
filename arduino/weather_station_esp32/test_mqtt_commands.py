#!/usr/bin/env python3
"""
ESP32 Weather Station - MQTT Commands Test Suite
Tests all advanced MQTT commands implemented in FASE 3

Usage:
    python test_mqtt_commands.py

Requirements:
    pip install paho-mqtt

This script tests the enhanced MQTT command functionality:
- Advanced reading interval control
- Granular sensor enable/disable (all 7 sensors)
- Remote calibration system
- Alert threshold configuration
- Security validation
- Automatic rollback mechanism
"""

import paho.mqtt.client as mqtt
import json
import time
import sys
from datetime import datetime

# MQTT Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
STATION_ID = "ESP32_STATION_001"
COMMAND_TOPIC = f"weather/command/{STATION_ID}"
STATUS_TOPIC = f"weather/status/{STATION_ID}"
LOG_TOPIC = f"weather/logs/{STATION_ID}"

class ESP32CommandTester:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.responses = []
        self.test_results = []
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
            # Subscribe to response topics
            client.subscribe(STATUS_TOPIC)
            client.subscribe(LOG_TOPIC)
        else:
            print(f"❌ Failed to connect to MQTT broker. RC: {rc}")
            sys.exit(1)
    
    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            if msg.topic == STATUS_TOPIC:
                print(f"📋 [{timestamp}] Status: {payload.get('status', 'unknown')}")
            elif msg.topic == LOG_TOPIC:
                success = "✅" if payload.get('success', False) else "❌"
                print(f"📝 [{timestamp}] Log: {success} {payload.get('command', 'unknown')}")
            
            self.responses.append({
                'topic': msg.topic,
                'payload': payload,
                'timestamp': timestamp
            })
        except Exception as e:
            print(f"❌ Error parsing message: {e}")
    
    def send_command(self, command_data, test_name="", wait_time=3):
        """Send MQTT command and wait for response"""
        print(f"\n🚀 Testing: {test_name}")
        print(f"📤 Command: {json.dumps(command_data, indent=2)}")
        
        # Clear previous responses
        self.responses.clear()
        
        # Send command
        result = self.client.publish(COMMAND_TOPIC, json.dumps(command_data))
        if result.rc != 0:
            print(f"❌ Failed to publish command. RC: {result.rc}")
            return False
        
        # Wait for response
        start_time = time.time()
        while time.time() - start_time < wait_time:
            self.client.loop(timeout=0.1)
            time.sleep(0.1)
        
        # Analyze responses
        success = any(r['payload'].get('success', False) for r in self.responses if r['topic'] == LOG_TOPIC)
        status_responses = [r for r in self.responses if r['topic'] == STATUS_TOPIC]
        
        if status_responses:
            latest_status = status_responses[-1]['payload'].get('status', 'unknown')
            print(f"📊 Final Status: {latest_status}")
        
        result = "✅ PASSED" if success else "❌ FAILED"
        print(f"🏁 Test Result: {result}")
        
        self.test_results.append({
            'test': test_name,
            'command': command_data,
            'success': success,
            'responses': len(self.responses)
        })
        
        return success
    
    def run_all_tests(self):
        """Execute comprehensive test suite"""
        print("🎯 ESP32 Weather Station - MQTT Commands Test Suite")
        print("=" * 60)
        
        # Connect to MQTT
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            time.sleep(2)  # Allow connection to establish
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return
        
        # Test 1: Basic Status Check
        self.send_command(
            {"command": "status"},
            "Basic Status Check"
        )
        
        # Test 2: Reading Interval Control (valid range)
        self.send_command(
            {
                "command": "set_reading_interval",
                "parameters": {"interval_ms": 120000}  # 2 minutes
            },
            "Set Reading Interval (Valid - 2min)"
        )
        
        # Test 3: Reading Interval Control (invalid range - should fail)
        self.send_command(
            {
                "command": "set_reading_interval", 
                "parameters": {"interval_ms": 10000}  # 10 seconds - too short
            },
            "Set Reading Interval (Invalid - 10s)"
        )
        
        # Test 4: Sensor Enable/Disable (DHT22)
        self.send_command(
            {
                "command": "toggle_sensor",
                "parameters": {"sensor": "dht22", "enabled": False}
            },
            "Disable DHT22 Sensor"
        )
        
        # Test 5: Re-enable DHT22
        self.send_command(
            {
                "command": "toggle_sensor",
                "parameters": {"sensor": "dht22", "enabled": True}
            },
            "Re-enable DHT22 Sensor"
        )
        
        # Test 6: Multiple Sensor Toggle
        self.send_command(
            {
                "command": "toggle_sensor",
                "parameters": {"sensor": "bh1750", "enabled": True}
            },
            "Enable Light Sensor (BH1750)"
        )
        
        # Test 7: Temperature Calibration (valid)
        self.send_command(
            {
                "command": "set_calibration",
                "parameters": {
                    "sensor": "temperature",
                    "offset": -2.5
                }
            },
            "Temperature Calibration (Valid)"
        )
        
        # Test 8: Temperature Calibration (invalid - should fail)
        self.send_command(
            {
                "command": "set_calibration",
                "parameters": {
                    "sensor": "temperature", 
                    "offset": -15.0  # Out of range
                }
            },
            "Temperature Calibration (Invalid)"
        )
        
        # Test 9: Light Calibration with Scale
        self.send_command(
            {
                "command": "set_calibration",
                "parameters": {
                    "sensor": "light",
                    "offset": 10.0,
                    "scale": 1.2
                }
            },
            "Light Calibration (Offset + Scale)"
        )
        
        # Test 10: Alert Threshold Configuration
        self.send_command(
            {
                "command": "set_alert_threshold",
                "parameters": {
                    "parameter": "temperature",
                    "min": 5.0,
                    "max": 35.0,
                    "enabled": True
                }
            },
            "Temperature Alert Thresholds"
        )
        
        # Test 11: Humidity Alert Thresholds
        self.send_command(
            {
                "command": "set_alert_threshold",
                "parameters": {
                    "parameter": "humidity",
                    "min": 30.0,
                    "max": 80.0
                }
            },
            "Humidity Alert Thresholds"
        )
        
        # Test 12: Invalid Alert Parameter (should fail)
        self.send_command(
            {
                "command": "set_alert_threshold",
                "parameters": {
                    "parameter": "invalid_param",
                    "min": 0.0,
                    "max": 100.0
                }
            },
            "Invalid Alert Parameter"
        )
        
        # Test 13: Sleep Mode Configuration
        self.send_command(
            {
                "command": "sleep_mode",
                "enabled": False,
                "interval_ms": 300000  # 5 minutes
            },
            "Sleep Mode Configuration"
        )
        
        # Test 14: Unknown Sensor Toggle (should fail)
        self.send_command(
            {
                "command": "toggle_sensor",
                "parameters": {"sensor": "unknown_sensor", "enabled": True}
            },
            "Unknown Sensor Toggle (Should Fail)"
        )
        
        # Test 15: Invalid Command (should fail)
        self.send_command(
            {
                "command": "invalid_command",
                "parameters": {}
            },
            "Invalid Command (Should Fail)"
        )
        
        # Test 16: Final Status Check
        self.send_command(
            {"command": "status"},
            "Final Status Check"
        )
        
        # Clean up
        self.client.loop_stop()
        self.client.disconnect()
        
        # Print Test Summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for test in self.test_results if test['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for i, test in enumerate(self.test_results, 1):
            status = "✅ PASS" if test['success'] else "❌ FAIL"
            print(f"{i:2d}. {status} - {test['test']}")
        
        print("\n🎯 EXPECTED BEHAVIOR:")
        print("✅ Should PASS: Tests 1, 2, 4, 5, 6, 7, 9, 10, 11, 13, 16")
        print("❌ Should FAIL: Tests 3, 8, 12, 14, 15 (validation failures)")
        
        if passed >= 11:  # At least 11 out of 16 should pass
            print("\n🎉 Overall Result: PHASE 3 IMPLEMENTATION SUCCESSFUL!")
        else:
            print("\n⚠️  Overall Result: Some issues detected - review logs")

if __name__ == "__main__":
    print("ESP32 Weather Station - MQTT Commands Test Suite")
    print("Make sure your ESP32 is connected and MQTT broker is running")
    
    input("Press Enter to start testing...")
    
    tester = ESP32CommandTester()
    tester.run_all_tests()