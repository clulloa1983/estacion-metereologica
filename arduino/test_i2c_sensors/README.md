# Test de Sensores I2C - ESP32

Código simple para validar conexiones físicas de sensores BMP180 y GY-30 (BH1750) en ESP32.

## 📚 Librerías Necesarias

### Instalación desde Arduino IDE

1. **Wire.h** - Incluida por defecto con ESP32
2. **Adafruit BMP085 Library**
   - Ir a: `Sketch > Include Library > Manage Libraries`
   - Buscar: "Adafruit BMP085"
   - Instalar: "Adafruit BMP085 Library" by Adafruit
3. **BH1750**
   - Buscar: "BH1750"
   - Instalar: "BH1750" by Christopher Laws

### Instalación Manual
```cpp
// Ubicación de librerías:
// Windows: Documents/Arduino/libraries/
// Linux: ~/Arduino/libraries/
// macOS: ~/Documents/Arduino/libraries/
```

## 🔧 Configuración de Hardware

### Pines I2C Utilizados
```cpp
#define SDA_PIN 21  // GPIO 21 - Serial Data
#define SCL_PIN 22  // GPIO 22 - Serial Clock
```

### Alimentación y Pines
- **Voltaje:** 3.3V (importante: NO usar 5V)
- **Consumo BMP180:** ~3µA en standby, ~1000µA activo
- **Consumo BH1750:** ~120µA en modo continuo

### Pin ADDR del GY-30
- **ADDR = GND:** Dirección I2C 0x23 (por defecto)
- **ADDR = 3.3V:** Dirección I2C 0x5C (alternativa)
- **Uso:** Para conectar múltiples sensores BH1750 en el mismo bus

## 🚀 Uso del Código

1. **Cargar el código** en ESP32
2. **Abrir Monitor Serie** (115200 baud)
3. **Observar la salida** de diagnóstico
4. **Verificar lecturas** cada 3 segundos

### Salida Esperada
```
=== Test de Sensores I2C ===
✅ Dispositivo encontrado en dirección 0x23 (BH1750)
✅ Dispositivo encontrado en dirección 0x77 (BMP180)
✅ BMP180 inicializado correctamente
✅ BH1750 inicializado correctamente

📊 RESUMEN DE LECTURAS:
┌─────────────────────────────────┐
│ Temperatura:   23.5 °C        │
│ Presión:     1013.2 hPa       │
│ Altitud:       45.3 m         │
│ Luz:          234.5 lux       │
└─────────────────────────────────┘
```

## 🛠️ Funciones del Código

### `scanI2CDevices()`
- Escanea direcciones I2C (0x01 a 0x7F)
- Identifica dispositivos conectados
- Detecta BMP180 (0x77) y BH1750 (0x23)

### `readBMP180()`
- Lee temperatura (°C)
- Lee presión barométrica (hPa)
- Calcula altitud aproximada (m)

### `readBH1750()`
- Lee intensidad lumínica (lux)
- Rango: 0 a 65535 lux

### `displayReadings()`
- Formatea y muestra todas las lecturas
- Presenta datos en tabla organizada

## ⚠️ Diagnóstico de Errores

### "No se encontraron dispositivos I2C"
**Posibles causas:**
- Cables SDA/SCL desconectados o mal conectados
- Alimentación incorrecta (verificar 3.3V)
- Sensores defectuosos
- Contacto deficiente en protoboard

**Solución:**
1. Verificar continuidad de cables con multímetro
2. Comprobar voltaje en VCC de sensores (debe ser 3.3V)
3. Revisar conexiones en protoboard
4. Probar con cables diferentes

### "Error de lectura" en sensores
**Posibles causas:**
- Interferencia electromagnética
- Alimentación inestable
- Sensor sobrecalentado o dañado

**Solución:**
1. Alejar de fuentes de interferencia (motores, WiFi)
2. Verificar estabilidad de voltaje
3. Dejar enfriar sensores si están calientes
4. Reiniciar ESP32 completamente

## 📈 Valores Típicos de Referencia

### BMP180
- **Temperatura:** -40°C a +85°C
- **Presión:** 300-1100 hPa (3-11 mbar)
- **Altitud:** Calculada basada en presión estándar (1013.25 hPa)
- **Precisión:** ±0.5°C, ±1 hPa

### BH1750
- **Rango:** 1-65535 lux
- **Resolución:** 1 lux
- **Referencias:**
  - Noche oscura: 0.001 lux
  - Luna llena: 0.1-0.3 lux
  - Oficina: 320-500 lux
  - Día soleado: 32,000-100,000 lux

## 🔄 Próximos Pasos

Una vez validadas las conexiones:
1. **Integrar** con el código principal de la estación meteorológica
2. **Calibrar** sensores con valores de referencia
3. **Implementar** filtros para ruido en lecturas
4. **Agregar** funciones de promedio y suavizado
5. **Configurar** intervalos de medición optimizados