import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StationMarker, StationStatus } from '../types/stationTypes';

// Configurar iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Función para crear iconos personalizados
const createStationIcon = (
  status: StationStatus, 
  isSelected: boolean, 
  metricValue?: number,
  metric?: string,
  showMetrics?: boolean
) => {
  const size = isSelected ? 35 : 25;
  const statusColors = {
    [StationStatus.ACTIVE]: '#4caf50',
    [StationStatus.MAINTENANCE]: '#ff9800',
    [StationStatus.ERROR]: '#f44336',
    [StationStatus.INACTIVE]: '#9e9e9e'
  };
  
  const color = statusColors[status] || '#9e9e9e';
  const strokeWidth = isSelected ? 3 : 2;
  const strokeColor = isSelected ? '#1976d2' : '#ffffff';
  
  // Crear contenido del marcador
  let content = `<div style="color: white; font-weight: bold; font-size: 12px;">📡</div>`;
  
  if (showMetrics && metricValue !== undefined && metricValue !== null) {
    const displayValue = typeof metricValue === 'number' ? 
      (metric === 'temperature' ? `${metricValue.toFixed(0)}°` :
       metric === 'humidity' ? `${metricValue.toFixed(0)}%` :
       metric === 'pressure' ? `${Math.round(metricValue)}` :
       metricValue.toFixed(0)) : String(metricValue);
    
    content = `<div style="color: white; font-weight: bold; font-size: 10px; text-align: center;">${displayValue}</div>`;
  }

  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" 
              fill="${color}" 
              stroke="${strokeColor}" 
              stroke-width="${strokeWidth}"/>
      <foreignObject x="0" y="0" width="24" height="24">
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
          ${content}
        </div>
      </foreignObject>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

interface MapEventHandlerProps {
  onMapMove?: (center: { lat: number; lng: number }) => void;
  onMapZoom?: (zoom: number) => void;
}

const MapEventHandler: React.FC<MapEventHandlerProps> = ({ onMapMove, onMapZoom }) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      if (onMapMove) {
        const center = map.getCenter();
        onMapMove({ lat: center.lat, lng: center.lng });
      }
    },
    zoomend: () => {
      if (onMapZoom) {
        onMapZoom(map.getZoom());
      }
    }
  });

  return null;
};

interface MultiStationMapClientProps {
  stations: StationMarker[];
  center: { lat: number; lng: number };
  zoom: number;
  selectedStations: string[];
  selectedMetric?: string;
  showMetrics?: boolean;
  onStationClick: (stationId: string) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
  onMapZoom?: (zoom: number) => void;
  translations: {
    weatherStation: string;
    currentConditions: string;
    stationId: string;
    noData: string;
    clickToSelect: string;
    selected: string;
  };
  locale: string;
}

const MultiStationMapClient: React.FC<MultiStationMapClientProps> = ({
  stations,
  center,
  zoom,
  selectedStations,
  selectedMetric,
  showMetrics = true,
  onStationClick,
  onMapMove,
  onMapZoom,
  translations,
  locale
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Actualizar centro del mapa cuando cambian las props
  useEffect(() => {
    if (mapInstance && center) {
      mapInstance.setView([center.lat, center.lng], zoom);
    }
  }, [mapInstance, center, zoom]);

  // Componente para controlar el mapa
  const MapController = () => {
    const map = useMap();
    
    useEffect(() => {
      setMapInstance(map);
      return () => setMapInstance(null);
    }, [map]);

    return (
      <MapEventHandler 
        onMapMove={onMapMove} 
        onMapZoom={onMapZoom} 
      />
    );
  };

  // Obtener valor de métrica para una estación
  const getMetricValue = (station: StationMarker): number | undefined => {
    if (!station.current_data || !selectedMetric) return undefined;
    const value = station.current_data[selectedMetric as keyof typeof station.current_data];
    return typeof value === 'number' ? value : undefined;
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        zoomControl={true}
      >
        <MapController />
        
        {/* Capas base del mapa */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {/* Marcadores de estaciones */}
        {stations.map((station) => {
          const isSelected = selectedStations.includes(station.station_id);
          const metricValue = getMetricValue(station);
          
          return (
            <Marker
              key={station.station_id}
              position={station.position}
              icon={createStationIcon(
                station.metadata.status, 
                isSelected, 
                metricValue,
                selectedMetric,
                showMetrics
              )}
              eventHandlers={{
                click: () => onStationClick(station.station_id),
              }}
            >
              <Popup
                closeButton={true}
                autoClose={false}
                closeOnEscapeKey={true}
                className="station-popup"
              >
                <div dangerouslySetInnerHTML={{ __html: station.popup_content || '' }} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Estilos CSS para los popups */}
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .station-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .station-popup .leaflet-popup-content {
          margin: 12px;
          line-height: 1.4;
        }
        
        .station-popup .leaflet-popup-tip {
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        
        .leaflet-container {
          font-family: inherit;
        }
        
        /* Mejorar la legibilidad de los controles de zoom */
        .leaflet-control-zoom a {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid #ccc !important;
        }
        
        .leaflet-control-zoom a:hover {
          background-color: #f4f4f4 !important;
        }
      `}</style>
    </div>
  );
};

export default MultiStationMapClient;