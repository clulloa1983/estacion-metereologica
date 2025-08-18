# 🌦️ Weather Station Frontend Dashboard

**Dashboard web interactivo y moderno** para visualizar en tiempo real los datos meteorológicos de estaciones IoT Arduino/ESP32. Construido con tecnologías web de última generación para una experiencia fluida, responsiva y atractiva.

---

## ✨ Características Destacadas

- 📱 **Mediciones en Tiempo Real**: Cards interactivas con colores y animaciones dinámicas.
- 📈 **Gráficos Históricos**: Tendencias con múltiples periodos y zoom interactivo.
- 🗺️ **Mapas Interactivos**: Ubicación de estaciones con información contextual.
- 🚨 **Sistema de Alertas**: Notificaciones inteligentes categorizadas por severidad.
- 🌓 **Modo Oscuro/Claro**: Tema adaptable con cambio instantáneo.
- 🌐 **WebSocket**: Datos instantáneos (<1s) vía Socket.IO.
- 🔄 **Fallback HTTP**: Polling automático si WebSocket no está disponible.
- 📶 **Estado de Conexión**: Indicadores visuales y auto-reconexión.
- 🎨 **Interfaz Moderna**: Material-UI, diseño responsive y accesibilidad WCAG 2.1.
- ⚡ **Performance Optimizada**: Lazy loading, memoización y code splitting.

---

## 🛠️ Stack Tecnológico

- **Next.js** (React SSR/SSG)
- **TypeScript** (tipado estricto)
- **Material-UI** (UI moderna)
- **Chart.js** (gráficos)
- **Leaflet** (mapas)
- **Socket.IO** (WebSocket)
- **Jest & Testing Library** (testing)
- **Day.js** (fechas)
- ...y más

---

## 📁 Arquitectura del Proyecto

```bash
frontend/
├── src/
│   ├── components/        # 🧩 Componentes reutilizables
│   ├── pages/             # 📄 Páginas Next.js
│   ├── contexts/          # 🎯 Contextos React
│   ├── services/          # 🔌 Servicios API/WebSocket
│   └── __tests__/         # 🧪 Tests
├── public/                # 🌄 Assets estáticos
├── jest.config.js         # ⚙️ Configuración Jest
├── next.config.js         # ⚡ Configuración Next.js
├── tsconfig.json          # 📝 Configuración TypeScript
├── package.json           # 📦 Dependencias y scripts
└── .env.example           # 🌍 Variables de entorno
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
```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5002
NEXT_PUBLIC_MAP_DEFAULT_LAT=-34.6037
NEXT_PUBLIC_MAP_DEFAULT_LNG=-58.3816
NEXT_PUBLIC_DEFAULT_STATION_ID=ESP32_STATION_001
```

4️⃣ **Ejecutar en Desarrollo**
```bash
npm run dev
# Accede a http://localhost:3001
```

---

## 🏃‍♂️ Scripts Útiles

- `npm run dev` – 🛠️ Desarrollo con hot reload
- `npm run build` – 📦 Build de producción
- `npm start` – 🚀 Servidor de producción
- `npm test` – 🧪 Ejecutar tests
- `npm run lint` – 🔍 Linting de código
- `npm run type-check` – 📝 Verificar tipos

---

## 🧩 Componentes Clave

- **CurrentMeasurements**: Cards de mediciones con colores dinámicos e iconos.
- **HistoricalCharts**: Gráficos avanzados con rangos configurables y zoom.
- **WeatherMap**: Mapa interactivo con ubicación y datos en popup.
- **AlertsPanel**: Panel de alertas con severidad visual y filtros.
- **SystemStatus**: Estado de conectividad, batería y métricas.
- **ThemeToggle**: Cambio de tema oscuro/claro con animación.

---

## 🔌 Integración con APIs y WebSocket

### REST Endpoints
- `/api/weather/data/{stationId}/latest` – Última lectura
- `/api/weather/data/{stationId}?timeRange=30m` – Históricos
- `/api/alerts/{stationId}` – Alertas por estación
- `/api/monitoring/health` – Estado del sistema

### WebSocket Events
- `weather-data` – Nueva lectura
- `new-alert` – Alerta generada
- `station-status` – Estado de estación
- `system-health` – Salud del sistema

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

## 🧪 Testing

- Tests unitarios y de integración con Jest y Testing Library.
- Cobertura y reporte automático.
- Ejemplo:
```typescript
// CurrentMeasurements.test.tsx
import { render, screen } from '@testing-library/react';
import CurrentMeasurements from '../CurrentMeasurements';

test('renders temperature with correct color', () => {
  const mockData = { temperature: 30, humidity: 65 };
  render(<CurrentMeasurements data={mockData} />);
  
  const tempElement = screen.getByTestId('temperature-card');
  expect(tempElement).toHaveStyle('color: rgb(255, 152, 0)'); // Orange for 30°C
});
```

---

## 🤝 Contribución

1. 🍴 Haz fork del repo
2. 🌟 Crea tu rama feature
3. 📝 Commit y push
4. 🧪 Ejecuta tests
5. 🔄 Abre Pull Request

---

## 📈 Roadmap

- 🔔 Notificaciones push
- 📱 PWA offline
- 🌍 Multi-idioma
- 📊 Exportación avanzada
- 🤖 Predicción con ML

---

## 📄 Licencia

MIT License – Ver `LICENSE` para detalles.

---

## 📞 Soporte y Enlaces

- 📚 Documentación: `CLAUDE.md`
- 🌐 API Docs: [http://localhost:5002/api-docs](http://localhost:5002/api-docs)
- 🏥 Health: [http://localhost:5002/health](http://localhost:5002/health)
- 📊 Dashboard: [http://localhost:3001](http://localhost:3001)

---

**⚡ Frontend listo para producción, visual y potente ⚡**