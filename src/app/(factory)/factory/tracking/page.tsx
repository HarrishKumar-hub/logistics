'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Radio, Activity, Navigation, Truck } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';

interface Trip {
  id: string;
  truckId: string;
  source: string;
  destination: string;
  status: string;
  currentLocation?: { lat: number, lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629 // Center of India
};

export default function FactoryTracking() {
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
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

  // Fetch active trips
  useEffect(() => {
    // For MVP, just pull active trips
    const q = query(
      collection(db, 'trips'), 
      where('status', '==', 'IN_TRANSIT')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips: Trip[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trips.push({
          id: doc.id,
          truckId: data.truckId || 'Unknown Truck',
          source: data.source || '',
          destination: data.destination || '',
          status: data.status,
          currentLocation: data.currentLocation,
        });
      });
      
      setActiveTrips(trips);
      
      // Auto-select first trip or update currently selected trip's location
      if (trips.length > 0) {
        setSelectedTrip(current => {
          if (!current) return trips[0];
          const updated = trips.find(t => t.id === current.id);
          return updated || trips[0];
        });
      } else {
        setSelectedTrip(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Calculate directions when selected trip changes
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
          // Manually fit bounds if map is available
          if (mapRef.current) {
             mapRef.current.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );
  }, [selectedTrip?.source, selectedTrip?.destination, isLoaded]);

  // Truck Icon SVG
  const truckIcon = {
    path: "M4 16c0 1.1.9 2 2 2h1v1c0 1.1.9 2 2 2s2-.9 2-2v-1h6v1c0 1.1.9 2 2 2s2-.9 2-2v-1h1c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-3l-2.4-3.6c-.3-.5-.9-.8-1.6-.8H4c-1.1 0-2 .9-2 2v10zm3.5 2c-.8 0-1.5-.7-1.5-1.5S6.7 15 7.5 15s1.5.7 1.5 1.5S8.3 18 7.5 18zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM4 5h6.5l2 3H4V5z",
    fillColor: "#0f172a", // slate-900
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#ffffff",
    scale: 1.5,
    anchor: isLoaded ? new window.google.maps.Point(12, 12) : undefined,
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-800">
      
      {/* Left Sidebar: Active Shipments */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto z-10 shadow-sm shrink-0">
        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-20">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="text-amber-500 animate-pulse" size={24}/> Factory Radar
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
            Moving Freight ({activeTrips.length})
          </p>
        </div>

        <div className="p-4 space-y-3">
          {activeTrips.length === 0 ? (
            <div className="text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Activity size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No shipments currently in transit.</p>
            </div>
          ) : (
            activeTrips.map((trip) => (
              <div 
                key={trip.id}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedTrip?.id === trip.id 
                    ? 'bg-amber-50 border-amber-200 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                    {trip.truckId}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    <Truck size={12}/> Moving
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mb-4">
                  <span className="truncate">{trip.source}</span>
                  <Navigation size={10} className="text-slate-400 mx-1 shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>

                <button 
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full py-2 text-xs font-bold rounded-lg transition-colors ${
                    selectedTrip?.id === trip.id 
                      ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {selectedTrip?.id === trip.id ? 'Tracking Live' : 'View Live'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Main Area: Google Map */}
      <div className="flex-1 bg-slate-100 relative h-screen">
        {isLoaded ? (
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
            {/* The Route Polyline */}
            {directionsResponse && (
              <DirectionsRenderer 
                directions={directionsResponse}
                options={{ 
                  suppressMarkers: true, 
                  polylineOptions: { 
                    strokeColor: '#f59e0b', // amber-500
                    strokeWeight: 5 
                  } 
                }} 
              />
            )}

            {/* The Moving Truck Marker */}
            {selectedTrip?.currentLocation && (
              <Marker
                position={selectedTrip.currentLocation}
                icon={truckIcon}
                zIndex={100}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <Activity className="animate-spin mr-2" size={24} />
            <span className="font-medium">Initializing Radar...</span>
          </div>
        )}

        {/* Floating Telemetry Overlay (Optional, but adds to the Swiggy tracking feel) */}
        {selectedTrip && isLoaded && (
          <div className="absolute top-6 left-6 bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 z-10 w-64">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Live Telemetry</h3>
            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Truck ID</span>
                <span className="font-mono text-slate-800">{selectedTrip.truckId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-amber-600">In Transit</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
