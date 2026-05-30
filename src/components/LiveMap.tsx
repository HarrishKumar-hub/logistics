'use client';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Truck } from 'lucide-react';

interface LiveMapProps {
  trucks: any[];
}

export default function LiveMap({ trucks }: LiveMapProps) {
  // Replace with your Mapbox Public Token
  const MAPBOX_TOKEN = 'pk.eyJ1IjoiaGFycmlzaGstbG9naXN0aWMiLCJhIjoiY204dzZ6eGpwMDJlbzJycXF4Nmg4bmE3ciJ9.xxx'; // Replace the 'xxx' if you have one, or use a placeholder

  return (
    <div className="w-full h-full min-h-[500px] relative">
      <Map
        initialViewState={{
          longitude: 78.1460, // Default to Tamil Nadu area
          latitude: 11.6643,
          zoom: 6
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11" // Minimalist light style
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {trucks.map((truck) => (
          <Marker
            key={truck.id}
            longitude={truck.lng || 78.1460 + (Math.random() - 0.5)}
            latitude={truck.lat || 11.6643 + (Math.random() - 0.5)}
            anchor="bottom"
          >
            <div className="group relative cursor-pointer">
              {/* Ping Animation for issues */}
              {(truck.status === 'DELAYED' || truck.status === 'BROKEN_DOWN' || truck.status === 'BREAKDOWN' || truck.status === 'Breakdown') && (
                <div className="absolute inset-0 animate-ping bg-red-500 rounded-full opacity-75" />
              )}
              
              <div className={`relative p-2 rounded-full border shadow-xl transition-transform group-hover:scale-125
                ${(truck.status === 'DELAYED' || truck.status === 'BROKEN_DOWN' || truck.status === 'BREAKDOWN' || truck.status === 'Breakdown') ? 'bg-red-500 text-white border-red-400' : 'bg-gold text-white border-gold-hover'}`}>
                <Truck size={16} />
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white text-steel p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border">
                <p className="text-xs font-bold uppercase text-steel/40 mb-1">{truck.id}</p>
                <p className={`text-sm font-bold mb-1 ${(truck.status === 'DELAYED' || truck.status === 'BROKEN_DOWN' || truck.status === 'BREAKDOWN' || truck.status === 'Breakdown') ? 'text-red-600' : 'text-gold'}`}>
                  {truck.status?.replace('_', ' ')}
                </p>
                <p className="text-xs font-medium text-steel/60 line-clamp-2">
                  {truck.statusReason || 'On Route'}
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
