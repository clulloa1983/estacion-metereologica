#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <BH1750.h>

// Pin definitions for ESP32 DevKit V1
#define DHT_PIN 4         // GPIO4 - DHT22 sensor
#define RAIN_PIN 2        // GPIO2 - MH-RD rain sensor
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

// WiFi and MQTT configuration
const char* ssid = "Depa1313";
const char* password = "claudio1983";
const char* mqtt_server = "192.168.1.98";
const int mqtt_port = 1883;
const char* station_id = "ESP32_STATION_001";

WiFiClient espClient;
PubSubClient client(espClient);

// Global variables
volatile int rain_pulses = 0;
unsigned long last_reading = 0;
unsigned long reading_interval = 60000; // 1 minute
unsigned long last_wifi_check = 0;
int wifi_check_interval = 30000; // 30 seconds

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
  Serial.println("ESP32 Weather Station Starting...");

  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);

  // Initialize pins
  pinMode(RAIN_PIN, INPUT_PULLUP);
  pinMode(MQ135_PIN, INPUT);
  pinMode(DSM501A_PIN, INPUT);

  // Initialize sensors and check availability
  initializeSensors();

  // Setup interrupt for rain sensor
  if (sensors.mh_rd_available) {
    attachInterrupt(digitalPinToInterrupt(RAIN_PIN), rainPulseISR, FALLING);
  }

  // Connect to WiFi
  connectWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(512); // Increase MQTT buffer size

  // Initialize dust sensor timing
  starttime = millis();

  Serial.println("ESP32 Weather Station Ready!");
  printAvailableSensors();
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
  Serial.println(sensors.bmp180_available ? "✓ BMP180 detected" : "✗ BMP180 not found");

  // Test BH1750
  sensors.bh1750_available = lightMeter.begin();
  Serial.println(sensors.bh1750_available ? "✓ BH1750 detected" : "✗ BH1750 not found");

  // Test rain sensor (only if needed for this test)
  sensors.mh_rd_available = false;
  Serial.println("✗ MH-RD rain sensor disabled for testing");

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
    pressure = calibratePressure(pressure);
    doc["pressure"] = round(pressure * 100.0) / 100.0;
  }

  // Read BH1750 (Light)
  if (sensors.bh1750_available) {
    float lux = lightMeter.readLightLevel();
    if (lux >= 0) {
      doc["light_level"] = round(lux * 100.0) / 100.0;
    }
  }

  // Calculate rainfall (pulses in last minute)
  if (sensors.mh_rd_available) {
    float rainfall = calculateRainfall();
    doc["rainfall"] = round(rainfall * 100.0) / 100.0;
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
  }
}

// Interrupt service routine for rain sensor
void IRAM_ATTR rainPulseISR() {
  rain_pulses++;
}