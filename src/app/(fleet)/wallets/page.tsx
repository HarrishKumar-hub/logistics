"use client";

import { useState } from 'react';
import { Fuel, Plus, History, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

type Wallet = {
  id: string;
  route: string;
  driver: string;
  balance: number;
  status: string;
};

export default function SmartWallets() {
  const [activeWallets, setActiveWallets] = useState<Wallet[]>([
    { id: 'TN-52-AF-9898', route: 'Salem to Surat', driver: 'Murugan', balance: 12500, status: 'In Transit' },
    { id: 'TN-52-XY-1234', route: 'Erode to Delhi', driver: 'Ramesh', balance: 4200, status: 'Low Balance' },
    { id: 'TN-30-BB-5678', route: 'Surat to Salem', driver: 'Karthik', balance: 18000, status: 'Return Trip' },
  ]);
  const [drawerWallet, setDrawerWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Diesel Advance');

  const handleAllocateFunds = async () => {
    if (!drawerWallet || !amount) return;

    const parsedAmount = Number(amount);
    const nextBalance = drawerWallet.balance + parsedAmount;

    setActiveWallets((wallets) =>
      wallets.map((wallet) =>
        wallet.id === drawerWallet.id
          ? { ...wallet, balance: nextBalance, status: nextBalance < 5000 ? 'Low Balance' : wallet.status }
          : wallet
      )
    );

    await setDoc(
      doc(db, 'wallets', drawerWallet.id),
      {
        walletId: drawerWallet.id,
        route: drawerWallet.route,
        driver: drawerWallet.driver,
        currentBalance: nextBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addDoc(collection(db, 'wallets', drawerWallet.id, 'receipts'), {
      walletId: drawerWallet.id,
      amount: parsedAmount,
      reason,
      previousBalance: drawerWallet.balance,
      currentBalance: nextBalance,
      createdAt: serverTimestamp(),
    });

    setDrawerWallet(null);
    setAmount('');
    setReason('Diesel Advance');
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-steel tracking-tight">Smart Wallets</h1>
          <button className="flex items-center gap-2 text-steel/60 hover:text-gold transition-colors font-semibold">
            <History size={20} />
            View Transaction Ledger
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeWallets.map((wallet) => (
            <div key={wallet.id} className="bg-surface p-8 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 bg-pearl rounded-xl flex items-center justify-center border border-border">
                  <Fuel className="text-gold" size={28} />
                </div>

                <div>
                  <p className="text-xl font-bold text-steel">{wallet.id}</p>
                  <p className="text-steel/50 font-medium">{wallet.route} • Driver: {wallet.driver}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-steel/40 uppercase tracking-wider">Current Balance</p>
                <p className="text-3xl font-bold text-steel">₹{wallet.balance.toLocaleString('en-IN')}</p>
                {wallet.status === 'Low Balance' && (
                  <span className="inline-block mt-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">Action Required</span>
                )}
              </div>

              <div>
                <button
                  onClick={() => setDrawerWallet(wallet)}
                  className="bg-gold hover:bg-gold-hover text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-gold/20"
                >
                  <Plus size={20} />
                  Allocate Funds
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {drawerWallet && (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-steel">Allocate Funds</h2>
                <p className="text-xs text-steel/50">Wallet: {drawerWallet.id}</p>
              </div>
              <button onClick={() => setDrawerWallet(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  inputMode="numeric"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Diesel Advance"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500"
                />
              </div>

              <button
                onClick={handleAllocateFunds}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded font-semibold shadow-sm"
              >
                Post Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
