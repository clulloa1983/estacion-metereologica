# 🌦️ Sensores y Microcontroladores

---

## ✅ Sensores Conectados (ESP32)

- 🌡️ **DHT22** — Sensor de temperatura y humedad (GPIO27)
- 🧭 **BMP180** — Sensor de presión barométrica (I2C - GPIO21/22)
- 🌧️ **MH-RD** — Sensor de lluvia (GPIO12)

---

## 🖥️ Microcontrolador Principal

- 🚀 **ESP32** — Microcontrolador definitivo del proyecto

### Especificaciones ESP32
- **CPU**: Dual Core 240MHz
- **WiFi**: 802.11 b/g/n (2.4 GHz)
- **Bluetooth**: v4.2 BR/EDR y BLE
- **GPIO**: 34 pines disponibles
- **ADC**: 18 canales, 12-bit
- **I2C**: GPIO21 (SDA), GPIO22 (SCL)
- **Memoria**: 4MB Flash, 520KB RAM
- **Alimentación**: 5V (USB/Micro USB) / 3.3V (regulado)

---

## 🎯 Configuración Actual

### Conexiones Activas
| Sensor | Pin ESP32 | Protocolo | Función |
|--------|-----------|-----------|---------|
| DHT22 | GPIO27 | OneWire | Temperatura y humedad |
| BMP180 | GPIO21/22 | I2C | Presión barométrica |
| MH-RD | GPIO12 | Digital | Detección de lluvia |

### Estado del Proyecto
- ✅ **ESP32**: Microcontrolador principal en uso
- ✅ **Sensores básicos**: DHT22, BMP180, MH-RD conectados
- ✅ **Comunicación**: MQTT funcional
- ✅ **Alimentación**: USB/5V estable

---

> 📦 *Configuración actualizada para ESP32 como microcontrolador definitivo del proyecto.*
