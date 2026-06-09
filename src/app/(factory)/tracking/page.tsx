'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Radio, Activity, Navigation, Truck, Package } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';

interface Trip {
  id: string;
  truckId: string;
  source: string;
  destination: string;
  cargo: string;
  tonnage: number;
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
  const [isMounted, setIsMounted] = useState(false);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    // For MVP, just pull active trips. We will add strict factoryId filtering later.
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
          source: data.source || 'Origin',
          destination: data.destination || 'Destination',
          cargo: data.cargo || 'General Freight',
          tonnage: data.tons || 0,
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
          // Manually fit bounds to encompass the entire route
          if (mapRef.current) {
             mapRef.current.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );
  }, [selectedTrip?.source, selectedTrip?.destination, isLoaded]);

  // Heavy Truck Icon SVG
  const truckIcon = {
    path: "M4 16c0 1.1.9 2 2 2h1v1c0 1.1.9 2 2 2s2-.9 2-2v-1h6v1c0 1.1.9 2 2 2s2-.9 2-2v-1h1c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-3l-2.4-3.6c-.3-.5-.9-.8-1.6-.8H4c-1.1 0-2 .9-2 2v10zm3.5 2c-.8 0-1.5-.7-1.5-1.5S6.7 15 7.5 15s1.5.7 1.5 1.5S8.3 18 7.5 18zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM4 5h6.5l2 3H4V5z",
    fillColor: "#0f172a", // slate-900
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#ffffff",
    scale: 1.5,
    anchor: isLoaded ? new window.google.maps.Point(12, 12) : undefined,
  };

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <p className="text-sm font-bold tracking-widest text-slate-400 uppercase animate-pulse">
          Initializing Satellite Uplink...
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Left Sidebar: Active Shipments */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Radio className="text-amber-500 animate-pulse" size={24}/> Active Dispatches
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
            Moving Freight ({activeTrips.length})
          </p>
        </div>

        <div className="p-4 space-y-3">
          {activeTrips.length === 0 ? (
            <div className="text-center p-10 text-slate-400 border border-dashed border-slate-200 rounded-xl m-2 bg-slate-50/50">
              <Activity size={28} className="mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-sm font-medium">No active dispatches found.</p>
            </div>
          ) : (
            activeTrips.map((trip) => (
              <div 
                key={trip.id}
                className={`w-full text-left p-5 rounded-xl border transition-all ${
                  selectedTrip?.id === trip.id 
                    ? 'bg-amber-50 border-amber-200 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-100/50 px-2 py-1 rounded">
                    <Truck size={12}/> Moving
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {trip.truckId}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-900 font-bold mb-2">
                  <span className="truncate">{trip.source}</span>
                  <Navigation size={12} className="text-slate-400 mx-1 shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mb-5">
                  <Package size={14} className="text-slate-400" />
                  <span className="truncate">{trip.cargo}</span>
                  {trip.tonnage > 0 && <span className="text-slate-400">• {trip.tonnage} Tons</span>}
                </div>

                <button 
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors border ${
                    selectedTrip?.id === trip.id 
                      ? 'bg-white text-amber-600 border-amber-300 shadow-sm'
                      : 'bg-slate-50 text-amber-600 border-slate-200 hover:border-amber-300 hover:bg-white'
                  }`}
                >
                  {selectedTrip?.id === trip.id ? 'Tracking Live...' : 'View Live Radar'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Main Area: Google Map */}
      <div className="flex-1 bg-slate-100 relative h-full">
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
                    strokeWeight: 5,
                    strokeOpacity: 0.8
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50">
            <Activity className="animate-spin mr-3 text-amber-500" size={24} />
            <span className="font-bold uppercase tracking-widest text-sm text-slate-500">Initializing Radar...</span>
          </div>
        )}
      </div>

    </div>
  );
}
