// frontend/src/components/regional/RegionalSection.tsx
import React, { useState, useEffect } from 'react';
import { RegionalPerformanceCard } from './RegionalPerformanceCard';
import { TrendingLocalTournamentsCarousel } from './TrendingLocalTournamentsCarousel';
import { LocalActivityFeed } from './LocalActivityFeed';
import {
  fetchRegionalStatsAPI,
  fetchLocalTournamentsAPI,
  fetchLocalActivityAPI,
} from '../../services/regional.service';
import { AthleteProfile, PickupGame, SportType } from '../../types';
import { Sparkles, RefreshCw } from 'lucide-react';

interface RegionalSectionProps {
  user: AthleteProfile;
  primarySport: SportType;
  registeredCity?: string;
  registeredState?: string;
  pickupGames?: PickupGame[];
  onNavigateToTab: (tab: string) => void;
  onOpenProCheckout?: (msg?: string) => void;
  onJoinGame?: (gameId: string) => void;
}

export const RegionalSection: React.FC<RegionalSectionProps> = ({
  user,
  primarySport,
  registeredCity,
  registeredState,
  pickupGames = [],
  onNavigateToTab,
  onOpenProCheckout,
  onJoinGame,
}) => {
  const athleteId = (user as any)?.id;
  const city = registeredCity || (user as any)?.registeredCity || (user as any)?.city || 'New York';
  const state = registeredState || (user as any)?.registeredState || (user as any)?.state || 'NY';

  const [regionalStats, setRegionalStats] = useState<any>(null);
  const [localTournaments, setLocalTournaments] = useState<any[]>([]);
  const [localActivity, setLocalActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    if (!athleteId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 [RegionalSection] Fetching data for:', city, state, primarySport);

      const [stats, tourneys, activity] = await Promise.all([
        fetchRegionalStatsAPI(athleteId, primarySport),
        fetchLocalTournamentsAPI(city, state, primarySport, 10),
        fetchLocalActivityAPI(city, state, primarySport, 20),
      ]);

      console.log('✅ [RegionalSection] Loaded:', {
        stats,
        tournaments: tourneys.length,
        activity: activity.length,
      });

      setRegionalStats(stats);
      setLocalTournaments(tourneys);
      setLocalActivity(activity);
    } catch (err: any) {
      console.error('❌ [RegionalSection] Load failed:', err);
      setError(err?.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, city, state, primarySport]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!athleteId) return;
      setIsLoading(true);
      try {
        const [stats, tourneys, activity] = await Promise.all([
          fetchRegionalStatsAPI(athleteId, primarySport),
          fetchLocalTournamentsAPI(city, state, primarySport, 10),
          fetchLocalActivityAPI(city, state, primarySport, 20),
        ]);
        if (cancelled) return;
        setRegionalStats(stats);
        setLocalTournaments(tourneys);
        setLocalActivity(activity);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [athleteId, city, state, primarySport]);

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-indigo-900/40 border border-white/10 rounded-[2.5rem] p-6 animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-800 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-indigo-800 rounded w-1/3" />
                <div className="h-3 bg-indigo-800 rounded w-1/2" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center space-x-2 text-lime-400">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span className="text-xs font-mono">
                Loading {i === 1 ? 'regional rank' : i === 2 ? 'tournaments' : 'activity'}...
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-[2rem] text-center space-y-3">
        <p className="text-rose-300 font-bold text-sm">⚠️ Failed to load regional data</p>
        <p className="text-rose-400/70 text-xs">{error}</p>
        <button
          onClick={() => loadAll()}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RegionalPerformanceCard
        user={user}
        primarySport={primarySport}
        registeredCity={city}
        registeredState={state}
        regionalStats={regionalStats}
        onNavigateToLeaderboard={() => onNavigateToTab('leaderboard')}
        onOpenProCheckout={onOpenProCheckout}
      />

      <TrendingLocalTournamentsCarousel
        user={user}
        tournaments={localTournaments}
        selectedSport={primarySport}
        registeredCity={city}
        registeredState={state}
        onNavigateToTab={onNavigateToTab}
      />

      <LocalActivityFeed
        registeredCity={city}
        registeredState={state}
        pickupGames={pickupGames}
        selectedSport={primarySport}
        activities={localActivity}
        onJoinGame={onJoinGame}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};