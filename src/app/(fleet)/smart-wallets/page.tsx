"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { X, Fuel, Plus } from "lucide-react";

type Wallet = {
  id: string;
  driver: string;
  route: string;
  balance: number;
  alert?: boolean;
};

type Transaction = {
  id: string;
  walletId: string;
  amount: number;
  reason: string;
  type: 'CREDIT' | 'DEBIT';
  timestamp: string;
};

export default function SmartWallets() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Diesel Advance');

  const wallets: Wallet[] = [
    { id: 'TN-52-AF-9898', driver: 'Murugan', route: 'Salem to Surat', balance: 12500 },
    { id: 'TN-52-XY-1234', driver: 'Ramesh', route: 'Erode to Delhi', balance: 4200, alert: true },
    { id: 'TN-30-BB-5678', driver: 'Karthik', route: 'Surat to Salem', balance: 18000 },
  ];

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Transaction, 'id'>) })));
    });
    return () => unsubscribe();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !activeWallet) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        walletId: activeWallet,
        amount: Number(amount),
        reason,
        type: 'CREDIT',
        timestamp: new Date().toISOString(),
      });

      setAmount('');
      setActiveWallet(null);
    } catch (err) {
      console.error('Ledger error:', err);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-steel tracking-tight">Smart Wallets</h1>
        <button className="flex items-center gap-2 text-steel/60 hover:text-gold transition-colors font-semibold">
          <Plus size={20} />
          View Transaction Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {wallets.map((wallet) => (
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
              {wallet.alert && (
                <span className="inline-block mt-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">Action Required</span>
              )}
            </div>

            <div>
              <button
                onClick={() => setActiveWallet(wallet.id)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Allocate Funds
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeWallet && (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-border">
            <form onSubmit={handleAllocate} className="h-full flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-bold text-steel">Transfer Funds</h2>
                  <p className="text-xs text-steel/50">Target Wallet: {activeWallet}</p>
                </div>
                <button type="button" onClick={() => setActiveWallet(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹)</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Reason code</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800 bg-white"
                  >
                    <option>Diesel Advance</option>
                    <option>Toll & Checkpost</option>
                    <option>Maintenance / Repair</option>
                    <option>Driver Bata (Food)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded shadow-sm"
                >
                  Authorize Transfer
                </button>

                <div className="rounded-xl border border-border bg-pearl/40 p-4">
                  <h3 className="text-sm font-bold text-steel mb-3">Recent Transactions</h3>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {transactions.filter((transaction) => transaction.walletId === activeWallet).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-border">
                        <span className="text-steel/70">{transaction.reason}</span>
                        <span className="font-bold text-steel">+₹{transaction.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
