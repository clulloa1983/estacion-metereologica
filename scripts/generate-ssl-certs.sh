#!/bin/bash

# SSL Certificate Generation Script for Development
# This script generates self-signed certificates for development/testing purposes

set -e  # Exit on any error

echo "🔐 Generating SSL certificates for Weather Station system..."

# Create SSL directories
mkdir -p docker/nginx/ssl
mkdir -p docker/mosquitto/ssl

# Certificate configuration
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="Weather Station Dev"
OU="IoT Development"
CN="localhost"
EMAIL="dev@weather-station.local"

# Days valid
DAYS=365

echo "📝 Certificate Details:"
echo "   Common Name: $CN"
echo "   Organization: $ORG"
echo "   Valid for: $DAYS days"
echo ""

# Generate CA private key
echo "🔑 Generating CA private key..."
openssl genrsa -out docker/nginx/ssl/ca.key 4096
openssl genrsa -out docker/mosquitto/ssl/ca.key 4096

# Generate CA certificate
echo "📜 Generating CA certificate..."
openssl req -new -x509 -days $DAYS -key docker/nginx/ssl/ca.key -out docker/nginx/ssl/ca.crt -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG CA/OU=$OU/CN=$CN CA/emailAddress=$EMAIL"
cp docker/nginx/ssl/ca.crt docker/mosquitto/ssl/ca.crt
cp docker/nginx/ssl/ca.key docker/mosquitto/ssl/ca.key

# Generate server private key
echo "🔐 Generating server private key..."
openssl genrsa -out docker/nginx/ssl/server.key 4096
openssl genrsa -out docker/mosquitto/ssl/server.key 4096

# Generate server certificate signing request
echo "📋 Generating server certificate request..."
openssl req -new -key docker/nginx/ssl/server.key -out docker/nginx/ssl/server.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL"
openssl req -new -key docker/mosquitto/ssl/server.key -out docker/mosquitto/ssl/server.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL"

# Create extensions file for Subject Alternative Names
cat > docker/nginx/ssl/server.ext << EOF
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
EOF

cp docker/nginx/ssl/server.ext docker/mosquitto/ssl/server.ext

# Generate server certificate signed by CA
echo "✅ Generating server certificate..."
openssl x509 -req -in docker/nginx/ssl/server.csr -CA docker/nginx/ssl/ca.crt -CAkey docker/nginx/ssl/ca.key -CAcreateserial -out docker/nginx/ssl/server.crt -days $DAYS -extensions v3_req -extfile docker/nginx/ssl/server.ext
openssl x509 -req -in docker/mosquitto/ssl/server.csr -CA docker/mosquitto/ssl/ca.crt -CAkey docker/mosquitto/ssl/ca.key -CAcreateserial -out docker/mosquitto/ssl/server.crt -days $DAYS -extensions v3_req -extfile docker/mosquitto/ssl/server.ext

# Generate client certificate for ESP32 (optional, for mutual TLS)
echo "📱 Generating client certificate for ESP32..."
openssl genrsa -out docker/mosquitto/ssl/client.key 2048
openssl req -new -key docker/mosquitto/ssl/client.key -out docker/mosquitto/ssl/client.csr -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=ESP32/CN=ESP32_STATION_001/emailAddress=$EMAIL"
openssl x509 -req -in docker/mosquitto/ssl/client.csr -CA docker/mosquitto/ssl/ca.crt -CAkey docker/mosquitto/ssl/ca.key -CAcreateserial -out docker/mosquitto/ssl/client.crt -days $DAYS

# Clean up CSR files
echo "🧹 Cleaning up temporary files..."
rm -f docker/nginx/ssl/*.csr docker/nginx/ssl/*.ext
rm -f docker/mosquitto/ssl/*.csr docker/mosquitto/ssl/*.ext

# Set appropriate permissions
echo "🔒 Setting certificate permissions..."
chmod 644 docker/nginx/ssl/*.crt
chmod 600 docker/nginx/ssl/*.key
chmod 644 docker/mosquitto/ssl/*.crt
chmod 600 docker/mosquitto/ssl/*.key

# Verify certificates
echo "🔍 Verifying certificates..."
echo ""
echo "=== NGINX Certificate Info ==="
openssl x509 -in docker/nginx/ssl/server.crt -text -noout | grep -E "(Subject|Issuer|Not Before|Not After|DNS|IP Address)"
echo ""
echo "=== MQTT Certificate Info ==="
openssl x509 -in docker/mosquitto/ssl/server.crt -text -noout | grep -E "(Subject|Issuer|Not Before|Not After|DNS|IP Address)"
echo ""

# Create certificate installation instructions
cat > docker/ssl-installation-guide.md << 'EOF'
# SSL Certificate Installation Guide

## Development Certificates Generated

This system now uses self-signed certificates for HTTPS and MQTT TLS.

### Certificate Locations
- **Nginx (Web)**: `docker/nginx/ssl/`
- **MQTT Broker**: `docker/mosquitto/ssl/`

### Trust Certificate in Browser (Development Only)

1. **Chrome/Edge**:
   - Navigate to `https://localhost`
   - Click "Advanced" → "Proceed to localhost (unsafe)"
   - Or import `docker/nginx/ssl/ca.crt` to "Trusted Root Certificate Authorities"

2. **Firefox**:
   - Navigate to `https://localhost`
   - Click "Advanced" → "Accept the Risk and Continue"
   - Or go to Settings → Privacy & Security → Certificates → Import

### ESP32 Configuration

Add these certificates to your ESP32 code:
```cpp
// In weather_station_esp32.ino
const char* ca_cert = R"(
-----BEGIN CERTIFICATE-----
[Content of docker/mosquitto/ssl/ca.crt]
-----END CERTIFICATE-----
)";

// For MQTT TLS connection
WiFiClientSecure espClient;
espClient.setCACert(ca_cert);
PubSubClient client(espClient);
```

### Production Deployment

⚠️ **Important**: These are self-signed certificates for development only.

For production:
1. Use Let's Encrypt: `certbot --nginx -d your-domain.com`
2. Update nginx configuration with real certificates
3. Configure proper DNS and firewall rules

### Certificate Renewal

Development certificates expire in 365 days. Regenerate with:
```bash
./scripts/generate-ssl-certs.sh
docker-compose restart nginx mosquitto
```
EOF

echo ""
echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificate files created:"
echo "   - docker/nginx/ssl/ca.crt (Certificate Authority)"
echo "   - docker/nginx/ssl/server.crt (Web Server Certificate)"
echo "   - docker/nginx/ssl/server.key (Web Server Private Key)"
echo "   - docker/mosquitto/ssl/ca.crt (MQTT CA Certificate)"  
echo "   - docker/mosquitto/ssl/server.crt (MQTT Server Certificate)"
echo "   - docker/mosquitto/ssl/server.key (MQTT Server Private Key)"
echo "   - docker/mosquitto/ssl/client.crt (ESP32 Client Certificate)"
echo ""
echo "📖 See docker/ssl-installation-guide.md for setup instructions"
echo ""
echo "🚀 Ready to start services with SSL/TLS enabled!"
echo "   Run: docker-compose up -d"
echo ""