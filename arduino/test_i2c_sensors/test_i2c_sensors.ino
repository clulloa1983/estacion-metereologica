#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <BH1750.h>
#include <DHT.h>

// Crear instancias de los sensores
Adafruit_BMP085 bmp;
BH1750 lightMeter;
DHT dht(4, DHT22);

// Pines I2C para ESP32
#define SDA_PIN 21
#define SCL_PIN 22

// Configuración del sensor DHT22
#define DHT_PIN 4                            // GPIO donde conectar el sensor DHT22
#define DHT_TYPE DHT22                       // Tipo de sensor DHT

// Configuración del pluviómetro DFRobots
#define PLUVIOMETRO_PIN 2                    // GPIO donde conectar el cable verde
volatile int contadorPulsos = 0;             // Contador de pulsos (volátil para interrupciones)
float lluviaAcumulada = 0.0;                 // Lluvia total acumulada
const float RESOLUCION_MM = 0.3;             // Resolución: 0.3mm por pulso
unsigned long ultimoResetLluvia = 0;         // Para reset periódico de lluvia acumulada
const unsigned long INTERVALO_RESET_LLUVIA = 3600000; // Reset cada hora (3600000 ms)

// Configuración del sensor de lluvia MH-RD
#define MHRD_DIGITAL_PIN 12                  // GPIO digital para detección ON/OFF
#define MHRD_ANALOG_PIN 34                   // GPIO analógico para intensidad (ADC1_CH6)
#define MHRD_VCC_PIN 13                      // GPIO para alimentar el sensor (opcional)
const int MHRD_THRESHOLD_DRY = 3000;         // Valor ADC para condición seca (ajustable)
const int MHRD_THRESHOLD_WET = 1000;         // Valor ADC para condición muy húmeda (ajustable)

// Configuración del sensor de viento ZTS-3000
#define WIND_SPEED_PIN 35                    // GPIO analógico para velocidad del viento (ADC1_CH7)
#define WIND_DIRECTION_PIN 32                // GPIO analógico para dirección del viento (opcional)
#define WIND_VCC_PIN 25                      // GPIO para alimentar el sensor (opcional, 5V)
const float WIND_MAX_SPEED = 30.0;           // Velocidad máxima del sensor (m/s)
const float WIND_MAX_VOLTAGE = 5.0;          // Voltaje máximo de salida (V)
const int WIND_ADC_MAX = 4095;               // Resolución ADC 12-bit
const int WIND_SAMPLES = 10;                 // Número de muestras para promediar
const float WIND_CALIBRATION_OFFSET = 0.0;   // Offset de calibración
const float WIND_CALIBRATION_FACTOR = 1.0;   // Factor de calibración

// Variables para almacenar lecturas
float temperature = 0;
float pressure = 0;
float altitude = 0;
float lightLevel = 0;
float lluviaDetectada = 0;

// Variables para el sensor DHT22
float dhtTemperature = 0;
float dhtHumidity = 0;

// Variables para el sensor MH-RD
int mhrdDigitalValue = 0;                    // Lectura digital (0 = lluvia, 1 = seco)
int mhrdAnalogValue = 0;                     // Lectura analógica (0-4095)
String mhrdStatus = "SECO";                  // Estado interpretado del sensor

// Variables para el sensor de viento ZTS-3000
float windSpeed = 0.0;                       // Velocidad del viento en m/s
float windDirection = 0.0;                   // Dirección del viento en grados (opcional)
int windSpeedRaw = 0;                        // Valor ADC crudo de velocidad
int windDirectionRaw = 0;                    // Valor ADC crudo de dirección
String windSpeedCategory = "CALMA";          // Categoría de viento según escala Beaufort

// Función de interrupción para contar pulsos del pluviómetro
void IRAM_ATTR contarPulso() {
  contadorPulsos++;
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== Test de Sensores I2C + Sensores de Lluvia + Sensor de Viento ===");
  Serial.println("BMP180 + GY-30 (BH1750) + DHT22 + Pluviómetro + Sensor MH-RD + ZTS-3000");
  Serial.println("=====================================================================");
  
  // Configurar pines I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Escanear dispositivos I2C
  Serial.println("\n1. Escaneando dispositivos I2C...");
  scanI2CDevices();
  
  // Inicializar BMP180
  Serial.println("\n2. Inicializando BMP180...");
  if (!bmp.begin()) {
    Serial.println("❌ ERROR: No se pudo encontrar el sensor BMP180");
    Serial.println("   Verifica las conexiones:");
    Serial.println("   VCC -> 3.3V, GND -> GND, SDA -> GPIO21, SCL -> GPIO22");
  } else {
    Serial.println("✅ BMP180 inicializado correctamente");
  }
  
  // Inicializar GY-30 (BH1750)
  Serial.println("\n3. Inicializando BH1750...");
  if (lightMeter.begin()) {
    Serial.println("✅ BH1750 inicializado correctamente");
  } else {
    Serial.println("❌ ERROR: No se pudo encontrar el sensor BH1750");
    Serial.println("   Verifica las conexiones:");
    Serial.println("   VCC -> 3.3V, GND -> GND, SDA -> GPIO21, SCL -> GPIO22");
  }
  
  // Inicializar DHT22
  Serial.println("\n4. Inicializando DHT22...");
  dht.begin();
  Serial.println("✅ DHT22 inicializado correctamente");
  Serial.println("   Conexiones:");
  Serial.println("   VCC -> 3.3V, GND -> GND, DATA -> GPIO4");
  Serial.println("   Nota: Incluir resistencia pull-up de 10kΩ entre VCC y DATA");
  
  // Inicializar Pluviómetro DFRobots
  Serial.println("\n5. Inicializando Pluviómetro DFRobots...");
  pinMode(PLUVIOMETRO_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PLUVIOMETRO_PIN), contarPulso, FALLING);
  Serial.println("✅ Pluviómetro DFRobots inicializado correctamente");
  Serial.println("   Conexiones:");
  Serial.println("   Cable ROJO -> 3.3V, Cable VERDE -> GPIO2");
  Serial.println("   Resolución: 0.3mm por pulso");
  
  // Inicializar Sensor de Lluvia MH-RD
  Serial.println("\n6. Inicializando Sensor de Lluvia MH-RD...");
  pinMode(MHRD_DIGITAL_PIN, INPUT);
  pinMode(MHRD_ANALOG_PIN, INPUT);
  
  // Configurar alimentación del sensor (opcional)
  pinMode(MHRD_VCC_PIN, OUTPUT);
  digitalWrite(MHRD_VCC_PIN, HIGH);  // Activar alimentación
  delay(100);  // Tiempo para estabilizar
  
  Serial.println("✅ Sensor MH-RD inicializado correctamente");
  Serial.println("   Conexiones:");
  Serial.println("   VCC -> GPIO13 (3.3V), GND -> GND");
  Serial.println("   AO (Analógico) -> GPIO34, DO (Digital) -> GPIO12");
  Serial.printf("   Umbral SECO: >%d, Umbral HÚMEDO: <%d\n", MHRD_THRESHOLD_DRY, MHRD_THRESHOLD_WET);
  
  // Inicializar Sensor de Viento ZTS-3000
  Serial.println("\n7. Inicializando Sensor de Viento ZTS-3000...");
  pinMode(WIND_SPEED_PIN, INPUT);
  pinMode(WIND_DIRECTION_PIN, INPUT);
  
  // Configurar alimentación del sensor (opcional - requiere 5V)
  pinMode(WIND_VCC_PIN, OUTPUT);
  digitalWrite(WIND_VCC_PIN, HIGH);  // Activar alimentación (usar convertidor 3.3V->5V si es necesario)
  delay(500);  // Tiempo para estabilizar el sensor
  
  Serial.println("✅ Sensor de Viento ZTS-3000 inicializado correctamente");
  Serial.println("   Conexiones:");
  Serial.println("   ROJO -> VCC (5V recomendado, usar convertidor desde GPIO25)");
  Serial.println("   NEGRO -> GND");
  Serial.println("   AZUL -> GPIO35 (Velocidad - señal 0-5V)");
  Serial.println("   AMARILLO -> GPIO32 (Dirección - opcional)");
  Serial.printf("   Rango: 0-%.1f m/s, Resolución: 0.1 m/s\n", WIND_MAX_SPEED);
  Serial.println("   Nota: Señal 0-5V, usar divisor resistivo si es necesario");
  
  // Inicializar timestamp para reset de lluvia
  ultimoResetLluvia = millis();
  
  Serial.println("\n=================================================");
  Serial.println("Iniciando lecturas cada 3 segundos...");
  Serial.println("=================================================\n");
  
  delay(2000);
}

void loop() {
  Serial.println("--- Nueva Lectura ---");
  
  // Leer BMP180
  readBMP180();
  
  // Leer BH1750
  readBH1750();
  
  // Leer DHT22
  readDHT22();
  
  // Leer Pluviómetro DFRobots
  readPluviometer();
  
  // Leer Sensor MH-RD
  readMHRDSensor();
  
  // Leer Sensor de Viento ZTS-3000
  readWindSensor();
  
  // Verificar reset periódico de lluvia acumulada
  checkRainReset();
  
  // Mostrar todas las lecturas
  displayReadings();
  
  Serial.println("--------------------\n");
  delay(3000);
}

void scanI2CDevices() {
  byte error, address;
  int deviceCount = 0;
  
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("✅ Dispositivo encontrado en dirección 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      
      // Identificar dispositivos conocidos
      if (address == 0x77) Serial.print(" (BMP180)");
      if (address == 0x23) Serial.print(" (BH1750)");
      
      Serial.println();
      deviceCount++;
    }
    else if (error == 4) {
      Serial.print("❌ Error desconocido en dirección 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  
  if (deviceCount == 0) {
    Serial.println("❌ No se encontraron dispositivos I2C");
    Serial.println("   Verifica las conexiones y la alimentación");
  } else {
    Serial.print("Total de dispositivos encontrados: ");
    Serial.println(deviceCount);
  }
}

void readBMP180() {
  if (bmp.begin()) {
    temperature = bmp.readTemperature();
    pressure = bmp.readPressure() / 100.0F; // Convertir a hPa
    altitude = bmp.readAltitude();
    
    Serial.println("BMP180:");
    Serial.print("  Temperatura: ");
    Serial.print(temperature);
    Serial.println(" °C");
    Serial.print("  Presión: ");
    Serial.print(pressure);
    Serial.println(" hPa");
    Serial.print("  Altitud: ");
    Serial.print(altitude);
    Serial.println(" m");
  } else {
    Serial.println("BMP180: ❌ Error de lectura");
  }
}

void readBH1750() {
  lightLevel = lightMeter.readLightLevel();
  
  if (lightLevel >= 0) {
    Serial.println("BH1750:");
    Serial.print("  Luz: ");
    Serial.print(lightLevel);
    Serial.println(" lux");
  } else {
    Serial.println("BH1750: ❌ Error de lectura");
  }
}

void readDHT22() {
  // Leer temperatura y humedad del DHT22
  dhtTemperature = dht.readTemperature();
  dhtHumidity = dht.readHumidity();
  
  // Verificar si las lecturas son válidas
  if (isnan(dhtTemperature) || isnan(dhtHumidity)) {
    Serial.println("DHT22: ❌ Error de lectura");
    dhtTemperature = 0;
    dhtHumidity = 0;
  } else {
    Serial.println("DHT22:");
    Serial.print("  Temperatura: ");
    Serial.print(dhtTemperature);
    Serial.println(" °C");
    Serial.print("  Humedad: ");
    Serial.print(dhtHumidity);
    Serial.println(" %");
    
    // Calcular índice de calor (Heat Index)
    float heatIndex = dht.computeHeatIndex(dhtTemperature, dhtHumidity, false);
    Serial.print("  Índice de calor: ");
    Serial.print(heatIndex);
    Serial.println(" °C");
  }
}

void readPluviometer() {
  // Verificar si hay nuevos pulsos
  if (contadorPulsos > 0) {
    // Deshabilitar interrupciones temporalmente
    noInterrupts();
    int pulsosActuales = contadorPulsos;
    contadorPulsos = 0;
    interrupts();
    
    // Calcular lluvia detectada
    lluviaDetectada = pulsosActuales * RESOLUCION_MM;
    lluviaAcumulada += lluviaDetectada;
    
    Serial.println("Pluviómetro DFRobots:");
    Serial.print("  🌧️ Lluvia detectada: ");
    Serial.print(lluviaDetectada);
    Serial.println(" mm");
    Serial.print("  📊 Lluvia acumulada: ");
    Serial.print(lluviaAcumulada);
    Serial.println(" mm");
    Serial.print("  📏 Número de pulsos: ");
    Serial.println(pulsosActuales);
  } else {
    lluviaDetectada = 0;
    Serial.println("Pluviómetro DFRobots: Sin lluvia detectada");
  }
}

void readMHRDSensor() {
  // Leer valores del sensor MH-RD
  mhrdDigitalValue = digitalRead(MHRD_DIGITAL_PIN);
  mhrdAnalogValue = analogRead(MHRD_ANALOG_PIN);
  
  // Interpretar estado basado en valor analógico
  if (mhrdAnalogValue > MHRD_THRESHOLD_DRY) {
    mhrdStatus = "SECO";
  } else if (mhrdAnalogValue < MHRD_THRESHOLD_WET) {
    mhrdStatus = "MUY_HUMEDO";
  } else {
    mhrdStatus = "HUMEDO";
  }
  
  // Mostrar lecturas del sensor MH-RD
  Serial.println("Sensor MH-RD:");
  Serial.print("  💧 Estado Digital: ");
  Serial.println(mhrdDigitalValue == HIGH ? "SECO" : "LLUVIA");
  Serial.print("  📊 Valor Analógico: ");
  Serial.print(mhrdAnalogValue);
  Serial.print(" (0-4095)");
  
  // Mostrar porcentaje de humedad (inverso del valor ADC)
  float humidityPercentage = map(mhrdAnalogValue, 4095, 0, 0, 100);
  if (humidityPercentage > 100) humidityPercentage = 100;
  if (humidityPercentage < 0) humidityPercentage = 0;
  
  Serial.print(" - ");
  Serial.print(humidityPercentage, 1);
  Serial.println("% humedad");
  Serial.print("  🌦️ Estado: ");
  Serial.println(mhrdStatus);
  
  // Comparación con el digital
  if ((mhrdDigitalValue == LOW && mhrdStatus == "SECO") || 
      (mhrdDigitalValue == HIGH && mhrdStatus != "SECO")) {
    Serial.println("  ⚠️ Posible discrepancia entre lecturas digital/analógica");
  }
}

void readWindSensor() {
  // Tomar múltiples lecturas para promediar y reducir ruido
  long totalSpeedReading = 0;
  long totalDirectionReading = 0;
  
  for (int i = 0; i < WIND_SAMPLES; i++) {
    totalSpeedReading += analogRead(WIND_SPEED_PIN);
    totalDirectionReading += analogRead(WIND_DIRECTION_PIN);
    delay(10); // Pequeña pausa entre lecturas
  }
  
  // Calcular promedio
  windSpeedRaw = totalSpeedReading / WIND_SAMPLES;
  windDirectionRaw = totalDirectionReading / WIND_SAMPLES;
  
  // Convertir valor ADC a voltaje (0-3.3V en ESP32, pero sensor da 0-5V)
  // Si usas divisor resistivo 5V->3.3V, ajustar el factor
  float voltage = (windSpeedRaw * 3.3) / WIND_ADC_MAX;
  
  // Si el sensor da directamente 0-5V y usas divisor resistivo 2:3
  // voltage = voltage * (5.0 / 3.3); // Descomentar si usas divisor resistivo
  
  // Convertir voltaje a velocidad del viento
  // Fórmula: velocidad = (voltaje / voltaje_max) * velocidad_max
  windSpeed = ((voltage / WIND_MAX_VOLTAGE) * WIND_MAX_SPEED) * WIND_CALIBRATION_FACTOR + WIND_CALIBRATION_OFFSET;
  
  // Asegurar que la velocidad no sea negativa
  if (windSpeed < 0) {
    windSpeed = 0;
  }
  
  // Convertir dirección si está conectada (0-360 grados)
  if (windDirectionRaw > 100) { // Solo si hay señal válida
    windDirection = (windDirectionRaw * 360.0) / WIND_ADC_MAX;
  } else {
    windDirection = 0; // Sin señal de dirección
  }
  
  // Clasificar viento según escala Beaufort simplificada
  if (windSpeed == 0) {
    windSpeedCategory = "CALMA";
  } else if (windSpeed < 2) {
    windSpeedCategory = "AIRE_LIGERO";
  } else if (windSpeed < 6) {
    windSpeedCategory = "BRISA_LIGERA";
  } else if (windSpeed < 12) {
    windSpeedCategory = "BRISA_MODERADA";
  } else if (windSpeed < 20) {
    windSpeedCategory = "BRISA_FUERTE";
  } else if (windSpeed < 25) {
    windSpeedCategory = "VIENTO_FUERTE";
  } else {
    windSpeedCategory = "TEMPORAL";
  }
  
  // Mostrar lecturas
  Serial.println("Sensor de Viento ZTS-3000:");
  Serial.print("  💨 Velocidad: ");
  Serial.print(windSpeed, 1);
  Serial.println(" m/s");
  Serial.print("  📊 Valor ADC: ");
  Serial.print(windSpeedRaw);
  Serial.print(" (Voltaje: ");
  Serial.print(voltage, 2);
  Serial.println("V)");
  Serial.print("  🧭 Dirección: ");
  if (windDirectionRaw > 100) {
    Serial.print(windDirection, 0);
    Serial.println(" grados");
  } else {
    Serial.println("No conectada");
  }
  Serial.print("  🌪️ Categoría: ");
  Serial.println(windSpeedCategory);
  
  // Conversión a km/h para referencia
  float windSpeedKmh = windSpeed * 3.6;
  Serial.print("  🏃 Velocidad: ");
  Serial.print(windSpeedKmh, 1);
  Serial.println(" km/h");
  
  // Advertencias para velocidades altas
  if (windSpeed > 15) {
    Serial.println("  ⚠️ ADVERTENCIA: Viento fuerte detectado");
  } else if (windSpeed > 25) {
    Serial.println("  🚨 ALERTA: Condiciones de temporal");
  }
}

void checkRainReset() {
  // Reset periódico de lluvia acumulada (cada hora)
  if (millis() - ultimoResetLluvia >= INTERVALO_RESET_LLUVIA) {
    if (lluviaAcumulada > 0) {
      Serial.print("🔄 Reset automático - Lluvia acumulada última hora: ");
      Serial.print(lluviaAcumulada);
      Serial.println(" mm");
    }
    lluviaAcumulada = 0.0;
    ultimoResetLluvia = millis();
  }
}

void displayReadings() {
  Serial.println("\n📊 RESUMEN DE LECTURAS:");
  Serial.println("┌─────────────────────────────────────────┐");
  Serial.printf("│ Temp (BMP180): %6.1f °C              │\n", temperature);
  Serial.printf("│ Temp (DHT22):  %6.1f °C              │\n", dhtTemperature);
  Serial.printf("│ Humedad:       %6.1f %%               │\n", dhtHumidity);
  Serial.printf("│ Presión:       %6.1f hPa             │\n", pressure);
  Serial.printf("│ Altitud:       %6.1f m               │\n", altitude);
  Serial.printf("│ Luz:           %6.1f lux             │\n", lightLevel);
  Serial.printf("│ Lluvia (DFR):  %6.1f mm              │\n", lluviaDetectada);
  Serial.printf("│ Lluv. Acum.:   %6.1f mm              │\n", lluviaAcumulada);
  
  // Información del sensor MH-RD
  float humidityPercentage = map(mhrdAnalogValue, 4095, 0, 0, 100);
  if (humidityPercentage > 100) humidityPercentage = 100;
  if (humidityPercentage < 0) humidityPercentage = 0;
  
  Serial.printf("│ MH-RD Digital: %-8s           │\n", mhrdDigitalValue == HIGH ? "SECO" : "LLUVIA");
  Serial.printf("│ MH-RD Analog:  %4d (%5.1f%%)        │\n", mhrdAnalogValue, humidityPercentage);
  Serial.printf("│ MH-RD Estado:  %-11s        │\n", mhrdStatus.c_str());
  Serial.printf("│ Viento Vel.:   %6.1f m/s            │\n", windSpeed);
  Serial.printf("│ Viento Cat.:   %-12s       │\n", windSpeedCategory.c_str());
  if (windDirectionRaw > 100) {
    Serial.printf("│ Viento Dir.:   %6.0f°              │\n", windDirection);
  } else {
    Serial.println("│ Viento Dir.:   No conectada          │");
  }
  Serial.println("└─────────────────────────────────────────┘");
  
  // Información adicional del pluviómetro
  if (lluviaAcumulada > 0) {
    float horasTranscurridas = (millis() - ultimoResetLluvia) / 3600000.0;
    Serial.printf("⏱️  Tiempo desde último reset: %.1f horas\n", horasTranscurridas);
  }
  
  // Comparación de temperaturas entre sensores
  if (dhtTemperature > 0 && temperature > 0) {
    float tempDiff = abs(dhtTemperature - temperature);
    Serial.printf("🌡️  Diferencia de temperatura entre sensores: %.1f °C\n", tempDiff);
    if (tempDiff > 3.0) {
      Serial.println("⚠️  Diferencia de temperatura considerable - verificar calibración");
    }
  }
  
  // Correlación entre sensores de lluvia
  bool pluviometroDetected = (lluviaDetectada > 0);
  bool mhrdDetected = (mhrdDigitalValue == LOW || mhrdStatus != "SECO");
  
  if (pluviometroDetected || mhrdDetected) {
    Serial.println("\n🌧️  ANÁLISIS DE LLUVIA:");
    Serial.printf("   Pluviómetro DFRobots: %s\n", pluviometroDetected ? "LLUVIA DETECTADA" : "Sin lluvia");
    Serial.printf("   Sensor MH-RD:        %s\n", mhrdDetected ? "LLUVIA DETECTADA" : "Sin lluvia");
    
    if (pluviometroDetected && mhrdDetected) {
      Serial.println("   ✅ Ambos sensores confirman lluvia");
    } else if (pluviometroDetected != mhrdDetected) {
      Serial.println("   ⚠️ Discrepancia entre sensores");
    }
  }
  
  // Información adicional del viento
  Serial.println("\n💨 ANÁLISIS DE VIENTO:");
  Serial.printf("   Velocidad: %.1f m/s (%.1f km/h)\n", windSpeed, windSpeed * 3.6);
  Serial.printf("   Categoría: %s\n", windSpeedCategory.c_str());
  if (windDirectionRaw > 100) {
    String windDirectionName = getWindDirectionName(windDirection);
    Serial.printf("   Dirección: %.0f° (%s)\n", windDirection, windDirectionName.c_str());
  }
  
  // Análisis de condiciones meteorológicas combinadas
  if (windSpeed > 10 && (pluviometroDetected || mhrdDetected)) {
    Serial.println("\n🌪️ CONDICIONES METEOROLÓGICAS:");
    Serial.println("   ⚠️ TORMENTA: Viento fuerte + lluvia detectada");
  } else if (windSpeed > 15) {
    Serial.println("\n🌪️ CONDICIONES METEOROLÓGICAS:");
    Serial.println("   ⚠️ VIENTO FUERTE: Posibles condiciones adversas");
  }
}

String getWindDirectionName(float degrees) {
  if (degrees >= 337.5 || degrees < 22.5) return "Norte";
  if (degrees >= 22.5 && degrees < 67.5) return "Nordeste";
  if (degrees >= 67.5 && degrees < 112.5) return "Este";
  if (degrees >= 112.5 && degrees < 157.5) return "Sudeste";
  if (degrees >= 157.5 && degrees < 202.5) return "Sur";
  if (degrees >= 202.5 && degrees < 247.5) return "Sudoeste";
  if (degrees >= 247.5 && degrees < 292.5) return "Oeste";
  if (degrees >= 292.5 && degrees < 337.5) return "Noroeste";
  return "Desconocido";
}