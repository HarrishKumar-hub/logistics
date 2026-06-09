'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { MapPin, Package, Weight, IndianRupee, CheckCircle2 } from 'lucide-react';

export default function FactoryLoadGenerator() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    cargo: '',
    tonnage: '',
    expectedRate: ''
  });

  const handleCreateLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source || !formData.destination || !formData.cargo || !formData.tonnage || !formData.expectedRate) return;
    
    setIsProcessing(true);
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'market_loads'), {
        from: formData.source,
        to: formData.destination,
        cargo: formData.cargo,
        tons: Number(formData.tonnage),
        price: Number(formData.expectedRate),
        status: 'AVAILABLE',
        factoryId: 'TST_FACTORY_01',
        createdAt: new Date().toISOString()
      });

      // Clear form
      setFormData({
        source: '',
        destination: '',
        cargo: '',
        tonnage: '',
        expectedRate: ''
      });
      
      // Show premium green success message
      setSuccessMessage('Contract broadcasted to TST Fleet Network.');
      
      // Optional: Clear message after a few seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error("Error creating load contract:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Factory Load Generator</h1>
          <p className="text-slate-500 mt-1">Post freight to the live market network.</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="text-green-600" size={24} />
            <p className="text-green-800 font-medium tracking-wide">{successMessage}</p>
          </div>
        )}

        {/* The Generator Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleCreateLoad} className="p-8 space-y-8">
            
            {/* Routing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <MapPin size={14} className="text-slate-400" /> Source
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Salem"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  className="w-full border-b-2 border-slate-200 py-2 font-medium focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-slate-300 text-slate-800" 
                  required 
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <MapPin size={14} className="text-amber-500" /> Destination
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Chennai"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  className="w-full border-b-2 border-slate-200 py-2 font-medium focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-slate-300 text-slate-800" 
                  required 
                />
              </div>
            </div>

            {/* Cargo Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Package size={14} className="text-slate-400" /> Cargo
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Sago Bags"
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  className="w-full border-b-2 border-slate-200 py-2 font-medium focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-slate-300 text-slate-800" 
                  required 
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Weight size={14} className="text-slate-400" /> Tonnage
                </label>
                <input 
                  type="number" 
                  placeholder="e.g., 21"
                  value={formData.tonnage}
                  onChange={(e) => setFormData({...formData, tonnage: e.target.value})}
                  className="w-full border-b-2 border-slate-200 py-2 font-medium focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-slate-300 text-slate-800" 
                  required 
                  min="1"
                  step="0.1"
                />
              </div>
            </div>

            {/* Financials */}
            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <IndianRupee size={14} className="text-amber-500"/> Expected Rate (₹)
              </label>
              <input 
                type="number" 
                placeholder="e.g., 18000"
                value={formData.expectedRate}
                onChange={(e) => setFormData({...formData, expectedRate: e.target.value})}
                className="w-full text-3xl border-b-2 border-slate-200 py-2 font-bold focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-slate-200 text-slate-800" 
                required 
                min="1"
              />
            </div>

            {/* Action */}
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {isProcessing ? 'Publishing to Market...' : 'Publish Load'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
