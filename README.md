# Estación Meteorológica IoT

Sistema completo de estación meteorológica basado en Arduino/ESP32 con dashboard web y almacenamiento en base de datos de series temporales.

## 📋 Características

- **Sensores Meteorológicos**: Temperatura, humedad, presión, viento, lluvia
- **Conectividad**: WiFi con protocolo MQTT
- **Base de Datos**: InfluxDB para datos de series temporales
- **Dashboard**: React/Next.js con TypeScript + Grafana para visualización
- **API REST**: Backend en Node.js/Express
- **Alertas**: Sistema de notificaciones automáticas
- **Exportación**: Datos en CSV/JSON
- **Frontend Moderno**: Material-UI 7.3.1, Chart.js, Leaflet maps

## 🏗️ Arquitectura del Sistema

### Diagrama General del Sistema
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           📡 ESTACIÓN METEOROLÓGICA IOT                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   🌡️ SENSORES    │    │   📶 CONECTIVIDAD │    │   💻 BACKEND     │    │   📊 FRONTEND    │
│                  │    │                  │    │                  │    │                  │
│ DHT22 (Temp/Hum) │    │                  │    │   Node.js/Express│    │   React/Next.js  │
│ BMP180 (Presión) │    │    📡 WiFi       │    │   Puerto: 5002   │    │   Puerto: 3001+  │
│ BH1750 (Luz)     │◄──►│       +          │◄──►│                  │◄──►│                  │
│ MH-RD (Lluvia)   │    │    🔗 MQTT       │    │   🔄 Middlewares │    │   📈 Dashboard   │
│ MQ7 (CO)         │    │   Puerto: 1883   │    │   • Rate Limit   │    │   • Material-UI  │
│ MQ135 (Aire)     │    │   WS: 9001       │    │   • Validation   │    │   • Chart.js     │
│ DSM501A (PM2.5)  │    │                  │    │   • CORS         │    │   • Leaflet Maps │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
         │                        │                        │                        │
         │                        │                        │                        │
         └────────────────────────┼────────────────────────┼────────────────────────┘
                                  │                        │
┌──────────────────────────────────┼────────────────────────┼──────────────────────────────────┐
│                               📊 ALMACENAMIENTO Y VISUALIZACIÓN                            │
│                                  │                        │                                  │
│  ┌─────────────────┐            │                        │            ┌─────────────────┐   │
│  │   🗄️ InfluxDB   │◄───────────┘                        └───────────►│   📈 Grafana    │   │
│  │                 │                                                   │                 │   │
│  │  • Time-series  │              ┌─────────────────┐                  │  • Dashboards   │   │
│  │  • Weather data │              │   🔴 Redis      │                  │  • Alertas      │   │
│  │  • Puerto: 8086 │              │                 │                  │  • Puerto: 3000 │   │
│  │  • Bucket: data │              │  • Cache        │                  │  • admin/pass   │   │
│  │  • Org: station │              │  • Sessions     │                  │  • Datasources  │   │
│  └─────────────────┘              │  • Puerto: 6379 │                  └─────────────────┘   │
│                                   └─────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

                              🐳 Docker Compose Orquestación
```

### Flujo de Datos Detallado

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   📊 FLUJO DE DATOS                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

1️⃣ CAPTURA DE DATOS (ESP32 DevKit V1)
┌──────────────────┐
│   📡 ESP32       │──── 60s interval ────┐
│   ESP32 DevKit V1│                      │
│                  │  ┌─────────────────────▼──────────────────┐
│ • Sensores I2C   │  │  📋 JSON Payload                       │
│ • GPIO Digital   │  │  {                                     │
│ • WiFiManager    │  │    "station_id": "ESP32_STATION_001", │
│ • Interrupciones │  │    "timestamp": millis(),             │
└──────────────────┘  │    "temperature": 25.67,              │
                      │    "humidity": 65.23,                 │
                      │    "pressure": 1013.25,               │
                      │    "light_level": 1234.56,            │
                      │    "rainfall": 0.2,                   │
                      │    "co_level": 2.45,                  │
                      │    "air_quality_digital": 0,           │
                      │    "dust_pm25": 12.34,                │
                      │    "uptime": 12345,                    │
                      │    "signal_strength": -45,             │
                      │    "free_heap": 25600                  │
                      │  }                                     │
                      └────────────────────────────────────────┘

2️⃣ TRANSMISIÓN MQTT
┌──────────────────┐    📡 WiFi     ┌──────────────────┐
│   📤 Publisher   │──────────────►│   🔗 MQTT Broker │
│   ESP32          │               │   Mosquitto      │
│                  │  Topic:       │   Puerto: 1883   │
│ • Auto-reconnect │  weather/data/│   WS: 9001       │
│ • QoS Level 0    │  ESP32_STATION│                  │
│ • JSON Payload   │  _001         │ • Retain: false  │
└──────────────────┘               │ • Persistence    │
                                   └──────────────────┘

3️⃣ PROCESAMIENTO BACKEND (Node.js)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│   💻 Backend API Server (Puerto: 5002)                                               │
│                                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │  🔗 MQTT Client │    │  ⚡ Middleware  │    │  🗄️ InfluxDB    │                  │
│  │                 │    │                 │    │  Client          │                  │
│  │ • mqttService   │───►│ • Validation    │───►│                 │                  │
│  │ • Auto-connect  │    │ • Rate Limiting │    │ • writeWeather  │                  │
│  │ • Message Queue │    │ • CORS Handler  │    │ • Timestamp Fix │                  │
│  │ • Error Recovery│    │ • Body Parser   │    │ • Batch Writes  │                  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                  │
│                                   │                       │                          │
│                                   ▼                       ▼                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │  ⚠️ Alert Engine│    │  📊 API Routes  │    │  📄 Data Export │                  │
│  │                 │    │                 │    │                 │                  │
│  │ • Threshold     │    │ • /weather/*    │    │ • CSV Format    │                  │
│  │ • Suppression   │    │ • /alerts/*     │    │ • JSON Format   │                  │
│  │ • Notifications │    │ • /health       │    │ • Time Ranges   │                  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────────────┘

4️⃣ ALMACENAMIENTO (InfluxDB)
┌─────────────────────────────────────────────────────────────────────────────────────┐
│   🗄️ InfluxDB Time-Series Database (Puerto: 8086)                                   │
│                                                                                     │
│  📊 Bucket: weather-data    🏢 Org: weather-station                                 │
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                 │
│  │  📈 Measurement │    │  🏷️ Tags         │    │  📊 Fields       │                 │
│  │  "weather"      │    │                 │    │                 │                 │
│  │                 │    │ • station_id    │    │ • temperature   │                 │
│  │ Time-based      │    │ • location      │    │ • humidity      │                 │
│  │ Auto-indexing   │    │ • sensor_type   │    │ • pressure      │                 │
│  │ Retention       │    │                 │    │ • light_level   │                 │
│  │ Compression     │    │                 │    │ • rainfall      │                 │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

5️⃣ VISUALIZACIÓN Y MONITOREO
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                             📊 Frontend Interfaces                                   │
│                                                                                      │
│  ┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐  │
│  │   🌐 React Dashboard (Puerto 3001+) │    │   📈 Grafana (Puerto: 3000)        │  │
│  │                                     │    │                                     │  │
│  │  ┌─────────────────┐                │    │  ┌─────────────────┐                │  │
│  │  │ 📊 Components   │                │    │  │ 📋 Dashboards   │                │  │
│  │  │                 │                │    │  │                 │                │  │
│  │  │ • Current Data  │◄──── API ─────┐│    │  │ • Weather Panel │◄─── Flux ────┐│  │
│  │  │ • Historical    │              ││    │  │ • Alert Panel   │              ││  │
│  │  │ • Weather Maps  │              ││    │  │ • System Health │              ││  │
│  │  │ • Alerts Panel  │              ││    │  │ • Custom Queries│              ││  │
│  │  │ • System Status │              ││    │  └─────────────────┘              ││  │
│  │  └─────────────────┘              ││    │                                   ││  │
│  │                                   ││    │  admin/grafana123                ││  │
│  │  Next.js + TypeScript + Material ││    │  Auto-configured datasource      ││  │
│  └───────────────────────────────────┘│    └───────────────────────────────────┘│  │
│                                       │                                        │  │
│                                       └────────────────────────────────────────┘  │
│                            REST API Calls (http://localhost:5002/api)              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológico

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           🏗️ TECNOLOGÍAS UTILIZADAS                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

🖥️ HARDWARE & FIRMWARE
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ESP8266 (WEMOS D1 R2)     │ Microcontrolador principal WiFi                      │
│ Arduino Framework         │ C++ con librerías específicas                        │
│ • PubSubClient            │ Cliente MQTT para ESP8266                            │
│ • ArduinoJson             │ Serialización JSON                                   │
│ • DHT Sensor Library      │ Lectura sensores temperatura/humedad                 │
│ • Adafruit BMP085         │ Presión barométrica                                   │
│ • BH1750 Library          │ Sensor de luminosidad                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

💻 BACKEND & API
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Node.js 18+               │ Runtime JavaScript                                    │
│ Express.js 4.18           │ Framework web minimalista                            │
│ • express-rate-limit      │ Rate limiting                                         │
│ • helmet                  │ Seguridad HTTP headers                               │
│ • cors                    │ Cross-Origin Resource Sharing                        │
│ • morgan                  │ HTTP request logger                                   │
│ MQTT.js                   │ Cliente MQTT para Node.js                            │
│ InfluxDB 2.x Client       │ Base de datos time-series                            │
│ Winston                   │ Sistema de logging estructurado                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

🌐 FRONTEND & UI
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ React 19.1.1              │ Library UI declarativa                               │
│ Next.js 15.4.6            │ Framework React con SSR/SSG                          │
│ TypeScript 5.9.2          │ Tipado estático para JavaScript                      │
│ Material-UI 7.3.1         │ Componentes UI siguiendo Material Design            │
│ • @mui/material           │ Componentes core                                      │
│ • @mui/icons-material     │ Iconografía                                           │
│ • @emotion/react          │ CSS-in-JS styling                                     │
│ Chart.js 4.5.0            │ Gráficos y visualizaciones                           │
│ Leaflet 1.9+              │ Mapas interactivos                                    │
│ • react-leaflet           │ Integración React                                     │
│ Socket.IO Client 4.8.1    │ WebSocket real-time communication                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

🗄️ ALMACENAMIENTO & INFRAESTRUCTURA
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ InfluxDB 2.7              │ Base de datos time-series                            │
│ • Flux Query Language     │ Lenguaje consultas optimizado                        │
│ • Bucket: weather-data    │ Almacenamiento datos meteorológicos                  │
│ • Retention Policies      │ Gestión automática de datos históricos               │
│ Redis 7 Alpine            │ Cache en memoria y sessions                          │
│ • Key-value store         │ Cache API responses                                   │
│ • Session management      │ Autenticación y estado                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

📡 COMUNICACIÓN & MESSAGERÍA
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Eclipse Mosquitto 2       │ Broker MQTT ligero                                   │
│ • QoS Levels 0,1,2        │ Quality of Service configurable                      │
│ • WebSocket Support       │ Cliente web vía WS (puerto 9001)                     │
│ • Persistence             │ Mensajes persistentes en disco                       │
│ • Authentication          │ Opcional con usuarios/passwords                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

📊 VISUALIZACIÓN & MONITOREO
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Grafana Latest            │ Plataforma de monitoreo y visualización              │
│ • InfluxDB Datasource     │ Conexión nativa con InfluxDB                         │
│ • Dashboard Templates     │ Dashboards predefinidos                              │
│ • Alert Manager           │ Sistema de alertas avanzado                          │
│ • User Management         │ Control de acceso y roles                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

🐳 DEVOPS & CONTENEDORES
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Docker Engine             │ Containerización de servicios                        │
│ Docker Compose            │ Orquestación multi-container                         │
│ • Networks: bridge        │ Red interna para comunicación                        │
│ • Volumes: persistent     │ Almacenamiento persistente                           │
│ • Health Checks           │ Monitoreo de estado de servicios                     │
│ Alpine Linux Base         │ Imágenes base ligeras                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

🧪 TESTING & CALIDAD DE CÓDIGO
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Jest 29.7.0               │ Framework de testing para JavaScript                 │
│ • Backend Testing         │ Tests unitarios y de integración                     │
│ • Frontend Testing        │ Tests de componentes React                           │
│ React Testing Library     │ Testing utilities para componentes React            │
│ Supertest 6.3.3           │ Testing HTTP APIs                                     │
│ jsdom Environment         │ Entorno de testing para componentes DOM              │
│ Coverage Reports          │ Reportes de cobertura de código                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Arquitectura de Despliegue

```
🏠 DESARROLLO LOCAL                           ☁️ PRODUCCIÓN (Ejemplo)
┌─────────────────────────────────────┐      ┌─────────────────────────────────────┐
│                                     │      │                                     │
│  🖥️ Host Machine (Windows)          │      │  🌍 Cloud Provider                  │
│  ├── 📂 Proyecto                    │      │  ├── 🔄 Load Balancer               │
│  │   ├── arduino/                   │      │  ├── 🖥️ App Server                  │
│  │   ├── backend/                   │      │  │   ├── Node.js API (PM2)          │
│  │   ├── frontend/                  │      │  │   └── Next.js Build              │
│  │   └── docker-compose.yml         │      │  ├── 🗄️ Database Server             │
│  ├── 🐳 Docker Desktop              │      │  │   ├── InfluxDB Cluster           │
│  │   ├── weather_influxdb:8086      │      │  │   └── Redis Cluster              │
│  │   ├── weather_grafana:3000       │      │  ├── 📡 MQTT Broker                 │
│  │   ├── weather_mosquitto:1883     │      │  │   └── Mosquitto Cluster          │
│  │   └── weather_redis:6379         │      │  └── 📊 Monitoring                  │
│  ├── Node.js Backend:5002           │      │      ├── Grafana                    │
│  └── Next.js Frontend:3001+         │      │      └── Prometheus + AlertManager │
│                                     │      │                                     │
│  🌐 Network: bridge                 │      │  🔒 Security:                       │
│  📦 Volumes: local bind mounts      │      │  ├── SSL/TLS Certificates           │
│                                     │      │  ├── VPN Access                     │
│                                     │      │  ├── Firewall Rules                 │
│                                     │      │  └── Secret Management              │
└─────────────────────────────────────┘      └─────────────────────────────────────┘

🏠 ESP8266 Station                            🏠 ESP8266 Station  
┌─────────────────────────────────────┐      ┌─────────────────────────────────────┐
│  📡 WEMOS_STATION_001               │      │  📡 WEMOS_STATION_002               │
│  ├── 🌡️ DHT22 (Temp/Humidity)      │◄────►│  ├── 🌡️ Different sensor config    │
│  ├── 🧭 BMP180 (Pressure)           │ WiFi │  ├── 🌪️ Anemometer + Wind Vane      │
│  ├── 💡 BH1750 (Light)              │      │  ├── 🌧️ Rain Gauge                  │
│  ├── 🌧️ MH-RD (Rain detector)       │      │  └── 🔋 Solar Panel + Battery       │
│  ├── 🫁 MQ7 (CO)                    │      │                                     │
│  ├── 🏭 MQ135 (Air Quality)          │      │  📍 Remote Location                 │
│  ├── 🌫️ DSM501A (PM2.5)             │      │  🔋 Battery Powered                 │
│  └── 🔌 USB Powered                 │      │  📡 Long Range WiFi                 │
│                                     │      │                                     │
│  📍 Indoor/Outdoor Station          │      │  ⏰ Deep Sleep Mode                 │
│  🔄 60s Reading Interval            │      │  🔄 10min Reading Interval          │
└─────────────────────────────────────┘      └─────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

- **Docker Desktop** (Windows/Mac) o **Docker Engine + Docker Compose** (Linux)
- **Node.js 18+** (para desarrollo local)
- **Arduino IDE 2.x** o **PlatformIO** (para firmware ESP8266)
- **Git** (para clonación del repositorio)

### 1. Configurar la Infraestructura

```bash
# Clonar el proyecto
git clone <repository-url>
cd estacion-metereologica

# Iniciar servicios con Docker
docker-compose up -d

# Verificar que todos los servicios estén funcionando
docker-compose ps
```

Servicios disponibles:
- **InfluxDB**: http://localhost:8086
- **Grafana**: http://localhost:3000 (admin/grafana123)
- **MQTT Broker**: localhost:1883

### 2. Configurar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# Iniciar en modo desarrollo (puerto 5002)
npm run dev
```

### 3. Configurar el Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env.local
# O crear .env.local con:
# NEXT_PUBLIC_API_URL=http://localhost:5002/api

# Iniciar en modo desarrollo
npm run dev
```

### 4. Configurar el Arduino/ESP32

1. Abrir `arduino/weather_station_wemos/weather_station_wemos.ino`
2. Configurar WiFi y MQTT:
```cpp
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* mqtt_server = "tu-servidor-mqtt.com";
```
3. Subir el código al ESP32

### 🌐 Servicios Disponibles

- **Frontend Dashboard**: http://localhost:3001+ (auto-asignado, evita 3000 usado por Grafana)
- **Backend API**: http://localhost:5002/api (Node.js/Express)
- **InfluxDB UI**: http://localhost:8086 (admin/weather123)
- **Grafana Dashboard**: http://localhost:3000 (admin/grafana123)
- **MQTT Broker**: localhost:1883 (WebSocket: 9001)

## 📊 API Endpoints

### Weather Data
- `POST /api/weather/data` - Enviar datos meteorológicos
- `GET /api/weather/data/:stationId` - Obtener datos históricos
- `GET /api/weather/data/:stationId/latest` - Últimos datos
- `GET /api/weather/stations` - Listar estaciones

### Alertas
- `GET /api/alerts` - Obtener alertas
- `GET /api/alerts/:stationId` - Alertas por estación
- `POST /api/alerts` - Crear alerta manual

### Ejemplo de Uso

```bash
# Obtener últimos datos de una estación
curl http://localhost:5002/api/weather/data/ESP32_STATION_001/latest

# Obtener datos históricos (últimos 30 minutos)
curl "http://localhost:5002/api/weather/data/ESP32_STATION_001?timeRange=30m"

# Exportar datos en CSV
curl "http://localhost:5002/api/weather/export/ESP32_STATION_001?format=csv&start=-7d"
```

## 🔧 Hardware y Configuración ESP32/WEMOS

### Diagrama de Conexiones WEMOS D1 R2

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    🖥️ WEMOS D1 R2                          │
                    │                 (ESP8266 Compatible)                       │
                    ├─────────────────────────────────────────────────────────────┤
                    │                                                             │
          3V3 ──────┤ 3V3                                                  RST ├───── RST
          GND ──────┤ GND                                                   A0 ├───── 🌬️ MQ7 (CO)
           D0 ──────┤ D0 (GPIO16)              ┌─────────┐                  D0 ├─────
           D1 ──────┤ D1 (GPIO5/SCL) ──────────┤   I2C   ├─────────────────── D1 ├───── 🔗 SCL
           D2 ──────┤ D2 (GPIO4/SDA) ──────────┤   BUS   ├─────────────────── D2 ├───── 🔗 SDA
           D3 ──────┤ D3 (GPIO0)               └─────────┘                  D3 ├─────
           D4 ──────┤ D4 (GPIO2) ──────────────────────────────────────────── D4 ├───── 🌧️ MH-RD (Rain)
         3V3 ──────┤ 3V3                                                   D5 ├───── 🌡️ DHT22 (Data)
           D6 ──────┤ D6 (GPIO12) ─────────────────────────────────────────── D6 ├───── 🏭 MQ135 (Air Quality)
           D7 ──────┤ D7 (GPIO13) ─────────────────────────────────────────── D7 ├───── 🌫️ DSM501A (PM2.5)
           D8 ──────┤ D8 (GPIO15)                                           D8 ├─────
         GND ──────┤ GND                                                  5V ├───── 5V
                    └─────────────────────────────────────────────────────────────┘

                              📡 WiFi: 2.4GHz (802.11 b/g/n)
                              🔌 Alimentación: 5V/1A (USB/Barrel)
                              💾 Memoria: 4MB Flash
```

### Conexión Detallada de Sensores

```
🌡️ DHT22 (Temperatura y Humedad)
┌─────────────────┐    ┌─────────────────┐
│    DHT22        │    │   WEMOS D1 R2   │
│                 │    │                 │
│ VCC (Pin 1) ────┼────┤ 3V3             │
│ DATA (Pin 2) ───┼────┤ D5 (GPIO14)     │ + Pull-up 10kΩ a 3V3
│ NC (Pin 3)      │    │                 │
│ GND (Pin 4) ────┼────┤ GND             │
└─────────────────┘    └─────────────────┘

🧭 BMP180 (Presión Barométrica) + 💡 BH1750 (Luminosidad)
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     BMP180      │    │   I2C BUS       │    │    BH1750       │
│                 │    │                 │    │                 │
│ VCC ────────────┼────┤ 3V3             ├────┼──────────── VCC │
│ GND ────────────┼────┤ GND             ├────┼──────────── GND │
│ SCL ────────────┼────┤ D1 (GPIO5/SCL)  ├────┼──────────── SCL │
│ SDA ────────────┼────┤ D2 (GPIO4/SDA)  ├────┼──────────── SDA │
│                 │    │                 │    │                 │
│ I2C Addr: 0x77  │    │ Pull-ups: 4.7kΩ │    │ I2C Addr: 0x23  │
└─────────────────┘    └─────────────────┘    └─────────────────┘

🌧️ MH-RD (Sensor de Lluvia)
┌─────────────────┐    ┌─────────────────┐
│     MH-RD       │    │   WEMOS D1 R2   │
│                 │    │                 │
│ VCC ────────────┼────┤ 3V3             │
│ GND ────────────┼────┤ GND             │
│ DO (Digital) ───┼────┤ D4 (GPIO2)      │ ← Interrupt Pin
│ AO (Analog) ────┼────┤ No Connect      │   (Opcional)
└─────────────────┘    └─────────────────┘

🫁 MQ7 (Monóxido de Carbono)
┌─────────────────┐    ┌─────────────────┐
│      MQ7        │    │   WEMOS D1 R2   │
│                 │    │                 │
│ VCC ────────────┼────┤ 5V (Para heater)│
│ GND ────────────┼────┤ GND             │
│ DO (Digital) ───┼────┤ No Connect      │
│ AO (Analog) ────┼────┤ A0 (ADC)        │ ← 0-1024 (0-3.3V)
└─────────────────┘    └─────────────────┘

🏭 MQ135 (Calidad del Aire)
┌─────────────────┐    ┌─────────────────┐
│     MQ135       │    │   WEMOS D1 R2   │
│                 │    │                 │
│ VCC ────────────┼────┤ 3V3             │
│ GND ────────────┼────┤ GND             │
│ DO (Digital) ───┼────┤ D6 (GPIO12)     │ ← Threshold detect
│ AO (Analog) ────┼────┤ No Connect      │   (Opcional)
└─────────────────┘    └─────────────────┘

🌫️ DSM501A (Partículas PM2.5)
┌─────────────────┐    ┌─────────────────┐
│    DSM501A      │    │   WEMOS D1 R2   │
│                 │    │                 │
│ VCC (Pin 3) ────┼────┤ 5V              │
│ GND (Pin 1) ────┼────┤ GND             │
│ PM2.5 (Pin 4) ──┼────┤ D7 (GPIO13)     │ ← Pulse width measure
│ PM10 (Pin 2) ───┼────┤ No Connect      │   (Opcional)
│ CTRL (Pin 5) ───┼────┤ GND             │   (Always enabled)
└─────────────────┘    └─────────────────┘
```

### Especificaciones Técnicas WEMOS D1 R2

| Componente | Especificación |
|------------|----------------|
| **Microcontrolador** | ESP8266 (80/160 MHz) |
| **Memoria Flash** | 4MB |
| **RAM** | 80KB |
| **GPIO Digitales** | 11 pines (D0-D8, TX, RX) |
| **GPIO Analógicos** | 1 pin (A0) - 0-3.3V, 10-bit ADC |
| **I2C** | D1 (SCL), D2 (SDA) |
| **SPI** | D5 (CLK), D6 (MISO), D7 (MOSI), D8 (CS) |
| **UART** | TX, RX |
| **WiFi** | 802.11 b/g/n (2.4 GHz) |
| **Alimentación** | 5V (USB/Barrel) / 3.3V (Regulado) |
| **Consumo** | ~80mA (activo), ~20µA (deep sleep) |

### Tabla de Conexiones Consolidada

| Sensor | Pin WEMOS | Pin GPIO | Tipo | Voltaje | Protocolo | Descripción |
|--------|-----------|----------|------|---------|-----------|-------------|
| 🌡️ DHT22 | D5 | GPIO14 | Digital | 3.3V | OneWire | Temperatura y humedad |
| 🧭 BMP180 SDA | D2 | GPIO4 | I2C | 3.3V | I2C | Presión barométrica |
| 🧭 BMP180 SCL | D1 | GPIO5 | I2C | 3.3V | I2C | Presión barométrica |
| 💡 BH1750 SDA | D2 | GPIO4 | I2C | 3.3V | I2C | Sensor de luz (compartido) |
| 💡 BH1750 SCL | D1 | GPIO5 | I2C | 3.3V | I2C | Sensor de luz (compartido) |
| 🌧️ MH-RD | D4 | GPIO2 | Digital | 3.3V | Interrupt | Sensor de lluvia |
| 🫁 MQ7 | A0 | ADC0 | Analógico | 5V | ADC | Monóxido de carbono |
| 🏭 MQ135 | D6 | GPIO12 | Digital | 3.3V | Digital | Calidad del aire |
| 🌫️ DSM501A | D7 | GPIO13 | Digital | 5V | PWM | Partículas PM2.5 |

### Protocolo MQTT - Estructura de Comunicación

```
📡 MQTT Topics Structure
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🔗 MQTT COMMUNICATION                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

📤 PUBLICACIÓN (ESP8266 → Broker)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Topic: weather/data/WEMOS_STATION_001                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Payload JSON:                                                                   │  │
│  │ {                                                                               │  │
│  │   "station_id": "WEMOS_STATION_001",      // ID único de la estación           │  │
│  │   "timestamp": 1234567890,                // millis() del ESP8266              │  │
│  │   "temperature": 25.67,                   // °C (DHT22)                        │  │
│  │   "humidity": 65.23,                      // % (DHT22)                         │  │
│  │   "pressure": 1013.25,                    // hPa (BMP180)                      │  │
│  │   "light_level": 1234.56,                 // Lux (BH1750)                      │  │
│  │   "rainfall": 0.2,                        // mm (MH-RD pulses)                 │  │
│  │   "co_level": 2.45,                       // ppm (MQ7)                         │  │
│  │   "co_raw": 512,                          // ADC value (0-1024)                │  │
│  │   "air_quality_digital": 0,               // 0/1 (MQ135)                       │  │
│  │   "dust_pm25": 12.34,                     // μg/m³ (DSM501A)                   │  │
│  │   "uptime": 12345,                        // Segundos desde boot               │  │
│  │   "signal_strength": -45,                 // dBm RSSI                          │  │
│  │   "free_heap": 25600                      // Bytes libres                      │  │
│  │ }                                                                               │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  Frecuencia: Cada 60 segundos                                                       │
│  QoS: 0 (Fire and forget)                                                           │
│  Retain: false                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘

📤 ESTADO DEL SISTEMA (ESP8266 → Broker)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Topic: weather/status/WEMOS_STATION_001                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │ {                                                                               │  │
│  │   "station_id": "WEMOS_STATION_001",                                           │  │
│  │   "status": "online",                     // online/offline/error              │  │
│  │   "timestamp": 1234567890,                                                     │  │
│  │   "uptime": 12345,                                                             │  │
│  │   "signal_strength": -45,                                                      │  │
│  │   "free_heap": 25600,                                                          │  │
│  │   "sensors": {                                                                 │  │
│  │     "dht22": true,                        // Estados de sensores               │  │
│  │     "bmp180": true,                                                            │  │
│  │     "bh1750": true,                                                            │  │
│  │     "mh_rd": false,                                                            │  │
│  │     "mq7": false,                                                              │  │
│  │     "mq135": false,                                                            │  │
│  │     "dsm501a": false                                                           │  │
│  │   }                                                                            │  │
│  │ }                                                                               │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  Frecuencia: Al conectar, bajo comando, o cambio de estado                          │
└──────────────────────────────────────────────────────────────────────────────────────┘

📥 COMANDOS REMOTOS (Broker → ESP8266)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Topic: weather/command/WEMOS_STATION_001 (SUSCRIPCIÓN)                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Comando: Reiniciar dispositivo                                                  │  │
│  │ {"command": "restart"}                                                          │  │
│  │                                                                                 │  │
│  │ Comando: Solicitar estado                                                       │  │
│  │ {"command": "status"}                                                           │  │
│  │                                                                                 │  │
│  │ Comando: Verificar sensores                                                     │  │
│  │ {"command": "sensor_check"}                                                     │  │
│  │                                                                                 │  │
│  │ Comando: Configurar intervalo                                                   │  │
│  │ {"command": "set_interval", "value": 30}  // Segundos                          │  │
│  │                                                                                 │  │
│  │ Comando: Modo bajo consumo                                                      │  │
│  │ {"command": "deep_sleep", "duration": 3600}  // Segundos                       │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  Respuesta: Inmediata con acknowledge o estado actualizado                          │
└──────────────────────────────────────────────────────────────────────────────────────┘

📊 BROKER MQTT (Mosquitto)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  🔗 Eclipse Mosquitto                                                               │
│  • Puerto: 1883 (TCP)                                                               │
│  • Puerto WebSocket: 9001                                                           │
│  • Autenticación: Opcional                                                          │
│  • Persistencia: Habilitada                                                         │
│  • Logs: /mosquitto/log/mosquitto.log                                               │
│  • Configuración: /mosquitto/config/mosquitto.conf                                  │
│                                                                                      │
│  🔍 Comandos de debugging:                                                          │
│  docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/data/+" -v    │
│  docker exec weather_mosquitto mosquitto_pub -h localhost -t "weather/command/...   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Calibración de Sensores

Editar valores en el código Arduino (`CalibrationFactors` struct):
```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;       // Compensación temperatura (°C)
  float temp_scale = 1.0;        // Factor de escala temperatura
  float humidity_offset = 0.0;   // Compensación humedad (%)
  float pressure_offset = 0.0;   // Compensación presión (hPa)
  float rain_factor = 0.2;       // mm por pulso del pluviómetro
  float mq7_offset = 0.0;        // Offset sensor CO (ppm)
  float mq135_offset = 0.0;      // Offset sensor calidad aire
};
```

## 📈 Dashboard y Visualización

### Grafana
- Acceder a http://localhost:3000
- Usuario: `admin` / Contraseña: `grafana123`
- El datasource de InfluxDB ya está preconfigurado

### Consultas de Ejemplo

```flux
// Temperatura últimas 24h
from(bucket: "weather-data")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "weather")
  |> filter(fn: (r) => r._field == "temperature")
```

## ⚠️ Sistema de Alertas

### Reglas Predefinidas

- Temperatura > 40°C → ALTA
- Viento > 60 km/h → CRÍTICA
- Batería < 11.5V → ALTA
- PM2.5 > 150 μg/m³ → ALTA

### Personalización

Editar `backend/src/services/alertService.js` para agregar nuevas reglas.

## 🔧 Scripts Útiles

### Backend
```bash
npm start     # Producción
npm run dev   # Desarrollo (puerto 5002)
npm test      # Pruebas
```

### Frontend
```bash
npm run dev   # Desarrollo (puerto auto-asignado 3001+)
npm run build # Compilar para producción
npm start     # Servidor de producción
npm test      # Ejecutar tests unitarios
npm run test:watch # Tests en modo watch
npm run test:coverage # Tests con cobertura
npm run lint  # Verificar código con ESLint
npm run type-check # Verificar tipos TypeScript
```

### Docker
```bash
docker-compose up -d          # Iniciar servicios
docker-compose down           # Detener servicios
docker-compose logs -f        # Ver logs
docker-compose restart influxdb  # Reiniciar servicio
```

## ⚙️ Configuración Importante

### Variables de Entorno Frontend
**IMPORTANTE**: El frontend DEBE tener `.env.local` con:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5002/api
```
Sin este archivo, las llamadas a la API fallarán con errores "Failed to fetch".

### Gestión de Puertos
- **Backend**: Puerto 5002 (configurable via `PORT` en `.env`)
- **Frontend**: Auto-asigna puertos disponibles (3001+, evita 3000 usado por Grafana)
- **Conflictos**: Next.js detecta automáticamente puertos ocupados y asigna el siguiente disponible

## 📁 Estructura del Proyecto

```
estacion-metereologica/
├── arduino/
│   ├── weather_station_esp32/
│   │   └── weather_station_esp32.ino
│   ├── weather_station_wemos/ (legacy)
│   │   ├── weather_station_wemos.ino
│   │   └── README.md
│   └── sensores-microcontroladores.md
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── influxdb.js
│   │   │   └── logger.js
│   │   ├── controllers/
│   │   │   ├── alertController.js
│   │   │   └── weatherController.js
│   │   ├── routes/
│   │   │   ├── alertRoutes.js
│   │   │   ├── weatherRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   └── monitoringRoutes.js
│   │   ├── services/
│   │   │   ├── alertService.js
│   │   │   ├── mqttService.js
│   │   │   ├── cacheService.js
│   │   │   ├── monitoringService.js
│   │   │   └── socketService.js
│   │   ├── middleware/
│   │   │   ├── rateLimiter.js
│   │   │   └── validation.js
│   │   └── index.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertsPanel.tsx
│   │   │   ├── CurrentMeasurements.tsx
│   │   │   ├── HistoricalCharts.tsx
│   │   │   ├── SystemStatus.tsx
│   │   │   ├── WeatherMap.tsx
│   │   │   └── WeatherMapClient.tsx
│   │   ├── pages/
│   │   │   ├── index.tsx
│   │   │   ├── _app.tsx
│   │   │   └── _document.tsx
│   │   ├── services/
│   │   │   ├── weatherService.ts
│   │   │   ├── socketService.ts
│   │   │   └── __tests__/
│   │   │       └── weatherService.test.ts
│   │   └── components/
│   │       └── __tests__/
│   │           ├── AlertsPanel.test.tsx
│   │           └── CurrentMeasurements.test.tsx
│   ├── package.json
│   └── tsconfig.json
├── docker/
│   ├── grafana/
│   │   └── provisioning/
│   └── mosquitto/
│       └── config/
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

## 🛠️ Desarrollo

### Agregar Nuevos Sensores

1. **Hardware**: Conectar sensor al ESP32
2. **Arduino**: Agregar lectura en `readAndSendData()` en `weather_station_wemos.ino`
3. **Backend**: Actualizar validación en `middleware/validation.js`
4. **Frontend**: Agregar visualización en componentes React correspondientes
5. **Base de datos**: Los campos se crean automáticamente en InfluxDB

### Personalizar Alertas

1. Editar reglas en `backend/src/services/alertService.js`
2. Configurar notificaciones (email, SMS, etc.)
3. Crear dashboard específico en Grafana
4. Agregar visualización de alertas en componente `AlertsPanel.tsx`

## 📦 Despliegue en Producción

### Variables de Entorno

**Backend (.env)**:
```bash
NODE_ENV=production
PORT=5002
INFLUXDB_TOKEN=<token-seguro>
INFLUXDB_URL=<url-influxdb>
INFLUXDB_ORG=weather-station
INFLUXDB_BUCKET=weather-data
MQTT_USERNAME=<usuario>
MQTT_PASSWORD=<contraseña>
```

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5002/api
NODE_ENV=production
```

### SSL/TLS

Configurar certificados para:
- MQTT (puerto 8883)
- HTTP API (puerto 443)
- InfluxDB (puerto 8086)

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver archivo [LICENSE](LICENSE) para detalles.

## ⚠️ Consideraciones de Desarrollo

### Estado Actual del Proyecto

**✅ Funcionalidades Implementadas:**
- Sistema básico de captura y almacenamiento de datos
- Dashboard React con visualizaciones Material-UI
- API REST con endpoints básicos
- Integración MQTT funcional
- Configuración Docker completa
- Testing framework configurado

**🔄 En Desarrollo/Parcialmente Implementado:**
- Sistema de autenticación (configurado pero no activo)
- Cache Redis (disponible pero no utilizado)
- WebSocket real-time (configurado pero usa polling)
- Sistema de monitoreo (básico)
- WiFiManager en ESP32 (implementado)

**⚠️ Limitaciones Conocidas:**
- Sin autenticación de producción
- Configuración de seguridad básica
- Sin optimización de rendimiento
- Timestamps del ESP32 requieren conversión
- No hay sistema de backup automatizado

### Roadmap de Desarrollo Recomendado

1. **Fase 1 - Seguridad** (Semana 1-2)
   - Implementar autenticación JWT completa
   - Configurar HTTPS/SSL
   - Validación robusta de datos

2. **Fase 2 - Performance** (Semana 3-4)
   - Activar cache Redis
   - Implementar WebSocket real-time
   - Optimización de consultas InfluxDB

3. **Fase 3 - Escalabilidad** (Semana 5-6)
   - Sistema de backup
   - Monitoreo avanzado
   - Alertas por email/SMS

## 🔍 Solución de Problemas

### Problemas Comunes

1. **Error "Failed to fetch" en frontend**:
   - Verificar que `.env.local` existe con `NEXT_PUBLIC_API_URL=http://localhost:5002/api`
   - Confirmar que el backend esté ejecutándose en puerto 5002

2. **Puerto 3000 ocupado**:
   - Next.js auto-asigna el siguiente puerto disponible (3001, 3002, etc.)
   - Grafana usa puerto 3000 por defecto

3. **Conflictos de puertos**:
   ```bash
   # Verificar procesos en puerto específico
   netstat -ano | findstr :5002
   # Terminar proceso si es necesario
   cmd /c "taskkill /F /PID <process_id>"
   ```

4. **Datos no aparecen en dashboard**:
   - Verificar conexión MQTT: `docker logs weather_mosquitto`
   - Comprobar logs del backend: `npm run dev`
   - Revisar InfluxDB: http://localhost:8086

### Lista de Verificación del Sistema

1. ✅ Docker services: `docker-compose ps`
2. ✅ Backend API: `curl http://localhost:5002/health`
3. ✅ Frontend: Verificar puerto auto-asignado en consola
4. ✅ MQTT: `docker exec weather_mosquitto mosquitto_sub -h localhost -t "weather/data/+" -v`

## 🆘 Soporte

- **Issues**: Reportar problemas en GitHub
- **Wiki**: Documentación adicional
- **Discussions**: Preguntas y discusiones de la comunidad

---

**⚡ Weather Station IoT - Monitoreo meteorológico inteligente**