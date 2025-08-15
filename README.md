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

## 🏗️ Arquitectura

```
Arduino/ESP32 → MQTT → Backend API → InfluxDB
                            ↓
                   React Dashboard + Grafana
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo)
- Arduino IDE o PlatformIO

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
curl http://localhost:5002/api/weather/data/WEMOS_STATION_001/latest

# Obtener datos históricos (últimos 30 minutos)
curl "http://localhost:5002/api/weather/data/WEMOS_STATION_001?timeRange=30m"

# Exportar datos en CSV
curl "http://localhost:5002/api/weather/export/WEMOS_STATION_001?format=csv&start=-7d"
```

## 🔧 Configuración de Sensores

### Conexiones ESP32

| Sensor | Pin ESP32 |
|--------|-----------|
| DHT22 (Data) | GPIO 4 |
| Anemómetro | GPIO 2 |
| Pluviómetro | GPIO 3 |
| Veleta (Analógico) | A0 |
| Batería (Voltaje) | A1 |
| BMP280 (SDA) | GPIO 21 |
| BMP280 (SCL) | GPIO 22 |

### Calibración

Editar valores en el código Arduino:
```cpp
struct CalibrationFactors {
  float temp_offset = 0.0;     // Compensación temperatura
  float humidity_offset = 0.0; // Compensación humedad
  float pressure_offset = 0.0; // Compensación presión
  float wind_speed_factor = 2.4; // Factor velocidad viento
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
│   ├── weather_station_wemos/
│   │   ├── weather_station_wemos.ino
│   │   └── README.md
│   ├── weather_station_esp32/
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
│   │   │   └── weatherRoutes.js
│   │   ├── services/
│   │   │   ├── alertService.js
│   │   │   └── mqttService.js
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
│   │   └── services/
│   │       ├── weatherService.ts
│   │       └── socketService.ts
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