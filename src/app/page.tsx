export default function Home() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-steel tracking-tight">Overview</h1>
      
      {/* Mock Data Cards Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-surface p-6 rounded-2xl border border-border hover:border-gold transition-colors group">
          <p className="text-steel/50 font-semibold mb-1">Active Trips</p>
          <p className="text-4xl font-bold text-steel group-hover:text-gold transition-colors">12</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border hover:border-gold transition-colors group">
          <p className="text-steel/50 font-semibold mb-1">Wallet Escrow</p>
          <p className="text-4xl font-bold text-steel group-hover:text-gold transition-colors">₹1,45,000</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border hover:border-gold transition-colors group">
          <p className="text-steel/50 font-semibold mb-1">Pending Matches</p>
          <p className="text-4xl font-bold text-steel group-hover:text-gold transition-colors">3</p>
        </div>

      </div>

    </div>
  );
}
