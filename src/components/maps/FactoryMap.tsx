'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { Activity } from 'lucide-react';
import { Trip } from '@/app/(factory)/tracking/page';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629 // Center of India
};

interface FactoryMapProps {
  selectedTrip: Trip | null;
}

export default function FactoryMap({ selectedTrip }: FactoryMapProps) {
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!selectedTrip || !selectedTrip.source || !selectedTrip.destination || !isLoaded) {
      setDirectionsResponse(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: selectedTrip.source,
        destination: selectedTrip.destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          if (mapRef.current) {
             mapRef.current.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );
  }, [selectedTrip?.source, selectedTrip?.destination, isLoaded]);

  const truckIcon = {
    path: "M4 16c0 1.1.9 2 2 2h1v1c0 1.1.9 2 2 2s2-.9 2-2v-1h6v1c0 1.1.9 2 2 2s2-.9 2-2v-1h1c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-3l-2.4-3.6c-.3-.5-.9-.8-1.6-.8H4c-1.1 0-2 .9-2 2v10zm3.5 2c-.8 0-1.5-.7-1.5-1.5S6.7 15 7.5 15s1.5.7 1.5 1.5S8.3 18 7.5 18zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM4 5h6.5l2 3H4V5z",
    fillColor: "#0f172a", // slate-900
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#ffffff",
    scale: 1.5,
    anchor: isLoaded && typeof window !== 'undefined' && window.google ? new window.google.maps.Point(12, 12) : undefined,
  };

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50">
        <Activity className="animate-spin mr-3 text-amber-500" size={24} />
        <span className="font-bold uppercase tracking-widest text-sm text-slate-500">Initializing Radar...</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={selectedTrip?.currentLocation || defaultCenter}
      zoom={5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {directionsResponse && (
        <DirectionsRenderer 
          directions={directionsResponse}
          options={{ 
            suppressMarkers: true, 
            polylineOptions: { 
              strokeColor: '#f59e0b', // amber-500
              strokeWeight: 5,
              strokeOpacity: 0.8
            } 
          }} 
        />
      )}

      {selectedTrip?.currentLocation && (
        <Marker
          position={selectedTrip.currentLocation}
          icon={truckIcon}
          zIndex={100}
        />
      )}
    </GoogleMap>
  );
}
