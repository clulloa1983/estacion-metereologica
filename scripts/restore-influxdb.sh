#!/bin/bash

# InfluxDB Restore Script
# Restaura backups de la base de datos InfluxDB

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-weather_influxdb}"
INFLUXDB_ORG="${INFLUXDB_ORG:-weather-station}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-weather-station-token-12345}"

# Función para mostrar uso
show_usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Example:"
    echo "  $0 influxdb_backup_20250818_143000.tar.gz"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_DIR}"/influxdb_backup_*.tar.gz 2>/dev/null || echo "  No backups found"
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo "❌ Error: Backup file not specified"
    show_usage
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "=== InfluxDB Restore Script ==="
echo "Timestamp: $(date)"
echo "Backup File: ${BACKUP_FILE}"
echo "Container: ${CONTAINER_NAME}"
echo "Organization: ${INFLUXDB_ORG}"
echo ""

# Verificar que el archivo de backup existe
if [ ! -f "${BACKUP_PATH}" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_PATH}"
    show_usage
    exit 1
fi

echo "✅ Backup file found: ${BACKUP_PATH}"

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Error: Container ${CONTAINER_NAME} is not running"
    exit 1
fi

echo "✅ Container ${CONTAINER_NAME} is running"

# Extraer el nombre del directorio del backup
BACKUP_NAME=$(basename "${BACKUP_FILE}" .tar.gz)

# Descomprimir backup
echo "📦 Extracting backup..."
cd "${BACKUP_DIR}"
tar -xzf "${BACKUP_FILE}"

# Copiar backup al contenedor
echo "📤 Copying backup to container..."
docker cp "${BACKUP_NAME}" "${CONTAINER_NAME}:/tmp/"

# Confirmar antes de restaurar
echo ""
echo "⚠️  WARNING: This will restore data from backup and may overwrite existing data."
echo "Backup: ${BACKUP_FILE}"
echo "Target: ${CONTAINER_NAME} (${INFLUXDB_ORG})"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled by user"
    # Limpiar archivos temporales
    rm -rf "${BACKUP_NAME}"
    docker exec "${CONTAINER_NAME}" rm -rf "/tmp/${BACKUP_NAME}"
    exit 1
fi

# Realizar la restauración
echo "🔄 Restoring backup..."
docker exec "${CONTAINER_NAME}" influx restore \
    --token "${INFLUXDB_TOKEN}" \
    --org "${INFLUXDB_ORG}" \
    "/tmp/${BACKUP_NAME}"

# Limpiar archivos temporales
echo "🧹 Cleaning up temporary files..."
rm -rf "${BACKUP_NAME}"
docker exec "${CONTAINER_NAME}" rm -rf "/tmp/${BACKUP_NAME}"

echo ""
echo "✅ Restore completed successfully!"
echo "Data restored from: ${BACKUP_FILE}"