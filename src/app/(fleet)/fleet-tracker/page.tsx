'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Navigation, Radio, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';

const FleetMap = dynamic(() => import('@/components/maps/FleetMap'), { ssr: false });

export interface ActiveVehicle {
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

export default function FleetTracker() {
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<ActiveVehicle | null>(null);

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

      {/* Right Area: Dynamic Google Map Canvas */}
      <div className="flex-1 relative bg-slate-100">
        <FleetMap 
          activeVehicles={activeVehicles} 
          selectedVehicle={selectedVehicle} 
          setSelectedVehicle={setSelectedVehicle} 
        />
      </div>

    </div>
  );
}
