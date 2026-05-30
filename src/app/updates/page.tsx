'use client';
import { useState } from 'react';
import { MessageSquare, Send, Bot, Clock, MapPin, AlertTriangle } from 'lucide-react';

export default function DriverUpdates() {
  const [message, setMessage] = useState('');
  const [tripId, setTripId] = useState('TRIP-TN52-9898');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAI = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('http://127.0.0.1:5001/lorry52-1a4b3/us-central1/processwhatsappmessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, message }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to connect to local server. Ensure Firebase Emulators are running." });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-gold rounded-xl flex items-center justify-center text-white shadow-lg shadow-gold/20">
          <MessageSquare size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-steel">Driver Update Processor</h1>
          <p className="text-steel/50 font-medium">Test the Genkit AI logic for analyzing WhatsApp messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-surface p-8 rounded-3xl border border-border space-y-6 shadow-sm">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-steel/60 uppercase">Trip ID</label>
            <input 
              type="text" 
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-steel font-bold"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-steel/60 uppercase">WhatsApp Message Snippet</label>
            <textarea 
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Sir tyre punctured near Hosur, delayed by 3 hours"
              className="w-full bg-pearl/50 border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-steel"
            />
          </div>

          <button 
            onClick={testAI}
            disabled={loading || !message}
            className="w-full bg-gold hover:bg-gold-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-gold/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (
              <>
                <Send size={20} />
                Analyze Update
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="bg-steel rounded-3xl p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Bot size={120} />
          </div>

          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot size={24} className="text-gold" />
            AI Analysis Result
          </h2>

          {!result && !loading && (
            <div className="h-48 border-2 border-white/10 border-dashed rounded-2xl flex items-center justify-center text-white/30 font-medium">
              Awaiting message for processing...
            </div>
          )}

          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
              <div className="h-20 bg-white/10 rounded"></div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {result.error ? (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-200 text-sm flex gap-3">
                  <AlertTriangle size={20} />
                  {result.details || result.error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</p>
                      <p className="text-sm font-bold text-gold">{result.status}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Parsed At</p>
                      <p className="text-[10px] font-medium opacity-60">{new Date(result.processedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                    <p className="text-sm font-medium leading-relaxed italic text-white/80">
                      "{result.analysis}"
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
