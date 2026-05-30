'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Package, MapPin } from 'lucide-react';

const AVAILABLE_LOADS = [
  { id: 'LD-8891', price: 42000, from: 'Surat, GJ', to: 'Salem, Tamil Nadu', cargo: 'Textile Yarn', tons: 21, lat: 11.6643, lng: 78.1460 },
  { id: 'LD-8892', price: 55000, from: 'Coimbatore, TN', to: 'Mumbai, MH', cargo: 'Machinery', tons: 18, lat: 19.0760, lng: 72.8777 },
  { id: 'LD-8893', price: 18000, from: 'Salem, TN', to: 'Chennai, Tamil Nadu', cargo: 'Sago Bags', tons: 25, lat: 13.0827, lng: 80.2707 },
];

type Load = (typeof AVAILABLE_LOADS)[number];

export default function LoadMarket() {
  const router = useRouter();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [lorryId, setLorryId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAcceptLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoad || !lorryId || !driverName) return;
    setIsProcessing(true);

    try {
      await addDoc(collection(db, 'trips'), {
        status: 'IN_TRANSIT',
        driverName,
        lorryId,
        destinationName: selectedLoad.to,
        statusReason: `Hauling ${selectedLoad.tons} Tons of ${selectedLoad.cargo} (Load ${selectedLoad.id})`,
        lat: selectedLoad.lat,
        lng: selectedLoad.lng,
        manifestUrl: '',
        timestamp: new Date().toISOString(),
      });

      setSelectedLoad(null);
      setLorryId('');
      setDriverName('');
      router.push('/fleet?view=map');
    } catch (err) {
      console.error('Error accepting load:', err);
      setIsProcessing(false);
    }
  };

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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-steel">Assign Vehicle</h2>
                <p className="text-sm text-steel/50">{selectedLoad.from} → {selectedLoad.to}</p>
              </div>
              <button onClick={() => setSelectedLoad(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAcceptLoad} className="px-6 py-5 space-y-4">
              <div className="text-sm text-steel/70">
                <p><span className="font-bold text-steel">Contract:</span> ₹{selectedLoad.price.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lorry ID</label>
                <input
                  value={lorryId}
                  onChange={(e) => setLorryId(e.target.value)}
                  placeholder="TN-52-..."
                  className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Driver Name</label>
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold py-4 transition-colors text-sm"
              >
                {isProcessing ? 'Writing to Network...' : 'Confirm Assignment & Track'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
