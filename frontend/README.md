# 🌦️ Weather Station Frontend Dashboard

**Dashboard web interactivo y moderno** para visualizar en tiempo real los datos meteorológicos de estaciones IoT Arduino/ESP32. Construido con tecnologías web de última generación para una experiencia fluida, responsiva y atractiva.

---

## ✨ Características Destacadas

- 📱 **Mediciones en Tiempo Real**: Cards interactivas con colores y animaciones dinámicas
- 📈 **Gráficos Históricos**: Tendencias con múltiples periodos y zoom interactivo
- 🗺️ **Mapas Interactivos**: Ubicación de estaciones con información contextual
- 🚨 **Sistema de Alertas**: Notificaciones inteligentes categorizadas por severidad
- ⚙️ **Configuración Remota**: Panel completo para configurar ESP32 remotamente
- 🌓 **Modo Oscuro/Claro**: Tema adaptable con cambio instantáneo
- 🌐 **WebSocket**: Datos instantáneos (<1s) vía Socket.IO
- 🔄 **Fallback HTTP**: Polling automático si WebSocket no está disponible
- 📶 **Estado de Conexión**: Indicadores visuales y auto-reconexión
- 🌍 **Internacionalización**: Soporte multi-idioma con react-i18next
- 📱 **PWA**: Progressive Web App con soporte offline
- 🎨 **Interfaz Moderna**: Material-UI 7.3.1, diseño responsive y accesibilidad
- ⚡ **Performance Optimizada**: Lazy loading, memoización y code splitting

---

## 🛠️ Stack Tecnológico

### Framework y Core
- **Next.js 15.4.6** - React SSR/SSG con App Router
- **React 19.1.1** - Biblioteca de UI
- **TypeScript 5.9.2** - Tipado estático
- **Material-UI 7.3.1** - Sistema de diseño

### Visualización de Datos
- **Chart.js 4.5.0** - Gráficos interactivos
- **React-Chartjs-2 5.3.0** - Integración React con Chart.js
- **Leaflet 1.9.4** - Mapas interactivos
- **React-Leaflet 5.0.0** - Componentes React para mapas

### Comunicación en Tiempo Real
- **Socket.IO Client 4.8.1** - WebSocket para actualizaciones en vivo

### Internacionalización y PWA
- **react-i18next 15.6.1** - Sistema de internacionalización
- **next-pwa 5.6.0** - Progressive Web App
- **workbox-webpack-plugin 7.3.0** - Service Workers

### Utilidades
- **Day.js 1.11.13** - Manipulación de fechas
- **date-fns 4.1.0** - Utilidades de fecha para Chart.js

### Testing
- **Jest 29.7.0** - Framework de testing
- **Testing Library** - Testing de componentes React
- **jsdom** - Entorno DOM para tests

---

## 📁 Arquitectura del Proyecto

```bash
frontend/
├── src/
│   ├── components/          # 🧩 Componentes reutilizables
│   │   ├── AlertsPanel.tsx           # Panel de alertas con filtros
│   │   ├── CurrentMeasurements.tsx   # Cards de mediciones actuales
│   │   ├── HistoricalCharts.tsx      # Gráficos de tendencias
│   │   ├── LanguageSelector.tsx      # Selector de idioma
│   │   ├── RemoteConfigPanel.tsx     # Panel de configuración remota
│   │   ├── SystemStatus.tsx          # Estado del sistema
│   │   ├── ThemeToggle.tsx           # Cambio de tema
│   │   ├── WeatherMap.tsx            # Mapa meteorológico
│   │   ├── WeatherMapClient.tsx      # Cliente de mapa (CSR)
│   │   ├── config/                   # Secciones de configuración
│   │   │   ├── AlertConfigSection.tsx
│   │   │   ├── ConnectivityConfigSection.tsx
│   │   │   ├── PowerConfigSection.tsx
│   │   │   └── SensorConfigSection.tsx
│   │   └── __tests__/               # Tests de componentes
│   ├── pages/               # 📄 Páginas Next.js
│   │   ├── _app.tsx                 # App wrapper con providers
│   │   ├── _document.tsx            # Document personalizado
│   │   └── index.tsx                # Dashboard principal
│   ├── contexts/            # 🎯 Contextos React
│   │   └── ThemeContext.tsx         # Contexto de tema
│   ├── services/            # 🔌 Servicios API/WebSocket
│   │   ├── configService.ts         # API de configuración remota
│   │   ├── socketService.ts         # WebSocket cliente
│   │   ├── weatherService.ts        # API de datos meteorológicos
│   │   └── __tests__/               # Tests de servicios
│   ├── styles/              # 🎨 Estilos globales
│   └── utils/               # 🛠️ Utilidades
├── public/                  # 🌄 Assets estáticos
├── jest.config.js           # ⚙️ Configuración Jest
├── next.config.js           # ⚡ Configuración Next.js (PWA + i18n)
├── next-i18next.config.js   # 🌍 Configuración i18n
├── tsconfig.json            # 📝 Configuración TypeScript
├── package.json             # 📦 Dependencias y scripts
└── .env.example             # 🌍 Variables de entorno
```

---

## 🚀 Instalación y Configuración Rápida

1️⃣ **Requisitos Previos**
- Node.js 18+ y npm/yarn
- Backend API corriendo en `http://localhost:5002`

2️⃣ **Instalación**
```bash
cd frontend
npm install
# o
yarn install
```

3️⃣ **Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Configurar variables requeridas
NEXT_PUBLIC_API_URL=http://localhost:5002/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5002

# Configuración opcional del mapa
NEXT_PUBLIC_MAP_DEFAULT_LAT=-34.6037
NEXT_PUBLIC_MAP_DEFAULT_LNG=-58.3816
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

4️⃣ **Ejecutar en Desarrollo**
```bash
npm run dev
# Accede a http://localhost:3001
```

---

## 🏃‍♂️ Scripts Disponibles

### Desarrollo
- `npm run dev` – 🛠️ Desarrollo con hot reload
- `npm run build` – 📦 Build de producción
- `npm start` – 🚀 Servidor de producción
- `npm run lint` – 🔍 Linting con ESLint
- `npm run lint:fix` – 🔧 Corregir errores de linting automáticamente
- `npm run type-check` – 📝 Verificar tipos TypeScript

### Testing
- `npm test` – 🧪 Ejecutar todos los tests
- `npm run test:watch` – 👀 Tests en modo watch
- `npm run test:coverage` – 📊 Tests con reporte de cobertura
- `npm run test:unit` – 🔬 Solo tests unitarios
- `npm run test:components` – 🧩 Solo tests de componentes
- `npm run test:services` – ⚙️ Solo tests de servicios
- `npm run test:ci` – 🤖 Tests para CI/CD

---

## 🧩 Componentes Principales

### Dashboard Core
- **CurrentMeasurements**: Cards de mediciones en tiempo real con colores dinámicos e iconos
- **HistoricalCharts**: Gráficos avanzados con Chart.js, rangos configurables y zoom
- **WeatherMap**: Mapa interactivo Leaflet con ubicación y datos en popup
- **AlertsPanel**: Panel de alertas con severidad visual, filtros y gestión
- **SystemStatus**: Estado de conectividad, batería y métricas del sistema

### Configuración y Control
- **RemoteConfigPanel**: Panel completo de configuración remota para ESP32
  - **SensorConfigSection**: Configuración de sensores e intervalos
  - **AlertConfigSection**: Configuración de umbrales de alerta
  - **PowerConfigSection**: Gestión de energía y modo sleep
  - **ConnectivityConfigSection**: Configuración WiFi y conectividad

### UI y UX
- **ThemeToggle**: Cambio de tema oscuro/claro con animación
- **LanguageSelector**: Selector de idioma con soporte i18n
- **WeatherMapClient**: Cliente de mapa optimizado para CSR (evita SSR)

---

## 🔌 Integración con APIs y WebSocket

### REST API Endpoints
- **Datos Meteorológicos**:
  - `GET /api/weather/data/{stationId}/latest` – Última lectura de sensores
  - `GET /api/weather/data/{stationId}?timeRange=30m` – Datos históricos
  - `GET /api/weather/stations` – Lista de estaciones
  - `GET /api/weather/export/{stationId}` – Exportar datos CSV/JSON

- **Sistema de Alertas**:
  - `GET /api/alerts/{stationId}` – Alertas por estación
  - `GET /api/alerts/summary/{stationId}` – Resumen de alertas
  - `PUT /api/alerts/{alertId}/acknowledge` – Confirmar alerta

- **Configuración Remota**:
  - `POST /api/config/command/{stationId}` – Enviar comando a ESP32
  - `GET /api/config/commands` – Lista de comandos disponibles
  - `GET /api/config/status/{stationId}` – Estado de configuración

- **Monitoreo**:
  - `GET /health` – Estado de salud del sistema
  - `GET /api/monitoring/health` – Métricas detalladas

### WebSocket Events (Socket.IO)
- **Datos en Tiempo Real**:
  - `weather-data` – Nueva lectura de sensores
  - `station-status` – Estado de conectividad de estación
  
- **Alertas**:
  - `new-alert` – Nueva alerta generada
  - `alert-acknowledged` – Alerta confirmada
  
- **Sistema**:
  - `system-health` – Estado de salud del sistema
  - `config-response` – Respuesta de comando de configuración

---

## 🎨 Personalización

- **Colores dinámicos** según valores meteorológicos.
- **Tema Material-UI** personalizado.
- **Mapa** configurable (coordenadas, tile server, zoom).
- **Rangos de tiempo** para gráficos fácilmente ajustables.

---

## ⚡ Performance y Optimización

- Lazy loading de mapas y gráficos.
- Memoización de componentes y datos.
- Actualización selectiva vía WebSocket.
- Code splitting automático.
- Monitoreo de Web Vitals.

---

## 🧪 Sistema de Testing

### Configuración de Testing
- **Jest 29.7.0** con configuración optimizada para React y TypeScript
- **Testing Library** para testing de componentes con enfoque en el usuario
- **jsdom** como entorno de pruebas para DOM
- **Cobertura automática** con reportes en HTML y texto

### Estructura de Tests
```bash
src/
├── components/__tests__/     # Tests de componentes
│   ├── AlertsPanel.test.tsx
│   ├── CurrentMeasurements.test.tsx
│   └── RemoteConfigPanel.test.tsx
└── services/__tests__/       # Tests de servicios
    ├── configService.test.ts
    └── weatherService.test.ts
```

### Ejemplo de Test de Componente
```typescript
// CurrentMeasurements.test.tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import CurrentMeasurements from '../CurrentMeasurements';
import { createTheme } from '@mui/material/styles';

test('renders temperature card with correct styling', () => {
  const mockData = { 
    temperature: 25.5, 
    humidity: 65,
    timestamp: new Date().toISOString()
  };
  
  render(
    <ThemeProvider theme={createTheme()}>
      <CurrentMeasurements data={mockData} />
    </ThemeProvider>
  );
  
  expect(screen.getByText('25.5°C')).toBeInTheDocument();
  expect(screen.getByLabelText(/temperatura/i)).toBeInTheDocument();
});
```

### Comandos de Testing
```bash
# Tests básicos
npm test                    # Ejecutar todos los tests
npm run test:watch         # Tests en modo watch
npm run test:coverage      # Con reporte de cobertura

# Tests específicos
npm run test:components    # Solo componentes
npm run test:services      # Solo servicios
npm run test:unit         # Tests unitarios
npm run test:ci           # Para CI/CD
```

---

## 🤝 Contribución

1. 🍴 Haz fork del repo
2. 🌟 Crea tu rama feature
3. 📝 Commit y push
4. 🧪 Ejecuta tests
5. 🔄 Abre Pull Request

---

## 📈 Funcionalidades Implementadas vs. Roadmap

### ✅ Implementado
- ✅ **PWA**: Progressive Web App con soporte offline
- ✅ **Multi-idioma**: Internacionalización con react-i18next
- ✅ **Configuración Remota**: Control completo del ESP32 vía MQTT
- ✅ **Tema Dinámico**: Modo oscuro/claro persistente
- ✅ **WebSocket**: Actualizaciones en tiempo real
- ✅ **Testing**: Cobertura completa de componentes y servicios
- ✅ **TypeScript**: Tipado estricto en toda la aplicación
- ✅ **Material-UI 7.3.1**: Sistema de diseño moderno

### 🚧 En Desarrollo
- 🔔 **Notificaciones Push**: Sistema de notificaciones web
- 📊 **Exportación Avanzada**: Múltiples formatos (PDF, Excel)
- 📱 **Modo Offline**: Cache inteligente de datos
- 🤖 **Predicción ML**: Modelos de predicción meteorológica

### 🔮 Futuro
- 🌐 **Multi-estación**: Dashboard para múltiples estaciones
- 📍 **Geolocalización**: Detección automática de ubicación
- 🎛️ **Panel Admin**: Gestión avanzada de usuarios y estaciones
- 📈 **Analytics**: Métricas de uso y performance

---

## 📄 Licencia

MIT License – Ver `LICENSE` para detalles.

---

## 📞 Soporte y Enlaces Útiles

### 🔗 Enlaces de Desarrollo
- 📊 **Dashboard**: [http://localhost:3001+](http://localhost:3001) (auto-asigna puerto)
- 🌐 **API Backend**: [http://localhost:5002/api](http://localhost:5002/api)
- 🏥 **Health Check**: [http://localhost:5002/health](http://localhost:5002/health)
- 📚 **API Docs**: [http://localhost:5002/api-docs](http://localhost:5002/api-docs)

### 📖 Documentación
- 📝 **Documentación Completa**: `../CLAUDE.md` (raíz del proyecto)
- 🔧 **Configuración Backend**: `../backend/README.md`
- 🐳 **Docker Services**: `../docker-compose.yml`
- ⚙️ **Variables de Entorno**: `.env.example`

### 🛠️ Herramientas de Desarrollo
- **Grafana**: [http://localhost:3000](http://localhost:3000) (admin/grafana123)
- **InfluxDB**: [http://localhost:8086](http://localhost:8086) (admin/weather123)
- **MQTT Broker**: localhost:1883 (WebSocket: 9001)

---

## 🚀 Estado del Proyecto

**✅ SISTEMA COMPLETAMENTE OPERACIONAL**

- **Frontend**: Dashboard completo con TypeScript, Material-UI 7.3.1, PWA y i18n
- **Backend**: API Node.js con MQTT, InfluxDB, WebSocket y configuración remota
- **Hardware**: ESP32 DevKit V1 con 8 sensores transmitiendo datos cada 60s
- **Infraestructura**: Docker Compose con todos los servicios configurados
- **Testing**: Cobertura completa con Jest y Testing Library

**⚡ Listo para producción con arquitectura robusta y escalable ⚡**