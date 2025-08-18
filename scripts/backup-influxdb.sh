#!/bin/bash

# InfluxDB Backup Script
# Crea backups automatizados de la base de datos InfluxDB

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-weather_influxdb}"
INFLUXDB_ORG="${INFLUXDB_ORG:-weather-station}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-weather-station-token-12345}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="influxdb_backup_${TIMESTAMP}"

# Crear directorio de backup si no existe
mkdir -p "${BACKUP_DIR}"

echo "=== InfluxDB Backup Script ==="
echo "Timestamp: $(date)"
echo "Backup Directory: ${BACKUP_DIR}"
echo "Container: ${CONTAINER_NAME}"
echo "Organization: ${INFLUXDB_ORG}"
echo ""

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Error: Container ${CONTAINER_NAME} is not running"
    exit 1
fi

echo "✅ Container ${CONTAINER_NAME} is running"

# Crear backup usando influx CLI dentro del contenedor
echo "📦 Creating backup: ${BACKUP_NAME}"

docker exec "${CONTAINER_NAME}" influx backup \
    --token "${INFLUXDB_TOKEN}" \
    --org "${INFLUXDB_ORG}" \
    "/tmp/${BACKUP_NAME}"

# Copiar backup desde el contenedor al host
echo "📤 Copying backup to host..."
docker cp "${CONTAINER_NAME}:/tmp/${BACKUP_NAME}" "${BACKUP_DIR}/"

# Limpiar backup temporal del contenedor
docker exec "${CONTAINER_NAME}" rm -rf "/tmp/${BACKUP_NAME}"

# Comprimir backup
echo "🗜️ Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

# Calcular tamaño del backup
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
echo "✅ Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Limpiar backups antiguos
echo "🧹 Cleaning old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "influxdb_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Mostrar backups disponibles
echo ""
echo "📋 Available backups:"
ls -lh "${BACKUP_DIR}"/influxdb_backup_*.tar.gz 2>/dev/null || echo "No backups found"

echo ""
echo "✅ Backup process completed successfully!"
echo "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"