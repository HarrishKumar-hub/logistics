'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AlertCircle, List, Map, Plus, Truck, X } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '550px',
};

const DEFAULT_CENTER = {
  lat: 11.6643,
  lng: 78.146,
};

const MINIMAL_MAP_STYLES = [
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
  { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: 45 }] },
  { featureType: 'road.highway', elementType: 'all', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'all', stylers: [{ color: '#cde2e6' }, { visibility: 'on' }] },
];

type Trip = {
  id: string;
  lorryId?: string;
  driverName?: string;
  lat: number;
  lng: number;
  status?: string;
  statusReason?: string;
  destinationName?: string;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function FleetTracker() {
  const [fleetStatus, setFleetStatus] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedTruck, setSelectedTruck] = useState<Trip | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lorryId, setLorryId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [destination, setDestination] = useState('Sankari, Tamil Nadu');
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const searchParams = useSearchParams();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapOptions = useMemo(
    () => ({
      styles: MINIMAL_MAP_STYLES,
      clickableIcons: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    }),
    []
  );

  const mapCenter = selectedTruck
    ? { lat: selectedTruck.lat, lng: selectedTruck.lng }
    : fleetStatus[0]
      ? { lat: fleetStatus[0].lat, lng: fleetStatus[0].lng }
      : DEFAULT_CENTER;

  const getTripLabel = (trip: Trip) => {
    if (trip.lorryId) {
      return trip.driverName ? `${trip.lorryId} - ${trip.driverName}` : trip.lorryId;
    }

    if (trip.destinationName) {
      return trip.destinationName;
    }

    if (trip.statusReason) {
      return trip.statusReason;
    }

    return 'Vehicle Pending';
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'trips'), (snapshot) => {
      const liveTrips: Trip[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Partial<Trip>;
        return {
          id: doc.id,
          lorryId: data.lorryId,
          driverName: data.driverName,
          lat: data.lat ?? 11.58 + (Math.random() - 0.5) * 0.2,
          lng: data.lng ?? 77.98 + (Math.random() - 0.5) * 0.2,
          status: data.status,
          statusReason: data.statusReason,
        };
      });
      setFleetStatus(liveTrips);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchParams.get('view') === 'map') {
      setViewMode('map');
    }
  }, [searchParams]);

  useEffect(() => {
    const lorryIdParam = searchParams.get('lorryId');
    if (!lorryIdParam || fleetStatus.length === 0) return;

    const matchedTrip = fleetStatus.find((trip) => trip.lorryId === lorryIdParam || trip.id === lorryIdParam);
    if (matchedTrip) {
      setSelectedTruck(matchedTrip);
      setViewMode('map');
    }
  }, [fleetStatus, searchParams]);

  const handleCreateDispatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lorryId || !driverName) return;

    // 📍 The Coordinate Dictionary: Maps the dropdown text to exact GPS locations
    const hubCoordinates: Record<string, { lat: number; lng: number }> = {
      'Sankari, Tamil Nadu': { lat: 11.4782, lng: 77.8864 },
      'Mettur, Tamil Nadu': { lat: 11.7932, lng: 77.8015 },
      'Erode, Tamil Nadu': { lat: 11.3410, lng: 77.7172 },
      'Chennai, Tamil Nadu': { lat: 13.0827, lng: 80.2707 },
    };

    // Grab the exact coordinates based on what you selected, fallback to Salem
    const startLocation = hubCoordinates[destination] || { lat: 11.6643, lng: 78.1460 };

    try {
      let documentUrl = '';

      // 🗄️ FIREBASE STORAGE: If a file is selected, upload it first!
      if (manifestFile) {
        const fileRef = ref(storage, `manifests/${lorryId}-${Date.now()}-${manifestFile.name}`);
        const snapshot = await uploadBytes(fileRef, manifestFile);
        documentUrl = await getDownloadURL(snapshot.ref);
      }

      const createdTrip = await addDoc(collection(db, 'trips'), {
        id: lorryId,
        status: 'IN_TRANSIT',
        driverName,
        destinationName: destination,
        statusReason: 'New dispatch sequence initialized.',
        lat: startLocation.lat,
        lng: startLocation.lng,
        manifestUrl: documentUrl,
        timestamp: new Date().toISOString(),
      });

      setLorryId('');
      setDriverName('');
      setDestination('Sankari, Tamil Nadu');
      setManifestFile(null);
      setSelectedTruck({
        id: createdTrip.id,
        lorryId,
        driverName,
        lat: startLocation.lat,
        lng: startLocation.lng,
        status: 'IN_TRANSIT',
        statusReason: 'New dispatch sequence initialized.',
        destinationName: destination,
      });
      setViewMode('map');
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error writing dispatch transaction:', error);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-steel tracking-tight">Logistics Control Center</h1>
          <p className="mt-1 text-sm text-steel/50">Real-time routing and active dispatch management</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition-colors font-semibold shadow-sm"
          >
            <Plus size={18} /> New Dispatch
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'map' : 'table')}
            className="bg-pearl border border-border text-steel hover:border-steel px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-colors font-bold shadow-sm"
          >
            {viewMode === 'table' ? (
              <>
                <Map size={18} className="text-gold" /> View Live Map
              </>
            ) : (
              <>
                <List size={18} className="text-gold" /> View Table
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-steel/40 font-medium animate-pulse">
            Establishing secure stream to fleet...
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-pearl/50 border-b border-border">
                  <th className="px-8 py-5 text-sm font-bold text-steel/40 uppercase tracking-wider">Vehicle / Trip ID</th>
                  <th className="px-8 py-5 text-sm font-bold text-steel/40 uppercase tracking-wider">Deployment Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-steel/40 uppercase tracking-wider">Telemetry Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fleetStatus.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center text-steel/30 italic">No active trips found.</td>
                  </tr>
                ) : (
                  fleetStatus.map((trip) => (
                    <tr key={trip.id} className="hover:bg-pearl/30 transition-colors group">
                      <td className="px-8 py-6 font-bold text-steel flex items-center gap-3">
                        <Truck size={18} className="text-gold" />
                        {getTripLabel(trip)}
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight flex items-center gap-2 w-fit
                          ${trip.status === 'DELAYED' || trip.status === 'BROKEN_DOWN' || trip.status === 'BREAKDOWN' || trip.status === 'Breakdown'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : trip.status === 'IN_TRANSIT'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-pearl text-steel/40 border border-border'}`}
                        >
                          {(trip.status === 'DELAYED' || trip.status === 'BROKEN_DOWN' || trip.status === 'BREAKDOWN' || trip.status === 'Breakdown') && (
                            <AlertCircle size={14} />
                          )}
                          {trip.status ? trip.status.replace('_', ' ') : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {trip.statusReason ? (
                          <p className="text-sm font-medium text-steel/80 italic">{trip.statusReason}</p>
                        ) : (
                          <span className="text-xs text-steel/30 italic">GPS signal active.</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : !GOOGLE_MAPS_API_KEY ? (
          <div className="flex-1 flex items-center justify-center text-steel/40 font-medium">
            Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in .env.local
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={9}
            options={mapOptions}
          >
            {fleetStatus.map((truck) => (
              <MarkerF
                key={truck.id}
                position={{ lat: truck.lat, lng: truck.lng }}
                onClick={() => setSelectedTruck(truck)}
                label={{ text: (truck.lorryId || truck.destinationName || truck.id).substring(0, 6), color: '#1f2937', fontSize: '10px', fontWeight: '700' }}
              />
            ))}

            {selectedTruck && (
              <InfoWindowF
                position={{ lat: selectedTruck.lat, lng: selectedTruck.lng }}
                onCloseClick={() => setSelectedTruck(null)}
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">{getTripLabel(selectedTruck)}</div>
                  <div className="text-xs text-slate-600">{selectedTruck.status?.replace('_', ' ') || 'IN TRANSIT'}</div>
                  <div className="text-xs text-slate-500">
                    {selectedTruck.statusReason || 'In transit along normal highway corridor.'}
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        ) : (
          <div className="flex-1 flex items-center justify-center text-steel/40 font-medium">
            Loading Google Maps engine...
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-steel">Manifest New Dispatch</h2>
                <p className="text-xs text-steel/50">Create a fresh trip in Firestore</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lorry / Trip ID Reference</label>
                <input
                  value={lorryId}
                  onChange={(e) => setLorryId(e.target.value)}
                  placeholder="e.g., TRIP-TN52-4321"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Driver Name</label>
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g., Driver Kumar"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Route Hub Destination</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:outline-amber-500 bg-white"
                >
                  <option value="Sankari, Tamil Nadu">Sankari Commercial Yard</option>
                  <option value="Mettur, Tamil Nadu">Mettur Checkpost Node</option>
                  <option value="Erode, Tamil Nadu">Erode Delivery Junction</option>
                  <option value="Chennai, Tamil Nadu">Chennai Central Port Terminal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Manifest Document (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setManifestFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800 focus:outline-amber-500 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded font-semibold shadow-sm"
              >
                Authorize Fleet Launch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
