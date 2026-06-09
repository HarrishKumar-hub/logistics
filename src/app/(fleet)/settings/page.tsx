export default function Settings() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-steel tracking-tight">System Settings</h1>
        <p className="text-steel/50 mt-2 font-medium">Configure your fleet profile and payment settlements.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        
        {/* Company Profile */}
        <section className="bg-surface p-8 rounded-2xl border border-border space-y-6">
          <h2 className="text-xl font-bold text-steel">Company Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Fleet Name</label>
              <input type="text" placeholder="e.g., TST Fleet Management" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Association ID (Sankari)</label>
              <input type="text" placeholder="e.g., SNK-9921" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>
          </div>
        </section>

        {/* Banking Details */}
        <section className="bg-surface p-8 rounded-2xl border border-border space-y-6">
          <h2 className="text-xl font-bold text-steel">Settlement Bank Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">Account Number</label>
              <input type="password" placeholder="•••• •••• •••• 5567" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-steel/60 uppercase tracking-wider">IFSC Code</label>
              <input type="text" placeholder="SBIN0001234" className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-all" />
            </div>
          </div>
        </section>

        <div className="pt-4">
          <button className="bg-gold hover:bg-gold-hover text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-gold/20 flex items-center justify-center">
            Save Configuration
          </button>
        </div>
      </div>

    </div>
  );
}
