#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <esp_sleep.h>

// Pin definitions
#define DHT_PIN 4
#define WIND_SPEED_PIN 2
#define WIND_DIR_PIN A0
#define RAIN_PIN 3
#define BATTERY_PIN A1

// Sensor configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;

// WiFi and MQTT configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "your-mqtt-server.com";
const int mqtt_port = 1883;
const char* station_id = "STATION_001";

WiFiClient espClient;
PubSubClient client(espClient);

// Global variables
volatile int wind_pulses = 0;
volatile int rain_pulses = 0;
unsigned long last_reading = 0;
unsigned long reading_interval = 60000; // 1 minute
unsigned long last_wifi_check = 0;
int wifi_check_interval = 30000; // 30 seconds

// Calibration factors
struct CalibrationFactors {
  float temp_offset = 0.0;
  float temp_scale = 1.0;
  float humidity_offset = 0.0;
  float pressure_offset = 0.0;
  float wind_speed_factor = 2.4; // pulses per second to km/h
  float wind_dir_offset = 0.0;
} cal;

void setup() {
  Serial.begin(115200);
  Serial.println("Weather Station Starting...");

  // Initialize pins
  pinMode(WIND_SPEED_PIN, INPUT_PULLUP);
  pinMode(RAIN_PIN, INPUT_PULLUP);
  pinMode(BATTERY_PIN, INPUT);

  // Initialize sensors
  dht.begin();
  if (!bmp.begin()) {
    Serial.println("Could not find BMP280 sensor!");
  }

  // Configure BMP280
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);

  // Setup interrupts for wind and rain
  attachInterrupt(digitalPinToInterrupt(WIND_SPEED_PIN), windPulseISR, FALLING);
  attachInterrupt(digitalPinToInterrupt(RAIN_PIN), rainPulseISR, FALLING);

  // Connect to WiFi
  connectWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  Serial.println("Weather Station Ready!");
}

void loop() {
  unsigned long current_time = millis();

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

  // Read and send data at specified intervals
  if (current_time - last_reading >= reading_interval) {
    readAndSendData();
    last_reading = current_time;
  }

  delay(100);
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected to WiFi. IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi");
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = String(station_id) + "_" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to command topics
      String commandTopic = "weather/command/" + String(station_id);
      client.subscribe(commandTopic.c_str());
      
      // Send online status
      sendStatusUpdate("online");
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void readAndSendData() {
  Serial.println("Reading sensors...");
  
  // Create JSON document
  StaticJsonDocument<1024> doc;
  doc["station_id"] = station_id;
  doc["timestamp"] = getTimestamp();

  // Read DHT22 (Temperature and Humidity)
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

  // Read BMP280 (Pressure)
  if (bmp.begin()) {
    float pressure = bmp.readPressure() / 100.0F; // Convert Pa to hPa
    pressure = calibratePressure(pressure);
    doc["pressure"] = round(pressure * 100.0) / 100.0;
  }

  // Calculate wind speed (pulses in last minute)
  float wind_speed = calculateWindSpeed();
  doc["wind_speed"] = round(wind_speed * 100.0) / 100.0;
  
  // Read wind direction
  float wind_direction = readWindDirection();
  doc["wind_direction"] = round(wind_direction);

  // Calculate rainfall (pulses in last minute)
  float rainfall = calculateRainfall();
  doc["rainfall"] = round(rainfall * 100.0) / 100.0;

  // Read battery voltage
  float battery_voltage = readBatteryVoltage();
  doc["battery_voltage"] = round(battery_voltage * 100.0) / 100.0;

  // Add system info
  doc["uptime"] = millis() / 1000;
  doc["signal_strength"] = WiFi.RSSI();

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

float calculateWindSpeed() {
  float speed = (wind_pulses * cal.wind_speed_factor) / (reading_interval / 1000.0);
  wind_pulses = 0; // Reset counter
  return speed;
}

float readWindDirection() {
  int raw_value = analogRead(WIND_DIR_PIN);
  float direction = map(raw_value, 0, 4095, 0, 360);
  direction = fmod(direction + cal.wind_dir_offset, 360.0);
  return direction;
}

float calculateRainfall() {
  float rainfall = rain_pulses * 0.2; // 0.2mm per pulse (typical)
  rain_pulses = 0; // Reset counter
  return rainfall;
}

float readBatteryVoltage() {
  int raw_value = analogRead(BATTERY_PIN);
  // Convert ADC reading to voltage (assuming voltage divider)
  float voltage = (raw_value / 4095.0) * 3.3 * 4.0; // 4:1 voltage divider
  return voltage;
}

String getTimestamp() {
  // Simple timestamp - in production use NTP
  return String(millis());
}

void sendStatusUpdate(const char* status) {
  StaticJsonDocument<256> statusDoc;
  statusDoc["station_id"] = station_id;
  statusDoc["status"] = status;
  statusDoc["timestamp"] = getTimestamp();
  statusDoc["uptime"] = millis() / 1000;
  statusDoc["battery_voltage"] = readBatteryVoltage();
  statusDoc["signal_strength"] = WiFi.RSSI();

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
  } else if (command == "sleep") {
    int sleep_time = cmdDoc["duration"] | 60; // Default 60 seconds
    Serial.println("Entering deep sleep for " + String(sleep_time) + " seconds");
    esp_sleep_enable_timer_wakeup(sleep_time * 1000000); // Convert to microseconds
    esp_deep_sleep_start();
  }
}

// Interrupt service routines
void IRAM_ATTR windPulseISR() {
  wind_pulses++;
}

void IRAM_ATTR rainPulseISR() {
  rain_pulses++;
}