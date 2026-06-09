'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Radio, Activity, Navigation, Truck, Package } from 'lucide-react';
import dynamic from 'next/dynamic';

const FactoryMap = dynamic(() => import('@/components/maps/FactoryMap'), { ssr: false });

export interface Trip {
  id: string;
  truckId: string;
  source: string;
  destination: string;
  cargo: string;
  tonnage: number;
  status: string;
  currentLocation?: { lat: number, lng: number };
}

export default function FactoryTracking() {
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

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

      {/* Right Main Area: Dynamic Google Map */}
      <div className="flex-1 bg-slate-100 relative h-full">
        <FactoryMap selectedTrip={selectedTrip} />
      </div>

    </div>
  );
}
