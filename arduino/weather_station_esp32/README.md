# 🌦️ Estación Meteorológica ESP32

## 📖 Descripción General

¡Bienvenido a tu estación meteorológica IoT basada en **ESP32 DevKit V1**! Este proyecto recopila datos ambientales de múltiples sensores y los transmite vía MQTT a tu sistema backend. Incluye configuración WiFi dinámica, gestión de energía con deep sleep, sistema avanzado de comandos remotos con validación de seguridad y rollback automático.

**🚀 ESTADO ACTUAL**: **PRODUCCIÓN** - Sistema completo con comandos avanzados MQTT (Fase 3)

---

## 🛠️ Requisitos de Hardware

### 🧠 Microcontrolador
- **ESP32 DevKit V1** (placa principal recomendada)

### 🌡️ Sensores Compatibles
- **DHT22** – Temperatura y humedad (GPIO 4)
- **BMP180/BMP085** – Presión barométrica (I2C: GPIO 21/22)
- **BH1750** – Intensidad lumínica (I2C: GPIO 21/22) ✅ ACTIVO
- **MH-RD** – Sensor de lluvia digital (GPIO 12) y analógico (GPIO 34) con alimentación (GPIO 13) ✅ ACTIVO
- **Pluviómetro DFRobots** – Medición por pulsos (GPIO 2) ✅ ACTIVO
- **MQ7** – Monóxido de carbono (GPIO 36, ADC1_CH0) ⚪ DISPONIBLE
- **MQ135** – Calidad del aire (GPIO 15) ⚪ DISPONIBLE
- **DSM501A** – Partículas PM2.5 (GPIO 16) ⚪ DISPONIBLE

### ⚡ Configuración de Pines

#### 📊 Diagrama de Conexión ESP32 DevKit V1
```
                    ┌─────────────────────────┐
                    │      ESP32 DevKit V1    │
                    │                         │
     DHT22 ────────── GPIO 4  ████████  VIN   │
     Pluviómetro ──── GPIO 2  ████████  GND   │
                    │ GPIO 0  ████████  GPIO 23 │
     Rain Digital ── GPIO 12 ████████  GPIO 22 ──── SCL (BMP180, BH1750)
     Rain VCC ────── GPIO 13 ████████  GPIO 21 ──── SDA (BMP180, BH1750)
                    │ GPIO 14 ████████  GPIO 19 │
     MQ135 ────────── GPIO 15 ████████  GPIO 18 │
     DSM501A ──────── GPIO 16 ████████  GPIO 17 │
                    │ GPIO 5  ████████  GPIO 5  │
                    │ GPIO 26 ████████  GPIO 25 │
     Rain Analog ─── GPIO 34 ████████  GPIO 33 │
                    │ GPIO 35 ████████  GPIO 32 │
     MQ7 (CO) ────── GPIO 36 ████████  GPIO 27 │
                    │ GPIO 39 ████████  GPIO 0  │
                    │                         │
                    └─────────────────────────┘
```

#### 🔌 Tabla Detallada de Conexiones

| **Sensor/Dispositivo** | **Pin ESP32** | **Tipo** | **Protocolo** | **Función** | **Estado** |
|------------------------|---------------|----------|---------------|-------------|------------|
| **DHT22**              | GPIO 4        | Digital  | OneWire       | Temperatura/Humedad | ✅ ACTIVO |
| **Pluviómetro DFRobots** | GPIO 2      | Digital  | Interrupción  | Medición lluvia (pulsos) | ✅ ACTIVO |
| **MH-RD Rain (Digital)** | GPIO 12     | Digital  | Interrupción  | Detección lluvia | ✅ ACTIVO |
| **MH-RD Rain (VCC)**   | GPIO 13       | Digital  | GPIO          | Alimentación sensor | ✅ ACTIVO |
| **MH-RD Rain (Analógico)** | GPIO 34   | ADC      | 12-bit ADC    | Intensidad lluvia | ✅ ACTIVO |
| **MQ135 (Aire)**       | GPIO 15       | Digital  | GPIO          | Calidad del aire | ⚪ DISPONIBLE |
| **DSM501A (PM2.5)**    | GPIO 16       | Digital  | PWM           | Partículas PM2.5 | ⚪ DISPONIBLE |
| **MQ7 (CO)**           | GPIO 36       | ADC      | ADC1_CH0      | Monóxido de carbono | ⚪ DISPONIBLE |
| **BMP180 (Presión)**   | GPIO 21/22    | I2C      | SDA/SCL       | Presión barométrica | ✅ ACTIVO |
| **BH1750 (Luz)**       | GPIO 21/22    | I2C      | SDA/SCL       | Intensidad lumínica | ✅ ACTIVO |

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

- 📡 **Monitoreo ambiental multisensor** (8 sensores ambientales con detección automática)
- 🔗 **Comunicación MQTT** con payloads JSON estructurados y temas separados
- 📶 **WiFiManager** para configuración de red dinámica con portal cautivo
- 💾 **Almacenamiento NVS** para configuración persistente (sobrevive reinicios)
- 💤 **Gestión de energía con deep sleep** configurable remotamente
- 🛠️ **Sistema de comandos MQTT avanzado** (Fase 3) con validación y rollback
- 🔍 **Detección automática de sensores** con flags de disponibilidad dinámicos
- 🧪 **Sistema de calibración remoto** para todos los sensores sin recompilación
- 🌧️ **Doble medición de lluvia**: MH-RD (analógico/digital) + Pluviómetro DFRobots (pulsos)
- 🚨 **Configuración de alertas y umbrales** vía MQTT con persistencia
- 🔒 **Validación de seguridad** completa con respaldo automático de configuración
- 📊 **Monitoreo de sistema** con métricas de rendimiento y conectividad
- ⚡ **Control remoto completo** - intervalo de lectura, sensores individuales, WiFi

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
- `weather/data/{station_id}` – Datos de sensores en tiempo real (JSON)
- `weather/status/{station_id}` – Estado del dispositivo y disponibilidad de sensores
- `weather/logs/{station_id}` – Logs de ejecución de comandos y auditoría

### Suscripción a Comandos
- `weather/command/{station_id}` – Comandos remotos avanzados (Fase 3)

#### 🔧 Comandos Básicos
```json
{"command": "status"}                    // Solicitar estado completo del sistema
{"command": "restart"}                   // Reiniciar dispositivo ESP32
{"command": "sensor_check"}              // Re-inicializar y verificar sensores
{"command": "wake_up"}                   // Desactivar deep sleep inmediatamente
{"command": "factory_reset"}             // ⚠️ Reseteo completo NVS + reinicio
```

#### ⚙️ Comandos de Configuración Avanzados (Fase 3)
```json
// Control de intervalos de lectura (30s - 1h)
{"command": "set_reading_interval", "parameters": {"interval_ms": 120000}}

// Control granular de sensores individuales (8 sensores)
{"command": "toggle_sensor", "parameters": {"sensor": "dht22", "enabled": false}}
{"command": "toggle_sensor", "parameters": {"sensor": "bh1750", "enabled": true}}

// Sistema de calibración remoto (sin recompilación)
{"command": "set_calibration", "parameters": {"sensor": "temperature", "offset": -2.5}}
{"command": "set_calibration", "parameters": {"sensor": "light", "offset": 10.0, "scale": 1.2}}

// Configuración de umbrales de alerta con persistencia
{"command": "set_alert_threshold", "parameters": {"parameter": "temperature", "min": 5.0, "max": 35.0}}
{"command": "set_alert_threshold", "parameters": {"parameter": "humidity", "max": 85.0}}

// Gestión de energía con deep sleep configurable
{"command": "sleep_mode", "enabled": true, "interval_ms": 300000}

// Configuración WiFi remota con rollback automático
{"command": "wifi_config", "parameters": {"ssid": "Nueva_Red", "password": "password123"}}
```

#### 🔒 Características de Seguridad de Comandos
- ✅ **Validación estricta** de parámetros con rangos de seguridad
- ✅ **Respaldo automático** de configuración antes de cambios
- ✅ **Rollback automático** si la validación falla
- ✅ **Whitelist de comandos** - solo comandos autorizados
- ✅ **Logging completo** de ejecución vía MQTT (`weather/logs/{station_id}`)
- ✅ **Preservación de conectividad** - WiFi nunca se pierde permanentemente

---

## 📝 Formato de Datos

### Payload de Datos de Sensores (Actualizado)
```json
{
  "timestamp": "123456789",
  "temperature": 25.50,
  "humidity": 65.30,
  "pressure": 1013.25,
  "bmp_temperature": 25.30,
  "altitude": 150.50,
  "light_level": 1500.00,
  "mhrd_analog": 2048,
  "mhrd_humidity_percent": 50.0,
  "mhrd_digital": 1,
  "mhrd_status": "HUMEDO",
  "mhrd_rain_detected": true,
  "rain_analog": 2048,
  "rain_percentage": 50.0,
  "rain_digital": 1,
  "rain_detected": true,
  "rainfall": 0.20,
  "pluvio_rainfall": 0.30,
  "pluvio_accumulated": 2.40,
  "pluvio_pulses": 0,
  "co_level": 1.25,
  "co_raw": 1024,
  "air_quality_digital": 0,
  "dust_pm25": 15.5,
  "uptime": 3600,
  "signal_strength": -45,
  "free_heap": 180000
}
```

**Nota**: El `station_id` no se incluye en el payload JSON ya que está presente en el topic MQTT (`weather/data/{station_id}`).

### Payload de Estado (Actualizado)
```json
{
  "station_id": "ESP32_STATION_001",
  "status": "online",
  "timestamp": "123456789",
  "uptime": 3600,
  "signal_strength": -45,
  "free_heap": 245760,
  "sensors": {
    "dht22": true,
    "bmp180": true,
    "bh1750": true,
    "mh_rd": true,
    "pluviometer": true,
    "mq7": false,
    "mq135": false,
    "dsm501a": false
  }
}
```

**Estados de respuesta comunes**:
- `online` - Sistema funcionando normalmente
- `sensor_check_complete` - Verificación de sensores completada
- `reading_interval_updated` - Intervalo de lectura actualizado
- `sensor_toggled` - Estado de sensor modificado
- `calibration_updated` - Calibración aplicada exitosamente
- `alert_threshold_set` - Umbrales de alerta configurados
- `sleep_mode_updated` - Configuración de deep sleep modificada
- `wifi_updated` - Credenciales WiFi actualizadas
- `going_to_sleep` - Entrando en modo deep sleep
- `awake` - Deep sleep desactivado

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

### Estructura de Calibración (Código Actual)
```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;      // Offset temperatura (°C) [-10.0 a 10.0]
  float temp_scale = 1.0;       // Factor escala temperatura [0.5 a 2.0]
  float humidity_offset = 0.0;  // Offset humedad (%) [-20.0 a 20.0]
  float pressure_offset = 0.0;  // Offset presión (hPa) [-50.0 a 50.0]
  float rain_factor = 0.2;      // mm por pulso MH-RD [0.1 a 2.0]
  float mq7_offset = 0.0;       // Offset sensor CO [-5.0 a 5.0]
  float mq135_offset = 0.0;     // Offset calidad aire [-5.0 a 5.0]
  float light_scale = 1.0;      // Factor escala BH1750 [0.1 a 10.0]
  float light_offset = 0.0;     // Offset BH1750 [-1000 a 1000]
} cal;
```

### Sensores Soportados para Calibración
- **`temperature`** - DHT22 temperatura (offset + escala)
- **`humidity`** - DHT22 humedad (solo offset)
- **`pressure`** - BMP180 presión barométrica (solo offset)
- **`light`** - BH1750 intensidad lumínica (offset + escala)
- **`rain`** - Factor mm/pulso para sensores lluvia (solo offset)
- **`mq7`** - Sensor monóxido de carbono (solo offset)
- **`mq135`** - Sensor calidad del aire (solo offset)

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

### 🧪 Scripts de Testing Automatizado

El proyecto incluye **3 scripts completos** para probar el sistema de comandos MQTT avanzados:

#### 1. 🐍 Script Python Avanzado (`test_mqtt_commands.py`)
```bash
# Instalar dependencias
pip install paho-mqtt

# Ejecutar suite completa de pruebas
python test_mqtt_commands.py

# El script incluye:
# - Verificación automática de respuestas
# - Análisis de logs de ejecución  
# - Reporte de resultados detallado
# - Testing de validación y rollback
```

#### 2. 🐧 Script Bash para Linux/macOS (`test_commands.sh`)
```bash
# Hacer ejecutable
chmod +x test_commands.sh

# Ejecutar todas las pruebas
./test_commands.sh

# Requiere mosquitto-clients
sudo apt-get install mosquitto-clients  # Ubuntu/Debian
brew install mosquitto                  # macOS
```

#### 3. 🪟 Script Windows Batch (`test_commands.bat`)
```cmd
# Ejecutar desde CMD/PowerShell
test_commands.bat

# Requiere Docker con servicios MQTT activos
# Usa contenedores para herramientas mosquitto
```

#### 🎯 Cobertura de Testing
- ✅ **Comandos básicos** (status, restart, sensor_check, wake_up, factory_reset)
- ✅ **Control de intervalos** (set_reading_interval con validación)
- ✅ **Gestión de sensores** (toggle_sensor para los 8 sensores)
- ✅ **Sistema de calibración** (set_calibration para todos los parámetros)
- ✅ **Umbrales de alerta** (set_alert_threshold con persistencia)
- ✅ **Gestión de energía** (sleep_mode con configuración avanzada)
- ✅ **Configuración WiFi** (wifi_config con rollback de seguridad)
- ✅ **Validación de seguridad** (parámetros fuera de rango, comandos inválidos)
- ✅ **Sistema de rollback** (verificación de restauración automática)


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

## 🚀 Estado del Proyecto: PRODUCCIÓN COMPLETA

### ✅ FASE 3 IMPLEMENTADA Y OPERACIONAL
- ✅ **Sistema de comandos MQTT avanzado** (11 comandos con validación completa)
- ✅ **Control granular de 8 sensores individuales** con toggle remoto
- ✅ **Calibración remota en tiempo real** (7 tipos de sensores, sin recompilación)
- ✅ **Sistema de alertas y umbrales** (3 parámetros) configurable vía MQTT
- ✅ **Validación de seguridad completa** con respaldo y rollback automático
- ✅ **Suite de testing automatizado** (Python + Bash + Windows Batch)
- ✅ **Gestión avanzada de energía** (deep sleep configurable 30s-1h)
- ✅ **Configuración WiFi remota** con respaldo de conectividad
- ✅ **Persistencia NVS completa** (configuración sobrevive reinicios)
- ✅ **Sistema de logging y auditoría** completo vía MQTT
- ✅ **Doble sistema de medición lluvia** (MH-RD analógico/digital + Pluviómetro DFRobots)
- ✅ **Sensor BH1750 de luz** activo con calibración remota

### 📊 Estado de Sensores Actual
- **ACTIVOS**: DHT22, BMP180, BH1750, MH-RD, Pluviómetro DFRobots (5/8)
- **DISPONIBLES**: MQ7, MQ135, DSM501A (3/8 - configurable vía comandos)
- **Control remoto**: Todos los sensores pueden activarse/desactivarse vía MQTT

### 🔄 Mejoras Futuras (Opcionales)
- ⏰ Sincronización NTP para timestamps precisos
- 📲 Actualizaciones OTA de firmware remoto
- 🌬️ Sensores adicionales (anemómetro, UV, GPS)
- 💾 Registro local en tarjeta SD/SPIFFS
- 🌐 Interfaz web HTTP embebida
- 🔐 Autenticación MQTT con certificados SSL/TLS

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

### 🎯 Estado del Sistema
- **Hardware**: ESP32 DevKit V1 ✅ OPERACIONAL (5/8 sensores activos)
- **Software**: Firmware Fase 3 ✅ PRODUCCIÓN COMPLETA
- **MQTT**: Sistema de comandos avanzado ✅ 11 COMANDOS IMPLEMENTADOS
- **Integración**: Backend + Frontend ✅ SISTEMA COMPLETO OPERACIONAL
- **Testing**: Suite automatizada ✅ 3 SCRIPTS DE PRUEBA
- **Documentación**: ✅ COMPLETA (README + ADVANCED_COMMANDS)

### 🔗 Archivos de Referencia
- **Código principal**: `weather_station_esp32.ino` (1267 líneas)
- **Comandos avanzados**: `ADVANCED_COMMANDS.md` (manual completo)
- **Tests Python**: `test_mqtt_commands.py` (suite automatizada)
- **Tests Bash**: `test_commands.sh` (Linux/macOS)  
- **Tests Windows**: `test_commands.bat` (Batch script)

Para soporte técnico específico, reportes de bugs, o contribuciones al proyecto, consulta la documentación principal del sistema en `CLAUDE.md`.

---