'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface LoadContract {
  id: string; // The Firestore Document ID
  from: string;
  to: string;
  cargo: string;
  price: number;
  status: string;
  createdAt: string;
}

export default function FactoryEscrowVault() {
  const [contracts, setContracts] = useState<LoadContract[]>([]);

  useEffect(() => {
    // Listen to market_loads specifically from this factory
    const q = query(
      collection(db, 'market_loads'), 
      where('factoryId', '==', 'TST_FACTORY_01')
    );
    
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

  const activeContracts = contracts
    .filter(c => c.status === 'IN_TRANSIT')
    .length;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Escrow Vault Ledger</h1>
          <p className="text-sm text-slate-500 mt-2">Analytical overview of factory freight contracts and escrow allocations.</p>
        </div>

        {/* Top KPI Cards (3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-200 p-6 bg-white shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Freight Spent</p>
            <p className="text-3xl font-medium tracking-tight">₹{totalFreightSpent.toLocaleString('en-IN')}</p>
          </div>
          <div className="border border-slate-200 p-6 bg-white shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Funds in Escrow</p>
            <p className="text-3xl font-medium tracking-tight">₹{fundsInEscrow.toLocaleString('en-IN')}</p>
          </div>
          <div className="border border-slate-200 p-6 bg-white shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Active Contracts</p>
            <p className="text-3xl font-medium tracking-tight">{activeContracts}</p>
          </div>
        </div>

        {/* The Ledger Table */}
        <div className="border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Contract ID</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4 text-right">Value (₹)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No contracts found in the ledger. Post a load to see it here.
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">
                        {contract.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {contract.from} <span className="text-slate-400 mx-1">→</span> {contract.to}
                      </td>
                      <td className="px-6 py-4">{contract.cargo}</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-medium">
                        {contract.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        {contract.status === 'AVAILABLE' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Pending Fleet Assignment
                          </span>
                        )}
                        {contract.status === 'IN_TRANSIT' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                            Funds Locked in Escrow
                          </span>
                        )}
                        {contract.status === 'DELIVERED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Funds Released
                          </span>
                        )}
                        {/* Fallback for any unknown status */}
                        {contract.status !== 'AVAILABLE' && contract.status !== 'IN_TRANSIT' && contract.status !== 'DELIVERED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
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
