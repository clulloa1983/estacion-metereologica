#!/bin/bash

# InfluxDB Simple Backup Script
# Versión simplificada que funciona mejor con Windows/Docker

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-weather_influxdb}"
INFLUXDB_ORG="${INFLUXDB_ORG:-weather-station}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-weather-station-token-12345}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}.tar.gz"

# Crear directorio de backup si no existe
mkdir -p "${BACKUP_DIR}"

echo "=== InfluxDB Simple Backup ==="
echo "Timestamp: $(date)"
echo "Backup Directory: ${BACKUP_DIR}"
echo "Container: ${CONTAINER_NAME}"

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Error: Container ${CONTAINER_NAME} is not running"
    exit 1
fi

echo "✅ Container ${CONTAINER_NAME} is running"

# Crear backup directamente comprimido usando docker exec
echo "📦 Creating compressed backup: ${BACKUP_NAME}"

docker exec "${CONTAINER_NAME}" sh -c "
    influx backup --token '${INFLUXDB_TOKEN}' --org '${INFLUXDB_ORG}' /tmp/backup_temp &&
    cd /tmp &&
    tar -czf ${BACKUP_NAME} backup_temp &&
    rm -rf backup_temp
"

# Copiar backup comprimido desde el contenedor
echo "📤 Copying backup to host..."
docker cp "${CONTAINER_NAME}:/tmp/${BACKUP_NAME}" "${BACKUP_DIR}/"

# Limpiar backup del contenedor
docker exec "${CONTAINER_NAME}" rm -f "/tmp/${BACKUP_NAME}"

# Calcular tamaño del backup
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
echo "✅ Backup completed: ${BACKUP_NAME} (${BACKUP_SIZE})"

# Mostrar backups disponibles
echo ""
echo "📋 Available backups:"
ls -lh "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null || echo "No backups found"

echo ""
echo "✅ Simple backup process completed successfully!"
echo "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}"