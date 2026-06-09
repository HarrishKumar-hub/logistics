'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { X, Package, MapPin, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const AVAILABLE_LOADS = [
  { id: 'LD-8891', price: 42000, from: 'Surat, GJ', to: 'Salem, Tamil Nadu', cargo: 'Textile Yarn', tons: 21, lat: 11.6643, lng: 78.1460, docId: '' },
  { id: 'LD-8892', price: 55000, from: 'Coimbatore, TN', to: 'Mumbai, MH', cargo: 'Machinery', tons: 18, lat: 19.0760, lng: 72.8777, docId: '' },
  { id: 'LD-8893', price: 18000, from: 'Salem, TN', to: 'Chennai, Tamil Nadu', cargo: 'Sago Bags', tons: 25, lat: 13.0827, lng: 80.2707, docId: '' },
];

type Load = (typeof AVAILABLE_LOADS)[number];

interface AssignVehicleModalProps {
  load: Load;
  onClose: () => void;
}

export function AssignVehicleModal({ load, onClose }: AssignVehicleModalProps) {
  // UI States: 'idle' | 'submitting' | 'success' | 'error'
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [lorryId, setLorryId] = useState('');
  const [driverName, setDriverName] = useState('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lorryId || !driverName) return;
    
    setStatus('submitting');

    try {
      // Create dispatch record in 'trips' collection
      await addDoc(collection(db, 'trips'), {
        truckId: lorryId.toLowerCase(),
        lorryId: lorryId.toLowerCase(), // keep lorryId for backward compatibility
        driverName: driverName,
        source: load.from,
        destination: load.to,
        destinationName: load.to, // keep destinationName for backward compatibility
        cargo: load.cargo,
        freightValue: Number(load.price),
        tonnage: Number(load.tons || 21),
        status: 'IN_TRANSIT',
        statusReason: `Hauling ${load.tons || 21} Tons of ${load.cargo} (Load ${load.id})`,
        lat: load.lat,
        lng: load.lng,
        manifestUrl: '',
        timestamp: new Date().toISOString()
      });

      // Update original market load state to claimed
      if (load.docId) {
        await updateDoc(doc(db, 'market_loads', load.docId), {
          status: 'IN_TRANSIT'
        });
      }

      setStatus('success');

      // Gracefully auto-close modal after operator sees confirmation
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error("Network write failed:", err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all">
        
        {/* SUCCESS STATE UI LAYOUT */}
        {status === 'success' ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 animate-fade-in py-12">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner scale-up">
              <CheckCircle2 size={36} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Dispatch Authorized</h3>
              <p className="text-sm text-slate-400 mt-1">Vehicle ledger updated successfully.</p>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded border border-slate-100">
              Syncing Ledger to Live Radar...
            </div>
          </div>
        ) : (
          /* STANDARD DISPATCH FORM (IDLE & SUBMITTING STATES) */
          <form onSubmit={handleAssign}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Assign Vehicle</h3>
                <p className="text-xs text-slate-400 font-medium">{load.from} → {load.to}</p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs font-bold text-slate-500">Contract Value: <span className="text-slate-800 font-black">₹{load.price?.toLocaleString('en-IN')}</span></div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lorry ID</label>
                <input 
                  type="text" 
                  value={lorryId}
                  onChange={(e) => setLorryId(e.target.value)}
                  placeholder="e.g. tn45"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-amber-500 bg-transparent"
                  disabled={status === 'submitting'}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Name</label>
                <input 
                  type="text" 
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. harri"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-amber-500 bg-transparent"
                  disabled={status === 'submitting'}
                  required
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-500" />
                    Writing to Network...
                  </>
                ) : (
                  'Confirm & Deploy Fleet'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ERROR FALLBACK */}
        {status === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2 border-t border-red-100">
            <AlertTriangle size={14} /> Network update interrupted. Please check database connection rules.
          </div>
        )}

      </div>
    </div>
  );
}

export default function LoadMarket() {
  const router = useRouter();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  return (
    <div className="space-y-8 relative">
      <h1 className="text-3xl font-bold text-steel tracking-tight">Load Market</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_LOADS.map((load) => (
          <div key={load.id} className="bg-surface rounded-2xl border border-border overflow-hidden flex flex-col hover:border-gold transition-all group shadow-sm">
            <div className="p-6 space-y-6 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-steel/30 uppercase">Load ID: {load.id}</p>
                  <p className="text-2xl font-bold text-steel">₹{load.price.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-10 w-10 bg-pearl rounded-lg flex items-center justify-center text-gold border border-border">
                  <Package size={20} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gold" />
                  <p className="text-steel font-medium">From: <span className="font-bold">{load.from}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-steel/30" />
                  <p className="text-steel font-medium">To: <span className="font-bold">{load.to}</span></p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center text-sm font-bold text-steel/60">
                <span>{load.cargo}</span>
                <span>{load.tons} Tons</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedLoad(load)}
              className="w-full bg-steel text-white py-4 font-bold active:bg-gold transition-colors group-hover:bg-gold flex items-center justify-center gap-2"
            >
              Accept Load
            </button>
          </div>
        ))}
      </div>

      {selectedLoad && (
        <AssignVehicleModal
          load={selectedLoad}
          onClose={() => {
            setSelectedLoad(null);
            router.push('/fleet');
          }}
        />
      )}
    </div>
  );
}
