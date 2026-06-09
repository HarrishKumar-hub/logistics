'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { CheckCircle2, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

interface LoadContract {
  id: string; // The Firestore Document ID
  from: string;
  to: string;
  cargo: string;
  price: number;
  status: string;
  createdAt: string;
}

export default function EscrowVault() {
  const [contracts, setContracts] = useState<LoadContract[]>([]);

  useEffect(() => {
    // For MVP purposes, pull all loads; we will add strict factoryId filtering later
    const q = query(collection(db, 'market_loads'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedContracts: LoadContract[] = [];
      snapshot.forEach((doc) => {
        fetchedContracts.push({
          id: doc.id,
          ...doc.data()
        } as LoadContract);
      });
      // Sort by newest first
      fetchedContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setContracts(fetchedContracts);
    }, (error) => {
      console.error("Error fetching escrow ledger:", error);
    });

    return () => unsubscribe();
  }, []);

  // Calculate KPIs
  const totalFreightSpent = contracts
    .filter(c => c.status === 'DELIVERED')
    .reduce((sum, c) => sum + c.price, 0);

  const fundsInEscrow = contracts
    .filter(c => c.status === 'IN_TRANSIT')
    .reduce((sum, c) => sum + c.price, 0);

  const pendingContracts = contracts
    .filter(c => c.status === 'AVAILABLE')
    .length;

  return (
    <div className="p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="pb-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Escrow & Settlement Vault</h1>
          <p className="text-slate-500 mt-2">Secure freight ledger and active contract locked funds.</p>
        </div>

        {/* Top Financial KPI Cards (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-200 p-6 bg-white shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Freight Spent</p>
            </div>
            <p className="text-3xl font-bold tracking-tight">₹{totalFreightSpent.toLocaleString('en-IN')}</p>
          </div>
          
          <div className="border border-slate-200 p-6 bg-white shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-amber-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Funds Locked in Escrow</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-amber-600">₹{fundsInEscrow.toLocaleString('en-IN')}</p>
          </div>
          
          <div className="border border-slate-200 p-6 bg-white shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending Contracts</p>
            </div>
            <p className="text-3xl font-bold tracking-tight">{pendingContracts}</p>
          </div>
        </div>

        {/* The Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Contract ID</th>
                  <th className="px-6 py-4">Route (From - To)</th>
                  <th className="px-6 py-4">Cargo Details</th>
                  <th className="px-6 py-4 text-right">Contract Value</th>
                  <th className="px-6 py-4">Escrow Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No contracts found in the ledger.
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-900 font-bold">
                        {contract.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium flex items-center gap-2">
                        {contract.from} <ArrowRight size={14} className="text-slate-400" /> {contract.to}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{contract.cargo}</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-bold">
                        ₹{contract.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        {contract.status === 'AVAILABLE' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            Pending Fleet Assignment
                          </span>
                        )}
                        {contract.status === 'IN_TRANSIT' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Funds Locked in Escrow
                          </span>
                        )}
                        {contract.status === 'DELIVERED' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Funds Released
                          </span>
                        )}
                        {/* Fallback for any unknown status */}
                        {contract.status !== 'AVAILABLE' && contract.status !== 'IN_TRANSIT' && contract.status !== 'DELIVERED' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            {contract.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
