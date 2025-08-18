# InfluxDB Backup Script para Windows PowerShell
# Crea backups automatizados de la base de datos InfluxDB

param(
    [string]$BackupDir = "./backups",
    [string]$ContainerName = "weather_influxdb",
    [string]$InfluxDBOrg = "weather-station",
    [string]$InfluxDBToken = "weather-station-token-12345",
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"

# Configuración
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "influxdb_backup_$Timestamp"

Write-Host "=== InfluxDB Backup Script ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Yellow
Write-Host "Backup Directory: $BackupDir" -ForegroundColor Yellow
Write-Host "Container: $ContainerName" -ForegroundColor Yellow
Write-Host "Organization: $InfluxDBOrg" -ForegroundColor Yellow
Write-Host ""

# Crear directorio de backup si no existe
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "📁 Created backup directory: $BackupDir" -ForegroundColor Green
}

# Verificar que Docker esté disponible
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Error: Docker not found or not running" -ForegroundColor Red
    exit 1
}

# Verificar que el contenedor esté corriendo
$containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if ($containerStatus -ne $ContainerName) {
    Write-Host "❌ Error: Container $ContainerName is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container $ContainerName is running" -ForegroundColor Green

# Crear backup usando influx CLI dentro del contenedor
Write-Host "📦 Creating backup: $BackupName" -ForegroundColor Cyan

try {
    docker exec $ContainerName influx backup --token $InfluxDBToken --org $InfluxDBOrg "/tmp/$BackupName"
    
    # Copiar backup desde el contenedor al host
    Write-Host "📤 Copying backup to host..." -ForegroundColor Cyan
    docker cp "${ContainerName}:/tmp/$BackupName" "$BackupDir/"
    
    # Limpiar backup temporal del contenedor
    docker exec $ContainerName rm -rf "/tmp/$BackupName"
    
    # Comprimir backup
    Write-Host "🗜️ Compressing backup..." -ForegroundColor Cyan
    $SourcePath = Join-Path $BackupDir $BackupName
    $DestPath = Join-Path $BackupDir "$BackupName.zip"
    
    Compress-Archive -Path $SourcePath -DestinationPath $DestPath -Force
    Remove-Item -Path $SourcePath -Recurse -Force
    
    # Calcular tamaño del backup
    $BackupSize = (Get-Item $DestPath).Length
    $BackupSizeFormatted = [math]::Round($BackupSize / 1MB, 2)
    Write-Host "✅ Backup completed: $BackupName.zip ($BackupSizeFormatted MB)" -ForegroundColor Green
    
    # Limpiar backups antiguos
    Write-Host "🧹 Cleaning old backups (older than $RetentionDays days)..." -ForegroundColor Cyan
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Name "influxdb_backup_*.zip" | 
        ForEach-Object {
            $filePath = Join-Path $BackupDir $_
            if ((Get-Item $filePath).CreationTime -lt $CutoffDate) {
                Remove-Item $filePath
                Write-Host "🗑️ Deleted old backup: $_" -ForegroundColor Yellow
            }
        }
    
    # Mostrar backups disponibles
    Write-Host ""
    Write-Host "📋 Available backups:" -ForegroundColor Cyan
    Get-ChildItem -Path $BackupDir -Name "influxdb_backup_*.zip" | ForEach-Object {
        $file = Get-Item (Join-Path $BackupDir $_)
        $size = [math]::Round($file.Length / 1MB, 2)
        Write-Host "  $_ ($size MB) - $(Get-Date $file.CreationTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "✅ Backup process completed successfully!" -ForegroundColor Green
    Write-Host "Backup location: $BackupDir\$BackupName.zip" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error during backup process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}