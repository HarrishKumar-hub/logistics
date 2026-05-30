'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, UserCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const router = useRouter();

  // Example Mock Notifications
  const alerts = [
    { id: 1, message: "TN-52-AF-9898 Wallet below ₹1,000", type: "urgent" },
    { id: 2, message: "New Backhaul matched from Surat", type: "success" }
  ];

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      router.push(`/fleet?search=${searchQuery.toUpperCase()}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="h-20 bg-surface border-b border-border px-8 flex items-center justify-between">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-steel/40 group-focus-within:text-gold transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search orders, trucks, or wallets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-pearl/50 border border-border rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-sm text-steel"
          />
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-steel/60 hover:text-gold transition-colors"
          >
            <Bell size={24} />
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-gold rounded-full border-2 border-surface"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-border bg-pearl/30">
                <p className="font-bold text-steel">Recent Alerts</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.map(alert => (
                  <div key={alert.id} className="p-4 border-b border-border last:border-0 hover:bg-pearl/50 transition-colors">
                    <p className={`text-sm ${alert.type === 'urgent' ? 'text-red-600 font-bold' : 'text-steel font-medium'}`}>
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-[1px] bg-border mx-2"></div>

        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-4 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-steel group-hover:text-gold transition-colors">TST Fleet Management</p>
              <p className="text-xs text-steel/50 font-medium">Admin / Manager</p>
            </div>

            <div className="h-10 w-10 bg-pearl rounded-full flex items-center justify-center border border-border group-hover:border-gold transition-all">
              <UserCircle size={28} className="text-steel/40 group-hover:text-gold" />
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div className="absolute right-0 mt-4 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <button 
                onClick={() => { router.push('/account'); setShowProfile(false); }}
                className="block w-full text-left px-4 py-3 text-sm text-steel hover:bg-pearl transition-colors"
              >
                My Account
              </button>
              <button 
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold border-t border-border transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
