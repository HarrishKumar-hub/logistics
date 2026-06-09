'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Radio, Truck, Activity } from 'lucide-react';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';

const DEFAULT_CENTER = {
  lat: 11.6643,
  lng: 78.1460
};

interface ActiveVehicle {
  id: string;
  truckId: string;
  driverName: string;
  source: string;
  destination: string;
  imei?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function FleetTracker() {
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<ActiveVehicle | null>(null);
  
  // Directions state
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true, // Hides cluttered map controls for a clean UI
    zoomControl: true,
    styles: [
      // Minimalist map styling to match the brand
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] }, // slate-50
      { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] }, // slate-500
      { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fde68a' }] }, // amber-200
    ]
  }), []);

  // Real-Time Firestore Synced Stream
  useEffect(() => {
    const activeQuery = query(
      collection(db, 'trips'),
      where('status', '==', 'IN_TRANSIT')
    );
    
    const unsubscribe = onSnapshot(activeQuery, (snapshot) => {
      const vehicles: ActiveVehicle[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // Resolve coordinates from either top-level lat/lng or currentLocation object
        let lat = 11.6643;
        let lng = 78.1460;
        if (data.lat !== undefined && data.lng !== undefined) {
          lat = Number(data.lat);
          lng = Number(data.lng);
        } else if (data.currentLocation?.lat !== undefined && data.currentLocation?.lng !== undefined) {
          lat = Number(data.currentLocation.lat);
          lng = Number(data.currentLocation.lng);
        } else {
          // Stable fallback coordinate based on ID to avoid jumping
          let hash = 0;
          for (let i = 0; i < doc.id.length; i++) {
            hash = doc.id.charCodeAt(i) + ((hash << 5) - hash);
          }
          lat = 11.6643 + ((hash % 100) / 1000);
          lng = 78.1460 + (((hash >> 8) % 100) / 1000);
        }

        // Parse route source and destination from details
        let source = data.source || 'Sankari';
        let destination = data.destination || data.destinationName || '';
        
        if (data.statusReason) {
          if (data.statusReason.includes('LD-8891')) {
            source = 'Surat';
            destination = 'Salem';
          } else if (data.statusReason.includes('LD-8892')) {
            source = 'Coimbatore';
            destination = 'Mumbai';
          } else if (data.statusReason.includes('LD-8893')) {
            source = 'Salem';
            destination = 'Chennai';
          }
        }

        const cleanDest = destination.replace(', Tamil Nadu', '').replace(', TN', '').replace(', MH', '').replace(', GJ', '');
        const cleanSource = source.replace(', Tamil Nadu', '').replace(', TN', '').replace(', MH', '').replace(', GJ', '');

        vehicles.push({
          id: doc.id,
          truckId: data.truckId || data.lorryId || 'Unknown',
          driverName: data.driverName || 'Unassigned',
          source: cleanSource,
          destination: cleanDest,
          imei: data.imei || '',
          currentLocation: { lat, lng }
        });
      });
      setActiveVehicles(vehicles);
    });

    return () => unsubscribe();
  }, []);

  // Directions Route Calculation Hook
  useEffect(() => {
    if (!selectedVehicle) {
      setDirections(null);
      return;
    }
    if (typeof window === 'undefined' || !window.google) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: selectedVehicle.source, // e.g., "Coimbatore"
        destination: selectedVehicle.destination, // e.g., "Mumbai"
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          // Automatically zoom and pan to fit the entire route
          if (mapInstance) {
            mapInstance.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error("Directions request failed due to " + status);
          alert(`Google Maps Directions failed: ${status}. Check console for details.`);
        }
      }
    );
  }, [selectedVehicle, mapInstance]);

  // Fallback center coordinates
  const mapCenter = useMemo(() => {
    if (selectedVehicle?.currentLocation) {
      return selectedVehicle.currentLocation;
    }
    return DEFAULT_CENTER;
  }, [selectedVehicle]);

  return (
    <div className="w-full h-[calc(100vh-80px-4rem)] rounded-2xl border border-slate-200 overflow-hidden flex bg-white font-sans shadow-sm">
      
      {/* Left Sidebar: Active GPS Units */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full z-10 overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Radio className="text-amber-500 animate-pulse" size={24}/> Global Radar
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 font-mono">
            Transmitting Units ({activeVehicles.length})
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {activeVehicles.length === 0 ? (
            <div className="text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Activity size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No live hardware signals detected.</p>
            </div>
          ) : (
            activeVehicles.map((vehicle) => (
              <button 
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedVehicle?.id === vehicle.id 
                    ? 'bg-amber-50 border-amber-300 shadow-xs' 
                    : 'bg-white border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    {vehicle.truckId.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-mono">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Driver</span>
                    <span className="font-bold text-slate-700">{vehicle.driverName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">IMEI Link</span>
                    <span className="font-mono text-slate-500">{vehicle.imei || 'PENDING'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="truncate">{vehicle.source}</span>
                  <Navigation size={10} className="text-amber-500 shrink-0 rotate-90" />
                  <span className="truncate">{vehicle.destination}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Area: Google Map Canvas */}
      <div className="flex-1 relative bg-slate-100">
        {!isLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <Radio size={48} className="animate-pulse mb-4 opacity-50 text-amber-500" />
            <p className="font-bold text-sm tracking-wide uppercase font-mono">Initializing Satellite Uplink...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            zoom={selectedVehicle ? 12 : 7}
            center={mapCenter}
            options={mapOptions}
            onLoad={(map) => setMapInstance(map)} // Capture map instance for fitBounds
          >
            {/* 1. Draw the Swiggy-style Route Line */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true, // Hides default A and B pins
                  polylineOptions: {
                    strokeColor: '#f59e0b', // Brand gold polyline
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            )}

            {/* 2. Draw active unselected vehicles as smaller markers */}
            {activeVehicles.map(vehicle => (
              vehicle.currentLocation && selectedVehicle?.id !== vehicle.id && (
                <MarkerF
                  key={vehicle.id}
                  position={vehicle.currentLocation}
                  onClick={() => setSelectedVehicle(vehicle)}
                  icon={typeof window !== 'undefined' && window.google ? {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#64748b', // Slate gray for other fleet units
                    fillOpacity: 0.8,
                    strokeWeight: 1.5,
                    strokeColor: '#ffffff',
                    scale: 5,
                  } : undefined}
                />
              )
            ))}

            {/* 3. Draw the Live Selected Truck Marker */}
            {selectedVehicle?.currentLocation && (
              <MarkerF
                position={selectedVehicle.currentLocation}
                icon={typeof window !== 'undefined' && window.google ? {
                  // SVG Path for a heavy transport truck
                  path: "M20,8h-3V4c0-1.1-0.9-2-2-2H3C1.9,2,1,2.9,1,4v11h2c0,1.66,1.34,3,3,3s3-1.34,3-3h6c0,1.66,1.34,3,3,3s3-1.34,3-3h2v-5 L20,8z M6,16.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S6.83,16.5,6,16.5z M18,16.5c-0.83,0-1.5-0.67-1.5-1.5 s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S18.83,16.5,18,16.5z M17,12h-4V4h7V12z",
                  fillColor: '#f59e0b', // Gold truck marker
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: '#ffffff',
                  scale: 1.5,
                  anchor: new window.google.maps.Point(12, 12),
                } : undefined}
              />
            )}

            {/* Show Info Window above the selected vehicle */}
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
        )}
      </div>

    </div>
  );
}
