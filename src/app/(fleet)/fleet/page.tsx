'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import { 
  AlertCircle, List, Map, Plus, Truck, X, FileText, ChevronDown, Filter,
  CheckCircle2, XCircle, Eye
} from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const DEFAULT_CENTER = {
  lat: 11.6643,
  lng: 78.146,
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
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

interface TripDispatch {
  id: string; // Document ID
  truckId: string; // e.g., TN-30-F-9934
  driverName: string;
  source: string; // e.g., Surat
  destination: string; // e.g., Salem
  cargo: string; // e.g., Textile Yarn
  freightValue: number; // e.g., 42000
  tonnage: number;
  status: 'IN_TRANSIT' | 'SCHEDULED' | 'DELIVERED' | 'DELAYED' | 'BROKEN_DOWN';
  timestamp: any;
  manifestUrl?: string;
  lat?: number;
  lng?: number;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function FleetTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<TripDispatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Raw telemetry coordinates from Firestore for Google Maps markers
  const [fleetGPS, setFleetGPS] = useState<Record<string, { lat: number; lng: number }>>({});

  // Filter States
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedDest, setSelectedDest] = useState('All');
  const [searchTruck, setSearchTruck] = useState('');

  // Tracked Trip Modal State
  const [trackedTrip, setTrackedTrip] = useState<TripDispatch | null>(null);
  const [modalDirectionsResponse, setModalDirectionsResponse] = useState<any>(null);
  const [modalMap, setModalMap] = useState<any>(null);

  // New Dispatch Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lorryId, setLorryId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [manualDestination, setManualDestination] = useState('Sankari, Tamil Nadu');
  const [manifestFile, setManifestFile] = useState<File | null>(null);

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

  // Find coordinates of tracked truck, fallback to default center
  const mapCenter = useMemo(() => {
    if (trackedTrip && fleetGPS[trackedTrip.id]) {
      return fleetGPS[trackedTrip.id];
    }
    return DEFAULT_CENTER;
  }, [trackedTrip, fleetGPS]);

  // Real-Time Firestore Synced Stream
  useEffect(() => {
    const tripsQuery = query(collection(db, 'trips'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(tripsQuery, (snapshot) => {
      const liveTrips: TripDispatch[] = [];
      const gpsCoordinates: Record<string, { lat: number; lng: number }> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Resolve truckId / lorryId
        const truckId = data.truckId || data.lorryId || '';

        // Resolve source, destination, cargo, tonnage, freightValue
        let source = data.source || 'Sankari';
        let destination = data.destination || data.destinationName || '';
        let cargo = data.cargo || 'General Freight';
        let tonnage = Number(data.tonnage) || 21;
        let freightValue = Number(data.freightValue) || 0;

        // Parse from statusReason if it exists (for loads created via LoadMarket)
        if (data.statusReason) {
          if (data.statusReason.includes('LD-8891')) {
            source = 'Surat';
            destination = 'Salem';
            freightValue = 42000;
            cargo = 'Textile Yarn';
            tonnage = 21;
          } else if (data.statusReason.includes('LD-8892')) {
            source = 'Coimbatore';
            destination = 'Mumbai';
            freightValue = 55000;
            cargo = 'Machinery';
            tonnage = 18;
          } else if (data.statusReason.includes('LD-8893')) {
            source = 'Salem';
            destination = 'Chennai';
            freightValue = 18000;
            cargo = 'Sago Bags';
            tonnage = 25;
          } else {
            const cargoMatch = data.statusReason.match(/of\s+([^(]+)/);
            if (cargoMatch && cargoMatch[1]) {
              cargo = cargoMatch[1].trim();
            }
            const tonsMatch = data.statusReason.match(/Hauling\s+(\d+)\s+Tons/);
            if (tonsMatch && tonsMatch[1]) {
              tonnage = parseInt(tonsMatch[1], 10);
            }
          }
        }

        // Apply price fallbacks based on destination if freightValue is still 0
        if (freightValue === 0) {
          const d = destination.toUpperCase();
          if (d.includes('CHENNAI')) {
            freightValue = 18500;
            cargo = 'Sago Bags';
          }
          else if (d.includes('ERODE')) {
            freightValue = 12000;
            cargo = 'Industrial Parts';
          }
          else if (d.includes('METTUR')) {
            freightValue = 8500;
            cargo = 'Chemical Bags';
          }
          else if (d.includes('SANKARI')) {
            freightValue = 6000;
            cargo = 'Cement Blocks';
          }
          else {
            freightValue = 22000;
          }
        }

        const cleanDest = destination.replace(', Tamil Nadu', '').replace(', TN', '').replace(', MH', '').replace(', GJ', '');
        const cleanSource = source.replace(', Tamil Nadu', '').replace(', TN', '').replace(', MH', '').replace(', GJ', '');

        liveTrips.push({
          id: doc.id,
          truckId,
          driverName: data.driverName || '',
          source: cleanSource,
          destination: cleanDest,
          cargo,
          freightValue,
          tonnage,
          status: data.status || 'SCHEDULED',
          timestamp: data.timestamp,
          manifestUrl: data.manifestUrl || '',
          lat: data.lat ?? 11.58,
          lng: data.lng ?? 77.98
        });

        // Store GPS coordinates separately for markers
        gpsCoordinates[doc.id] = {
          lat: data.lat ?? 11.58 + (Math.random() - 0.5) * 0.2,
          lng: data.lng ?? 77.98 + (Math.random() - 0.5) * 0.2
        };
      });

      setTrips(liveTrips);
      setFleetGPS(gpsCoordinates);
      setLoading(false);
    }, (error) => {
      console.error("Firestore stream failed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle URL query highlights
  useEffect(() => {
    const lorryIdParam = searchParams.get('lorryId');
    if (!lorryIdParam || trips.length === 0) return;

    const matchedTrip = trips.find((trip) => trip.truckId === lorryIdParam || trip.id === lorryIdParam);
    if (matchedTrip) {
      setTrackedTrip(matchedTrip);
    }
  }, [trips, searchParams]);

  // Calculate route for modal
  useEffect(() => {
    if (trackedTrip && typeof window !== 'undefined' && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: trackedTrip.source,
          destination: trackedTrip.destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setModalDirectionsResponse(result);
          } else {
            console.error(`Directions request failed due to: ${status}`);
          }
        }
      );
    } else {
      setModalDirectionsResponse(null);
    }
  }, [trackedTrip]);

  // Automatically adjust bounds for modal Map when directions resolve
  useEffect(() => {
    if (modalMap && modalDirectionsResponse) {
      modalMap.fitBounds(modalDirectionsResponse.routes[0].bounds);
    }
  }, [modalMap, modalDirectionsResponse]);

  // Handle manual dispatch submission
  const handleCreateDispatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lorryId || !driverName) return;

    const hubCoordinates: Record<string, { lat: number; lng: number }> = {
      'Sankari, Tamil Nadu': { lat: 11.4782, lng: 77.8864 },
      'Mettur, Tamil Nadu': { lat: 11.7932, lng: 77.8015 },
      'Erode, Tamil Nadu': { lat: 11.3410, lng: 77.7172 },
      'Chennai, Tamil Nadu': { lat: 13.0827, lng: 80.2707 },
    };

    const startLocation = hubCoordinates[manualDestination] || { lat: 11.6643, lng: 78.1460 };

    try {
      let documentUrl = '';

      if (manifestFile) {
        const fileRef = ref(storage, `manifests/${lorryId}-${Date.now()}-${manifestFile.name}`);
        const snapshot = await uploadBytes(fileRef, manifestFile);
        documentUrl = await getDownloadURL(snapshot.ref);
      }

      const createdTrip = await addDoc(collection(db, 'trips'), {
        truckId: lorryId,
        lorryId,
        status: 'IN_TRANSIT',
        driverName,
        source: 'Sankari',
        destination: manualDestination,
        destinationName: manualDestination,
        statusReason: 'New dispatch sequence initialized.',
        lat: startLocation.lat,
        lng: startLocation.lng,
        manifestUrl: documentUrl,
        timestamp: new Date().toISOString(),
        cargo: 'General Cargo',
        tonnage: 21,
        freightValue: manualDestination.includes('Chennai') ? 18500 : manualDestination.includes('Erode') ? 12000 : manualDestination.includes('Mettur') ? 8500 : 6000
      });

      setLorryId('');
      setDriverName('');
      setManualDestination('Sankari, Tamil Nadu');
      setManifestFile(null);

      // Instantly track newly created dispatch
      const resolvedDest = manualDestination.replace(', Tamil Nadu', '').replace(', TN', '').replace(', MH', '').replace(', GJ', '');
      setTrackedTrip({
        id: createdTrip.id,
        truckId: lorryId,
        driverName,
        source: 'Sankari',
        destination: resolvedDest,
        cargo: 'General Cargo',
        tonnage: 21,
        freightValue: manualDestination.includes('Chennai') ? 18500 : manualDestination.includes('Erode') ? 12000 : manualDestination.includes('Mettur') ? 8500 : 6000,
        status: 'IN_TRANSIT',
        timestamp: new Date().toISOString(),
        manifestUrl: documentUrl,
        lat: startLocation.lat,
        lng: startLocation.lng
      });
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error writing dispatch transaction:', error);
    }
  };

  // 3. High-Density Dynamic Calculations for Top KPI Cards
  const activeDispatchesCount = trips.filter(t => t.status === 'IN_TRANSIT').length;
  const totalRevenue = trips.reduce((sum, t) => sum + t.freightValue, 0);
  const deliveredCount = 12 + trips.filter(t => t.status === 'DELIVERED').length;
  const disruptionCount = trips.filter(t => t.status === 'DELAYED' || t.status === 'BROKEN_DOWN').length;

  // Ledger Table stats
  const totalTons = trips.reduce((sum, t) => sum + t.tonnage, 0);
  const totalFleetSize = Math.max(24, trips.length);
  const runPercent = totalFleetSize > 0 ? Math.round((activeDispatchesCount / totalFleetSize) * 100) : 0;
  const avgRatePerTon = totalTons > 0 ? Math.round(totalRevenue / totalTons) : 2100;

  // 4. Live Array Filtering
  const filteredTrips = trips.filter(trip => {
    const matchesSource = selectedSource === 'All' || trip.source === selectedSource;
    const matchesDest = selectedDest === 'All' || trip.destination === selectedDest;
    const matchesTruck = trip.truckId.toLowerCase().includes(searchTruck.toLowerCase());
    return matchesSource && matchesDest && matchesTruck;
  });

  // Extract unique sources and destinations for filters
  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => { if (t.source) set.add(t.source); });
    return Array.from(set);
  }, [trips]);

  const uniqueDests = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => { if (t.destination) set.add(t.destination); });
    return Array.from(set);
  }, [trips]);

  return (
    <div className="w-full min-h-full p-6 space-y-6 bg-slate-50 font-sans text-slate-800">
      
      {/* Upper Title Area */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lorry Owner Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Real-time routing and active dispatch management</p>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded text-sm transition-colors font-bold shadow-sm flex items-center gap-1.5"
        >
          <Plus size={18} /> New Dispatch
        </button>
      </div>

      {/* Top Alert Banner */}
      <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-amber-850 font-bold text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          Please check, 3 new Load Contracts are available in the market for your action!
        </div>
        <button 
          onClick={() => router.push('/load-market')}
          className="bg-amber-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow hover:bg-amber-600 transition-colors shrink-0"
        >
          Click here
        </button>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Dispatches */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-500">
            <Truck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{activeDispatchesCount}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trucks on Road</div>
          </div>
        </div>

        {/* Card 2: Freight Revenue */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 text-2xl font-semibold w-12 h-12 flex items-center justify-center">
            ₹
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Freight Revenue</div>
          </div>
        </div>

        {/* Card 3: Successful Drop-offs */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{deliveredCount}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loads Delivered</div>
          </div>
        </div>

        {/* Card 4: Fleet Disruptions */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-500">
            <XCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{disruptionCount}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disruptions / Delays</div>
          </div>
        </div>

      </div>

      {/* High-Density Ledger Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-8">
        
        {/* Table Top Stats */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-amber-500"/> Dispatch Ledger
          </h2>
          
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5 text-xs uppercase tracking-wider">Fleet Running</span>
              <span className="text-xl font-black text-amber-600">
                {activeDispatchesCount}/{totalFleetSize}{' '}
                <span className="text-sm font-bold text-slate-400">({runPercent}%)</span>
              </span>
            </div>
            <div className="hidden md:block w-px bg-slate-200 h-10"></div>
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5 text-xs uppercase tracking-wider">Capacity Utilized</span>
              <span className="text-xl font-black text-slate-800">{totalTons} Tons</span>
            </div>
            <div className="hidden md:block w-px bg-slate-200 h-10"></div>
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5 text-xs uppercase tracking-wider">Avg Rate / Ton</span>
              <span className="text-xl font-black text-slate-800">₹{avgRatePerTon.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-white">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded text-sm text-slate-600 font-medium hover:border-amber-400 focus:border-amber-500 focus:outline-none bg-white min-w-[160px]"
          >
            <option value="All">Source: All</option>
            {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded text-sm text-slate-600 font-medium hover:border-amber-400 focus:border-amber-500 focus:outline-none bg-white min-w-[160px]"
          >
            <option value="All">Destination: All</option>
            {uniqueDests.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="relative flex-1 max-w-[240px]">
            <input
              type="text"
              placeholder="Search Truck ID..."
              value={searchTruck}
              onChange={(e) => setSearchTruck(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-600 font-medium hover:border-amber-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {(selectedSource !== 'All' || selectedDest !== 'All' || searchTruck) && (
            <button
              onClick={() => {
                setSelectedSource('All');
                setSelectedDest('All');
                setSearchTruck('');
              }}
              className="sm:ml-auto text-amber-600 text-sm font-bold flex items-center gap-1 hover:text-amber-700 p-1"
            >
              <Filter size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="p-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Syncing secure ledger stream...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-16 text-center text-sm text-slate-400 font-medium">
            No matching active dispatches found in ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 pl-6">Truck ID</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Dispatch / Status</th>
                  <th className="p-4">Freight Value</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4 text-center pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredTrips.map((trip) => {
                  const isDelayed = trip.status === 'DELAYED' || trip.status === 'BROKEN_DOWN';
                  const isTransit = trip.status === 'IN_TRANSIT';
                  const isDelivered = trip.status === 'DELIVERED';

                  // Format timestamp
                  let timeDisplay = '06:00 PM';
                  let dateDisplay = 'Today';
                  if (trip.timestamp) {
                    const dt = trip.timestamp.seconds 
                      ? new Date(trip.timestamp.seconds * 1000)
                      : new Date(trip.timestamp);
                    
                    if (!isNaN(dt.getTime())) {
                      timeDisplay = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      dateDisplay = dt.toDateString() === new Date().toDateString() ? 'Today' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    }
                  }

                  const capPercent = Math.round((trip.tonnage / 21) * 100);
                  const capColorClass = capPercent >= 100 ? 'text-emerald-600' : capPercent >= 80 ? 'text-amber-600' : 'text-slate-500';

                  return (
                    <tr key={trip.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100 last:border-0">
                      <td className="p-4 pl-6 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-slate-400" />
                          {trip.truckId}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{trip.source} - {trip.destination}</div>
                        <div className="text-xs text-slate-400 font-semibold">{trip.cargo}</div>
                      </td>
                      <td className="p-4">
                        <div>{timeDisplay} ({dateDisplay})</div>
                        {isDelayed ? (
                          <div className="text-xs text-red-500 font-bold flex items-center gap-1 mt-0.5 animate-pulse">
                            <AlertCircle size={12} /> Delayed / Incident
                          </div>
                        ) : isTransit ? (
                          <div className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> In Transit
                          </div>
                        ) : isDelivered ? (
                          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 size={12} /> Delivered
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 font-bold mt-0.5">Scheduled</div>
                        )}
                      </td>
                      <td className="p-4 font-black text-slate-800">
                        ₹{trip.freightValue.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span className={`${capColorClass} font-bold`}>{capPercent}%</span> ({trip.tonnage}/21T)
                      </td>
                      <td className="p-4 text-center pr-6">
                        <div className="flex items-center justify-center gap-2">
                          {trip.manifestUrl ? (
                            <a
                              href={trip.manifestUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded text-xs shadow-sm transition-colors"
                            >
                              View Manifest
                            </a>
                          ) : (
                            <button
                              disabled
                              className="bg-slate-100 text-slate-400 font-semibold py-1.5 px-3 rounded text-xs cursor-not-allowed"
                            >
                              No Manifest
                            </button>
                          )}
                          <button
                            onClick={() => setTrackedTrip(trip)}
                            className="border border-slate-200 hover:border-amber-400 text-slate-700 font-bold py-1.5 px-3 rounded text-xs shadow-sm hover:text-amber-600 bg-white transition-colors flex items-center gap-1"
                          >
                            <Eye size={12} className="text-amber-500" /> View Live Map
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Google Maps Telemetry Modal Overlay */}
      {trackedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                  {trackedTrip.truckId}
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">Telemetry Intercept</h3>
              </div>
              <button 
                onClick={() => setTrackedTrip(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Map Box Area */}
            <div className="flex-1 bg-slate-100 relative flex items-center justify-center">
              {!GOOGLE_MAPS_API_KEY ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold p-6 text-center">
                  Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in .env.local
                </div>
              ) : isLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={mapCenter}
                  zoom={9}
                  options={mapOptions}
                  onLoad={(map) => setModalMap(map)}
                >
                  {/* Render route directions tracing */}
                  {modalDirectionsResponse && (
                    <DirectionsRenderer
                      directions={modalDirectionsResponse}
                      options={{
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: '#f59e0b', // Brand gold polyline
                          strokeWeight: 4,
                          strokeOpacity: 0.8
                        }
                      }}
                    />
                  )}

                  {/* Render marker for tracked truck using vector heavy truck icon */}
                  <MarkerF
                    position={mapCenter}
                    onClick={() => {}}
                    icon={typeof window !== 'undefined' && window.google ? {
                      path: "M20,8h-3V4c0-1.1-0.9-2-2-2H3C1.9,2,1,2.9,1,4v11h2c0,1.66,1.34,3,3,3s3-1.34,3-3h6c0,1.66,1.34,3,3,3s3-1.34,3-3h2v-5 L20,8z M6,16.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S6.83,16.5,6,16.5z M18,16.5c-0.83,0-1.5-0.67-1.5-1.5 s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S18.83,16.5,18,16.5z M17,12h-4V4h7V12z",
                      fillColor: '#ef4444', // Red truck marker
                      fillOpacity: 1,
                      strokeWeight: 1,
                      strokeColor: '#ffffff',
                      scale: 1.5,
                      anchor: new window.google.maps.Point(12, 12),
                    } : undefined}
                  />

                  <InfoWindowF
                    position={mapCenter}
                    onCloseClick={() => {}}
                  >
                    <div className="space-y-1 p-1 max-w-xs text-slate-800">
                      <div className="text-sm font-black text-slate-900">{trackedTrip.truckId}</div>
                      <div className="text-xs text-amber-600 font-bold">
                        {trackedTrip.status.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold italic">
                        {trackedTrip.source} to {trackedTrip.destination}
                      </div>
                    </div>
                  </InfoWindowF>
                </GoogleMap>
              ) : (
                <div className="text-center z-10 p-6">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <Truck size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Loading Maps Telemetry...</p>
                  <p className="text-xs text-slate-400 mt-1">{trackedTrip.source} to {trackedTrip.destination}</p>
                </div>
              )}
            </div>

            {/* Manifest & Driver Readout */}
            <div className="p-6 border-t border-slate-200 bg-white space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider">Assigned Driver</span>
                  <span className="font-bold text-slate-800 text-sm">{trackedTrip.driverName}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider">Cargo Weight</span>
                  <span className="font-bold text-slate-800 text-sm">{trackedTrip.tonnage} Metric Tons</span>
                </div>
              </div>
              
              {/* Manifest view action */}
              {trackedTrip.manifestUrl && (
                <div className="pt-2">
                  <a
                    href={trackedTrip.manifestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center block bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded text-xs transition-colors"
                  >
                    View Manifest Document
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* New Dispatch Slider/Modal Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-slate-800">Manifest New Dispatch</h2>
                <p className="text-xs text-slate-400 font-semibold">Create a fresh trip in Firestore</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Lorry / Trip ID Reference
                </label>
                <input
                  value={lorryId}
                  onChange={(e) => setLorryId(e.target.value)}
                  placeholder="e.g., TN-30-F-9934"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Driver Name
                </label>
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g., Driver Kumar"
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Route Hub Destination
                </label>
                <select
                  value={manualDestination}
                  onChange={(e) => setManualDestination(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-800 focus:border-amber-400 focus:outline-none bg-white"
                >
                  <option value="Sankari, Tamil Nadu">Sankari Commercial Yard</option>
                  <option value="Mettur, Tamil Nadu">Mettur Checkpost Node</option>
                  <option value="Erode, Tamil Nadu">Erode Delivery Junction</option>
                  <option value="Chennai, Tamil Nadu">Chennai Central Port Terminal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Manifest Document (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setManifestFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full border border-slate-200 rounded p-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none bg-white file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded font-bold shadow-sm transition-colors mt-6 uppercase tracking-wider text-xs"
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

export default function FleetTracker() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-semibold animate-pulse">Loading Fleet Tracker...</div>}>
      <FleetTrackerContent />
    </Suspense>
  );
}
