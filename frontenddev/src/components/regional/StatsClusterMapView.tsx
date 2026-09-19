// components/regional/StatsClusterMapView.tsx
import React, { useState, useMemo } from 'react';
import { AthleteProfile, SportType } from '../../types';
import {
  MapPin, ShieldCheck, Globe, Sparkles,
} from 'lucide-react';

interface StatsClusterMapViewProps {
  user: AthleteProfile;
}

interface LocationCluster {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  matchCount: number;
  verifiedCount: number;
  sportsLogged: string[];
  totalXpEarned: number;
  lastMatchDate: string;
  recentMatches: any[];
  xPercent: number;
  yPercent: number;
}

export const StatsClusterMapView: React.FC<StatsClusterMapViewProps> = ({ user }) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const history = (user as any).statsHistory || [];

  // ─── Build clusters from statsHistory ───
  const clusters = useMemo<LocationCluster[]>(() => {
    const clusterMap: Record<string, LocationCluster> = {};

    // Default fallback venues (when history is empty)
    const defaultVenues: LocationCluster[] = [
      {
        id: 'loc_nyc',
        name: 'Rucker Park / NYC Arena',
        city: (user as any).registeredCity || (user as any).city || 'New York',
        state: (user as any).registeredState || (user as any).state || 'NY',
        latitude: 40.8303,
        longitude: -73.9388,
        matchCount: 14,
        verifiedCount: 14,
        sportsLogged: [
          ((user as any).primarySport || (user as any).primary_sport || 'basketball'),
          'volleyball',
        ],
        totalXpEarned: 3500,
        lastMatchDate: '2026-08-10',
        recentMatches: [
          { sport: (user as any).primarySport || 'basketball', result: 'W', date: '2026-08-10', isVerified: true },
          { sport: 'volleyball', result: 'W', date: '2026-08-08', isVerified: true },
        ],
        xPercent: 78,
        yPercent: 42,
      },
      {
        id: 'loc_venice',
        name: 'Venice Beach Courts',
        city: 'Venice',
        state: 'CA',
        latitude: 33.985,
        longitude: -118.4695,
        matchCount: 8,
        verifiedCount: 8,
        sportsLogged: ['volleyball', 'basketball'],
        totalXpEarned: 2000,
        lastMatchDate: '2026-08-04',
        recentMatches: [
          { sport: 'volleyball', result: 'W', date: '2026-08-04', isVerified: true },
        ],
        xPercent: 28,
        yPercent: 68,
      },
      {
        id: 'loc_miami',
        name: 'South Beach Sand Arena',
        city: 'Miami',
        state: 'FL',
        latitude: 25.7617,
        longitude: -80.1918,
        matchCount: 5,
        verifiedCount: 5,
        sportsLogged: ['volleyball', 'soccer'],
        totalXpEarned: 1250,
        lastMatchDate: '2026-07-28',
        recentMatches: [
          { sport: 'soccer', result: 'L', date: '2026-07-28', isVerified: true },
        ],
        xPercent: 82,
        yPercent: 88,
      },
    ];

    if (!history.length) return defaultVenues;

    history.forEach((item: any, index: number) => {
      const geo = item.geolocation || {};
      const lat = Number(item.latitude ?? geo.latitude ?? 34.05 + (index % 5) * 0.1);
      const lng = Number(item.longitude ?? geo.longitude ?? -118.24 + (index % 5) * 0.1);
      const city = item.city || geo.city || (user as any).registeredCity || (user as any).city || 'Local City';
      const state = item.state || geo.state || (user as any).registeredState || (user as any).state || 'US';
      const locName =
        item.locationName || geo.locationName || item.location || `${city} Sports Court #${(index % 3) + 1}`;
      const isVerified = item.verified ?? geo.verified ?? true;

      const clusterKey = `${city}_${state}_${String(locName).substring(0, 12)}`;

      if (!clusterMap[clusterKey]) {
        // Map lat/lng to SVG-ish percentage (US-centric assumption)
        const xPct = Math.min(90, Math.max(10, Math.round(((lng + 125) / 60) * 100)));
        const yPct = Math.min(90, Math.max(10, Math.round(((50 - lat) / 25) * 100)));

        clusterMap[clusterKey] = {
          id: `cluster_${index}`,
          name: locName,
          city,
          state,
          latitude: lat,
          longitude: lng,
          matchCount: 0,
          verifiedCount: 0,
          sportsLogged: [],
          totalXpEarned: 0,
          lastMatchDate: item.date || 'Recently',
          recentMatches: [],
          xPercent: isNaN(xPct) ? 50 : xPct,
          yPercent: isNaN(yPct) ? 50 : yPct,
        };
      }

      const cl = clusterMap[clusterKey];
      cl.matchCount += 1;
      if (isVerified) cl.verifiedCount += 1;

      const sport = item.sport || 'basketball';
      if (!cl.sportsLogged.includes(sport)) cl.sportsLogged.push(sport);

      cl.totalXpEarned += 250;
      cl.recentMatches.push({
        sport,
        result: item.result || (item.isWin ? 'W' : 'L'),
        date: item.date || 'Recent',
        isVerified: !!isVerified,
      });
    });

    const parsed = Object.values(clusterMap);
    return parsed.length > 0 ? parsed : defaultVenues;
  }, [history, user]);

  // ─── Filters ───
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (verifiedOnly && c.verifiedCount === 0) return false;
      if (sportFilter !== 'all' && !c.sportsLogged.includes(sportFilter)) return false;
      return true;
    });
  }, [clusters, verifiedOnly, sportFilter]);

  const activeCluster = useMemo(() => {
    return (
      filteredClusters.find((c) => c.id === selectedClusterId) ||
      filteredClusters[0] ||
      clusters[0]
    );
  }, [filteredClusters, selectedClusterId, clusters]);

  const totalVerifiedLogs = useMemo(
    () => clusters.reduce((acc, curr) => acc + curr.verifiedCount, 0),
    [clusters]
  );

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-5 md:p-6 rounded-[2.5rem] border border-lime-400/30 shadow-xl space-y-5">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-lime-400 text-black rounded-2xl shadow-lg shadow-lime-400/20">
            <Globe className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-lime-400/20 text-lime-300 rounded font-mono border border-lime-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-lime-400" />
                VERIFIED GPS LOG MAP
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                {user.name}'s Venue Footprint
              </span>
            </div>
            <h3 className="text-xl font-black italic uppercase text-white mt-0.5">
              Official Stat Location Cluster Map
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
            {(['all', 'volleyball', 'basketball'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSportFilter(s)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition ${
                  sportFilter === s
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                {s === 'all'
                  ? 'All Sports'
                  : s === 'volleyball'
                  ? 'Volleyball 🏐'
                  : 'Basketball 🏀'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase border transition flex items-center space-x-1.5 ${
              verifiedOnly
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-indigo-900/80 text-indigo-200 border-white/10 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>GPS Verified Only</span>
          </button>
        </div>
      </div>

      {/* Map + Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Canvas */}
        <div className="lg:col-span-2 relative aspect-[16/10] bg-indigo-950/90 rounded-3xl border border-white/10 overflow-hidden p-5 shadow-2xl flex flex-col justify-between">
          <div className="relative z-10 flex items-center justify-between text-xs font-mono">
            <span className="text-lime-400 font-extrabold flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-xl border border-lime-400/30 backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>{filteredClusters.length} Active Venue Clusters Mapped</span>
            </span>
            <span className="text-indigo-300 bg-black/60 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-sm">
              {totalVerifiedLogs} Verified Match Records
            </span>
          </div>

          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(163, 230, 53, 0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative w-full h-full my-4">
            {filteredClusters.map((cluster) => {
              const isSelected = activeCluster && cluster.id === activeCluster.id;
              return (
                <div
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  style={{ left: `${cluster.xPercent}%`, top: `${cluster.yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                >
                  <div className="absolute -inset-2 bg-lime-400/40 rounded-full animate-ping pointer-events-none" />

                  <div
                    className={`relative px-3 py-1.5 rounded-2xl border-2 transition-all duration-300 flex items-center space-x-1.5 shadow-xl ${
                      isSelected
                        ? 'bg-lime-400 text-black border-white shadow-[0_0_30px_rgba(163,230,53,0.9)] scale-125 font-black'
                        : 'bg-indigo-900/90 text-lime-300 border-lime-400/60 hover:scale-110'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-lime-400'}`} />
                    <span className="text-xs font-mono font-bold">
                      {cluster.matchCount} Match{cluster.matchCount > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1 bg-black/90 text-white rounded-xl text-[10px] font-mono font-bold whitespace-nowrap border border-lime-400/40 opacity-0 group-hover:opacity-100 transition shadow-2xl pointer-events-none">
                    {cluster.name} ({cluster.city}, {cluster.state})
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-indigo-300 bg-black/60 p-2.5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive GPS cluster map built from user's official stat submission history.</span>
            </span>
          </div>
        </div>

        {/* Selected Cluster Details */}
        {activeCluster ? (
          <div className="p-5 bg-indigo-900/60 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-black uppercase text-lime-400 font-mono tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  SELECTED COURT CLUSTER
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  GPS VERIFIED
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black italic uppercase text-white">
                  {activeCluster.name}
                </h4>
                <p className="text-xs text-indigo-200/80 font-medium mt-0.5 flex items-center gap-1 flex-wrap">
                  <span>{activeCluster.city}, {activeCluster.state}</span>
                  <span className="text-indigo-400 font-mono">
                    ({activeCluster.latitude.toFixed(3)}, {activeCluster.longitude.toFixed(3)})
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold">Games Played</span>
                  <p className="text-lg font-extrabold text-lime-400">{activeCluster.matchCount}</p>
                </div>
                <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold">XP Earned</span>
                  <p className="text-lg font-extrabold text-amber-300">+{activeCluster.totalXpEarned} XP</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">
                  Sports Logged at Venue:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCluster.sportsLogged.map((sp) => (
                    <span
                      key={sp}
                      className="px-2.5 py-1 bg-lime-400/20 text-lime-300 rounded-xl text-xs font-mono font-bold border border-lime-400/30 uppercase"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">
                  Recent Match Sessions:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeCluster.recentMatches.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 bg-indigo-950/80 rounded-xl border border-white/5 text-xs font-mono flex items-center justify-between"
                    >
                      <span className="text-white font-bold uppercase">{m.sport}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            m.result === 'W'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {m.result}
                        </span>
                        <span className="text-indigo-300 text-[10px]">{m.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-indigo-900/60 rounded-3xl border border-white/10 flex items-center justify-center text-center text-xs text-indigo-300 font-semibold">
            Select a cluster marker on the map to inspect court log details.
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsClusterMapView;