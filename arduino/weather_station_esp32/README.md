# 🌦️ Estación Meteorológica ESP32

## 📖 Descripción General

¡Bienvenido a tu estación meteorológica IoT basada en **ESP32 DevKit V1**! Este proyecto recopila datos ambientales de múltiples sensores y los transmite vía MQTT a tu sistema backend. Incluye configuración WiFi dinámica, gestión de energía con deep sleep y soporte para comandos remotos.

---

## 🛠️ Requisitos de Hardware

### 🧠 Microcontrolador
- **ESP32 DevKit V1** (placa principal recomendada)

### 🌡️ Sensores Compatibles
- **DHT22** – Temperatura y humedad (GPIO 4)
- **BMP180/BMP085** – Presión barométrica (I2C: GPIO 21/22)
- **BH1750** – Intensidad lumínica (I2C: GPIO 21/22)
- **MH-RD** – Sensor de lluvia digital (GPIO 2) y analógico (GPIO 34)
- **MQ7** – Monóxido de carbono (GPIO 36, ADC1_CH0)
- **MQ135** – Calidad del aire (GPIO 12)
- **DSM501A** – Partículas PM2.5 (GPIO 13)

### ⚡ Configuración de Pines
```
DHT22:    GPIO 4  (Digital, OneWire)
Lluvia D: GPIO 2  (Entrada digital con interrupción)
Lluvia A: GPIO 34 (Entrada analógica, ADC 12 bits)
MQ7:      GPIO 36 (Entrada analógica, ADC1_CH0)
MQ135:    GPIO 12 (Entrada digital)
DSM501A:  GPIO 13 (Entrada digital, medición PWM)
I2C SDA:  GPIO 21 (BMP180, BH1750)
I2C SCL:  GPIO 22 (BMP180, BH1750)
```

---

## ✨ Características Principales

- 📡 **Monitoreo ambiental multisensor**
- 🔗 **Comunicación MQTT** con payloads JSON
- 📶 **WiFiManager** para configuración de red fácil
- 💾 **Almacenamiento NVS** para configuración persistente
- 💤 **Gestión de energía con deep sleep**
- 🛠️ **Procesamiento de comandos remotos** vía MQTT
- 🔍 **Detección automática de sensores**
- 🧪 **Sistema de calibración** para precisión
- 🌧️ **Medición de lluvia basada en interrupciones**

---

## 🔋 Gestión de Energía

- 💤 **Modo deep sleep** con intervalos configurables
- 🕒 **Memoria RTC** para datos persistentes entre ciclos
- 🔌 **Gestión de WiFi** con reconexión automática
- 🔋 **Operación eficiente para despliegues a batería**

---

## 🌐 Funcionalidades de Red

- 📲 **Portal cautivo WiFiManager** para configuración inicial
- 🔒 **Soporte de autenticación MQTT** con tokens API
- 🔄 **Reconexión automática** para WiFi y MQTT
- 📶 **Monitoreo de intensidad de señal**
- 🆔 **IDs de cliente MQTT dinámicos**

---

## 🚀 Instalación y Puesta en Marcha

### 1️⃣ Configuración en Arduino IDE

Instala las siguientes librerías:
```
WiFiManager by tzapu
PubSubClient by Nick O'Leary
ArduinoJson by Benoit Blanchon
DHT sensor library by Adafruit
Adafruit BMP085 Library
BH1750 by Christopher Laws
```

### 2️⃣ Cableado de Sensores

- Sigue la configuración de pines indicada arriba.
- Asegúrate de:
  - Fuente de alimentación estable (3.3V)
  - Resistencias pull-up (4.7kΩ) para I2C (BMP180, BH1750)
  - Conexiones firmes para el sensor de lluvia (interrupción)

### 3️⃣ Configuración Inicial

1. Sube el código al ESP32
2. Conéctate a la red WiFi "WeatherStation-Setup"
3. Configura credenciales WiFi y parámetros MQTT en el portal cautivo
4. Define el ID de estación y otros parámetros

---

## ⚙️ Opciones de Configuración

### Parámetros WiFiManager
- **SSID/Contraseña WiFi**
- **Servidor MQTT** (por defecto: 192.168.1.98)
- **Puerto MQTT** (por defecto: 1883)
- **ID de estación** (por defecto: ESP32_STATION_001)
- **Token API** (opcional)

### Configuración Persistente (NVS)
- Activar/desactivar deep sleep
- Duración del sueño (ms)
- Factores de calibración para sensores
- Configuración de red y MQTT

---

## 📡 Temas MQTT

### Publicación de Datos
- `weather/data/{station_id}` – Datos de sensores (JSON)
- `weather/status/{station_id}` – Estado y salud del dispositivo

### Suscripción a Comandos
- `weather/command/{station_id}` – Comandos remotos

#### Comandos Soportados
```json
{"command": "status"}                    // Solicitar estado
{"command": "restart"}                   // Reiniciar dispositivo
{"command": "sensor_check"}              // Re-inicializar sensores
{"command": "wake_up"}                   // Desactivar deep sleep
{"command": "sleep_mode", "enabled": true, "interval_ms": 60000}  // Configurar sueño
```

---

## 📝 Formato de Datos

### Payload de Datos de Sensores
```json
{
  "station_id": "ESP32_STATION_001",
  "timestamp": "123456789",
  "temperature": 25.50,
  "humidity": 65.30,
  "pressure": 1013.25,
  "light_level": 1500.00,
  "rainfall": 0.20,
  "rain_intensity": 2048,
  "rain_level_percent": 50,
  "co_level": 1.25,
  "co_raw": 1024,
  "air_quality_digital": 0,
  "dust_pm25": 15.5,
  "uptime": 3600,
  "signal_strength": -45,
  "free_heap": 180000
}
```

### Payload de Estado
```json
{
  "station_id": "ESP32_STATION_001",
  "status": "online",
  "timestamp": "123456789",
  "uptime": 3600,
  "signal_strength": -45,
  "free_heap": 180000,
  "sensors": {
    "dht22": true,
    "bmp180": true,
    "bh1750": true,
    "mh_rd": true,
    "mq7": false,
    "mq135": false,
    "dsm501a": false
  }
}
```

---

## 🧪 Sistema de Calibración

Ajusta la estructura `CalibrationFactors` para mejorar la precisión de los sensores:

```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;      // Offset de temperatura (°C)
  float temp_scale = 1.0;       // Factor de escala de temperatura
  float humidity_offset = 0.0;  // Offset de humedad (%)
  float pressure_offset = 0.0;  // Offset de presión (hPa)
  float rain_factor = 0.2;      // mm por pulso de lluvia
  float mq7_offset = 0.0;       // Offset sensor CO
  float mq135_offset = 0.0;     // Offset calidad de aire
} cal;
```

---

## 🔄 Modos de Operación

### 1. Modo Continuo (por defecto)
- Lectura de sensores cada 60 segundos
- WiFi y MQTT activos permanentemente
- Ideal para instalaciones alimentadas por red

### 2. Modo Deep Sleep
- Lectura de sensores en cada ciclo de activación
- Entra en deep sleep entre lecturas
- Intervalos configurables
- Conserva conteo de lluvia en memoria RTC
- Óptimo para operación con batería

---

## 🛠️ Solución de Problemas

### Problemas de Sensores
- Verifica cableado I2C (BMP180, BH1750)
- Asegura alimentación estable (3.3V)
- Usa el monitor serial para ver el estado de inicialización

### Problemas de WiFi
- Resetea WiFiManager manteniendo pulsado el botón al arrancar
- Verifica intensidad de señal
- Revisa credenciales de red

### Problemas de MQTT
- Confirma IP y puerto del broker
- Verifica conectividad de red
- Revisa estructura de topics y permisos

### Consumo de Energía
- Activa deep sleep para operación a batería
- Ajusta intervalos de sueño según necesidades
- Monitorea heap para evitar fugas de memoria

---

## 🖥️ Integración con Otros Sistemas

Esta estación está diseñada para integrarse con:
- **Broker MQTT** (Mosquitto recomendado)
- **Base de datos InfluxDB** (series temporales)
- **Backend Node.js** para procesamiento de datos
- **Frontend React/Next.js** para visualización
- **Dashboards Grafana** para analítica

---

## 👨‍💻 Notas de Desarrollo

### Salida Serial
- Monitorea a 115200 baudios:
  - Estado de sensores
  - Detalles de conexión de red
  - Mensajes MQTT enviados
  - Diagnóstico del sistema

### Gestión de Memoria
- Usa `StaticJsonDocument<512>` para payloads MQTT
- Buffer MQTT configurable (512 bytes)
- Monitoreo de heap para estabilidad

### Consideraciones de Tiempos
- Muestreo de sensor de polvo: 30 segundos
- Intervalos de lectura configurables
- Detección de lluvia por interrupción
- Operación no bloqueante de sensores

---

## 🚧 Mejoras Futuras

- ⏰ **Sincronización NTP** para timestamps precisos
- 📲 **Actualizaciones OTA** de firmware
- 🌬️ **Soporte para más sensores** (viento, UV)
- 💾 **Registro local de datos** en SD
- 🌐 **Interfaz web** para configuración local

---

## 📄 Licencia

Este código forma parte del proyecto IoT Weather Station y sigue los términos de licencia del proyecto.

---

## 🆘 Soporte

Para soporte técnico e integración, consulta la documentación principal en `CLAUDE.md`.

---