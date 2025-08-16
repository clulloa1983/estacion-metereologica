# Weather Station System - Shutdown Procedures

## Executive Summary

This document provides standardized procedures for safely shutting down all components of the IoT Weather Station system and freeing up network ports. Follow these procedures when system maintenance, port conflicts, or complete shutdown is required.

## System Overview

The Weather Station system uses the following ports:
- **Frontend (Next.js)**: Port 3001 (auto-assigned)
- **Backend API**: Port 5002 
- **Docker Services**:
  - Grafana: Port 3000
  - InfluxDB: Port 8086
  - MQTT Broker: Ports 1883, 9001
  - Redis: Port 6379

## Quick Shutdown Checklist

☐ Stop Frontend development server  
☐ Stop Backend development server  
☐ Stop Docker Compose services  
☐ Verify all ports are freed  
☐ Confirm no weather station containers running

---

## Detailed Procedures

### 1. Pre-Shutdown Assessment

**Check Current System Status:**
```bash
# Check active ports
netstat -ano | findstr ":3001 :5002 :3000 :8086 :6379 :1883 :9001"

# Check running Docker containers
docker ps
```

**Expected Output:**
- Ports 3001, 5002: Node.js processes (frontend/backend)
- Ports 3000, 8086, 6379, 1883, 9001: Docker containers
- Container names: weather_grafana, weather_influxdb, weather_redis, weather_mosquitto

### 2. Frontend Shutdown

**Identify Frontend Process:**
```bash
netstat -ano | findstr ":3001"
```

**Stop Frontend Server:**
```bash
# Method 1: Graceful shutdown (if console access available)
# Press Ctrl+C in the frontend terminal

# Method 2: Force kill process
cmd /c "taskkill /F /PID [PROCESS_ID]"
```

**Verification:**
```bash
netstat -ano | findstr ":3001"
```
> Note: TIME_WAIT connections are normal and will clear automatically

### 3. Backend Shutdown

**Identify Backend Process:**
```bash
netstat -ano | findstr ":5002"
```

**Stop Backend Server:**
```bash
# Method 1: Graceful shutdown (if console access available)
# Press Ctrl+C in the backend terminal

# Method 2: Force kill process
cmd /c "taskkill /F /PID [PROCESS_ID]"
```

**Verification:**
```bash
netstat -ano | findstr ":5002"
```

### 4. Docker Services Shutdown

**Stop All Weather Station Containers:**
```bash
# Navigate to project directory
cd C:\desarrollo\proyectos\estacion-metereologica

# Stop and remove all services
docker-compose down
```

**Expected Output:**
```
Container weather_grafana  Stopping
Container weather_mosquitto  Stopping
Container weather_redis  Stopping
Container weather_influxdb  Stopping
[All containers stopped and removed]
Network estacion-metereologica_weather-network  Removed
```

**Verify Docker Cleanup:**
```bash
docker ps
```
> Should show no weather station containers running

### 5. Final Verification

**Check All Ports Are Free:**
```bash
netstat -ano | findstr ":3001 :5002 :3000 :8086 :6379 :1883 :9001"
```

**Expected Result:**
- No LISTENING entries for these ports
- Only TIME_WAIT connections (normal, will clear automatically)

---

## Troubleshooting

### Stubborn Processes

**If ports remain occupied after standard shutdown:**

```bash
# Kill all Node.js processes (nuclear option)
cmd /c "taskkill /F /IM node.exe"

# Kill specific process with tree
cmd /c "taskkill /F /PID [PROCESS_ID] /T"
```

### Docker Issues

**If containers won't stop:**
```bash
# Force remove containers
docker rm -f weather_grafana weather_influxdb weather_redis weather_mosquitto

# Remove network if needed
docker network rm estacion-metereologica_weather-network
```

### Port Investigation

**Identify what's using a specific port:**
```bash
# Check process details
cmd /c "wmic process where processid=[PID] get commandline,name"

# Alternative using PowerShell
Get-Process -Id [PID] | Select-Object Name, Path, CommandLine
```

---

## Emergency Procedures

### Complete System Reset

**When normal procedures fail:**

1. **Force kill all Node.js processes:**
   ```bash
   cmd /c "taskkill /F /IM node.exe"
   ```

2. **Force remove all Docker containers:**
   ```bash
   docker rm -f $(docker ps -aq)
   ```

3. **Clear Docker networks:**
   ```bash
   docker network prune -f
   ```

4. **Restart Docker service (if needed):**
   ```bash
   net stop com.docker.service
   net start com.docker.service
   ```

### System Restart Alternative

**If ports remain stubbornly occupied:**
- Restart the computer (last resort)
- All ports will be freed on system restart

---

## Prevention Best Practices

### Graceful Shutdown Sequence

1. **Always stop services in order:**
   - Frontend first (port 3001)
   - Backend second (port 5002) 
   - Docker services last (all other ports)

2. **Use Ctrl+C when possible:**
   - Allows graceful cleanup
   - Prevents port binding issues

3. **Verify each step:**
   - Check ports after each shutdown
   - Confirm processes are fully terminated

### Regular Maintenance

- **Weekly**: Review running processes
- **Monthly**: Clean Docker system (`docker system prune`)
- **As needed**: Update this document with new procedures

---

## Quick Reference Commands

```bash
# Status Check
netstat -ano | findstr ":3001 :5002 :3000 :8086 :6379 :1883 :9001"
docker ps

# Shutdown Sequence
cmd /c "taskkill /F /PID [FRONTEND_PID]"
cmd /c "taskkill /F /PID [BACKEND_PID]"
docker-compose down

# Verification
netstat -ano | findstr ":3001 :5002 :3000 :8086 :6379 :1883 :9001"
docker ps

# Emergency Reset
cmd /c "taskkill /F /IM node.exe"
docker rm -f $(docker ps -aq)
```

---

## Document Information

**Created:** 2025-08-16  
**Version:** 1.0  
**Last Updated:** 2025-08-16  
**Applies To:** Weather Station IoT Project v1.0  

**Next Review Date:** 2025-09-16