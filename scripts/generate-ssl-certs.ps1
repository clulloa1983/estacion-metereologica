# SSL Certificate Generation Script for Windows Development
# PowerShell version for Windows users

Write-Host "🔐 Generating SSL certificates for Weather Station system..." -ForegroundColor Green

# Check if OpenSSL is available
try {
    $null = Get-Command openssl -ErrorAction Stop
} catch {
    Write-Host "❌ OpenSSL not found. Please install OpenSSL first:" -ForegroundColor Red
    Write-Host "   - Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "   - Or use Chocolatey: choco install openssl" -ForegroundColor Yellow
    Write-Host "   - Or use winget: winget install ShiningLight.OpenSSL" -ForegroundColor Yellow
    exit 1
}

# Create SSL directories
New-Item -ItemType Directory -Force -Path "docker\nginx\ssl" | Out-Null
New-Item -ItemType Directory -Force -Path "docker\mosquitto\ssl" | Out-Null

# Certificate configuration
$COUNTRY = "US"
$STATE = "California"
$CITY = "San Francisco"
$ORG = "Weather Station Dev"
$OU = "IoT Development"
$CN = "localhost"
$EMAIL = "dev@weather-station.local"
$DAYS = 365

Write-Host "📝 Certificate Details:" -ForegroundColor Cyan
Write-Host "   Common Name: $CN"
Write-Host "   Organization: $ORG"
Write-Host "   Valid for: $DAYS days"
Write-Host ""

# Generate CA private key
Write-Host "🔑 Generating CA private key..." -ForegroundColor Yellow
& openssl genrsa -out docker\nginx\ssl\ca.key 4096
& openssl genrsa -out docker\mosquitto\ssl\ca.key 4096

# Generate CA certificate
Write-Host "📜 Generating CA certificate..." -ForegroundColor Yellow
& openssl req -new -x509 -days $DAYS -key docker\nginx\ssl\ca.key -out docker\nginx\ssl\ca.crt -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG CA/OU=$OU/CN=$CN CA/emailAddress=$EMAIL"
Copy-Item docker\nginx\ssl\ca.crt docker\mosquitto\ssl\ca.crt
Copy-Item docker\nginx\ssl\ca.key docker\mosquitto\ssl\ca.key

# Generate server private key
Write-Host "🔐 Generating server private key..." -ForegroundColor Yellow
& openssl genrsa -out docker\nginx\ssl\server.key 4096
& openssl genrsa -out docker\mosquitto\ssl\server.key 4096

# Generate server certificate signing request
Write-Host "📋 Generating server certificate request..." -ForegroundColor Yellow
& openssl req -new -key docker\nginx\ssl\server.key -out docker\nginx\ssl\server.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL"
& openssl req -new -key docker\mosquitto\ssl\server.key -out docker\mosquitto\ssl\server.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL"

# Create extensions file for Subject Alternative Names
$extContent = @"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = weather-station.local
DNS.3 = *.weather-station.local
IP.1 = 127.0.0.1
IP.2 = 192.168.1.100
"@

Set-Content -Path "docker\nginx\ssl\server.ext" -Value $extContent
Copy-Item docker\nginx\ssl\server.ext docker\mosquitto\ssl\server.ext

# Generate server certificate signed by CA
Write-Host "✅ Generating server certificate..." -ForegroundColor Yellow
& openssl x509 -req -in docker\nginx\ssl\server.csr -CA docker\nginx\ssl\ca.crt -CAkey docker\nginx\ssl\ca.key -CAcreateserial -out docker\nginx\ssl\server.crt -days $DAYS -extensions v3_req -extfile docker\nginx\ssl\server.ext
& openssl x509 -req -in docker\mosquitto\ssl\server.csr -CA docker\mosquitto\ssl\ca.crt -CAkey docker\mosquitto\ssl\ca.key -CAcreateserial -out docker\mosquitto\ssl\server.crt -days $DAYS -extensions v3_req -extfile docker\mosquitto\ssl\server.ext

# Generate client certificate for ESP32
Write-Host "📱 Generating client certificate for ESP32..." -ForegroundColor Yellow
& openssl genrsa -out docker\mosquitto\ssl\client.key 2048
& openssl req -new -key docker\mosquitto\ssl\client.key -out docker\mosquitto\ssl\client.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=ESP32/CN=ESP32_STATION_001/emailAddress=$EMAIL"
& openssl x509 -req -in docker\mosquitto\ssl\client.csr -CA docker\mosquitto\ssl\ca.crt -CAkey docker\mosquitto\ssl\ca.key -CAcreateserial -out docker\mosquitto\ssl\client.crt -days $DAYS

# Clean up temporary files
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item docker\nginx\ssl\*.csr -ErrorAction SilentlyContinue
Remove-Item docker\nginx\ssl\*.ext -ErrorAction SilentlyContinue
Remove-Item docker\mosquitto\ssl\*.csr -ErrorAction SilentlyContinue
Remove-Item docker\mosquitto\ssl\*.ext -ErrorAction SilentlyContinue

# Verify certificates
Write-Host "🔍 Verifying certificates..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== NGINX Certificate Info ===" -ForegroundColor Cyan
& openssl x509 -in docker\nginx\ssl\server.crt -text -noout | Select-String "(Subject|Issuer|Not Before|Not After|DNS|IP Address)"
Write-Host ""
Write-Host "=== MQTT Certificate Info ===" -ForegroundColor Cyan
& openssl x509 -in docker\mosquitto\ssl\server.crt -text -noout | Select-String "(Subject|Issuer|Not Before|Not After|DNS|IP Address)"
Write-Host ""

Write-Host "✅ SSL certificates generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Certificate files created:" -ForegroundColor Cyan
Write-Host "   - docker\nginx\ssl\ca.crt (Certificate Authority)"
Write-Host "   - docker\nginx\ssl\server.crt (Web Server Certificate)"
Write-Host "   - docker\nginx\ssl\server.key (Web Server Private Key)"
Write-Host "   - docker\mosquitto\ssl\ca.crt (MQTT CA Certificate)"
Write-Host "   - docker\mosquitto\ssl\server.crt (MQTT Server Certificate)"
Write-Host "   - docker\mosquitto\ssl\server.key (MQTT Server Private Key)"
Write-Host "   - docker\mosquitto\ssl\client.crt (ESP32 Client Certificate)"
Write-Host ""
Write-Host "🚀 Ready to start services with SSL/TLS enabled!" -ForegroundColor Green
Write-Host "   Run: docker-compose up -d" -ForegroundColor Yellow
Write-Host ""