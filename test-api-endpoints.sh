#!/bin/bash

# Test script to verify all API endpoints are working after security implementation
echo "🧪 Testing API endpoints after security implementation..."

API_KEY="weather-station-device-key-esp32-2024-dev"
STATION_ID="ESP32_STATION_001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    
    echo -e "\n${BLUE}Testing: ${description}${NC}"
    echo "URL: $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -k -s -w "%{http_code}" -H "x-api-key: $API_KEY" "$url")
    else
        response=$(curl -k -s -w "%{http_code}" -X "$method" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" "$url")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - HTTP $http_code"
        echo "Response: $(echo $body | head -c 100)..."
    else
        echo -e "${RED}❌ FAILED${NC} - HTTP $http_code"
        echo "Error: $body"
    fi
}

echo -e "${YELLOW}=== Testing HTTPS endpoints (nginx proxy) ===${NC}"

# Test health endpoint
test_endpoint "GET" "https://localhost/health" "Health check"

# Test weather endpoints
test_endpoint "GET" "https://localhost/api/weather/data/$STATION_ID/latest" "Latest weather data"
test_endpoint "GET" "https://localhost/api/weather/data/$STATION_ID?timeRange=1h" "Historical data (1h)"
test_endpoint "GET" "https://localhost/api/weather/stations" "Weather stations list"

# Test alerts endpoints  
test_endpoint "GET" "https://localhost/api/alerts/$STATION_ID" "Station alerts"
test_endpoint "GET" "https://localhost/api/alerts/summary/$STATION_ID" "Alert summary"

# Test config endpoints (these require JWT, will fail with 401 - expected)
echo -e "\n${YELLOW}=== Testing JWT-protected endpoints (expect 401) ===${NC}"
test_endpoint "GET" "https://localhost/api/weather/data/$STATION_ID/summary" "Weather summary (JWT required)"
test_endpoint "POST" "https://localhost/api/config/command/$STATION_ID" "Config command (JWT required)"

echo -e "\n${YELLOW}=== Testing HTTP fallback endpoints ===${NC}"

# Test direct backend access (fallback)
test_endpoint "GET" "http://localhost:5002/health" "Health check (direct backend)"
test_endpoint "GET" "http://localhost:5002/api/weather/data/$STATION_ID/latest" "Latest data (direct backend)"

echo -e "\n${BLUE}=== Summary ===${NC}"
echo "✅ Green tests: Working correctly"
echo "❌ Red tests: Need investigation"  
echo "🟡 401 Unauthorized: Expected for JWT-protected endpoints"
echo ""
echo "If you see mostly green results, the security implementation is working correctly!"
echo "Frontend issues are likely due to:"
echo "1. Frontend not restarted after .env.local changes"
echo "2. Browser cache (try hard refresh: Ctrl+F5)"
echo "3. Self-signed certificate warnings (click 'Accept Risk')"