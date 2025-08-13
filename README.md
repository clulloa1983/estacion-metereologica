# Estación Meteorológica IoT

Sistema completo de estación meteorológica basado en Arduino/ESP32 con dashboard web y almacenamiento en base de datos de series temporales.

## 📋 Características

- **Sensores Meteorológicos**: Temperatura, humedad, presión, viento, lluvia
- **Conectividad**: WiFi con protocolo MQTT
- **Base de Datos**: InfluxDB para datos de series temporales
- **Dashboard**: Grafana para visualización
- **API REST**: Backend en Node.js
- **Alertas**: Sistema de notificaciones automáticas
- **Exportación**: Datos en CSV/JSON

## 🏗️ Arquitectura

```
Arduino/ESP32 → MQTT → Backend API → InfluxDB
                            ↓
                      Dashboard Web
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

# Iniciar en modo desarrollo
npm run dev
```

### 3. Configurar el Arduino/ESP32

1. Abrir `arduino/weather_station/weather_station.ino`
2. Configurar WiFi y MQTT:
```cpp
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* mqtt_server = "tu-servidor-mqtt.com";
```
3. Subir el código al ESP32

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
curl http://localhost:5000/api/weather/data/STATION_001/latest

# Exportar datos en CSV
curl "http://localhost:5000/api/weather/export/STATION_001?format=csv&start=-7d"
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
npm run dev   # Desarrollo
npm test      # Pruebas
```

### Docker
```bash
docker-compose up -d          # Iniciar servicios
docker-compose down           # Detener servicios
docker-compose logs -f        # Ver logs
docker-compose restart influxdb  # Reiniciar servicio
```

## 📁 Estructura del Proyecto

```
estacion-metereologica/
├── arduino/
│   └── weather_station/
│       └── weather_station.ino
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── package.json
├── docker/
│   ├── grafana/
│   └── mosquitto/
├── docker-compose.yml
└── README.md
```

## 🛠️ Desarrollo

### Agregar Nuevos Sensores

1. **Hardware**: Conectar sensor al ESP32
2. **Arduino**: Agregar lectura en `readAndSendData()`
3. **Backend**: Actualizar validación en `validation.js`
4. **Base de datos**: Los campos se crean automáticamente

### Personalizar Alertas

1. Editar reglas en `alertService.js`
2. Configurar notificaciones (email, SMS, etc.)
3. Crear dashboard específico en Grafana

## 📦 Despliegue en Producción

### Variables de Entorno

```bash
NODE_ENV=production
INFLUXDB_TOKEN=<token-seguro>
MQTT_USERNAME=<usuario>
MQTT_PASSWORD=<contraseña>
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

## 🆘 Soporte

- **Issues**: Reportar problemas en GitHub
- **Wiki**: Documentación adicional
- **Discussions**: Preguntas y discusiones de la comunidad

---

**⚡ Weather Station IoT - Monitoreo meteorológico inteligente**