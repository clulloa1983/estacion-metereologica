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
#define PLUVIOMETRO_PIN 2         // GPIO2 - DFRobots pluviometer (pulse-based)
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

// Calibration factors structure
struct CalibrationFactors {
  float temp_offset = 0.0;
  float temp_scale = 1.0;
  float humidity_offset = 0.0;
  float pressure_offset = 0.0;
  float rain_factor = 0.2; // mm per pulse
  float mq7_offset = 0.0;
  float mq135_offset = 0.0;
  float light_scale = 1.0;
  float light_offset = 0.0;
};

// Available sensors flags structure
struct SensorFlags {
  bool dht22_available = true;
  bool bmp180_available = true;
  bool bh1750_available = true;   // Enable BH1750 light sensor
  bool mh_rd_available = true;
  bool pluviometro_available = true;  // Enable DFRobots pluviometer
  bool mq7_available = false;
  bool mq135_available = false;
  bool dsm501a_available = false;
};

// Alert thresholds storage structure
struct AlertThresholds {
  float temp_min = -40.0;
  float temp_max = 60.0;
  float humidity_min = 0.0;
  float humidity_max = 100.0;
  float pressure_min = 800.0;
  float pressure_max = 1200.0;
  float light_min = 0.0;
  float light_max = 100000.0;
  bool alerts_enabled = false;
};

// Configuration backup structure
struct ConfigBackup {
  unsigned long reading_interval_backup;
  CalibrationFactors cal_backup;
  SensorFlags sensors_backup;
  bool deep_sleep_backup;
  unsigned long sleep_duration_backup;
};

// Global variables
volatile int rain_pulses = 0;
volatile int pluvio_pulses = 0;  // Pulse counter for DFRobots pluviometer
unsigned long last_reading = 0;
unsigned long reading_interval = 60000; // 1 minute (changeable via MQTT)
unsigned long last_wifi_check = 0;
int wifi_check_interval = 30000; // 30 seconds

// DFRobots pluviometer configuration
const float RESOLUCION_MM = 0.3;             // Resolution: 0.3mm per pulse
unsigned long ultimoResetLluvia = 0;         // For periodic rainfall reset
const unsigned long INTERVALO_RESET_LLUVIA = 3600000; // Reset every hour (3600000 ms)
float lluviaAcumulada = 0.0;                 // Total accumulated rainfall

// Configuration backup for rollback
ConfigBackup config_backup;

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

// Calibration factors instance
CalibrationFactors cal;

// Alert thresholds instance
AlertThresholds alert_thresholds;

// Available sensors flags instance
SensorFlags sensors;

// Function declarations
void IRAM_ATTR rainPulseISR();
void IRAM_ATTR pluvioPulseISR();  // ISR for pluviometer pulses
void loadConfigurationSimple();
void backupConfiguration();
void restoreConfiguration();
bool validateCommand(StaticJsonDocument<256>& cmdDoc);
bool validateParameter(String param, float value, float min, float max);
void applyCalibrationSafely(String sensor, float value);
void logCommandExecution(String command, bool success);
void checkRainReset();  // Function to reset accumulated rainfall

void setup() {
  Serial.begin(115200);
  Serial.println("=== Estación Meteorológica ESP32 ===");
  
  // Initialize I2C for BMP180 and BH1750 - FIRST, before anything else
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100); // Give I2C time to initialize
  
  // Initialize BMP180
  if (!bmp.begin()) {
    Serial.println("ERROR: No se pudo encontrar el sensor BMP180!");
    sensors.bmp180_available = false;
    // Try again after a delay
    delay(1000);
    if (!bmp.begin()) {
      Serial.println("BMP180 segunda prueba también falló");
    } else {
      sensors.bmp180_available = true;
      Serial.println("BMP180 inicializado en segundo intento");
    }
  } else {
    sensors.bmp180_available = true;
    Serial.println("BMP180 inicializado");
  }
  
  // Initialize BH1750 light sensor
  if (lightMeter.begin()) {
    sensors.bh1750_available = true;
    Serial.println("BH1750 light sensor inicializado");
  } else {
    Serial.println("ERROR: No se pudo encontrar el sensor BH1750");
    sensors.bh1750_available = false;
  }
  
  // Initialize DHT22
  dht.begin();
  delay(2000); // DHT22 needs time to initialize 
  Serial.println("DHT22 inicializado");
  
  // Configure rain sensor
  pinMode(RAIN_DIGITAL_PIN, INPUT);
  sensors.mh_rd_available = true;
  Serial.println("Sensor de lluvia MH-RD inicializado");
  
  // Setup interrupts for rain sensors
  attachInterrupt(digitalPinToInterrupt(RAIN_DIGITAL_PIN), rainPulseISR, FALLING);
  
  // Setup interrupt for DFRobots pluviometer (shared pin with MH-RD digital)
  // Note: Both sensors use the same pin, so we'll handle both in the ISR
  attachInterrupt(digitalPinToInterrupt(PLUVIOMETRO_PIN), pluvioPulseISR, FALLING);

  // Set sensor availability flags (some updated from initialization results above)
  sensors.dht22_available = true;
  sensors.pluviometro_available = true;  // DFRobots pluviometer enabled
  sensors.mq7_available = false;
  sensors.mq135_available = false;
  sensors.dsm501a_available = false;
  
  // Initialize rainfall tracking
  ultimoResetLluvia = millis();
  
  Serial.println("====================================");

  // Increment boot count and handle wake up
  ++boot_count;
  handleWakeUp();

  // Restore rain pulse count from RTC memory
  rain_pulses = persistent_rain_pulses;

  // Load configuration from NVS - but don't override sensor availability
  loadConfigurationSimple();
  
  // Connect to WiFi using WiFiManager
  connectWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, atoi(mqtt_port));
  client.setCallback(mqttCallback);
  client.setBufferSize(512); // Increase MQTT buffer size

  // Initialize dust sensor timing
  starttime = millis();

  Serial.println("ESP32 Weather Station Ready!");
  Serial.println("Sensors initialized:");
  Serial.printf("- DHT22: %s\n", sensors.dht22_available ? "OK" : "FAILED");
  Serial.printf("- BMP180: %s\n", sensors.bmp180_available ? "OK" : "FAILED");
  Serial.printf("- BH1750: %s\n", sensors.bh1750_available ? "OK" : "FAILED");
  Serial.printf("- MH-RD Rain: %s\n", sensors.mh_rd_available ? "OK" : "FAILED");
  Serial.printf("- DFRobots Pluviometer: %s\n", sensors.pluviometro_available ? "OK" : "FAILED");
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

// Function removed - initialization moved directly to setup()

void printAvailableSensors() {
  Serial.println("\n=== Available Sensors ===");
  if (sensors.dht22_available) Serial.println("🌡️ DHT22 - Temperature & Humidity");
  if (sensors.bmp180_available) Serial.println("🧭 BMP180 - Pressure");
  if (sensors.bh1750_available) Serial.println("💡 BH1750 - Light");
  if (sensors.mh_rd_available) Serial.println("🌧️ MH-RD - Rain Sensor (Analog/Digital)");
  if (sensors.pluviometro_available) Serial.println("☔ DFRobots - Pluviometer (Pulse-based)");
  if (sensors.mq7_available) Serial.println("🫁 MQ7 - Carbon Monoxide");
  if (sensors.mq135_available) Serial.println("🏭 MQ135 - Air Quality");
  if (sensors.dsm501a_available) Serial.println("🌫️ DSM501A - Dust Particles");
  Serial.println("========================\n");
}

void loadConfigurationSimple() {
  preferences.begin("weather-station", false);
  
  // Load only essential configuration - don't touch sensor flags
  preferences.getString("mqtt_server", mqtt_server, sizeof(mqtt_server));
  preferences.getString("mqtt_port", mqtt_port, sizeof(mqtt_port));
  preferences.getString("station_id", station_id, sizeof(station_id));
  preferences.getString("api_token", api_token, sizeof(api_token));
  
  // Load deep sleep configuration
  deep_sleep_enabled = preferences.getBool("deep_sleep_enabled", true);
  sleep_duration_ms = preferences.getULong("sleep_duration_ms", 60000);
  reading_interval = preferences.getULong("reading_interval", 60000);
  
  // Load calibration factors
  cal.temp_offset = preferences.getFloat("temp_offset", 0.0);
  cal.temp_scale = preferences.getFloat("temp_scale", 1.0);
  cal.humidity_offset = preferences.getFloat("humidity_offset", 0.0);
  cal.pressure_offset = preferences.getFloat("pressure_offset", 0.0);
  cal.rain_factor = preferences.getFloat("rain_factor", 0.2);
  
  preferences.end();
  
  Serial.println("Configuration loaded:");
  Serial.println("MQTT Server: " + String(mqtt_server));
  Serial.println("MQTT Port: " + String(mqtt_port));
  Serial.println("Station ID: " + String(station_id));
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
  sensors.bmp180_available = preferences.getBool("sensor_bmp180", true);
  sensors.bh1750_available = preferences.getBool("sensor_bh1750", false);
  sensors.mh_rd_available = preferences.getBool("sensor_rain", true);
  sensors.mq7_available = preferences.getBool("sensor_mq7", false);
  sensors.mq135_available = preferences.getBool("sensor_mq135", false);
  sensors.dsm501a_available = preferences.getBool("sensor_dsm501a", false);
  
  // Load extended calibration factors
  cal.light_scale = preferences.getFloat("light_scale", 1.0);
  cal.light_offset = preferences.getFloat("light_offset", 0.0);
  
  // Load alert thresholds
  alert_thresholds.temp_min = preferences.getFloat("alert_temp_min", -40.0);
  alert_thresholds.temp_max = preferences.getFloat("alert_temp_max", 60.0);
  alert_thresholds.humidity_min = preferences.getFloat("alert_hum_min", 0.0);
  alert_thresholds.humidity_max = preferences.getFloat("alert_hum_max", 100.0);
  alert_thresholds.pressure_min = preferences.getFloat("alert_pres_min", 800.0);
  alert_thresholds.pressure_max = preferences.getFloat("alert_pres_max", 1200.0);
  alert_thresholds.light_min = preferences.getFloat("alert_light_min", 0.0);
  alert_thresholds.light_max = preferences.getFloat("alert_light_max", 100000.0);
  alert_thresholds.alerts_enabled = preferences.getBool("alerts_enabled", false);
  
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
  preferences.putFloat("light_scale", cal.light_scale);
  preferences.putFloat("light_offset", cal.light_offset);
  
  // Save alert thresholds
  preferences.putFloat("alert_temp_min", alert_thresholds.temp_min);
  preferences.putFloat("alert_temp_max", alert_thresholds.temp_max);
  preferences.putFloat("alert_hum_min", alert_thresholds.humidity_min);
  preferences.putFloat("alert_hum_max", alert_thresholds.humidity_max);
  preferences.putFloat("alert_pres_min", alert_thresholds.pressure_min);
  preferences.putFloat("alert_pres_max", alert_thresholds.pressure_max);
  preferences.putFloat("alert_light_min", alert_thresholds.light_min);
  preferences.putFloat("alert_light_max", alert_thresholds.light_max);
  preferences.putBool("alerts_enabled", alert_thresholds.alerts_enabled);
  
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
  Serial.println("📊 LECTURAS DE SENSORES:");
  Serial.println("");
  
  // Create JSON document
  StaticJsonDocument<512> doc;
  // Note: station_id is not included in JSON payload as it's already in the MQTT topic
  doc["timestamp"] = getTimestamp();

  // ==================== DHT22 ====================
  float humidity = dht.readHumidity();
  float temp_dht = dht.readTemperature();
  
  Serial.println("🌡️  DHT22:");
  if (isnan(humidity) || isnan(temp_dht)) {
    Serial.println("   ❌ Error leyendo DHT22");
  } else {
    temp_dht = calibrateTemperature(temp_dht);
    humidity = calibrateHumidity(humidity);
    doc["temperature"] = round(temp_dht * 100.0) / 100.0;
    doc["humidity"] = round(humidity * 100.0) / 100.0;
    
    Serial.print("   Temperatura: ");
    Serial.print(temp_dht);
    Serial.println(" °C");
    Serial.print("   Humedad: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  // ==================== BMP180 ====================
  if (sensors.bmp180_available) {
    float temp_bmp = bmp.readTemperature();
    float presion = bmp.readPressure();
    float altitud = bmp.readAltitude();
    
    Serial.println("🌤️  BMP180:");
    Serial.print("   Temperatura: ");
    Serial.print(temp_bmp);
    Serial.println(" °C");
    Serial.print("   Presión: ");
    Serial.print(presion / 100.0);
    Serial.println(" hPa");
    Serial.print("   Altitud: ");
    Serial.print(altitud);
    Serial.println(" m");
    
    // Apply calibration and add to JSON
    float pressure_hpa = calibratePressure(presion / 100.0);
    doc["pressure"] = round(pressure_hpa * 100.0) / 100.0;
    doc["bmp_temperature"] = round(temp_bmp * 100.0) / 100.0;
    doc["altitude"] = round(altitud * 100.0) / 100.0;
  }

  // ==================== BH1750 LIGHT SENSOR ====================
  if (sensors.bh1750_available) {
    float lux = lightMeter.readLightLevel();
    Serial.println("💡 BH1750 Light Sensor:");
    if (lux >= 0) {
      lux = calibrateLight(lux);
      doc["light_level"] = round(lux * 100.0) / 100.0;
      Serial.print("   Light Level: ");
      Serial.print(lux);
      Serial.println(" lux");
    } else {
      Serial.println("   ❌ Error reading BH1750");
    }
  }

  // ==================== SENSOR LLUVIA ====================
  if (sensors.mh_rd_available) {
    int lluvia_analog = analogRead(RAIN_ANALOG_PIN);
    int lluvia_digital = digitalRead(RAIN_DIGITAL_PIN);
    
    // Convertir lectura analógica a porcentaje (0-100%)
    int lluvia_porcentaje = map(lluvia_analog, 0, 4095, 0, 100);
    
    // Determinar estado de lluvia
    String estado_lluvia;
    if (lluvia_porcentaje < 20) {
      estado_lluvia = "Lluvia INTENSA";
    } else if (lluvia_porcentaje < 40) {
      estado_lluvia = "Lluvia MODERADA";
    } else if (lluvia_porcentaje < 60) {
      estado_lluvia = "Lluvia LIGERA";
    } else {
      estado_lluvia = "SIN LLUVIA";
    }
    
    Serial.println("🌧️  SENSOR LLUVIA:");
    Serial.print("   Valor analógico: ");
    Serial.println(lluvia_analog);
    Serial.print("   Intensidad: ");
    Serial.print(lluvia_porcentaje);
    Serial.println("%");
    Serial.print("   Estado: ");
    Serial.println(estado_lluvia);
    Serial.print("   Digital: ");
    Serial.println(lluvia_digital == LOW ? "DETECTA LLUVIA" : "SIN LLUVIA");
    
    // Add to JSON
    doc["rain_analog"] = lluvia_analog;
    doc["rain_percentage"] = lluvia_porcentaje;
    doc["rain_digital"] = lluvia_digital;
    doc["rain_detected"] = (lluvia_digital == LOW);
    
    // Also include pulse count for compatibility
    float rainfall = rain_pulses * cal.rain_factor;
    doc["rainfall"] = round(rainfall * 100.0) / 100.0;
    rain_pulses = 0; // Reset counter
  }

  // ==================== PLUVIÓMETRO DFROBOTS ====================
  if (sensors.pluviometro_available) {
    // Check for new pulses from DFRobots pluviometer
    float lluvia_detectada = 0;
    if (pluvio_pulses > 0) {
      // Disable interrupts temporarily
      noInterrupts();
      int pulsosActuales = pluvio_pulses;
      pluvio_pulses = 0;
      interrupts();
      
      // Calculate detected rainfall
      lluvia_detectada = pulsosActuales * RESOLUCION_MM;
      lluviaAcumulada += lluvia_detectada;
      
      Serial.println("☔ DFRobots Pluviometer:");
      Serial.print("   🌧️ Rainfall detected: ");
      Serial.print(lluvia_detectada);
      Serial.println(" mm");
      Serial.print("   📊 Accumulated rainfall: ");
      Serial.print(lluviaAcumulada);
      Serial.println(" mm");
      Serial.print("   📏 Number of pulses: ");
      Serial.println(pulsosActuales);
    } else {
      Serial.println("☔ DFRobots Pluviometer: No rainfall detected");
    }
    
    // Add DFRobots pluviometer data to JSON
    doc["pluvio_rainfall"] = round(lluvia_detectada * 100.0) / 100.0;
    doc["pluvio_accumulated"] = round(lluviaAcumulada * 100.0) / 100.0;
    doc["pluvio_pulses"] = pluvio_pulses;
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

  // Check for periodic rainfall reset
  checkRainReset();

  // Add system info
  doc["uptime"] = millis() / 1000;
  doc["signal_strength"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();

  Serial.println("==========================================");
  Serial.println("");

  // Convert to string and send
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Sending MQTT data: " + payload);
  
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

float calibrateLight(float raw_light) {
  return (raw_light * cal.light_scale) + cal.light_offset;
}

// Function removed - rainfall calculation moved to readAndSendData() to match simple version

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
  sensorStatus["pluviometer"] = sensors.pluviometro_available;
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
    logCommandExecution("parse_error", false);
    return;
  }
  
  String command = cmdDoc["command"];
  Serial.println("Processing command: " + command);
  
  // Validate command before processing
  if (!validateCommand(cmdDoc)) {
    Serial.println("Command validation failed");
    logCommandExecution(command, false);
    sendStatusUpdate("command_validation_failed");
    return;
  }
  
  // Backup current configuration before making changes
  backupConfiguration();
  
  bool command_success = true;
  
  if (command == "status") {
    sendStatusUpdate("online");
  } else if (command == "restart") {
    Serial.println("Restart command received");
    logCommandExecution(command, true);
    delay(1000);
    ESP.restart();
  } else if (command == "sensor_check") {
    // Re-check sensor availability
    sensors.bmp180_available = bmp.begin();
    printAvailableSensors();
    sendStatusUpdate("sensor_check_complete");
  } else if (command == "sleep_mode") {
    // Toggle deep sleep mode with validation
    if (cmdDoc.containsKey("enabled")) {
      deep_sleep_enabled = cmdDoc["enabled"].as<bool>();
    }
    if (cmdDoc.containsKey("interval_ms")) {
      unsigned long new_sleep = cmdDoc["interval_ms"].as<unsigned long>();
      if (validateParameter("sleep_duration", new_sleep, 30000, 3600000)) {
        sleep_duration_ms = new_sleep;
        reading_interval = sleep_duration_ms;
      } else {
        command_success = false;
      }
    }
    
    if (command_success) {
      Serial.println("Deep sleep " + String(deep_sleep_enabled ? "enabled" : "disabled"));
      Serial.println("Sleep duration: " + String(sleep_duration_ms) + "ms");
      saveConfiguration();
      sendStatusUpdate("sleep_mode_updated");
    } else {
      restoreConfiguration();
      sendStatusUpdate("command_error");
    }
  } else if (command == "wake_up") {
    deep_sleep_enabled = false;
    Serial.println("Deep sleep disabled via wake_up command");
    saveConfiguration();
    sendStatusUpdate("awake");
  } else if (command == "set_reading_interval") {
    // Enhanced reading interval control with strict validation
    if (cmdDoc.containsKey("parameters") && cmdDoc["parameters"].containsKey("interval_ms")) {
      unsigned long new_interval = cmdDoc["parameters"]["interval_ms"].as<unsigned long>();
      if (validateParameter("reading_interval", new_interval, 30000, 3600000)) {
        reading_interval = new_interval;
        Serial.println("Reading interval updated to: " + String(new_interval) + "ms");
        saveConfiguration();
        sendStatusUpdate("reading_interval_updated");
      } else {
        restoreConfiguration();
        sendStatusUpdate("invalid_interval_range");
        command_success = false;
      }
    }
  } else if (command == "toggle_sensor") {
    // Enhanced sensor toggle with all 7 sensors
    if (cmdDoc.containsKey("parameters")) {
      String sensor = cmdDoc["parameters"]["sensor"].as<String>();
      bool enabled = cmdDoc["parameters"]["enabled"].as<bool>();
      
      bool sensor_found = true;
      if (sensor == "dht22") {
        sensors.dht22_available = enabled;
      } else if (sensor == "bmp180" || sensor == "bmp085") {
        sensors.bmp180_available = enabled;
      } else if (sensor == "bh1750" || sensor == "light") {
        sensors.bh1750_available = enabled;
      } else if (sensor == "rain" || sensor == "mh_rd") {
        sensors.mh_rd_available = enabled;
      } else if (sensor == "pluviometer" || sensor == "dfrobots") {
        sensors.pluviometro_available = enabled;
      } else if (sensor == "mq7" || sensor == "co") {
        sensors.mq7_available = enabled;
      } else if (sensor == "mq135" || sensor == "air_quality") {
        sensors.mq135_available = enabled;
      } else if (sensor == "dsm501a" || sensor == "dust") {
        sensors.dsm501a_available = enabled;
      } else {
        sensor_found = false;
        command_success = false;
      }
      
      if (sensor_found) {
        Serial.println("Sensor " + sensor + " " + (enabled ? "enabled" : "disabled"));
        saveConfiguration();
        sendStatusUpdate("sensor_toggled");
      } else {
        restoreConfiguration();
        sendStatusUpdate("unknown_sensor");
      }
    }
  } else if (command == "set_calibration") {
    // Enhanced calibration system for all sensor types
    if (cmdDoc.containsKey("parameters")) {
      String sensor = cmdDoc["parameters"]["sensor"].as<String>();
      
      if (cmdDoc["parameters"].containsKey("offset")) {
        float offset = cmdDoc["parameters"]["offset"].as<float>();
        applyCalibrationSafely(sensor, offset);
      }
      
      if (cmdDoc["parameters"].containsKey("scale")) {
        float scale = cmdDoc["parameters"]["scale"].as<float>();
        if (sensor == "temperature" && validateParameter("temp_scale", scale, 0.5, 2.0)) {
          cal.temp_scale = scale;
        } else if (sensor == "light" && validateParameter("light_scale", scale, 0.1, 10.0)) {
          cal.light_scale = scale;
        } else {
          command_success = false;
        }
      }
      
      if (command_success) {
        Serial.println("Calibration updated for " + sensor);
        saveConfiguration();
        sendStatusUpdate("calibration_updated");
      } else {
        restoreConfiguration();
        sendStatusUpdate("calibration_error");
      }
    }
  } else if (command == "set_alert_threshold") {
    // Enhanced alert threshold configuration
    if (cmdDoc.containsKey("parameters")) {
      String parameter = cmdDoc["parameters"]["parameter"].as<String>();
      
      bool threshold_set = false;
      if (parameter == "temperature") {
        if (cmdDoc["parameters"].containsKey("min") && 
            validateParameter("temp_min", cmdDoc["parameters"]["min"].as<float>(), -50.0, 50.0)) {
          alert_thresholds.temp_min = cmdDoc["parameters"]["min"].as<float>();
          threshold_set = true;
        }
        if (cmdDoc["parameters"].containsKey("max") && 
            validateParameter("temp_max", cmdDoc["parameters"]["max"].as<float>(), -40.0, 70.0)) {
          alert_thresholds.temp_max = cmdDoc["parameters"]["max"].as<float>();
          threshold_set = true;
        }
      } else if (parameter == "humidity") {
        if (cmdDoc["parameters"].containsKey("min") && 
            validateParameter("hum_min", cmdDoc["parameters"]["min"].as<float>(), 0.0, 90.0)) {
          alert_thresholds.humidity_min = cmdDoc["parameters"]["min"].as<float>();
          threshold_set = true;
        }
        if (cmdDoc["parameters"].containsKey("max") && 
            validateParameter("hum_max", cmdDoc["parameters"]["max"].as<float>(), 10.0, 100.0)) {
          alert_thresholds.humidity_max = cmdDoc["parameters"]["max"].as<float>();
          threshold_set = true;
        }
      } else if (parameter == "pressure") {
        if (cmdDoc["parameters"].containsKey("min") && 
            validateParameter("pres_min", cmdDoc["parameters"]["min"].as<float>(), 800.0, 1100.0)) {
          alert_thresholds.pressure_min = cmdDoc["parameters"]["min"].as<float>();
          threshold_set = true;
        }
        if (cmdDoc["parameters"].containsKey("max") && 
            validateParameter("pres_max", cmdDoc["parameters"]["max"].as<float>(), 900.0, 1200.0)) {
          alert_thresholds.pressure_max = cmdDoc["parameters"]["max"].as<float>();
          threshold_set = true;
        }
      }
      
      if (cmdDoc["parameters"].containsKey("enabled")) {
        alert_thresholds.alerts_enabled = cmdDoc["parameters"]["enabled"].as<bool>();
        threshold_set = true;
      }
      
      if (threshold_set) {
        Serial.println("Alert threshold configured for: " + parameter);
        saveConfiguration();
        sendStatusUpdate("alert_threshold_set");
      } else {
        restoreConfiguration();
        sendStatusUpdate("threshold_error");
        command_success = false;
      }
    }
  } else if (command == "wifi_config") {
    // Enhanced WiFi configuration with validation
    if (cmdDoc.containsKey("parameters")) {
      String new_ssid = cmdDoc["parameters"]["ssid"].as<String>();
      String new_password = cmdDoc["parameters"]["password"].as<String>();
      
      if (new_ssid.length() > 0 && new_ssid.length() <= 32 && 
          new_password.length() >= 8 && new_password.length() <= 64) {
        
        Serial.println("WiFi credentials updated. Attempting reconnection...");
        
        WiFi.disconnect();
        delay(1000);
        WiFi.begin(new_ssid.c_str(), new_password.c_str());
        
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
          Serial.println("WiFi reconnection failed");
          restoreConfiguration();
          connectWiFi();
          sendStatusUpdate("wifi_update_failed");
          command_success = false;
        }
      } else {
        Serial.println("Invalid WiFi credentials format");
        sendStatusUpdate("invalid_wifi_params");
        command_success = false;
      }
    }
  } else if (command == "factory_reset") {
    // Factory reset command
    Serial.println("Factory reset initiated");
    preferences.begin("weather-station", false);
    preferences.clear();
    preferences.end();
    sendStatusUpdate("factory_reset_complete");
    delay(2000);
    ESP.restart();
  } else {
    Serial.println("Unknown command: " + command);
    sendStatusUpdate("unknown_command");
    command_success = false;
  }
  
  logCommandExecution(command, command_success);
}

// Interrupt service routine for rain sensor (MH-RD)
void IRAM_ATTR rainPulseISR() {
  rain_pulses++;
}

// Interrupt service routine for DFRobots pluviometer
void IRAM_ATTR pluvioPulseISR() {
  pluvio_pulses++;
}

// Function to check and reset accumulated rainfall periodically
void checkRainReset() {
  // Reset accumulated rainfall periodically (every hour)
  if (millis() - ultimoResetLluvia >= INTERVALO_RESET_LLUVIA) {
    if (lluviaAcumulada > 0) {
      Serial.print("🔄 Automatic reset - Accumulated rainfall last hour: ");
      Serial.print(lluviaAcumulada);
      Serial.println(" mm");
    }
    lluviaAcumulada = 0.0;
    ultimoResetLluvia = millis();
  }
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

// Configuration backup and rollback functions
void backupConfiguration() {
  config_backup.reading_interval_backup = reading_interval;
  config_backup.cal_backup = cal;
  config_backup.sensors_backup = sensors;
  config_backup.deep_sleep_backup = deep_sleep_enabled;
  config_backup.sleep_duration_backup = sleep_duration_ms;
}

void restoreConfiguration() {
  reading_interval = config_backup.reading_interval_backup;
  cal = config_backup.cal_backup;
  sensors = config_backup.sensors_backup;
  deep_sleep_enabled = config_backup.deep_sleep_backup;
  sleep_duration_ms = config_backup.sleep_duration_backup;
  Serial.println("Configuration restored from backup");
}

// Command validation functions
bool validateCommand(StaticJsonDocument<256>& cmdDoc) {
  // Basic command structure validation
  if (!cmdDoc.containsKey("command")) {
    Serial.println("Command field missing");
    return false;
  }
  
  String command = cmdDoc["command"];
  
  // Validate command against whitelist
  if (command == "status" || command == "restart" || command == "sensor_check" ||
      command == "sleep_mode" || command == "wake_up" || command == "set_reading_interval" ||
      command == "toggle_sensor" || command == "set_calibration" || 
      command == "set_alert_threshold" || command == "wifi_config" || command == "factory_reset") {
    return true;
  }
  
  Serial.println("Unknown or unauthorized command: " + command);
  return false;
}

bool validateParameter(String param, float value, float min, float max) {
  if (value >= min && value <= max) {
    Serial.println("Parameter " + param + " validated: " + String(value));
    return true;
  } else {
    Serial.println("Parameter " + param + " out of range: " + String(value) + 
                   " (valid: " + String(min) + "-" + String(max) + ")");
    return false;
  }
}

void applyCalibrationSafely(String sensor, float value) {
  // Apply calibration with safety bounds
  if (sensor == "temperature") {
    if (validateParameter("temp_offset", value, -10.0, 10.0)) {
      cal.temp_offset = value;
    }
  } else if (sensor == "humidity") {
    if (validateParameter("humidity_offset", value, -20.0, 20.0)) {
      cal.humidity_offset = value;
    }
  } else if (sensor == "pressure") {
    if (validateParameter("pressure_offset", value, -50.0, 50.0)) {
      cal.pressure_offset = value;
    }
  } else if (sensor == "light") {
    if (validateParameter("light_offset", value, -1000.0, 1000.0)) {
      cal.light_offset = value;
    }
  } else if (sensor == "rain") {
    if (validateParameter("rain_factor", value, 0.1, 2.0)) {
      cal.rain_factor = value;
    }
  } else if (sensor == "mq7") {
    if (validateParameter("mq7_offset", value, -5.0, 5.0)) {
      cal.mq7_offset = value;
    }
  } else if (sensor == "mq135") {
    if (validateParameter("mq135_offset", value, -5.0, 5.0)) {
      cal.mq135_offset = value;
    }
  } else {
    Serial.println("Unknown sensor for calibration: " + sensor);
  }
}

void logCommandExecution(String command, bool success) {
  Serial.println("Command '" + command + "' execution: " + (success ? "SUCCESS" : "FAILED"));
  
  // Send command execution log via MQTT
  StaticJsonDocument<256> logDoc;
  logDoc["station_id"] = station_id;
  logDoc["command"] = command;
  logDoc["success"] = success;
  logDoc["timestamp"] = getTimestamp();
  logDoc["uptime"] = millis() / 1000;
  
  String logPayload;
  serializeJson(logDoc, logPayload);
  
  String logTopic = "weather/logs/" + String(station_id);
  client.publish(logTopic.c_str(), logPayload.c_str());
}