● Basándome en el código del ESP32, ya tienes una estación muy completa con 8 sensores. Te sugiero estos módulos adicionales:

  Sensores Recomendados Adicionales

  Sensores de Viento:
  - AS5600 - Sensor magnético para dirección del viento (I2C)
  - Reed switch + imán - Para velocidad del viento (pulsos)

  Sensores Atmosféricos:
  - UV sensor (ML8511 o GUVA-S12SD) - Radiación UV
  - BME680 - Reemplazar BMP180, incluye VOC y gas quality

  Sensores de Suelo:
  - Sensor de humedad del suelo - Para jardín/agricultura
  - DS18B20 - Temperatura del suelo (waterproof)

  Pines disponibles en tu ESP32:
  - GPIO 0, 5, 14, 17, 18, 19, 23, 25-27, 32-33, 35, 39 (algunos con restricciones)

  Alimentación para Techo

  Opción 1: Solar + Batería (Recomendada)
  - Panel solar 20W (suficiente para ESP32 + sensores)
  - Batería LiFePO4 12V 5Ah-10Ah
  - Módulo de carga TP4056 o similar
  - Regulador de voltaje LM2596 (12V→5V→3.3V)

  Opción 2: Fuente Externa
  - Cable weatherproof desde interior
  - Fuente 12V regulada con protección
  - Conductos impermeables

  Consideraciones Importantes:
  - Carcasa IP65 resistente a intemperie
  - Ventilación para evitar condensación
  - Deep Sleep ya implementado en tu código - excelente para solar
  - Disipador de calor para reguladores de voltaje
  - Pararrayos/protección si hay tormentas frecuentes