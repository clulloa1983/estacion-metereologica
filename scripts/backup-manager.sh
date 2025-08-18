#!/bin/bash

# InfluxDB Backup Manager
# Script para gestionar backups de InfluxDB con múltiples opciones

set -e

# Configuración por defecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
CONTAINER_NAME="weather_influxdb"

# Funciones
show_help() {
    cat << EOF
InfluxDB Backup Manager

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    backup              Create a new backup
    restore <file>      Restore from backup file
    list               List available backups
    cleanup            Remove old backups
    status             Show backup service status
    schedule           Show backup schedule
    test               Test backup system

Options:
    -h, --help         Show this help message
    -v, --verbose      Verbose output
    -d, --dir DIR      Backup directory (default: ./backups)
    -r, --retain DAYS  Retention period in days (default: 7)

Examples:
    $0 backup
    $0 restore influxdb_backup_20250818_143000.tar.gz
    $0 list
    $0 cleanup --retain 14
    $0 status

EOF
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon is not running or not accessible"
        exit 1
    fi
}

check_container() {
    if ! docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container ${CONTAINER_NAME} is not running"
        exit 1
    fi
}

cmd_backup() {
    log_info "Starting backup process..."
    check_docker
    check_container
    
    "${SCRIPT_DIR}/backup-influxdb.sh"
}

cmd_restore() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Backup file not specified"
        echo "Available backups:"
        cmd_list
        exit 1
    fi
    
    log_info "Starting restore process for: $backup_file"
    check_docker
    check_container
    
    "${SCRIPT_DIR}/restore-influxdb.sh" "$backup_file"
}

cmd_list() {
    log_info "Available backups in ${BACKUP_DIR}:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "  No backup directory found"
        return
    fi
    
    local count=0
    for backup in "$BACKUP_DIR"/influxdb_backup_*.tar.gz; do
        if [ -f "$backup" ]; then
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" 2>/dev/null || stat -f %Sm "$backup" 2>/dev/null || echo "unknown")
            echo "  $(basename "$backup") - $size - $date"
            ((count++))
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo "  No backups found"
    else
        echo "  Total: $count backups"
    fi
}

cmd_cleanup() {
    local retention_days="${1:-7}"
    
    log_info "Cleaning up backups older than $retention_days days..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "No backup directory found"
        return
    fi
    
    local deleted=0
    while IFS= read -r -d '' backup; do
        rm -f "$backup"
        log_info "Deleted: $(basename "$backup")"
        ((deleted++))
    done < <(find "$BACKUP_DIR" -name "influxdb_backup_*.tar.gz" -type f -mtime +$retention_days -print0 2>/dev/null)
    
    if [ $deleted -eq 0 ]; then
        log_info "No old backups to delete"
    else
        log_info "Deleted $deleted old backups"
    fi
}

cmd_status() {
    log_info "Backup system status:"
    
    echo "Docker status:"
    if command -v docker &> /dev/null && docker ps &> /dev/null; then
        echo "  ✅ Docker is running"
    else
        echo "  ❌ Docker is not available"
    fi
    
    echo "Container status:"
    if docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo "  ✅ ${CONTAINER_NAME} is running"
    else
        echo "  ❌ ${CONTAINER_NAME} is not running"
    fi
    
    echo "Backup service:"
    if docker ps --filter "name=weather_backup_service" --format "{{.Names}}" | grep -q "weather_backup_service"; then
        echo "  ✅ Backup service is running"
    else
        echo "  ❌ Backup service is not running"
    fi
    
    echo "Backup directory:"
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(find "$BACKUP_DIR" -name "influxdb_backup_*.tar.gz" -type f 2>/dev/null | wc -l)
        echo "  ✅ $BACKUP_DIR exists ($backup_count backups)"
    else
        echo "  ❌ $BACKUP_DIR does not exist"
    fi
}

cmd_schedule() {
    log_info "Backup schedule information:"
    
    if docker ps --filter "name=weather_backup_service" --format "{{.Names}}" | grep -q "weather_backup_service"; then
        local schedule=$(docker exec weather_backup_service cat /etc/crontabs/root 2>/dev/null || echo "unknown")
        echo "  Current schedule: $schedule"
        echo "  Next run: $(docker exec weather_backup_service crond -t 2>/dev/null | head -1 || echo "unknown")"
    else
        echo "  ❌ Backup service is not running"
    fi
}

cmd_test() {
    log_info "Testing backup system..."
    
    check_docker
    check_container
    
    echo "1. Creating test backup..."
    cmd_backup
    
    echo "2. Listing backups..."
    cmd_list
    
    echo "3. Checking backup service..."
    cmd_status
    
    log_info "Backup system test completed"
}

# Parsear argumentos
VERBOSE=false
RETENTION_DAYS=7

while [[ $# -gt 0 ]]; do
    case $1 in
        backup)
            COMMAND="backup"
            shift
            ;;
        restore)
            COMMAND="restore"
            BACKUP_FILE="$2"
            shift 2
            ;;
        list)
            COMMAND="list"
            shift
            ;;
        cleanup)
            COMMAND="cleanup"
            shift
            ;;
        status)
            COMMAND="status"
            shift
            ;;
        schedule)
            COMMAND="schedule"
            shift
            ;;
        test)
            COMMAND="test"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retain)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Ejecutar comando
case "$COMMAND" in
    backup)
        cmd_backup
        ;;
    restore)
        cmd_restore "$BACKUP_FILE"
        ;;
    list)
        cmd_list
        ;;
    cleanup)
        cmd_cleanup "$RETENTION_DAYS"
        ;;
    status)
        cmd_status
        ;;
    schedule)
        cmd_schedule
        ;;
    test)
        cmd_test
        ;;
    *)
        log_error "No command specified"
        show_help
        exit 1
        ;;
esac