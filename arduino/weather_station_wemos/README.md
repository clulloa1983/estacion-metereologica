# 🌦️ Estación Meteorológica WEMOS D1 R2

Este código está diseñado para funcionar con un microcontrolador WEMOS D1 R2 y los sensores disponibles listados en `sensores-microcontroladores.md`.

## 📋 Librerías Requeridas

Instala estas librerías en el Arduino IDE:

```
ESP8266WiFi (incluida con ESP8266 Core)
PubSubClient
ArduinoJson (v6.x)
DHT sensor library
Adafruit BMP085 Library
BH1750 (by Christopher Laws)
```

## 🔌 Conexiones de Hardware

### Mapeo de Pines WEMOS D1 R2

| Sensor | Pin WEMOS | Pin GPIO | Tipo | Descripción |
|--------|-----------|----------|------|-------------|
| DHT22 | D4 | GPIO2 | Digital | Temperatura y humedad |
| BMP180 SDA | D2 | GPIO4 | I2C | Presión barométrica |
| BMP180 SCL | D1 | GPIO5 | I2C | Presión barométrica |
| BH1750 SDA | D2 | GPIO4 | I2C | Sensor de luz (compartido) |
| BH1750 SCL | D1 | GPIO5 | I2C | Sensor de luz (compartido) |
| MH-RD | D5 | GPIO14 | Digital | Sensor de lluvia |
| MQ7 | A0 | ADC0 | Analógico | Monóxido de carbono |
| MQ135 | D6 | GPIO12 | Digital | Calidad del aire |
| DSM501A | D7 | GPIO13 | Digital | Partículas PM2.5 |

### Diagrama de Conexión

```
WEMOS D1 R2
├── 3V3 ──────────► DHT22 (VCC), BMP180 (VCC), BH1750 (VCC)
├── GND ──────────► Común a todos los sensores
├── D1 (GPIO5) ───► SCL (BMP180, BH1750)
├── D2 (GPIO4) ───► SDA (BMP180, BH1750)
├── D4 (GPIO2) ───► DHT22 (Data)
├── D5 (GPIO14) ──► MH-RD (Signal)
├── D6 (GPIO12) ──► MQ135 (Digital Out)
├── D7 (GPIO13) ──► DSM501A (P1)
└── A0 ───────────► MQ7 (Analog Out)
```

## ⚙️ Configuración Inicial

### 1. Configurar WiFi y MQTT

Modifica estas líneas en el código:

```cpp
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";
const char* mqtt_server = "localhost"; // IP de tu servidor MQTT
const char* station_id = "WEMOS_STATION_001"; // ID único de la estación
```

### 2. Calibración de Sensores

Ajusta los factores de calibración según tu instalación:

```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;        // Offset temperatura (°C)
  float humidity_offset = 0.0;    // Offset humedad (%)
  float pressure_offset = 0.0;    // Offset presión (hPa)
  float rain_factor = 0.2;        // mm por pulso del pluviómetro
  float mq7_offset = 0.0;         // Offset sensor CO
  float mq135_offset = 0.0;       // Offset sensor calidad aire
};
```

## 🚀 Instalación Paso a Paso

### Fase 1: Sensores Básicos
1. **DHT22** - Conectar primero para verificar temperatura y humedad
2. **BMP180** - Añadir presión barométrica (I2C)

### Fase 2: Sensores Avanzados  
3. **BH1750** - Luminosidad (compartir bus I2C)
4. **MH-RD** - Detección de lluvia

### Fase 3: Calidad del Aire
5. **MQ7** - Monóxido de carbono
6. **MQ135** - Calidad general del aire
7. **DSM501A** - Partículas PM2.5

## 📡 Estructura de Datos MQTT

### Topic: `weather/data/WEMOS_STATION_001`

```json
{
  "station_id": "WEMOS_STATION_001",
  "timestamp": "1234567890",
  "temperature": 25.67,
  "humidity": 65.23,
  "pressure": 1013.25,
  "light_level": 1234.56,
  "rainfall": 0.2,
  "co_level": 2.45,
  "co_raw": 512,
  "air_quality_digital": 0,
  "dust_pm25": 12.34,
  "uptime": 12345,
  "signal_strength": -45,
  "free_heap": 25600
}
```

### Topic: `weather/status/WEMOS_STATION_001`

```json
{
  "station_id": "WEMOS_STATION_001",
  "status": "online",
  "timestamp": "1234567890",
  "uptime": 12345,
  "signal_strength": -45,
  "free_heap": 25600,
  "sensors": {
    "dht22": true,
    "bmp180": true,
    "bh1750": true,
    "mh_rd": true,
    "mq7": true,
    "mq135": true,
    "dsm501a": true
  }
}
```

## 🔧 Comandos MQTT

Envía comandos al topic: `weather/command/WEMOS_STATION_001`

### Reiniciar dispositivo
```json
{"command": "restart"}
```

### Verificar estado
```json
{"command": "status"}
```

### Verificar sensores
```json
{"command": "sensor_check"}
```

## 🔍 Detección Automática de Sensores

El código incluye detección automática de sensores disponibles:

- **DHT22**: Verifica lectura de temperatura válida
- **BMP180**: Verifica inicialización I2C
- **BH1750**: Verifica inicialización I2C  
- **Analógicos**: Asume disponibles (MQ7, MQ135, DSM501A)
- **Digitales**: Asume disponibles (MH-RD)

## ⚠️ Notas Importantes

1. **Alimentación**: Todos los sensores funcionan a 3.3V
2. **I2C**: BMP180 y BH1750 comparten el mismo bus I2C
3. **Interrupciones**: Solo MH-RD usa interrupción (pin D5)
4. **Memoria**: El ESP8266 tiene limitaciones de memoria, monitor el `free_heap`
5. **Calentamiento**: Los sensores MQ requieren tiempo de calentamiento (5-24 horas)

## 🐛 Solución de Problemas

### Sensor no detectado
- Verificar conexiones físicas
- Comprobar alimentación (3.3V)
- Revisar dirección I2C (usar scanner I2C)

### WiFi no conecta
- Verificar credenciales
- Comprobar señal WiFi
- Reiniciar dispositivo

### MQTT no conecta
- Verificar IP del broker
- Comprobar puerto (1883)
- Revisar logs seriales

### Lecturas erróneas
- Calibrar sensores con valores conocidos
- Verificar estabilidad de alimentación
- Permitir tiempo de estabilización