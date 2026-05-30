import Link from 'next/link';
import { LayoutDashboard, Wallet, Route, Truck, Settings, Bell } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-steel text-white flex flex-col h-screen">
      {/* Brand Logo Area */}
      <div className="p-8">
        <div className="text-2xl font-bold text-gold tracking-tight italic">
          Freight OS
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-gold">
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link href="/smart-wallets" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
          <Wallet size={20} />
          Smart Wallets
        </Link>
        <Link href="/load-market" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
          <Route size={20} />
          Load Market
        </Link>
        <Link href="/fleet" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
          <Truck size={20} />
          Fleet Tracker
        </Link>
        <Link href="/updates" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
          <Bell size={20} />
          Driver Updates
        </Link>
      </nav>

      {/* Bottom Area */}
      <div className="p-4 border-t border-white/10">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
          <Settings size={20} />
          Settings
        </Link>
      </div>

    </aside>
  );
}
