# Gu\u00eda Ejecutiva: Reinicio de Base de Datos - Estaci\u00f3n Meteorol\u00f3gica

## Resumen Ejecutivo

Este documento proporciona un procedimiento paso a paso para reiniciar completamente la base de datos de la estaci\u00f3n meteorol\u00f3gica, eliminando todos los registros hist\u00f3ricos y preparando el sistema para nuevas capturas de datos.

**Duraci\u00f3n Estimada:** 5-10 minutos  
**Impacto:** Eliminaci\u00f3n total de datos hist\u00f3ricos (irreversible)  
**Prerrequisitos:** Docker en ejecuci\u00f3n, acceso a l\u00ednea de comandos

---

## Procedimiento de Reinicio

### 1. Verificaci\u00f3n del Estado Actual

**Objetivo:** Confirmar que el sistema est\u00e1 operativo y verificar la cantidad de registros actuales.

```bash
# Verificar servicios Docker activos
docker ps

# Verificar cantidad de registros actuales
docker exec weather_influxdb influx query --org weather-station --token weather-station-token-12345 'from(bucket: "weather-data") |> range(start: -30d) |> group() |> count()'
```

**Resultado Esperado:** Lista de contenedores activos y n\u00famero total de registros en la base de datos.

---

### 2. Respaldo de Datos (Opcional)

**Objetivo:** Crear una copia de seguridad antes del borrado (recomendado para entornos de producci\u00f3n).

```bash
# Exportar datos a archivo JSON
docker exec weather_influxdb influx query --org weather-station --token weather-station-token-12345 --raw 'from(bucket: "weather-data") |> range(start: -30d)' > backup_weather_data_$(date +%Y%m%d_%H%M%S).json
```

**Resultado:** Archivo de respaldo con timestamp en el directorio actual.

---

### 3. Eliminaci\u00f3n de Datos

**Objetivo:** Borrar todos los registros de la base de datos InfluxDB.

```bash
# Eliminar todos los datos del bucket weather-data
docker exec weather_influxdb influx delete --bucket weather-data --start 1970-01-01T00:00:00Z --stop 2025-12-31T23:59:59Z --org weather-station --token weather-station-token-12345
```

**Nota Importante:** Esta operaci\u00f3n es **irreversible**. Aseg\u00farese de haber creado un respaldo si es necesario.

---

### 4. Verificaci\u00f3n de Limpieza

**Objetivo:** Confirmar que todos los datos han sido eliminados correctamente.

```bash
# Verificar que no hay registros
docker exec weather_influxdb influx query --org weather-station --token weather-station-token-12345 'from(bucket: "weather-data") |> range(start: -30d) |> group() |> count()'
```

**Resultado Esperado:** Comando sin salida o error indicando que no hay datos.

---

### 5. Verificaci\u00f3n del Sistema

**Objetivo:** Asegurar que todos los servicios est\u00e1n operativos para recibir nuevos datos.

```bash
# Verificar salud del backend API
curl http://localhost:5002/health

# Verificar servicios Docker
docker-compose ps
```

**Resultado Esperado:**
- API responde con status 200 y mensaje "OK"
- Todos los servicios en estado "Up"

---

## Estados del Sistema Post-Reinicio

### \u2705 Sistema Listo
- Base de datos limpia
- Servicios operativos
- API funcionando
- Listo para recibir datos del ESP32

### \u26a0\ufe0f Consideraciones Importantes
- **Dashboards vac\u00edos:** Frontend y Grafana mostrar\u00e1n "Sin datos" hasta que lleguen nuevas lecturas
- **Alertas reiniciadas:** Historial de alertas eliminado
- **Estad\u00edsticas perdidas:** Todas las m\u00e9tricas hist\u00f3ricas se pierden permanentemente

---

## Troubleshooting

### Problema: Servicios Docker no responden
```bash
# Reiniciar servicios
docker-compose restart
# o reinicio completo
docker-compose down && docker-compose up -d
```

### Problema: Error de autenticaci\u00f3n InfluxDB
```bash
# Verificar token y organizaci\u00f3n
docker exec weather_influxdb influx auth list --org weather-station
```

### Problema: Base de datos no se limpia
```bash
# Verificar conexi\u00f3n
docker exec weather_influxdb influx ping
# Reintentar eliminaci\u00f3n con rango m\u00e1s espec\u00edfico
docker exec weather_influxdb influx delete --bucket weather-data --start 2020-01-01T00:00:00Z --stop $(date -u +%Y-%m-%dT%H:%M:%SZ) --org weather-station --token weather-station-token-12345
```

---

## Checklist de Validaci\u00f3n Final

- [ ] Verificar que `docker ps` muestra todos los servicios activos
- [ ] Confirmar que `curl http://localhost:5002/health` responde OK
- [ ] Validar que la consulta de datos no retorna registros
- [ ] Verificar que frontend en http://localhost:3001+ carga sin errores
- [ ] Confirmar que Grafana en http://localhost:3000 est\u00e1 accesible

---

## Contacto y Soporte

Para soporte t\u00e9cnico adicional, consultar:
- `CLAUDE.md`: Documentaci\u00f3n completa del sistema
- `docker-compose.yml`: Configuraci\u00f3n de servicios
- Logs del sistema: `docker-compose logs -f`

---

**\u00daltima Actualizaci\u00f3n:** Agosto 2025  
**Versi\u00f3n del Documento:** 1.0  
**Autor:** Claude Code Assistant