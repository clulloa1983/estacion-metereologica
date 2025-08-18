#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <BH1750.h>
#include <Preferences.h>

// Pin definitions for ESP32 DevKit V1
#define DHT_PIN 4         // GPIO4 - DHT22 sensor
#define RAIN_DIGITAL_PIN 2        // GPIO2 - MH-RD rain sensor (digital)
#define RAIN_ANALOG_PIN 34        // GPIO34 - MH-RD rain sensor (analog)
#define MQ7_PIN 36        // GPIO36 (ADC1_CH0) - MQ7 CO sensor
#define MQ135_PIN 12      // GPIO12 - MQ135 air quality (digital)
#define DSM501A_PIN 13    // GPIO13 - DSM501A dust sensor
#define SDA_PIN 21        // GPIO21 - I2C SDA for BMP180 and BH1750
#define SCL_PIN 22        // GPIO22 - I2C SCL for BMP180 and BH1750

// Sensor configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP085 bmp;
BH1750 lightMeter;

// WiFi and MQTT configuration (stored in NVS)
char mqtt_server[40] = "192.168.1.98";  // Default fallback
char mqtt_port[6] = "1883";              // Default fallback
char station_id[20] = "ESP32_STATION_001"; // Default fallback
char api_token[64] = "";                  // For future API authentication

// WiFiManager and Preferences
WiFiManager wm;
Preferences preferences;

WiFiClient espClient;
PubSubClient client(espClient);

// Global variables
volatile int rain_pulses = 0;
unsigned long last_reading = 0;
unsigned long reading_interval = 60000; // 1 minute (changeable via MQTT)
unsigned long last_wifi_check = 0;
int wifi_check_interval = 30000; // 30 seconds

// Deep Sleep configuration
bool deep_sleep_enabled = true;
unsigned long sleep_duration_ms = 60000; // Default 1 minute sleep
RTC_DATA_ATTR int boot_count = 0;
RTC_DATA_ATTR volatile int persistent_rain_pulses = 0;

// Dust sensor variables for DSM501A
unsigned long duration;
unsigned long starttime;
unsigned long sampletime_ms = 30000; // 30 seconds sampling
unsigned long lowpulseoccupancy = 0;

// Calibration factors
struct CalibrationFactors {
  float temp_offset = 0.0;
  float temp_scale = 1.0;
  float humidity_offset = 0.0;
  float pressure_offset = 0.0;
  float rain_factor = 0.2; // mm per pulse
  float mq7_offset = 0.0;
  float mq135_offset = 0.0;
} cal;

// Available sensors flags
struct SensorFlags {
  bool dht22_available = true;
  bool bmp180_available = false;
  bool bh1750_available = false;
  bool mh_rd_available = false;
  bool mq7_available = false;
  bool mq135_available = false;
  bool dsm501a_available = false;
} sensors;

// Function declarations
void IRAM_ATTR rainPulseISR();

void setup() {
  Serial.begin(115200);
  
  // Increment boot count and handle wake up
  ++boot_count;
  handleWakeUp();

  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);

  // Initialize pins
  pinMode(RAIN_DIGITAL_PIN, INPUT_PULLUP);
  pinMode(MQ135_PIN, INPUT);
  pinMode(DSM501A_PIN, INPUT);

  // Restore rain pulse count from RTC memory
  rain_pulses = persistent_rain_pulses;

  // Initialize sensors and check availability
  initializeSensors();

  // Setup interrupt for rain sensor
  if (sensors.mh_rd_available) {
    attachInterrupt(digitalPinToInterrupt(RAIN_DIGITAL_PIN), rainPulseISR, FALLING);
  }

  // Load configuration from NVS
  loadConfiguration();
  
  // Connect to WiFi using WiFiManager
  connectWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, atoi(mqtt_port));
  client.setCallback(mqttCallback);
  client.setBufferSize(512); // Increase MQTT buffer size

  // Initialize dust sensor timing
  starttime = millis();

  Serial.println("ESP32 Weather Station Ready!");
  printAvailableSensors();
}

void loop() {
  unsigned long current_time = millis();

  // If deep sleep is enabled, do one reading cycle and then sleep
  if (deep_sleep_enabled) {
    // Quick WiFi and MQTT reconnection
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost, reconnecting...");
      connectWiFi();
    }
    
    if (!client.connected()) {
      reconnectMQTT();
    }
    client.loop();
    
    // Do single sensor reading
    readAndSendData();
    
    // Wait for MQTT to finish sending
    delay(1000);
    
    // Enter deep sleep
    enterDeepSleep();
    return; // This won't actually execute, but for clarity
  }

  // Original loop logic for when deep sleep is disabled
  // Check WiFi connection periodically
  if (current_time - last_wifi_check > wifi_check_interval) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost, reconnecting...");
      connectWiFi();
    }
    last_wifi_check = current_time;
  }

  // Ensure MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Read dust sensor continuously
  if (sensors.dsm501a_available) {
    duration = pulseIn(DSM501A_PIN, LOW);
    lowpulseoccupancy = lowpulseoccupancy + duration;
  }

  // Read and send data at specified intervals
  if (current_time - last_reading >= reading_interval) {
    readAndSendData();
    last_reading = current_time;
    
    // Reset dust sensor for next cycle
    if (sensors.dsm501a_available) {
      lowpulseoccupancy = 0;
      starttime = millis();
    }
  }

  delay(100);
}

void initializeSensors() {
  Serial.println("Initializing sensors...");

  // Test DHT22
  dht.begin();
  delay(2000);
  float testTemp = dht.readTemperature();
  sensors.dht22_available = !isnan(testTemp);
  Serial.println(sensors.dht22_available ? "✓ DHT22 detected" : "✗ DHT22 not found");

  // Test BMP180
  sensors.bmp180_available = bmp.begin();
  if (sensors.bmp180_available) {
    Serial.println("✓ BMP180 detected");
    // Test reading to ensure sensor is working
    float testPressure = bmp.readPressure();
    Serial.print("  Test pressure reading: ");
    Serial.print(testPressure / 100.0F);
    Serial.println(" hPa");
  } else {
    Serial.println("✗ BMP180 not found - Check I2C wiring (SDA=21, SCL=22)");
  }

  // Test BH1750
  sensors.bh1750_available = lightMeter.begin();
  Serial.println(sensors.bh1750_available ? "✓ BH1750 detected" : "✗ BH1750 not found");

  // Test rain sensor MH-RD
  sensors.mh_rd_available = true;
  Serial.println("✓ MH-RD rain sensor enabled");

  // Test analog sensors (disable for initial testing)
  sensors.mq7_available = false;
  sensors.mq135_available = false;
  sensors.dsm501a_available = false;
  Serial.println("✗ Analog sensors (MQ7, MQ135, DSM501A) disabled for testing");
}

void printAvailableSensors() {
  Serial.println("\n=== Available Sensors ===");
  if (sensors.dht22_available) Serial.println("🌡️ DHT22 - Temperature & Humidity");
  if (sensors.bmp180_available) Serial.println("🧭 BMP180 - Pressure");
  if (sensors.bh1750_available) Serial.println("💡 BH1750 - Light");
  if (sensors.mh_rd_available) Serial.println("🌧️ MH-RD - Rain");
  if (sensors.mq7_available) Serial.println("🫁 MQ7 - Carbon Monoxide");
  if (sensors.mq135_available) Serial.println("🏭 MQ135 - Air Quality");
  if (sensors.dsm501a_available) Serial.println("🌫️ DSM501A - Dust Particles");
  Serial.println("========================\n");
}

void loadConfiguration() {
  preferences.begin("weather-station", false);
  
  // Load MQTT configuration
  preferences.getString("mqtt_server", mqtt_server, sizeof(mqtt_server));
  preferences.getString("mqtt_port", mqtt_port, sizeof(mqtt_port));
  preferences.getString("station_id", station_id, sizeof(station_id));
  preferences.getString("api_token", api_token, sizeof(api_token));
  
  // Load deep sleep configuration
  deep_sleep_enabled = preferences.getBool("deep_sleep_enabled", true); // Default enabled
  sleep_duration_ms = preferences.getULong("sleep_duration_ms", 60000); // Default 1 minute
  reading_interval = preferences.getULong("reading_interval", 60000); // Load reading interval separately
  
  // Load calibration factors
  cal.temp_offset = preferences.getFloat("temp_offset", 0.0);
  cal.temp_scale = preferences.getFloat("temp_scale", 1.0);
  cal.humidity_offset = preferences.getFloat("humidity_offset", 0.0);
  cal.pressure_offset = preferences.getFloat("pressure_offset", 0.0);
  cal.rain_factor = preferences.getFloat("rain_factor", 0.2);
  cal.mq7_offset = preferences.getFloat("mq7_offset", 0.0);
  cal.mq135_offset = preferences.getFloat("mq135_offset", 0.0);
  
  // Load sensor availability flags
  sensors.dht22_available = preferences.getBool("sensor_dht22", true);
  sensors.bmp180_available = preferences.getBool("sensor_bmp180", false);
  sensors.bh1750_available = preferences.getBool("sensor_bh1750", false);
  sensors.mh_rd_available = preferences.getBool("sensor_rain", false);
  sensors.mq7_available = preferences.getBool("sensor_mq7", false);
  sensors.mq135_available = preferences.getBool("sensor_mq135", false);
  sensors.dsm501a_available = preferences.getBool("sensor_dsm501a", false);
  
  preferences.end();
  
  Serial.println("Configuration loaded:");
  Serial.println("MQTT Server: " + String(mqtt_server));
  Serial.println("MQTT Port: " + String(mqtt_port));
  Serial.println("Station ID: " + String(station_id));
  Serial.println("Deep Sleep: " + String(deep_sleep_enabled ? "enabled" : "disabled"));
  Serial.println("Sleep Duration: " + String(sleep_duration_ms) + "ms");
}

void saveConfiguration() {
  preferences.begin("weather-station", false);
  
  preferences.putString("mqtt_server", mqtt_server);
  preferences.putString("mqtt_port", mqtt_port);
  preferences.putString("station_id", station_id);
  preferences.putString("api_token", api_token);
  
  // Save deep sleep configuration
  preferences.putBool("deep_sleep_enabled", deep_sleep_enabled);
  preferences.putULong("sleep_duration_ms", sleep_duration_ms);
  preferences.putULong("reading_interval", reading_interval);
  
  // Save calibration factors
  preferences.putFloat("temp_offset", cal.temp_offset);
  preferences.putFloat("temp_scale", cal.temp_scale);
  preferences.putFloat("humidity_offset", cal.humidity_offset);
  preferences.putFloat("pressure_offset", cal.pressure_offset);
  preferences.putFloat("rain_factor", cal.rain_factor);
  preferences.putFloat("mq7_offset", cal.mq7_offset);
  preferences.putFloat("mq135_offset", cal.mq135_offset);
  
  // Save sensor availability flags
  preferences.putBool("sensor_dht22", sensors.dht22_available);
  preferences.putBool("sensor_bmp180", sensors.bmp180_available);
  preferences.putBool("sensor_bh1750", sensors.bh1750_available);
  preferences.putBool("sensor_rain", sensors.mh_rd_available);
  preferences.putBool("sensor_mq7", sensors.mq7_available);
  preferences.putBool("sensor_mq135", sensors.mq135_available);
  preferences.putBool("sensor_dsm501a", sensors.dsm501a_available);
  
  preferences.end();
  Serial.println("Configuration saved to NVS");
}

void connectWiFi() {
  // For deep sleep mode, reduce WiFi connection timeout for faster startup
  if (deep_sleep_enabled) {
    wm.setConfigPortalTimeout(30);  // Reduced from 180 seconds
    wm.setConnectTimeout(10);       // Reduced from 20 seconds
  } else {
    wm.setConfigPortalTimeout(180); // 3 minutes timeout
    wm.setConnectTimeout(20);       // 20 seconds to connect
  }
  
  // Setup WiFiManager with custom parameters
  WiFiManagerParameter custom_mqtt_server("mqtt_server", "MQTT Server", mqtt_server, 40);
  WiFiManagerParameter custom_mqtt_port("mqtt_port", "MQTT Port", mqtt_port, 6);
  WiFiManagerParameter custom_station_id("station_id", "Station ID", station_id, 20);
  WiFiManagerParameter custom_api_token("api_token", "API Token", api_token, 64);
  
  wm.addParameter(&custom_mqtt_server);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_station_id);
  wm.addParameter(&custom_api_token);
  
  bool connected = false;
  
  // Try to connect to saved WiFi
  if(wm.autoConnect("WeatherStation-Setup")) {
    connected = true;
  } else {
    Serial.println("Failed to connect to WiFi");
    if (deep_sleep_enabled) {
      // If deep sleep enabled and WiFi fails, sleep and try again later
      Serial.println("WiFi failed in deep sleep mode, sleeping for 30 seconds...");
      esp_sleep_enable_timer_wakeup(30 * 1000000); // 30 seconds
      esp_deep_sleep_start();
    } else {
      ESP.restart(); // Restart and try again
    }
  }
  
  if (connected) {
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    // Update configuration with user input
    strcpy(mqtt_server, custom_mqtt_server.getValue());
    strcpy(mqtt_port, custom_mqtt_port.getValue());
    strcpy(station_id, custom_station_id.getValue());
    strcpy(api_token, custom_api_token.getValue());
    
    // Save updated configuration
    saveConfiguration();
  }
}

void reconnectMQTT() {
  int attempts = 0;
  int max_attempts = deep_sleep_enabled ? 3 : 10; // Fewer attempts in deep sleep mode
  
  while (!client.connected() && attempts < max_attempts) {
    Serial.print("Attempting MQTT connection...");
    attempts++;
    
    String clientId = String(station_id) + "_" + String(random(0xffff), HEX);
    
    // Use API token for MQTT authentication if available
    bool mqtt_connected = false;
    if (strlen(api_token) > 0) {
      mqtt_connected = client.connect(clientId.c_str(), "api_user", api_token);
    } else {
      mqtt_connected = client.connect(clientId.c_str());
    }
    
    if (mqtt_connected) {
      Serial.println("connected");
      
      // Subscribe to command topics
      String commandTopic = "weather/command/" + String(station_id);
      client.subscribe(commandTopic.c_str());
      
      // Send online status
      sendStatusUpdate("online");
      break;
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in " + String(deep_sleep_enabled ? "2" : "5") + " seconds");
      delay(deep_sleep_enabled ? 2000 : 5000); // Shorter delay in deep sleep mode
    }
  }
  
  if (!client.connected() && deep_sleep_enabled) {
    Serial.println("MQTT connection failed after " + String(max_attempts) + " attempts in deep sleep mode");
    // Continue with sensor reading even if MQTT fails
  }
}

void readAndSendData() {
  Serial.println("Reading sensors...");
  
  // Create JSON document (reduced size for testing)
  StaticJsonDocument<512> doc;
  doc["station_id"] = station_id;
  doc["timestamp"] = getTimestamp();

  // Read DHT22 (Temperature and Humidity)
  if (sensors.dht22_available) {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (!isnan(temperature)) {
      temperature = calibrateTemperature(temperature);
      doc["temperature"] = round(temperature * 100.0) / 100.0;
    }
    
    if (!isnan(humidity)) {
      humidity = calibrateHumidity(humidity);
      doc["humidity"] = round(humidity * 100.0) / 100.0;
    }
  }

  // Read BMP180 (Pressure)
  if (sensors.bmp180_available) {
    float pressure = bmp.readPressure() / 100.0F; // Convert Pa to hPa
    if (pressure > 0) {
      pressure = calibratePressure(pressure);
      doc["pressure"] = round(pressure * 100.0) / 100.0;
      Serial.print("BMP180 Pressure: ");
      Serial.print(pressure);
      Serial.println(" hPa");
    } else {
      Serial.println("BMP180 pressure reading failed");
    }
  }

  // Read BH1750 (Light)
  if (sensors.bh1750_available) {
    float lux = lightMeter.readLightLevel();
    if (lux >= 0) {
      doc["light_level"] = round(lux * 100.0) / 100.0;
    }
  }

  // Read MH-RD rain sensor (both analog and digital)
  if (sensors.mh_rd_available) {
    // Digital reading (pulse count for rainfall amount)
    float rainfall = calculateRainfall();
    doc["rainfall"] = round(rainfall * 100.0) / 100.0;
    
    // Analog reading (rain intensity level 0-4095)
    int rain_analog = analogRead(RAIN_ANALOG_PIN);
    doc["rain_intensity"] = rain_analog;
    
    // Convert to percentage (inverted: higher analog value = less rain)
    float rain_percentage = map(rain_analog, 0, 4095, 100, 0);
    doc["rain_level_percent"] = constrain(rain_percentage, 0, 100);
  }

  // Read MQ7 (Carbon Monoxide) - ESP32 has 12-bit ADC (0-4095)
  if (sensors.mq7_available) {
    int mq7_raw = analogRead(MQ7_PIN);
    float mq7_voltage = (mq7_raw / 4095.0) * 3.3; // ESP32 ADC resolution
    doc["co_level"] = round((mq7_voltage + cal.mq7_offset) * 100.0) / 100.0;
    doc["co_raw"] = mq7_raw;
  }

  // Read MQ135 (Air Quality) - simplified digital reading
  if (sensors.mq135_available) {
    int mq135_value = digitalRead(MQ135_PIN);
    doc["air_quality_digital"] = mq135_value;
  }

  // Calculate dust concentration (DSM501A)
  if (sensors.dsm501a_available) {
    float ratio = lowpulseoccupancy / (sampletime_ms * 10.0);
    float concentration = 1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;
    if (concentration < 0) concentration = 0;
    doc["dust_pm25"] = round(concentration * 100.0) / 100.0;
  }

  // Add system info
  doc["uptime"] = millis() / 1000;
  doc["signal_strength"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();

  // Convert to string and send
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Sending data: " + payload);
  
  String topic = "weather/data/" + String(station_id);
  if (client.publish(topic.c_str(), payload.c_str())) {
    Serial.println("Data sent successfully");
  } else {
    Serial.println("Failed to send data");
  }
}

float calibrateTemperature(float raw_temp) {
  return (raw_temp * cal.temp_scale) + cal.temp_offset;
}

float calibrateHumidity(float raw_humidity) {
  return constrain(raw_humidity + cal.humidity_offset, 0.0, 100.0);
}

float calibratePressure(float raw_pressure) {
  return raw_pressure + cal.pressure_offset;
}

float calculateRainfall() {
  float rainfall = rain_pulses * cal.rain_factor;
  rain_pulses = 0; // Reset counter
  return rainfall;
}

String getTimestamp() {
  // Simple timestamp - in production use NTP
  return String(millis());
}

void sendStatusUpdate(const char* status) {
  StaticJsonDocument<512> statusDoc;
  statusDoc["station_id"] = station_id;
  statusDoc["status"] = status;
  statusDoc["timestamp"] = getTimestamp();
  statusDoc["uptime"] = millis() / 1000;
  statusDoc["signal_strength"] = WiFi.RSSI();
  statusDoc["free_heap"] = ESP.getFreeHeap();
  
  // Add sensor availability status
  JsonObject sensorStatus = statusDoc.createNestedObject("sensors");
  sensorStatus["dht22"] = sensors.dht22_available;
  sensorStatus["bmp180"] = sensors.bmp180_available;
  sensorStatus["bh1750"] = sensors.bh1750_available;
  sensorStatus["mh_rd"] = sensors.mh_rd_available;
  sensorStatus["mq7"] = sensors.mq7_available;
  sensorStatus["mq135"] = sensors.mq135_available;
  sensorStatus["dsm501a"] = sensors.dsm501a_available;

  String statusPayload;
  serializeJson(statusDoc, statusPayload);
  
  String statusTopic = "weather/status/" + String(station_id);
  client.publish(statusTopic.c_str(), statusPayload.c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("Received MQTT message: " + message);
  
  // Parse JSON command
  StaticJsonDocument<256> cmdDoc;
  DeserializationError error = deserializeJson(cmdDoc, message);
  
  if (error) {
    Serial.println("Failed to parse command JSON");
    return;
  }
  
  String command = cmdDoc["command"];
  
  if (command == "status") {
    sendStatusUpdate("online");
  } else if (command == "restart") {
    Serial.println("Restart command received");
    ESP.restart();
  } else if (command == "sensor_check") {
    initializeSensors();
    printAvailableSensors();
    sendStatusUpdate("sensor_check_complete");
  } else if (command == "sleep_mode") {
    // Toggle deep sleep mode
    deep_sleep_enabled = cmdDoc["enabled"].as<bool>();
    if (cmdDoc.containsKey("interval_ms")) {
      sleep_duration_ms = cmdDoc["interval_ms"].as<unsigned long>();
      reading_interval = sleep_duration_ms; // Sync reading interval
    }
    Serial.println("Deep sleep " + String(deep_sleep_enabled ? "enabled" : "disabled"));
    Serial.println("Sleep duration: " + String(sleep_duration_ms) + "ms");
    
    // Save configuration to persist across reboots
    saveConfiguration();
    
    sendStatusUpdate("sleep_mode_updated");
  } else if (command == "wake_up") {
    // Force wake up and disable sleep temporarily  
    deep_sleep_enabled = false;
    Serial.println("Deep sleep disabled via wake_up command");
    sendStatusUpdate("awake");
  } else if (command == "set_reading_interval") {
    // Set new reading interval
    if (cmdDoc.containsKey("parameters") && cmdDoc["parameters"].containsKey("interval_ms")) {
      unsigned long new_interval = cmdDoc["parameters"]["interval_ms"].as<unsigned long>();
      if (new_interval >= 30000 && new_interval <= 3600000) { // 30s to 1h
        reading_interval = new_interval;
        Serial.println("Reading interval updated to: " + String(new_interval) + "ms");
        saveConfiguration();
        sendStatusUpdate("reading_interval_updated");
      } else {
        Serial.println("Invalid interval range (30s-1h)");
        sendStatusUpdate("command_error");
      }
    }
  } else if (command == "toggle_sensor") {
    // Enable/disable specific sensor
    if (cmdDoc.containsKey("parameters")) {
      String sensor = cmdDoc["parameters"]["sensor"].as<String>();
      bool enabled = cmdDoc["parameters"]["enabled"].as<bool>();
      
      if (sensor == "dht22") {
        sensors.dht22_available = enabled;
      } else if (sensor == "bmp085") {
        sensors.bmp180_available = enabled;
      } else if (sensor == "rain") {
        sensors.mh_rd_available = enabled;
      } else if (sensor == "mq7") {
        sensors.mq7_available = enabled;
      } else if (sensor == "mq135") {
        sensors.mq135_available = enabled;
      } else if (sensor == "dsm501a") {
        sensors.dsm501a_available = enabled;
      } else if (sensor == "bh1750") {
        sensors.bh1750_available = enabled;
      }
      
      Serial.println("Sensor " + sensor + " " + (enabled ? "enabled" : "disabled"));
      saveConfiguration();
      sendStatusUpdate("sensor_toggled");
    }
  } else if (command == "set_calibration") {
    // Set calibration offset for sensors
    if (cmdDoc.containsKey("parameters")) {
      String sensor = cmdDoc["parameters"]["sensor"].as<String>();
      float offset = cmdDoc["parameters"]["offset"].as<float>();
      
      if (sensor == "temperature") {
        cal.temp_offset = offset;
      } else if (sensor == "humidity") {
        cal.humidity_offset = offset;
      } else if (sensor == "pressure") {
        cal.pressure_offset = offset;
      } else if (sensor == "light") {
        // Light calibration could be implemented as a scaling factor
        // For now, we'll use temp_offset as a general offset placeholder
        Serial.println("Light calibration not fully implemented");
      }
      
      Serial.println("Calibration updated for " + sensor + ": " + String(offset));
      saveConfiguration();
      sendStatusUpdate("calibration_updated");
    }
  } else if (command == "set_alert_threshold") {
    // Set alert thresholds (stored in NVS for future use)
    if (cmdDoc.containsKey("parameters")) {
      String parameter = cmdDoc["parameters"]["parameter"].as<String>();
      
      // For now, just acknowledge the command
      // In a full implementation, these would be stored and used for local alerting
      Serial.println("Alert threshold configured for: " + parameter);
      if (cmdDoc["parameters"].containsKey("min")) {
        Serial.println("Min threshold: " + String(cmdDoc["parameters"]["min"].as<float>()));
      }
      if (cmdDoc["parameters"].containsKey("max")) {
        Serial.println("Max threshold: " + String(cmdDoc["parameters"]["max"].as<float>()));
      }
      
      saveConfiguration();
      sendStatusUpdate("alert_threshold_set");
    }
  } else if (command == "wifi_config") {
    // Update WiFi credentials (use with caution!)
    if (cmdDoc.containsKey("parameters")) {
      String new_ssid = cmdDoc["parameters"]["ssid"].as<String>();
      String new_password = cmdDoc["parameters"]["password"].as<String>();
      
      // Validate SSID and password lengths
      if (new_ssid.length() > 0 && new_ssid.length() <= 32 && 
          new_password.length() >= 8 && new_password.length() <= 64) {
        
        Serial.println("WiFi credentials updated. Attempting reconnection...");
        
        // Disconnect current WiFi
        WiFi.disconnect();
        delay(1000);
        
        // Try connecting with new credentials
        WiFi.begin(new_ssid.c_str(), new_password.c_str());
        
        // Wait up to 10 seconds for connection
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
          delay(500);
          attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
          Serial.println("WiFi reconnected successfully");
          saveConfiguration();
          sendStatusUpdate("wifi_updated");
        } else {
          Serial.println("WiFi reconnection failed, reverting to WiFiManager");
          connectWiFi(); // Fall back to WiFiManager
          sendStatusUpdate("wifi_update_failed");
        }
      } else {
        Serial.println("Invalid WiFi credentials format");
        sendStatusUpdate("command_error");
      }
    }
  } else {
    Serial.println("Unknown command: " + command);
    sendStatusUpdate("unknown_command");
  }
}

// Interrupt service routine for rain sensor
void IRAM_ATTR rainPulseISR() {
  rain_pulses++;
}

// Deep Sleep Functions
void handleWakeUp() {
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  
  Serial.println("Boot #" + String(boot_count));
  
  switch(wakeup_reason) {
    case ESP_SLEEP_WAKEUP_TIMER:
      Serial.println("Wakeup caused by timer");
      break;
    case ESP_SLEEP_WAKEUP_EXT0:
      Serial.println("Wakeup caused by external signal using RTC_IO");
      break;
    case ESP_SLEEP_WAKEUP_EXT1:
      Serial.println("Wakeup caused by external signal using RTC_CNTL");
      break;
    case ESP_SLEEP_WAKEUP_TOUCHPAD:
      Serial.println("Wakeup caused by touchpad");
      break;
    case ESP_SLEEP_WAKEUP_ULP:
      Serial.println("Wakeup caused by ULP program");
      break;
    default:
      Serial.println("Wakeup was not caused by deep sleep: " + String(wakeup_reason));
      break;
  }
}

void enterDeepSleep() {
  Serial.println("Preparing for deep sleep...");
  
  // Save rain pulse count to RTC memory (survives deep sleep)
  persistent_rain_pulses = rain_pulses;
  
  // Send offline status
  sendStatusUpdate("going_to_sleep");
  delay(500); // Give time for MQTT message to send
  
  // Disconnect WiFi to save power
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  
  // Configure timer wakeup
  esp_sleep_enable_timer_wakeup(sleep_duration_ms * 1000); // Convert ms to microseconds
  
  // Optional: Enable wakeup on external interrupt (e.g., for rain sensor)
  // This allows immediate wakeup if it starts raining heavily
  if (sensors.mh_rd_available) {
    esp_sleep_enable_ext0_wakeup(GPIO_NUM_2, 0); // Rain sensor on GPIO2, wake on LOW
  }
  
  Serial.println("Going to sleep for " + String(sleep_duration_ms) + "ms");
  Serial.flush(); // Ensure all serial output is sent before sleeping
  
  // Enter deep sleep
  esp_deep_sleep_start();
}