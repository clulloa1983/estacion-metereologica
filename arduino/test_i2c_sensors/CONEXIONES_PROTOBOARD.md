# Conexiones en Protoboard - ESP32 + Sensores Meteorológicos

## 📋 Componentes Necesarios
- ESP32 DevKit V1
- Sensor BMP180 (presión y temperatura barométrica)
- Sensor GY-30 (BH1750) (luz ambiente)
- Sensor DHT22 (temperatura y humedad)
- Pluviómetro DFRobots (medición precisa de lluvia)
- Sensor de lluvia MH-RD (detección de humedad)
- Protoboard grande (830 puntos recomendado)
- Cables dupont macho-macho
- Resistencia pull-up 10kΩ (para DHT22)
- Fuente de alimentación 3.3V (del ESP32)

## 🔌 Esquema de Conexiones

### ESP32 DevKit V1
```
┌─────────────────────────────┐
│           ESP32             │
│  ┌─────┐              ┌─────┐│
│  │ 3V3 ├──────────────┤ GND ││ 
│  │ EN  │              │ D23 ││
│  │ D36 │              │ D22 ├┤ ← SCL (I2C Clock)
│  │ D39 │              │ D1  ││
│  │ D34 │              │ D3  ││
│  │ D35 │              │ D21 ├┤ ← SDA (I2C Data)
│  │ D32 │              │ D19 ││
│  │ D33 │              │ D18 ││
│  │ D25 │              │ D5  ││
│  │ D26 │              │ D17 ││
│  │ D27 │              │ D16 ││
│  │ D14 │              │ D4  ││
│  │ D12 │              │ D0  ││
│  │ GND ├──────────────┤ D2  ││
│  └─────┘              └─────┘│
└─────────────────────────────┘
```

### Tabla de Conexiones

| Componente | Pin | ESP32 Pin | Descripción |
|------------|-----|-----------|-------------|
| **BMP180** | VCC | 3.3V | Alimentación |
| **BMP180** | GND | GND | Tierra |
| **BMP180** | SDA | GPIO 21 | Datos I2C |
| **BMP180** | SCL | GPIO 22 | Clock I2C |
| **GY-30** | VCC | 3.3V | Alimentación |
| **GY-30** | GND | GND | Tierra |
| **GY-30** | SDA | GPIO 21 | Datos I2C |
| **GY-30** | SCL | GPIO 22 | Clock I2C |
| **GY-30** | ADDR | GND | Dirección I2C (GND = 0x23, 3.3V = 0x5C) |
| **DHT22** | VCC | 3.3V | Alimentación |
| **DHT22** | GND | GND | Tierra |
| **DHT22** | DATA | GPIO 4 | Datos OneWire |
| **DHT22** | - | Resistencia 10kΩ | Pull-up entre VCC y DATA |
| **Pluviómetro** | Rojo | 3.3V | Alimentación |
| **Pluviómetro** | Verde | GPIO 2 | Señal de pulsos (interrupción) |
| **MH-RD** | VCC | GPIO 13 | Alimentación controlada (3.3V) |
| **MH-RD** | GND | GND | Tierra |
| **MH-RD** | AO | GPIO 34 | Salida analógica (ADC1_CH6) |
| **MH-RD** | DO | GPIO 12 | Salida digital |

## 🔧 Montaje en Protoboard

### Vista Superior del Protoboard (830 puntos)
```
     a b c d e   f g h i j     k l m n o   p q r s t
   ┌─────────────────────────┬─────────────────────────┐
 1 │ + + + + +   + + + + + │ + + + + +   + + + + + │ ← Línea de alimentación (+3.3V)
 2 │ - - - - -   - - - - - │ - - - - -   - - - - - │ ← Línea de tierra (GND)
 3 │                       │                       │
 4 │   [BMP180]            │   [DHT22]             │
 5 │   VCC GND SDA SCL     │   VCC GND DATA        │
 6 │    │   │   │   │      │    │   │   │          │
 7 │    │   │   │   │      │    │   │   │ (R10kΩ)  │
 8 │    │   │   │   │      │    │   │   └────┐     │
 9 │   [GY-30/BH1750]     │                  │     │
10 │   VCC GND ADDR SDA SCL│                  │     │
11 │    │   │   │    │   │ │                  │     │
12 │    │   │   │    │   │ │                  │     │
13 │                       │   [Pluviómetro]        │
14 │                       │   ROJO VERDE           │
15 │                       │    │    │              │
16 │                       │    │    │              │
17 │   [MH-RD Sensor]      │    │    │              │
18 │   VCC GND AO DO       │    │    │              │
19 │    │   │  │  │        │    │    │              │
20 │    │   │  │  │        │    │    │              │
21 │ - - - - -   - - - - - │ - - - - -   - - - - - │
22 │ + + + + +   + + + + + │ + + + + +   + + + + + │
   └─────────────────────────┴─────────────────────────┘
   
   Conexiones a ESP32:
   GPIO 21 (SDA) ←── BMP180, GY-30
   GPIO 22 (SCL) ←── BMP180, GY-30  
   GPIO 4        ←── DHT22 DATA
   GPIO 2        ←── Pluviómetro Verde
   GPIO 13       ←── MH-RD VCC
   GPIO 34       ←── MH-RD AO (Analógico)
   GPIO 12       ←── MH-RD DO (Digital)
```

### Pasos de Montaje

1. **Conectar alimentación:**
   - Cable rojo: ESP32 (3.3V) → Línea + del protoboard
   - Cable negro: ESP32 (GND) → Línea - del protoboard

2. **Colocar sensores I2C (BMP180 y GY-30):**
   - **BMP180**: Insertar en filas 4-5 del lado izquierdo
     - VCC → Línea + (3.3V)
     - GND → Línea - (GND)
     - SDA → Cable hacia GPIO 21
     - SCL → Cable hacia GPIO 22
   - **GY-30**: Insertar en filas 9-10 del lado izquierdo
     - VCC → Línea + (3.3V)
     - GND → Línea - (GND)
     - ADDR → Línea - (GND) para dirección 0x23
     - SDA → Unir con SDA del BMP180 → GPIO 21
     - SCL → Unir con SCL del BMP180 → GPIO 22

3. **Colocar DHT22:**
   - Insertar en filas 4-5 del lado derecho
   - VCC → Línea + (3.3V)
   - GND → Línea - (GND)
   - DATA → Cable hacia GPIO 4
   - **IMPORTANTE**: Conectar resistencia pull-up de 10kΩ entre VCC y DATA

4. **Conectar Pluviómetro DFRobots:**
   - Cable ROJO → Línea + (3.3V)
   - Cable VERDE → Cable hacia GPIO 2 (configurado como INPUT_PULLUP)

5. **Colocar Sensor MH-RD:**
   - Insertar en filas 17-18 del lado izquierdo
   - VCC → Cable hacia GPIO 13 (alimentación controlada)
   - GND → Línea - (GND)
   - AO (Analógico) → Cable hacia GPIO 34
   - DO (Digital) → Cable hacia GPIO 12

## ⚡ Características de los Sensores

### Sensores I2C (Bus compartido GPIO 21/22)
| Sensor | Dirección I2C | Pin ADDR | Descripción |
|--------|---------------|----------|-------------|
| BMP180 | 0x77 | - | Sensor de presión barométrica y temperatura |
| BH1750 | 0x23 | GND | Sensor de luz ambiente (dirección por defecto) |
| BH1750 | 0x5C | 3.3V | Sensor de luz ambiente (dirección alternativa) |

### Sensores Digitales/Analógicos
| Sensor | GPIO | Tipo | Descripción |
|--------|------|------|-------------|
| DHT22 | 4 | OneWire | Temperatura y humedad (requiere pull-up 10kΩ) |
| Pluviómetro | 2 | Interrupciones | Pulsos por lluvia (0.3mm/pulso) |
| MH-RD | 12, 34, 13 | Digital/Analógico | Detección de humedad (alimentación controlada) |

### Especificaciones Técnicas
- **BMP180**: Rango presión 300-1100 hPa, temperatura -40°C a +85°C
- **BH1750**: Rango luz 1-65535 lux, resolución 1 lux
- **DHT22**: Humedad 0-100% ±2%, temperatura -40°C a +80°C ±0.5°C
- **Pluviómetro DFRobots**: Resolución 0.3mm por pulso, efecto reed switch
- **MH-RD**: Detección digital + analógica, rango ADC 0-4095

**Nota:** El pin ADDR del GY-30 permite cambiar la dirección I2C. Conectar a GND = 0x23, conectar a 3.3V = 0x5C. Esto es útil si necesitas conectar múltiples sensores BH1750.

## 🔍 Validación de Conexiones

El código de prueba realizará:

1. **Escaneo I2C:** Detecta dispositivos I2C conectados (BMP180 y BH1750)
2. **Inicialización:** Verifica que todos los sensores responden correctamente
3. **Lecturas continuas:** Muestra datos de todos los sensores cada 3 segundos
4. **Diagnóstico:** Indica errores de conexión específicos por sensor
5. **Análisis comparativo:** Compara lecturas entre sensores similares
6. **Correlación de lluvia:** Compara lecturas entre pluviómetro y sensor MH-RD

### Salida Esperada
```
=== Test de Sensores I2C + Sensores de Lluvia ===
BMP180 + GY-30 (BH1750) + DHT22 + Pluviómetro DFRobots + Sensor MH-RD
=================================================

1. Escaneando dispositivos I2C...
✅ Dispositivo encontrado en dirección 0x23 (BH1750)
✅ Dispositivo encontrado en dirección 0x77 (BMP180)
Total de dispositivos encontrados: 2

2. Inicializando BMP180...
✅ BMP180 inicializado correctamente

3. Inicializando BH1750...
✅ BH1750 inicializado correctamente

4. Inicializando DHT22...
✅ DHT22 inicializado correctamente

5. Inicializando Pluviómetro DFRobots...
✅ Pluviómetro DFRobots inicializado correctamente

6. Inicializando Sensor de Lluvia MH-RD...
✅ Sensor MH-RD inicializado correctamente

=================================================
Iniciando lecturas cada 3 segundos...
=================================================

--- Nueva Lectura ---
BMP180:
  Temperatura: 23.4 °C
  Presión: 1013.2 hPa
  Altitud: 123.5 m

BH1750:
  Luz: 254.3 lux

DHT22:
  Temperatura: 23.6 °C
  Humedad: 65.2 %
  Índice de calor: 24.1 °C

Pluviómetro DFRobots: Sin lluvia detectada

Sensor MH-RD:
  💧 Estado Digital: SECO
  📊 Valor Analógico: 3456 (0-4095) - 15.6% humedad
  🌦️ Estado: SECO

📊 RESUMEN DE LECTURAS:
┌─────────────────────────────────────────┐
│ Temp (BMP180):   23.4 °C              │
│ Temp (DHT22):    23.6 °C              │
│ Humedad:         65.2 %               │
│ Presión:       1013.2 hPa             │
│ Altitud:        123.5 m               │
│ Luz:            254.3 lux             │
│ Lluvia (DFR):     0.0 mm              │
│ Lluv. Acum.:      0.0 mm              │
│ MH-RD Digital: SECO                   │
│ MH-RD Analog:  3456 ( 15.6%)         │
│ MH-RD Estado:  SECO                   │
└─────────────────────────────────────────┘
🌡️  Diferencia de temperatura entre sensores: 0.2 °C
--------------------
```

## ⚠️ Solución de Problemas

### Errores de Sensores I2C (BMP180/BH1750)
**Síntoma**: No se encuentran dispositivos I2C
- Verificar conexiones SDA (GPIO 21) y SCL (GPIO 22)
- Comprobar alimentación 3.3V (NO usar 5V)
- Revisar continuidad en cables dupont
- Asegurar buen contacto en protoboard
- Verificar dirección ADDR del BH1750 (GND = 0x23)

**Síntoma**: Solo se encuentra un sensor I2C
- Verificar que ambos sensores estén alimentados
- Comprobar que no hay cables cruzados entre SDA/SCL
- Revisar soldaduras en módulos (si aplica)
- Probar cambiar dirección del BH1750 (ADDR a 3.3V = 0x5C)

### Errores del DHT22
**Síntoma**: "Error de lectura" en DHT22
- Verificar resistencia pull-up de 10kΩ entre VCC y DATA
- Comprobar que DATA esté conectado a GPIO 4
- Esperar al menos 2 segundos entre lecturas
- Verificar alimentación estable de 3.3V

**Síntoma**: Lecturas NaN (Not a Number)
- Reiniciar ESP32 completamente
- Verificar que el sensor no esté dañado por humedad
- Comprobar timing de lecturas (delay adecuado)

### Errores de Sensores de Lluvia
**Síntoma**: Pluviómetro no detecta pulsos
- Verificar cable VERDE conectado a GPIO 2
- Comprobar alimentación del cable ROJO (3.3V)
- Testear con multímetro la continuidad del reed switch
- Verificar configuración INPUT_PULLUP en el código

**Síntoma**: Sensor MH-RD siempre marca "SECO"
- Verificar alimentación controlada en GPIO 13
- Comprobar conexiones AO (GPIO 34) y DO (GPIO 12)
- Ajustar umbrales MHRD_THRESHOLD_DRY/WET según ambiente
- Probar humedecer el sensor para verificar cambios

### Problemas Generales
**Síntoma**: Lecturas erróneas o inestables
- Verificar estabilidad de la alimentación (usar fuente de calidad)
- Comprobar que no hay interferencias electromagnéticas
- Reiniciar ESP32 completamente (desconectar y reconectar)
- Verificar cables dupont en buen estado

**Síntoma**: Diferencia excesiva entre sensores de temperatura
- Normal hasta 2-3°C de diferencia entre BMP180 y DHT22
- Si diferencia >5°C, verificar calibración y conexiones
- Considerar ubicación física de los sensores (efectos térmicos)

### Diagnósticos Avanzados
- Usar herramientas I2C scanner para verificar direcciones
- Monitorear puerto serie a 115200 baudios para mensajes de error
- Verificar voltajes con multímetro: 3.3V en VCC, 0V en GND
- Probar sensores individualmente para aislar problemas