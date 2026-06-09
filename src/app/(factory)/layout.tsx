import Link from 'next/link';
import { Package, ShieldCheck, Radio, User } from 'lucide-react';

export default function FactoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          {/* Logo / Brand */}
          <div className="font-bold text-xl tracking-tight text-slate-900 flex items-center gap-2">
            <span className="bg-amber-500 text-white p-1 rounded-md">
              <Package size={20} />
            </span>
            TST Factory
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/factory/create-load" className="hover:text-amber-500 transition-colors">
              Create Contract
            </Link>
            <Link href="/factory/escrow" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
              <ShieldCheck size={16} /> Escrow Vault
            </Link>
            <Link href="/factory/tracking" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
              <Radio size={16} /> Live Radar
            </Link>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-4">
          <button className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200">
            <User size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
