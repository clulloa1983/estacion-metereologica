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

// Función de interrupción para contar pulsos del pluviómetro
void IRAM_ATTR contarPulso() {
  contadorPulsos++;
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== Test de Sensores I2C + Sensores de Lluvia ===");
  Serial.println("BMP180 + GY-30 (BH1750) + DHT22 + Pluviómetro DFRobots + Sensor MH-RD");
  Serial.println("=================================================");
  
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
}