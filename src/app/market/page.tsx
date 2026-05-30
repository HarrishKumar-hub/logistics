"use client";

import { useState } from 'react';
import { Package, MapPin, CheckCircle2, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

export default function LoadMarket() {
  const [selectedLoad, setSelectedLoad] = useState<null | {
    id: string;
    origin: string;
    dest: string;
    material: string;
    weight: string;
    price: number;
    isBackhaul: boolean;
  }>(null);
  const [lorryId, setLorryId] = useState('');

  const availableLoads = [
    { id: "LD-8891", origin: "Surat, GJ", dest: "Salem, TN", material: "Textile Yarn", weight: "21 Tons", price: 42000, isBackhaul: true },
    { id: "LD-8892", origin: "Coimbatore, TN", dest: "Mumbai, MH", material: "Machinery", weight: "18 Tons", price: 55000, isBackhaul: false },
    { id: "LD-8893", origin: "Salem, TN", dest: "Chennai, TN", material: "Sago Bags", weight: "25 Tons", price: 18000, isBackhaul: false },
  ];

  const handleAcceptLoad = async () => {
    if (!selectedLoad || !lorryId) return;

    await addDoc(collection(db, 'trips'), {
      loadId: selectedLoad.id,
      lorryId,
      originName: selectedLoad.origin,
      destinationName: selectedLoad.dest,
      material: selectedLoad.material,
      weight: selectedLoad.weight,
      price: selectedLoad.price,
      status: 'IN_TRANSIT',
      statusReason: 'Accepted from load market.',
      timestamp: new Date().toISOString(),
    });

    setSelectedLoad(null);
    setLorryId('');
  };

  return (
    <>
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-steel tracking-tight">Load Market</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableLoads.map((load, index) => (
          <div key={index} className="bg-surface rounded-2xl border border-border overflow-hidden flex flex-col hover:border-gold transition-all group shadow-sm">
            
            {/* Backhaul Badge */}
            {load.isBackhaul && (
              <div className="bg-gold text-white text-center py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <CheckCircle2 size={14} />
                Perfect Backhaul Match
              </div>
            )}

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
                  <p className="text-steel font-medium">From: <span className="font-bold">{load.origin}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-steel/30" />
                  <p className="text-steel font-medium">To: <span className="font-bold">{load.dest}</span></p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center text-sm font-bold text-steel/60">
                <span>{load.material}</span>
                <span>{load.weight}</span>
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

    </div>

    {selectedLoad && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-steel">Accept Load</h2>
              <p className="text-sm text-steel/50">Assign to which Lorry ID?</p>
            </div>
            <button onClick={() => setSelectedLoad(null)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="text-sm text-steel/70">
              <p><span className="font-bold text-steel">Load:</span> {selectedLoad.id}</p>
              <p><span className="font-bold text-steel">Route:</span> {selectedLoad.origin} → {selectedLoad.dest}</p>
              <p><span className="font-bold text-steel">Amount:</span> ₹{selectedLoad.price.toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lorry ID</label>
              <input
                value={lorryId}
                onChange={(e) => setLorryId(e.target.value)}
                placeholder="e.g. TN-52-AF-9898"
                className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
            <button
              onClick={() => setSelectedLoad(null)}
              className="px-4 py-2 rounded-lg border border-border text-steel font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptLoad}
              className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-white font-semibold"
            >
              Confirm Assign
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
