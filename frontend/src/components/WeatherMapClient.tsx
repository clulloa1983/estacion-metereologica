import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WeatherData {
  station_id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
  pm25?: number;
  pm10?: number;
  uv_index?: number;
  battery_voltage?: number;
  timestamp: string;
}

interface WeatherMapClientProps {
  coordinates: { lat: number; lng: number };
  stationId: string;
  currentData: WeatherData | null;
}

// Configurar iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear icono personalizado para la estación meteorológica
const weatherStationIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1779/1779940.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const WeatherMapClient: React.FC<WeatherMapClientProps> = ({ coordinates, stationId, currentData }) => {
  return (
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
    >
      <LayersControl position="topright">
        {/* Capa Satélite */}
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        
        {/* Capa Híbrida (por defecto) */}
        <LayersControl.BaseLayer checked name="Híbrido">
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution=''
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
          </>
        </LayersControl.BaseLayer>
        
        {/* Capa Calles */}
        <LayersControl.BaseLayer name="Calles">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        
        {/* Capa Topográfica */}
        <LayersControl.BaseLayer name="Topográfico">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      
      <Marker 
        position={[coordinates.lat, coordinates.lng]}
        icon={weatherStationIcon}
      >
        <Popup 
          maxWidth={280}
          minWidth={250}
          offset={[0, -10]}
          closeButton={true}
          autoClose={false}
          keepInView={true}
          autoPan={true}
          autoPanPadding={[20, 20]}
        >
          <div style={{ padding: '8px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              borderBottom: '1px solid #eee',
              paddingBottom: '4px'
            }}>
              🏠 Estación Meteorológica
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              ID: {stationId}
            </div>
            
            {currentData && (
              <div>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px', 
                  marginBottom: '6px',
                  color: '#333'
                }}>
                  📊 Condiciones Actuales:
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '3px' }}>
                    🌡️ <strong>{currentData?.temperature?.toFixed(1) ?? 'N/A'}°C</strong>
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    💧 {currentData?.humidity?.toFixed(0) ?? 'N/A'}%
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    🌀 {currentData?.pressure?.toFixed(1) ?? 'N/A'} hPa
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    💨 {currentData?.wind_speed?.toFixed(1) ?? 'N/A'} km/h
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    🌧️ {currentData?.rainfall?.toFixed(1) ?? 'N/A'} mm
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '10px', 
                  color: '#888',
                  borderTop: '1px solid #eee',
                  paddingTop: '4px',
                  marginTop: '6px'
                }}>
                  🕒 {currentData?.timestamp ? new Date(currentData.timestamp).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </div>
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default WeatherMapClient;