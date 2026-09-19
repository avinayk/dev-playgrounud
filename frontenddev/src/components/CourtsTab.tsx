import React, { useState, useMemo, useEffect } from 'react';
import { CourtPOI, PickupGame, AthleteProfile } from '../types';
import { CourtMapView } from './CourtMapView';
import { RegionalCoverageMap } from './regional/RegionalCoverageMap';
import { RegionInspectorCard } from './regional/RegionInspectorCard';
import { CourtStatusBadgeTooltip } from './common/CourtStatusBadgeTooltip';
import { CreateParkModal } from './CreateParkModal';
import {
  MapPin, Layers, Activity, Sparkles, Building2, Flame,
  ShieldCheck, Search, X, ArrowUpDown, Info, Clock,
  AlertTriangle, RotateCcw, Star, Compass, CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

/* ✅ MYSQL SERVICE */
import { fetchCourtsAPI } from '../services/courts.service';

interface CourtsTabProps {
  pickupGames: PickupGame[];
  onHostAtCourt: (court: CourtPOI) => void;
  onTriggerGeofenceAlert: (court: CourtPOI) => void;
  onOpenCreatePark?: () => void; // Optional — parent ke liye
  favoriteCourtIds?: string[];
  onToggleFavoriteCourt?: (courtId: string) => void;
  user?: AthleteProfile;
  athletes?: AthleteProfile[];
  onSelectAthlete?: (athlete: AthleteProfile) => void;
}

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const CourtsTab: React.FC<CourtsTabProps> = ({
  pickupGames,
  onHostAtCourt,
  onTriggerGeofenceAlert,
  onOpenCreatePark,
  favoriteCourtIds = [],
  onToggleFavoriteCourt,
  user,
  athletes = [],
  onSelectAthlete,
}) => {
  const [courts, setCourts] = useState<CourtPOI[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* ✅ NEW: Create Park Modal State */
  const [isCreateParkOpen, setIsCreateParkOpen] = useState(false);

  const [activeSubView, setActiveSubView] = useState<'all' | 'interactive_map' | 'density' | 'inspector'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'proximity' | 'rating' | 'active' | 'default'>('proximity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [showStatusGuide, setShowStatusGuide] = useState<boolean>(false);

  const registeredCity = user?.registeredCity || user?.location?.city || 'Venice';
  const registeredState = user?.registeredState || user?.location?.state || 'CA';
  const userLat = user?.location?.lat ?? 33.985;
  const userLng = user?.location?.lng ?? -118.4695;

  /* ═══════════════════════════════════════════
     ✅ FETCH COURTS FROM MYSQL
     ═══════════════════════════════════════════ */
  const loadCourts = async () => {
    setIsLoadingCourts(true);
    setFetchError(null);
    try {
      const data = await fetchCourtsAPI();
      const mapped: CourtPOI[] = data.map((c) => ({
        id: c.id,
        name: c.name,
        sport: c.sport as any,
        city: c.city,
        state: c.state,
        address: c.address || '',
        lat: c.lat || 0,
        lng: c.lng || 0,
        imageUrl:
          c.imageUrl ||
          'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80',
        rating: c.rating,
        activePlayersNow: c.activePlayersNow,
        distanceKm: 0,
        status: (c as any).status || 'verified',
        isIndoor: false,
        lighting: false,
        waterFountain: false,
        parkingAvailable: false,
        rimCondition: 'Pro Breakaway Glass',
        surfaceType: 'Asphalt',
      } as any));

      setCourts(mapped);
      console.log('✅ Loaded courts from MySQL:', mapped.length);
    } catch (err: any) {
      console.error('❌ Load courts failed:', err);
      setFetchError(err?.message || 'Failed to load courts');
    } finally {
      setIsLoadingCourts(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCourts(true);
    setFetchError(null);

    (async () => {
      try {
        const data = await fetchCourtsAPI();
        if (cancelled) return;
        const mapped: CourtPOI[] = data.map((c) => ({
          id: c.id,
          name: c.name,
          sport: c.sport as any,
          city: c.city,
          state: c.state,
          address: c.address || '',
          lat: c.lat || 0,
          lng: c.lng || 0,
          imageUrl:
            c.imageUrl ||
            'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80',
          rating: c.rating,
          activePlayersNow: c.activePlayersNow,
          distanceKm: 0,
          status: (c as any).status || 'verified',
          isIndoor: false,
          lighting: false,
          waterFountain: false,
          parkingAvailable: false,
          rimCondition: 'Pro Breakaway Glass',
          surfaceType: 'Asphalt',
        } as any));

        setCourts(mapped);
        console.log('✅ Loaded courts from MySQL:', mapped.length);
      } catch (err: any) {
        console.error('❌ Load courts failed:', err);
        if (!cancelled) setFetchError(err?.message || 'Failed to load courts');
      } finally {
        if (!cancelled) setIsLoadingCourts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ═══════════════════════════════════════════
     ✅ NEW: Handle "+ Add Park" Click
     ═══════════════════════════════════════════ */
  const handleOpenCreatePark = () => {
    console.log('➕ [CourtsTab] Opening Create Park Modal');
    triggerHaptic('medium');
    setIsCreateParkOpen(true);
  };

  /* ═══════════════════════════════════════════
     ✅ NEW: Handle Court Created (Refresh)
     ═══════════════════════════════════════════ */
  const handleCourtCreated = async (newCourt: any) => {
    console.log('✅ [CourtsTab] New court created:', newCourt);
    triggerHaptic('success');
    // Re-fetch from MySQL so we get the freshest data
    await loadCourts();
  };

  /* ───── Filtered + Sorted ───── */
  const filteredAndSortedCourts = useMemo(() => {
    let result = [...courts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.surfaceType && c.surfaceType.toLowerCase().includes(q)) ||
          (c.status && c.status.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => (c.status || 'verified') === statusFilter);
    }

    if (sortBy === 'proximity') {
      result.sort((a, b) => {
        const distA = calculateDistanceKm(userLat, userLng, a.lat, a.lng);
        const distB = calculateDistanceKm(userLat, userLng, b.lat, b.lng);
        return distA - distB;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'active') {
      result.sort((a, b) => (b.activePlayersNow || 0) - (a.activePlayersNow || 0));
    }

    return result;
  }, [courts, searchQuery, statusFilter, sortBy, userLat, userLng]);

  const handleClearFilters = () => {
    triggerHaptic('light');
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('proximity');
  };

  /* ───── Loading State ───── */
  if (isLoadingCourts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-lime-400 border-t-transparent" />
          <p className="text-sm font-bold text-indigo-300">
            Loading courts from server...
          </p>
        </div>
      </div>
    );
  }

  /* ───── Error State ───── */
  if (fetchError) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 bg-rose-500/10 border border-rose-500/40 rounded-3xl text-center text-white space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-sm font-bold">{fetchError}</p>
        <button
          onClick={loadCourts}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ───── Main Render ───── */
  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ═══════ HEADER BANNER ═══════ */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 rounded-[2.5rem] border border-lime-400/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-lime-400 text-black font-mono font-black text-[10px] uppercase rounded-md shadow">
                PLAYGROUND MAP NETWORK
              </span>
              <span className="text-xs font-mono text-indigo-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-lime-400" />
                {registeredCity}, {registeredState}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-wide flex items-center gap-2">
              Courts & Maps{' '}
              <Sparkles className="w-6 h-6 text-lime-400 animate-pulse" />
            </h1>
            <p className="text-xs text-indigo-200/80 font-mono">
              Explore local basketball, volleyball & pickleball courts, density
              maps, and regional venue metrics.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Full View', icon: Layers },
              { id: 'interactive_map', label: 'Court Map', icon: MapPin },
              { id: 'density', label: 'Density Map', icon: Building2 },
              { id: 'inspector', label: 'Region Inspector', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubView(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-lime-400 text-black shadow-md'
                      : 'text-indigo-200 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ SEARCH / SORT / STATUS ═══════ */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courts by name, city, address, or surface..."
              className="w-full pl-10 pr-10 py-2.5 bg-black/60 border border-white/15 rounded-2xl text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:border-lime-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white p-1 rounded-full transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Sort */}
            <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-300 px-2.5 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-lime-400" />
                Sort:
              </span>
              {[
                { id: 'proximity', label: 'Proximity 📍', icon: Compass },
                { id: 'rating', label: 'Rating ⭐', icon: Star },
                { id: 'active', label: 'Active 🔥', icon: Flame },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSortBy(s.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black italic uppercase transition flex items-center gap-1 ${
                      sortBy === s.id
                        ? 'bg-lime-400 text-black shadow'
                        : 'text-indigo-200 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Status */}
            <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-300 px-2">
                Status:
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('all');
                }}
                className={`px-2 py-1 rounded-xl text-[11px] font-bold uppercase transition ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('verified');
                }}
                className={`px-2 py-1 rounded-xl text-[11px] font-bold uppercase transition flex items-center gap-1 ${
                  statusFilter === 'verified'
                    ? 'bg-emerald-500 text-black font-black'
                    : 'text-emerald-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('pending');
                }}
                className={`px-2 py-1 rounded-xl text-[11px] font-bold uppercase transition flex items-center gap-1 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-400 text-black font-black'
                    : 'text-amber-300 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                Pending
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowStatusGuide(!showStatusGuide);
              }}
              className={`p-2 rounded-2xl border transition flex items-center gap-1.5 text-xs font-mono ${
                showStatusGuide
                  ? 'bg-lime-400 text-black border-lime-400 font-bold'
                  : 'bg-black/60 text-indigo-300 border-white/10 hover:border-lime-400/50 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Badge Guide</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300/80 px-1 pt-1 border-t border-white/5">
          <div className="flex items-center space-x-2">
            <span>
              Showing{' '}
              <strong className="text-lime-400">
                {filteredAndSortedCourts.length}
              </strong>{' '}
              of {courts.length} courts
            </span>
          </div>
          {(searchQuery || statusFilter !== 'all' || sortBy !== 'proximity') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-lime-400 hover:text-lime-300 hover:underline flex items-center gap-1 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {showStatusGuide && (
          <div className="p-4 bg-indigo-950/90 border border-lime-400/40 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-xs font-black italic uppercase text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                <span>Court Verification & Badge Validation</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowStatusGuide(false)}
                className="text-indigo-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-950/50 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="uppercase text-[11px]">
                      Verified Court
                    </span>
                  </div>
                  <CourtStatusBadgeTooltip status="verified" />
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  Inspected by Playground League scouts for standard rim heights,
                  durable court surfacing, and lighting.
                </p>
              </div>
              <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                    <Clock className="w-4 h-4" />
                    <span className="uppercase text-[11px]">Pending Review</span>
                  </div>
                  <CourtStatusBadgeTooltip status="pending" />
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Community-submitted court awaiting verification by regional
                  league scouts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ EMPTY STATE / CONTENT ═══════ */}
      {filteredAndSortedCourts.length === 0 ? (
        <div className="p-10 bg-slate-900/80 rounded-[2.5rem] border border-dashed border-white/20 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black italic uppercase text-white">
            No Courts Found
          </h3>
          <p className="text-xs text-indigo-200/70">
            We couldn't find any courts matching{' '}
            <strong className="text-lime-400">
              "{searchQuery || statusFilter}"
            </strong>
            .
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <>
          {(activeSubView === 'all' || activeSubView === 'density') && (
            <section className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-black uppercase text-lime-400 px-1">
                <Building2 className="w-4 h-4" />
                <span>Regional Coverage & Court Density Analytics</span>
              </div>
              <RegionalCoverageMap
                registeredCity={registeredCity}
                registeredState={registeredState}
                courts={filteredAndSortedCourts}
              />
            </section>
          )}

          {(activeSubView === 'all' || activeSubView === 'interactive_map') && (
            <section className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-black uppercase text-lime-400 px-1">
                <MapPin className="w-4 h-4" />
                <span>Interactive Venue Locator & Live Check-in Map</span>
              </div>
              <CourtMapView
                courts={filteredAndSortedCourts}
                pickupGames={pickupGames}
                favoriteCourtIds={favoriteCourtIds}
                onToggleFavoriteCourt={onToggleFavoriteCourt}
                user={user}
                athletes={athletes}
                onSelectAthlete={onSelectAthlete}
                onHostAtCourt={onHostAtCourt}
                onTriggerGeofenceAlert={onTriggerGeofenceAlert}
                onOpenCreatePark={handleOpenCreatePark}
              />
            </section>
          )}

          {(activeSubView === 'all' || activeSubView === 'inspector') && (
            <section className="space-y-2 pt-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-black uppercase text-lime-400 px-1">
                <Activity className="w-4 h-4" />
                <span>City & Regional Hub Inspector</span>
              </div>
              <RegionInspectorCard
                user={user}
                registeredCity={registeredCity}
                registeredState={registeredState}
              />
            </section>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
         ✅ CREATE PARK MODAL
         ═══════════════════════════════════════════ */}
      <CreateParkModal
        isOpen={isCreateParkOpen}
        onClose={() => setIsCreateParkOpen(false)}
        onCreated={handleCourtCreated}
        user={{
          id: user?.id,
          registeredCity: user?.registeredCity,
          registeredState: user?.registeredState,
        }}
      />
    </div>
  );
};

export default CourtsTab;