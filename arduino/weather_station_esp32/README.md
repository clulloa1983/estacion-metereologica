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

#### 📊 Diagrama de Conexión ESP32 DevKit V1
```
                    ┌─────────────────────────┐
                    │      ESP32 DevKit V1    │
                    │                         │
     DHT22 ────────── GPIO 4  ████████  VIN   │
     Rain Digital ── GPIO 2  ████████  GND   │
                    │ GPIO 0  ████████  GPIO 23 │
     MQ135 ────────── GPIO 12 ████████  GPIO 22 ──── SCL (BMP180, BH1750)
     DSM501A ──────── GPIO 13 ████████  GPIO 21 ──── SDA (BMP180, BH1750)
                    │ GPIO 15 ████████  GPIO 19 │
                    │ GPIO 14 ████████  GPIO 18 │
                    │ GPIO 27 ████████  GPIO 5  │
                    │ GPIO 26 ████████  GPIO 17 │
                    │ GPIO 25 ████████  GPIO 16 │
     Rain Analog ─── GPIO 34 ████████  GPIO 33 │
                    │ GPIO 35 ████████  GPIO 32 │
     MQ7 (CO) ────── GPIO 36 ████████  GPIO 4  │ ──── DHT22 (duplicado)
                    │ GPIO 39 ████████  GPIO 0  │
                    │                         │
                    └─────────────────────────┘
```

#### 🔌 Tabla Detallada de Conexiones

| **Sensor/Dispositivo** | **Pin ESP32** | **Tipo** | **Protocolo** | **Función** |
|------------------------|---------------|----------|---------------|-------------|
| **DHT22**              | GPIO 4        | Digital  | OneWire       | Temperatura/Humedad |
| **Sensor Lluvia (Digital)** | GPIO 2  | Digital  | Interrupción  | Detección de lluvia |
| **Sensor Lluvia (Analógico)** | GPIO 34 | ADC    | 12-bit ADC    | Intensidad de lluvia |
| **MQ7 (CO)**           | GPIO 36       | ADC      | ADC1_CH0      | Monóxido de carbono |
| **MQ135 (Aire)**       | GPIO 12       | Digital  | GPIO          | Calidad del aire |
| **DSM501A (PM2.5)**    | GPIO 13       | Digital  | PWM           | Partículas PM2.5 |
| **BMP180 (Presión)**   | GPIO 21/22    | I2C      | SDA/SCL       | Presión barométrica |
| **BH1750 (Luz)**       | GPIO 21/22    | I2C      | SDA/SCL       | Intensidad lumínica |

#### ⚠️ Notas Importantes de Conexión

**🔸 Alimentación:**
- **VCC Sensores**: 3.3V (ESP32) o 5V (según sensor)
- **GND**: Común para todos los dispositivos
- **Capacitor de desacople**: 100µF recomendado para estabilidad

**🔸 Resistencias Pull-up:**
- **I2C (GPIO 21/22)**: 4.7kΩ a 3.3V (obligatorio)
- **DHT22**: Resistencia pull-up 10kΩ interna activada
- **Sensores digitales**: Pull-up/down según especificación

**🔸 Consideraciones ADC:**
- **GPIO 34, 36**: Solo entrada (input-only pins)
- **Resolución ADC**: 12 bits (0-4095)
- **Voltaje máximo**: 3.3V (usar divisor de voltaje si necesario)

**🔸 Interrupciones:**
- **GPIO 2**: Configurado para interrupción en flanco descendente
- **Modo**: FALLING edge para detección de lluvia

---

## ✨ Características Principales

- 📡 **Monitoreo ambiental multisensor** (8 sensores ambientales)
- 🔗 **Comunicación MQTT** con payloads JSON estructurados
- 📶 **WiFiManager** para configuración de red dinámica
- 💾 **Almacenamiento NVS** para configuración persistente
- 💤 **Gestión de energía con deep sleep** avanzado
- 🛠️ **Sistema de comandos MQTT avanzado** con validación y rollback
- 🔍 **Detección automática de sensores** con flags de disponibilidad
- 🧪 **Sistema de calibración remoto** para precisión en tiempo real
- 🌧️ **Medición de lluvia por interrupciones** con conteo persistente
- 🚨 **Configuración de alertas y umbrales** vía MQTT
- 🔒 **Validación de seguridad** y respaldo automático de configuración
- 📊 **Monitoreo de sistema** con métricas de rendimiento

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

#### Comandos Básicos Soportados
```json
{"command": "status"}                    // Solicitar estado del sistema
{"command": "restart"}                   // Reiniciar dispositivo
{"command": "sensor_check"}              // Re-inicializar sensores
{"command": "wake_up"}                   // Desactivar deep sleep
{"command": "factory_reset"}             // Reseteo completo a configuración de fábrica
```

#### Comandos Avanzados de Configuración
```json
// Control de intervalos de lectura
{"command": "set_reading_interval", "parameters": {"interval_ms": 120000}}

// Control granular de sensores individuales
{"command": "toggle_sensor", "parameters": {"sensor": "dht22", "enabled": false}}

// Calibración remota de sensores
{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -2.5}}

// Configuración de umbrales de alerta
{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "min": 5.0, "max": 35.0}}

// Gestión de energía avanzada
{"command": "sleep_mode", "enabled": true, "interval_ms": 300000}

// Configuración WiFi remota
{"command": "wifi_config", "parameters": {"ssid": "Nueva_Red", "password": "password123"}}
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
  "reading_interval": 60000,
  "deep_sleep_enabled": false,
  "sensors": {
    "dht22": true,
    "bmp180": true,
    "bh1750": true,
    "mh_rd": true,
    "mq7": false,
    "mq135": false,
    "dsm501a": false
  },
  "calibration": {
    "temp_offset": 0.0,
    "humidity_offset": 0.0,
    "pressure_offset": 0.0,
    "light_scale": 1.0
  },
  "alert_thresholds": {
    "alerts_enabled": false,
    "temp_min": -40.0,
    "temp_max": 60.0,
    "humidity_max": 100.0,
    "pressure_min": 800.0,
    "pressure_max": 1200.0
  }
}
```

---

## 🧪 Sistema de Calibración Avanzado

### Calibración Remota via MQTT
El sistema permite calibración en tiempo real sin necesidad de recompilar código:

```json
// Calibración de temperatura con offset y escala
{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -2.5, "scale": 1.1}}

// Calibración de humedad (solo offset)
{"command": "set_calibration", "parameters": {"sensor": "humidity", "offset": 3.0}}

// Calibración de presión
{"command": "set_calibration", "parameters": {"sensor": "pressure", "offset": 5.2}}

// Calibración de sensor de luz
{"command": "set_calibration", "parameters": {"sensor": "light", "offset": 10.0, "scale": 1.2}}

// Factor de lluvia (mm por pulso)
{"command": "set_calibration", "parameters": {"sensor": "rain", "offset": 0.25}}
```

### Estructura de Calibración (Código)
```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;      // Offset de temperatura (°C) [-10.0 a 10.0]
  float temp_scale = 1.0;       // Factor de escala [0.5 a 2.0]
  float humidity_offset = 0.0;  // Offset de humedad (%) [-20.0 a 20.0]
  float pressure_offset = 0.0;  // Offset de presión (hPa) [-50.0 a 50.0]
  float rain_factor = 0.2;      // mm por pulso [0.1 a 2.0]
  float mq7_offset = 0.0;       // Offset sensor CO [-5.0 a 5.0]
  float mq135_offset = 0.0;     // Offset calidad de aire [-5.0 a 5.0]
  float light_scale = 1.0;      // Factor de escala luz [0.1 a 10.0]
  float light_offset = 0.0;     // Offset luz [-1000 a 1000]
} cal;
```

### Validación y Seguridad
- **Rangos seguros**: Todos los parámetros tienen límites de seguridad
- **Rollback automático**: Configuración anterior se restaura si hay errores
- **Persistencia NVS**: Calibración se guarda en memoria no volátil
- **Validación de entrada**: Parámetros se validan antes de aplicar

---

## 🚨 Sistema de Alertas y Umbrales

### Configuración Remota de Umbrales
Configure alertas para parámetros críticos via MQTT:

```json
// Configurar umbral de temperatura
{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "min": 5.0, "max": 35.0, "enabled": true}}

// Solo umbral máximo para humedad
{"command": "set_alert_threshold", "parameters": {"parameter": "humidity", "max": 85.0}}

// Umbral de presión barométrica
{"command": "set_alert_threshold", "parameters": {"parameter": "pressure", "min": 950.0, "max": 1050.0}}

// Desactivar alertas para un parámetro
{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "enabled": false}}
```

### Parámetros de Alerta Soportados
- **temperature**: Rango -50°C a 70°C
- **humidity**: Rango 0% a 100%
- **pressure**: Rango 800 hPa a 1200 hPa

### Estructura de Umbrales (Código)
```cpp
struct AlertThresholds {
  float temp_min = -40.0;       // Temperatura mínima (°C)
  float temp_max = 60.0;        // Temperatura máxima (°C)
  float humidity_min = 0.0;     // Humedad mínima (%)
  float humidity_max = 100.0;   // Humedad máxima (%)
  float pressure_min = 800.0;   // Presión mínima (hPa)
  float pressure_max = 1200.0;  // Presión máxima (hPa)
  bool alerts_enabled = false;  // Estado general de alertas
} thresholds;
```

---

## 🔄 Modos de Operación Avanzados

### 1. Modo Continuo (por defecto)
- Lectura de sensores configurable (30s - 1h)
- WiFi y MQTT activos permanentemente
- Comando remoto de intervalo: `set_reading_interval`
- Ideal para instalaciones alimentadas por red

### 2. Modo Deep Sleep Inteligente
- Lectura de sensores en cada ciclo de activación
- Entra en deep sleep entre lecturas
- Intervalos remotamente configurables
- Conserva conteo de lluvia en memoria RTC
- Activación/desactivación remota: `sleep_mode` y `wake_up`
- Óptimo para operación con batería

### 3. Modo de Configuración Remota
- Control granular de sensores individuales
- Calibración en tiempo real sin recompilación
- Configuración de umbrales de alerta
- Respaldo automático y rollback de seguridad

---

## 🧪 Testing y Scripts de Prueba

### Scripts Automatizados Disponibles
El proyecto incluye scripts completos para probar los comandos MQTT:

#### 1. Script Python Avanzado (`test_mqtt_commands.py`)
```bash
# Instalar dependencias
pip install paho-mqtt

# Ejecutar todas las pruebas
python test_mqtt_commands.py

# Pruebas específicas
python test_mqtt_commands.py --commands status,sensor_check
```

#### 2. Script Bash para Linux/macOS (`test_commands.sh`)
```bash
# Hacer ejecutable
chmod +x test_commands.sh

# Ejecutar todas las pruebas
./test_commands.sh

# Pruebas individuales disponibles
./test_commands.sh basic
./test_commands.sh calibration
./test_commands.sh alerts
```

#### 3. Script Windows Batch (`test_commands.bat`)
```cmd
# Ejecutar desde CMD
test_commands.bat

# Requiere Docker y mosquitto tools
```

### Cobertura de Pruebas
- ✅ Comandos básicos (status, restart, sensor_check)
- ✅ Control de intervalos de lectura
- ✅ Toggle granular de sensores
- ✅ Sistema de calibración remota
- ✅ Configuración de umbrales de alerta
- ✅ Gestión de energía (sleep/wake)
- ✅ Configuración WiFi
- ✅ Validación de seguridad y rollback

---

## 🔒 Características de Seguridad

### Validación de Comandos
- **Whitelist de comandos**: Solo comandos reconocidos se procesan
- **Validación de parámetros**: Rangos seguros para todos los valores
- **Validación JSON**: Estructura de mensajes verificada
- **Límites de entrada**: Prevención de valores extremos

### Sistema de Rollback Automático
```cpp
// Respaldo automático antes de cambios críticos
struct ConfigBackup {
  unsigned long reading_interval_backup;
  CalibrationFactors cal_backup;
  SensorFlags sensors_backup;
  bool deep_sleep_backup;
  unsigned long sleep_duration_backup;
};
```

### Características de Seguridad:
- **Respaldo de configuración**: Antes de cada cambio crítico
- **Restauración automática**: Si la validación falla
- **Preservación de conectividad**: WiFi nunca se pierde permanentemente
- **Límites de parámetros**: Prevención de valores dañinos
- **Logging de auditoría**: Registro de todos los comandos ejecutados

### Temas MQTT de Respuesta
- `weather/status/{station_id}` - Respuestas de estado
- `weather/logs/{station_id}` - Logs de comandos y auditoría
- Estructura de error estandarizada para debugging

---

## 🛠️ Solución de Problemas

### Problemas de Sensores
- Verifica cableado I2C (BMP180, BH1750)
- Asegura alimentación estable (3.3V)
- Usa el monitor serial para ver el estado de inicialización
- **Nuevo**: Comando remoto `sensor_check` para re-inicialización
- **Nuevo**: Toggle individual de sensores para aislamiento de problemas

### Problemas de WiFi
- Resetea WiFiManager manteniendo pulsado el botón al arrancar
- Verifica intensidad de señal
- Revisa credenciales de red
- **Nuevo**: Comando remoto `wifi_config` para actualización de credenciales
- **Nuevo**: Rollback automático si nueva configuración WiFi falla

### Problemas de MQTT
- Confirma IP y puerto del broker
- Verifica conectividad de red
- Revisa estructura de topics y permisos
- **Nuevo**: Validación de comandos en tiempo real
- **Nuevo**: Respuestas de estado detalladas en `weather/logs/`

### Problemas de Configuración
- **Comando `status`**: Verificar configuración actual
- **Factory reset**: `factory_reset` para restaurar configuración inicial
- **Scripts de prueba**: Usar scripts automatizados para validar funcionalidad
- **Rollback automático**: El sistema restaura configuración anterior si hay fallos

### Consumo de Energía
- Activa deep sleep para operación a batería
- **Nuevo**: Control remoto de sleep: `sleep_mode` y `wake_up`
- **Nuevo**: Intervalos configurables remotamente (30s - 1h)
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

## 🚧 Estado del Proyecto y Mejoras Implementadas

### ✅ Características Implementadas (FASE 3 Completa)
- ✅ **Sistema de comandos MQTT avanzado** con validación completa
- ✅ **Control granular de sensores** (8 sensores individuales)
- ✅ **Calibración remota en tiempo real** sin recompilación
- ✅ **Sistema de alertas y umbrales** configurable via MQTT
- ✅ **Validación de seguridad** con rollback automático
- ✅ **Scripts de testing automatizados** (Python, Bash, Batch)
- ✅ **Gestión avanzada de energía** con deep sleep configurable
- ✅ **Configuración WiFi remota** con respaldo de seguridad
- ✅ **Persistencia NVS** para toda la configuración
- ✅ **Sistema de logging y auditoría** via MQTT

### 🔄 Mejoras Futuras Planificadas
- ⏰ **Sincronización NTP** para timestamps precisos
- 📲 **Actualizaciones OTA** de firmware
- 🌬️ **Soporte para más sensores** (viento, UV, GPS)
- 💾 **Registro local de datos** en SD/SPIFFS
- 🌐 **Interfaz web local** para configuración offline
- 📊 **Dashboard embebido** con servidor HTTP
- 🔐 **Autenticación MQTT** con certificados SSL
- 📱 **Aplicación móvil** para configuración local

---

## 📄 Licencia

Este código forma parte del proyecto IoT Weather Station y sigue los términos de licencia del proyecto.

---

## 🆘 Soporte y Documentación

### Documentación Técnica Completa
- **Documentación principal**: `CLAUDE.md` (arquitectura completa del sistema)
- **Comandos MQTT avanzados**: `ADVANCED_COMMANDS.md` (manual detallado)
- **Scripts de testing**: `test_mqtt_commands.py`, `test_commands.sh`, `test_commands.bat`

### Enlaces de Integración
- **Backend API**: Integración completa con Node.js/Express
- **Frontend Dashboard**: Panel de control remoto en React/Next.js
- **Base de datos**: Almacenamiento en InfluxDB para series temporales
- **Monitoreo**: Dashboards en Grafana para visualización avanzada

### Estado del Sistema
- **Hardware**: ESP32 DevKit V1 ✅ OPERACIONAL
- **Software**: Firmware v3.0 ✅ FASE 3 COMPLETA
- **MQTT**: Comandos avanzados ✅ IMPLEMENTADO
- **Integración**: Sistema completo ✅ LISTO PARA PRODUCCIÓN

Para soporte técnico específico, reportes de bugs, o contribuciones al proyecto, consulta la documentación principal del sistema en `CLAUDE.md`.

---