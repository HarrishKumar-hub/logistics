'use client';
import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import { Radio } from 'lucide-react';
import { ActiveVehicle } from '@/app/(fleet)/fleet-tracker/page';

const DEFAULT_CENTER = {
  lat: 11.6643,
  lng: 78.1460
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface FleetMapProps {
  activeVehicles: ActiveVehicle[];
  selectedVehicle: ActiveVehicle | null;
  setSelectedVehicle: (vehicle: ActiveVehicle | null) => void;
}

export default function FleetMap({ activeVehicles, selectedVehicle, setSelectedVehicle }: FleetMapProps) {
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fde68a' }] },
    ]
  }), []);

  useEffect(() => {
    if (!selectedVehicle) {
      setDirections(null);
      return;
    }
    if (typeof window === 'undefined' || !window.google) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: selectedVehicle.source,
        destination: selectedVehicle.destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          if (mapInstance) {
            mapInstance.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error("Directions request failed due to " + status);
        }
      }
    );
  }, [selectedVehicle, mapInstance]);

  const mapCenter = useMemo(() => {
    if (selectedVehicle?.currentLocation) {
      return selectedVehicle.currentLocation;
    }
    return DEFAULT_CENTER;
  }, [selectedVehicle]);

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
        <Radio size={48} className="animate-pulse mb-4 opacity-50 text-amber-500" />
        <p className="font-bold text-sm tracking-wide uppercase font-mono">Initializing Satellite Uplink...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      zoom={selectedVehicle ? 12 : 7}
      center={mapCenter}
      options={mapOptions}
      onLoad={(map) => setMapInstance(map)}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#f59e0b',
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          }}
        />
      )}

      {activeVehicles.map(vehicle => (
        vehicle.currentLocation && selectedVehicle?.id !== vehicle.id && (
          <MarkerF
            key={vehicle.id}
            position={vehicle.currentLocation}
            onClick={() => setSelectedVehicle(vehicle)}
            icon={typeof window !== 'undefined' && window.google ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#64748b',
              fillOpacity: 0.8,
              strokeWeight: 1.5,
              strokeColor: '#ffffff',
              scale: 5,
            } : undefined}
          />
        )
      ))}

      {selectedVehicle?.currentLocation && (
        <MarkerF
          position={selectedVehicle.currentLocation}
          icon={typeof window !== 'undefined' && window.google ? {
            path: "M20,8h-3V4c0-1.1-0.9-2-2-2H3C1.9,2,1,2.9,1,4v11h2c0,1.66,1.34,3,3,3s3-1.34,3-3h6c0,1.66,1.34,3,3,3s3-1.34,3-3h2v-5 L20,8z M6,16.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S6.83,16.5,6,16.5z M18,16.5c-0.83,0-1.5-0.67-1.5-1.5 s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S18.83,16.5,18,16.5z M17,12h-4V4h7V12z",
            fillColor: '#f59e0b',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff',
            scale: 1.5,
            anchor: new window.google.maps.Point(12, 12),
          } : undefined}
        />
      )}

      {selectedVehicle && selectedVehicle.currentLocation && (
        <InfoWindowF
          position={selectedVehicle.currentLocation}
          onCloseClick={() => setSelectedVehicle(null)}
        >
          <div className="p-2 text-center min-w-[120px] text-slate-800">
            <h3 className="font-black text-slate-800 text-sm mb-1">{selectedVehicle.truckId.toUpperCase()}</h3>
            <p className="text-xs text-slate-500 font-semibold mb-2">{selectedVehicle.source} → {selectedVehicle.destination}</p>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider font-mono">
              {Math.round(selectedVehicle.currentLocation.lat * 1000) / 1000}, {Math.round(selectedVehicle.currentLocation.lng * 1000) / 1000}
            </span>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
