# Plan Integral - Estación Meteorológica Arduino

## 1. ARQUITECTURA GENERAL DEL SISTEMA

### Componentes Principales
- **Unidad de Sensores**: Conjunto de sensores meteorológicos
- **Microcontrolador**: Arduino/ESP32 para procesamiento
- **Sistema de Comunicación**: WiFi/LoRa/GSM para transmisión
- **Base de Datos**: Almacenamiento histórico de datos
- **Dashboard Web**: Interfaz de usuario interactiva
- **Sistema de Alimentación**: Panel solar + batería
- **Carcasa Weatherproof**: Protección contra intemperie

## 2. SELECCIÓN DE SENSORES

### Sensores Recomendados

#### Temperatura y Humedad
- **DHT22** (básico) - $15-20
  - Rango: -40°C a +80°C, 0-100% HR
  - Precisión: ±0.5°C, ±2-5% HR
- **SHT30/SHT35** (avanzado) - $25-35
  - Mayor precisión: ±0.1°C, ±1.5% HR
  - Interfaz I2C, mejor estabilidad

#### Presión Atmosférica
- **BMP280** - $8-12
  - Rango: 300-1100 hPa
  - Precisión: ±1 hPa
- **BME680** (premium) - $35-45
  - Incluye calidad del aire (VOCs)
  - Temperatura, humedad, presión en un solo sensor

#### Velocidad del Viento (Anemómetro)
- **Anemómetro de Copas con Reed Switch** - $30-50
  - Salida de pulsos digitales
  - Rango típico: 0-50 m/s
- **Sensor Ultrasónico** (sin partes móviles) - $150-300
  - Mayor durabilidad, mayor precisión

#### Dirección del Viento (Veleta)
- **Veleta con Potenciómetro** - $25-40
  - Salida analógica 0-360°
  - Requiere calibración inicial

#### Precipitación (Pluviómetro)
- **Pluviómetro de Balancín** - $40-80
  - Resolución típica: 0.2mm por pulso
  - Salida digital de pulsos
- **Sensor Capacitivo** - $100-200
  - Detección sin partes móviles

#### Calidad del Aire
- **MQ-135** (básico) - $5-10
  - Detección general de gases
- **PMS5003/PMS7003** - $25-40
  - Partículas PM2.5 y PM10
- **CCS811** - $15-25
  - CO2 equivalente y VOCs

### Sensores Adicionales (Opcionales)
- **Radiación UV**: GUVA-S12SD ($8-15)
- **Luminosidad**: BH1750 ($3-8)
- **Radiación Solar**: Piranómetro ($200-500)

## 3. HARDWARE Y MICROCONTROLADOR

### Microcontrolador Recomendado
**ESP32 DevKit** - $15-25
- **Ventajas**:
  - WiFi y Bluetooth integrados
  - Doble núcleo, 240MHz
  - Múltiples pines ADC y GPIO
  - Bajo consumo energético
  - Compatible con Arduino IDE

### Componentes Adicionales
- **Multiplexor I2C** (TCA9548A) - $5-8
- **Convertidor ADC externo** (ADS1115) - $8-12
- **RTC** (DS3231) - $3-5
- **Tarjeta SD** para backup local - $5-10
- **Display LCD** (opcional) - $10-20

## 4. CONECTIVIDAD Y TRANSMISIÓN

### Opciones de Conectividad

#### WiFi (Recomendado para áreas urbanas)
- **Ventajas**: Alta velocidad, fácil implementación
- **Desventajas**: Limitado por alcance del router
- **Consumo**: Moderado (configurable deep sleep)

#### LoRa (Ideal para áreas remotas)
- **Módulo**: RFM95W ($15-20)
- **Alcance**: Hasta 15km en campo abierto
- **Consumo**: Muy bajo
- **Limitación**: Baja velocidad de datos

#### GSM/4G (Máxima cobertura)
- **Módulo**: SIM800L ($10-15) o SIM7600 ($35-50)
- **Ventajas**: Cobertura universal
- **Desventajas**: Mayor consumo, costos de datos

### Protocolo de Comunicación Recomendado
- **MQTT** para transmisión eficiente
- **HTTP REST API** para compatibilidad amplia
- **JSON** como formato de datos

## 5. SISTEMA DE ALIMENTACIÓN SOLAR

### Componentes del Sistema
- **Panel Solar**: 20W ($30-50)
- **Controlador de Carga**: PWM 10A ($10-15)
- **Batería**: LiFePO4 12V 7Ah ($40-60)
- **Convertidor DC-DC**: Regulador a 3.3V/5V ($5-10)

### Cálculo de Consumo
```
Consumo estimado:
- ESP32 activo: 160mA @ 3.3V = 0.53W
- Sensores: 50mA @ 3.3V = 0.16W
- Transmisión (10% tiempo): 200mA @ 3.3V = 0.066W
Total promedio: ~0.75W
Diario: 18Wh

Batería requerida: 7Ah (autonomía 4-5 días sin sol)
Panel solar: 20W (suficiente para días nublados)
```

## 6. BASE DE DATOS Y BACKEND

### Arquitectura de Datos

#### Base de Datos Recomendada
**InfluxDB** (Time Series Database)
- Optimizada para datos temporales
- Excelente rendimiento para consultas históricas
- Fácil integración con Grafana

#### Estructura de Datos
```sql
-- Tabla principal de mediciones
CREATE TABLE weather_data (
    timestamp DATETIME PRIMARY KEY,
    station_id VARCHAR(50),
    temperature DECIMAL(4,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(7,2),
    wind_speed DECIMAL(5,2),
    wind_direction INT,
    rainfall DECIMAL(6,2),
    pm25 DECIMAL(6,2),
    pm10 DECIMAL(6,2),
    uv_index DECIMAL(4,2),
    battery_voltage DECIMAL(4,2)
);

-- Tabla de alertas
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    alert_type VARCHAR(50),
    message TEXT,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    acknowledged BOOLEAN DEFAULT FALSE
);
```

#### Backend API (Node.js + Express)
```javascript
// Estructura básica del servidor
const express = require('express');
const influx = require('influx');
const mqtt = require('mqtt');

const app = express();

// Configuración InfluxDB
const influxClient = new influx.InfluxDB({
    host: 'localhost',
    database: 'weather_station',
    schema: [
        {
            measurement: 'weather',
            fields: {
                temperature: influx.FieldType.FLOAT,
                humidity: influx.FieldType.FLOAT,
                pressure: influx.FieldType.FLOAT
                // ... otros campos
            },
            tags: ['station_id']
        }
    ]
});

// Endpoint para recibir datos
app.post('/api/data', (req, res) => {
    const data = req.body;
    
    influxClient.writePoints([{
        measurement: 'weather',
        tags: { station_id: data.station_id },
        fields: data.measurements,
        timestamp: new Date()
    }]);
    
    res.status(200).send('Data received');
});
```

## 7. PROGRAMACIÓN DEL MICROCONTROLADOR

### Código Principal Arduino/ESP32

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// Configuración de pines
#define DHT_PIN 4
#define WIND_SPEED_PIN 2
#define WIND_DIR_PIN A0
#define RAIN_PIN 3

// Configuración sensores
DHT dht(DHT_PIN, DHT22);
Adafruit_BMP280 bmp;

// Variables globales
volatile int wind_pulses = 0;
volatile int rain_pulses = 0;
unsigned long last_reading = 0;

// Configuración WiFi y MQTT
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* mqtt_server = "your-server.com";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
    Serial.begin(115200);
    
    // Inicializar sensores
    dht.begin();
    bmp.begin();
    
    // Configurar interrupciones
    attachInterrupt(digitalPinToInterrupt(WIND_SPEED_PIN), windPulse, FALLING);
    attachInterrupt(digitalPinToInterrupt(RAIN_PIN), rainPulse, FALLING);
    
    // Conectar WiFi
    connectWiFi();
    
    // Configurar MQTT
    client.setServer(mqtt_server, 1883);
}

void loop() {
    if (millis() - last_reading > 60000) { // Lectura cada minuto
        readSensors();
        sendData();
        last_reading = millis();
    }
    
    client.loop();
    delay(100);
}

void readSensors() {
    // Leer DHT22
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    // Leer BMP280
    float pressure = bmp.readPressure() / 100.0F; // hPa
    
    // Calcular velocidad del viento (pulsos por minuto)
    float wind_speed = (wind_pulses * 2.4) / 60.0; // km/h
    wind_pulses = 0;
    
    // Leer dirección del viento
    int wind_dir_raw = analogRead(WIND_DIR_PIN);
    float wind_direction = map(wind_dir_raw, 0, 1023, 0, 360);
    
    // Calcular precipitación
    float rainfall = rain_pulses * 0.2; // mm
    rain_pulses = 0;
    
    // Crear JSON
    StaticJsonDocument<500> doc;
    doc["station_id"] = "STATION_001";
    doc["timestamp"] = WiFi.getTime();
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["pressure"] = pressure;
    doc["wind_speed"] = wind_speed;
    doc["wind_direction"] = wind_direction;
    doc["rainfall"] = rainfall;
    
    String payload;
    serializeJson(doc, payload);
    
    // Enviar por MQTT
    client.publish("weather/data", payload.c_str());
}

void windPulse() {
    wind_pulses++;
}

void rainPulse() {
    rain_pulses++;
}
```

## 8. DASHBOARD WEB INTERACTIVO

### Tecnologías Recomendadas
- **Frontend**: React + Chart.js o Vue.js + D3.js
- **Tiempo Real**: WebSocket o Socket.io
- **Mapas**: Leaflet.js para ubicación
- **UI Framework**: Material-UI o Bootstrap

### Funcionalidades del Dashboard

#### Vista Principal
- **Mediciones Actuales**: Cards con valores en tiempo real
- **Gráficos Históricos**: Líneas de tiempo configurables
- **Mapa**: Ubicación de la estación
- **Estado del Sistema**: Batería, conectividad, última actualización

#### Alertas y Notificaciones
```javascript
// Sistema de alertas
const alertRules = [
    {
        parameter: 'temperature',
        condition: '> 40',
        severity: 'HIGH',
        message: 'Temperatura extrema detectada'
    },
    {
        parameter: 'wind_speed',
        condition: '> 60',
        severity: 'CRITICAL',
        message: 'Vientos peligrosos'
    }
];
```

#### Exportación de Datos
- **Formatos**: CSV, JSON, Excel
- **Filtros**: Por fecha, parámetro, agregación
- **Reportes**: PDF automáticos

## 9. CARCASA WEATHERPROOF

### Especificaciones de Protección
- **Grado IP**: IP65 mínimo (protección contra polvo y agua)
- **Material**: ABS o policarbonato con protección UV
- **Ventilación**: Para sensores de temperatura/humedad
- **Montaje**: Mástil ajustable, base antivibración

### Diseño Recomendado
- **Carcasa Principal**: 200x150x100mm
- **Compartimento Batería**: Separado, fácil acceso
- **Cable Glands**: Entradas selladas para cables
- **Protección Solar**: Escudo radiante para sensores

## 10. CALIBRACIÓN DE SENSORES

### Proceso de Calibración

#### Temperatura y Humedad
1. **Calibración de 2 puntos**: Hielo (0°C) y agua hirviendo (100°C)
2. **Cámara húmeda**: Sales saturadas para calibrar humedad
3. **Comparación**: Con estación meteorológica certificada

#### Presión Atmosférica
1. **Referencia**: Datos de estación meteorológica local
2. **Ajuste por altitud**: Compensación barométrica
3. **Deriva temporal**: Recalibración periódica

#### Viento
1. **Túnel de viento**: Calibración de velocidades conocidas
2. **Compass**: Verificación de dirección con brújula
3. **Factor de corrección**: Ajuste por instalación

### Código de Calibración
```cpp
// Factores de calibración (ajustar según pruebas)
struct CalibrationFactors {
    float temp_offset = 0.0;
    float temp_scale = 1.0;
    float humidity_offset = 0.0;
    float pressure_offset = 0.0;
    float wind_speed_factor = 2.4; // pulsos a km/h
    float wind_dir_offset = 0.0;   // corrección magnética
};

CalibrationFactors cal;

float calibrateTemperature(float raw_temp) {
    return (raw_temp * cal.temp_scale) + cal.temp_offset;
}
```

## 11. ESTIMACIÓN DE COSTOS

### Costos de Hardware

#### Opción Básica (~$300-400)
| Componente | Cantidad | Precio Unit. | Total |
|------------|----------|-------------|--------|
| ESP32 | 1 | $20 | $20 |
| DHT22 | 1 | $15 | $15 |
| BMP280 | 1 | $10 | $10 |
| Anemómetro básico | 1 | $40 | $40 |
| Veleta | 1 | $30 | $30 |
| Pluviómetro | 1 | $50 | $50 |
| MQ-135 | 1 | $8 | $8 |
| Panel solar 20W | 1 | $40 | $40 |
| Batería LiFePO4 | 1 | $50 | $50 |
| Carcasa + accesorios | 1 | $60 | $60 |
| Componentes varios | - | - | $50 |
| **SUBTOTAL** | | | **$373** |

#### Opción Avanzada (~$800-1000)
| Componente | Cantidad | Precio Unit. | Total |
|------------|----------|-------------|--------|
| ESP32 | 1 | $20 | $20 |
| SHT35 | 1 | $30 | $30 |
| BME680 | 1 | $40 | $40 |
| Anemómetro ultrasónico | 1 | $200 | $200 |
| Veleta de precisión | 1 | $60 | $60 |
| Pluviómetro profesional | 1 | $120 | $120 |
| PMS7003 | 1 | $35 | $35 |
| Sensor UV | 1 | $15 | $15 |
| Panel solar 50W | 1 | $80 | $80 |
| Batería 20Ah | 1 | $120 | $120 |
| Carcasa profesional | 1 | $150 | $150 |
| **SUBTOTAL** | | | **$870** |

### Costos de Software y Servicios
- **Servidor VPS**: $10-20/mes
- **Base de datos cloud**: $5-15/mes
- **Dominio**: $12/año
- **Certificado SSL**: $0 (Let's Encrypt)

## 12. CRONOGRAMA DE IMPLEMENTACIÓN

### Fase 1: Diseño y Adquisiciones (Semanas 1-2)
- ✅ Definir especificaciones finales
- ✅ Ordenar componentes
- ✅ Diseñar PCB (opcional)
- ✅ Preparar entorno de desarrollo

### Fase 2: Desarrollo de Hardware (Semanas 3-4)
- 🔄 Ensamble de prototipo
- 🔄 Pruebas individuales de sensores
- 🔄 Integración de sistema de alimentación
- 🔄 Pruebas de conectividad

### Fase 3: Desarrollo de Software (Semanas 4-6)
- 🔄 Programación del microcontrolador
- 🔄 Configuración de base de datos
- 🔄 Desarrollo del backend API
- 🔄 Implementación del dashboard

### Fase 4: Integración y Pruebas (Semanas 7-8)
- 🔄 Pruebas de sistema completo
- 🔄 Calibración de sensores
- 🔄 Pruebas de resistencia
- 🔄 Optimización de consumo

### Fase 5: Instalación y Despliegue (Semanas 9-10)
- 🔄 Construcción de carcasa final
- 🔄 Instalación en ubicación
- 🔄 Configuración de monitoreo
- 🔄 Documentación final

## 13. CONSIDERACIONES ADICIONALES

### Mantenimiento
- **Limpieza mensual** de sensores
- **Verificación trimestral** de calibración
- **Reemplazo anual** de componentes críticos
- **Actualización de firmware** según necesidad

### Escalabilidad
- **Red de estaciones**: Protocolo para múltiples ubicaciones
- **Machine Learning**: Predicciones basadas en datos históricos
- **API pública**: Compartir datos con terceros
- **Alertas móviles**: App para notificaciones

### Cumplimiento Normativo
- **Certificación CE/FCC**: Para uso comercial
- **Estándares WMO**: Compatibilidad meteorológica
- **GDPR**: Si se almacenan datos de usuarios

### Redundancia y Backup
- **Almacenamiento local**: SD card como respaldo
- **Múltiples canales**: WiFi + LoRa para confiabilidad
- **Base de datos replicada**: Backup automático

---

Este plan integral proporciona una base sólida para desarrollar tu estación meteorológica. La implementación puede adaptarse según tus necesidades específicas, presupuesto y nivel de experiencia técnica.