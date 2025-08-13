# Dashboard Frontend - Estación Meteorológica

Dashboard web interactivo para visualización en tiempo real de datos meteorológicos de una estación IoT Arduino/ESP32.

## Características

### 📊 Visualización de Datos
- **Mediciones Actuales**: Cards con valores en tiempo real con colores indicativos
- **Gráficos Históricos**: Visualización de tendencias con múltiples timeframes
- **Mapas Interactivos**: Ubicación de la estación con información contextual
- **Sistema de Alertas**: Notificaciones categorizadas por severidad

### 🔄 Tiempo Real
- **WebSocket**: Conexión en vivo para datos instantáneos
- **Fallback HTTP**: Actualización automática si WebSocket no está disponible
- **Estado de Conexión**: Indicador visual del estado de conectividad

### 🎨 Interfaz de Usuario
- **Material-UI**: Diseño moderno y responsivo
- **Temas Personalizados**: Paleta de colores específica para datos meteorológicos
- **Responsive Design**: Adaptable a dispositivos móviles y desktop

## Tecnologías Utilizadas

- **Next.js 15** - Framework React con SSR/SSG
- **TypeScript** - Tipado estático para mayor robustez
- **Material-UI** - Biblioteca de componentes UI
- **Chart.js** - Gráficos interactivos y responsivos
- **Leaflet** - Mapas interactivos
- **Socket.io** - Comunicación en tiempo real
- **React Hooks** - Manejo de estado moderno

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── CurrentMeasurements.tsx    # Cards de mediciones actuales
│   │   ├── HistoricalCharts.tsx       # Gráficos históricos
│   │   ├── WeatherMap.tsx             # Mapa de ubicación
│   │   ├── SystemStatus.tsx           # Estado del sistema
│   │   └── AlertsPanel.tsx            # Panel de alertas
│   ├── pages/               # Páginas de Next.js
│   │   ├── index.tsx        # Dashboard principal
│   │   ├── _app.tsx         # Configuración global
│   │   └── _document.tsx    # Estructura HTML
│   ├── services/            # Servicios de API
│   │   ├── weatherService.ts          # Cliente API REST
│   │   └── socketService.ts           # Cliente WebSocket
│   └── styles/              # Estilos globales
├── package.json             # Dependencias y scripts
├── next.config.js          # Configuración Next.js
└── .env.example            # Variables de entorno
```

## Configuración

### 1. Instalar Dependencias

```bash
cd frontend
npm install
```

### 2. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_MAP_DEFAULT_LAT=-34.6037
NEXT_PUBLIC_MAP_DEFAULT_LNG=-58.3816
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

El dashboard estará disponible en: http://localhost:3000

## Componentes Principales

### CurrentMeasurements
Muestra las mediciones actuales en cards con:
- Colores dinámicos según valores (temperatura, humedad, viento)
- Iconos descriptivos para cada parámetro
- Actualizaciones en tiempo real
- Indicadores de estado y calidad

### HistoricalCharts
Gráficos de tendencias con:
- Múltiples parámetros en pestañas separadas
- Rangos de tiempo configurables (1h, 6h, 24h, 7d, 30d)
- Gráficos combinados (temperatura + humedad)
- Zoom y pan interactivo

### WeatherMap
Mapa interactivo que incluye:
- Marcador de ubicación de la estación
- Popup con información completa
- Chips de estado con datos actuales
- Controles de navegación

### AlertsPanel
Sistema de alertas con:
- Categorización por severidad (LOW, MEDIUM, HIGH, CRITICAL)
- Reconocimiento de alertas
- Filtros por estado (pendientes, reconocidas)
- Resumen estadístico

### SystemStatus
Monitor del estado del sistema:
- Nivel de batería con indicador visual
- Estado de conectividad
- Última actualización
- Información de la estación

## APIs y Endpoints

El frontend consume los siguientes endpoints del backend:

```typescript
// Datos meteorológicos
GET /api/weather/data/{stationId}/latest
GET /api/weather/data/{stationId}?timeRange={range}
GET /api/weather/data/{stationId}/summary
GET /api/weather/stations

// Alertas
GET /api/alerts/{stationId}
PUT /api/alerts/{alertId}/acknowledge
GET /api/alerts/summary/{stationId}

// Exportación
GET /api/weather/export/{stationId}?format={format}
```

## WebSocket Events

Eventos en tiempo real:

```typescript
// Conexión
'connect' / 'disconnect' / 'connect_error'

// Datos
'weather-data' -> WeatherDataPoint
'new-alert' -> Alert
'station-status' -> StatusUpdate

// Suscripciones
emit('subscribe-station', stationId)
emit('unsubscribe-station', stationId)
```

## Personalización

### Colores de Temperatura
```typescript
const getTemperatureColor = (temp: number) => {
  if (temp < 0) return '#1976d2';    // Azul - congelación
  if (temp < 15) return '#4fc3f7';   // Azul claro - frío
  if (temp < 25) return '#4caf50';   // Verde - ideal
  if (temp < 35) return '#ff9800';   // Naranja - calor
  return '#f44336';                  // Rojo - extremo
};
```

### Configuración de Mapas
- Cambiar coordenadas por defecto en `.env.local`
- Personalizar tile server (OpenStreetMap, Mapbox, etc.)
- Ajustar zoom y límites de visualización

### Rangos de Tiempo
Modificar en `HistoricalCharts.tsx`:
```typescript
const timeRangeOptions = [
  { value: '1h', label: 'Última hora' },
  { value: '6h', label: 'Últimas 6 horas' },
  // ... agregar más rangos
];
```

## Deployment

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker (opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Troubleshooting

### Problemas Comunes

1. **Error de Leaflet en SSR**
   - Asegurar que los componentes de mapa usen `dynamic` import
   - Verificar configuración en `_app.tsx`

2. **WebSocket no conecta**
   - Verificar que el backend tenga Socket.io configurado
   - Revisar CORS en el servidor
   - Comprobar URL en variables de entorno

3. **Gráficos no cargan**
   - Verificar que Chart.js esté correctamente instalado
   - Comprobar formato de datos del backend
   - Revisar configuración de escalas

4. **Material-UI estilos inconsistentes**
   - Verificar que CssBaseline esté en `_app.tsx`
   - Comprobar orden de imports de CSS

## Performance

### Optimizaciones Implementadas
- Lazy loading de componentes de mapa
- Debouncing en actualizaciones de gráficos
- Memoización de componentes pesados
- Actualización selectiva por WebSocket

### Métricas Recomendadas
- Time to First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

## Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.