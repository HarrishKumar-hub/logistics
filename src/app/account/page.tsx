import { Shield, Key, Smartphone } from 'lucide-react';

export default function MyAccount() {
  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-steel tracking-tight">My Account</h1>
      
      <div className="grid grid-cols-1 gap-8">
        
        {/* Personal Details */}
        <section className="bg-surface p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="text-gold" size={24} />
            <h2 className="text-xl font-bold text-steel">Administrator Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Full Name</label>
              <input type="text" placeholder="Harrish Kumar" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Role</label>
              <input type="text" readOnly value="Fleet Manager / Owner" className="w-full bg-pearl/20 border border-border rounded-xl py-3 px-4 text-steel/40 focus:outline-none" />
            </div>
          </div>
        </section>

        {/* Contact & Notifications */}
        <section className="bg-surface p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3">
            <Smartphone className="text-gold" size={24} />
            <h2 className="text-xl font-bold text-steel">Primary Contact (WhatsApp)</h2>
          </div>
          <p className="text-sm text-steel/50">This number receives critical n8n alerts for load matches and wallet warnings.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Mobile Number</label>
              <input type="text" placeholder="+91 98765 43210" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Email Address</label>
              <input type="email" placeholder="manager@fleetos.com" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-surface p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3">
            <Key className="text-gold" size={24} />
            <h2 className="text-xl font-bold text-steel">Security</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end text-sm">
            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">New Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>

            <div>
              <button className="w-full border border-border text-steel font-bold py-3.5 px-4 rounded-xl hover:bg-pearl transition-colors">
                Update Password
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button className="bg-steel text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-steel/10 flex items-center justify-center hover:bg-gold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
