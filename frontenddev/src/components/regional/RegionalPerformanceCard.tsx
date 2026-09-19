// frontend/src/components/regional/RegionalPerformanceCard.tsx
import React, { useState, useMemo } from 'react';
import { AthleteProfile, SportType } from '../../types';
import { getStateName } from '../../data/usLocations';
import {
  MapPin, Trophy, TrendingUp, Sparkles, ChevronRight,
  Building2, Globe, Lock,
} from 'lucide-react';

interface RegionalPerformanceCardProps {
  user: AthleteProfile;
  primarySport?: SportType;
  registeredCity?: string;
  registeredState?: string;
  regionalStats?: {
    rank: number;
    totalAthletes: number;
    avgXp: number;
    userXp: number;
    percentile: number;
    topSport: string;
    userLevel: number;
  } | null;
  onNavigateToLeaderboard?: () => void;
  onOpenProCheckout?: (msg?: string) => void;
}

export const RegionalPerformanceCard: React.FC<RegionalPerformanceCardProps> = ({
  user,
  primarySport = 'basketball',
  registeredCity,
  registeredState,
  regionalStats,
  onNavigateToLeaderboard,
  onOpenProCheckout,
}) => {
  const [scope, setScope] = useState<'local' | 'state' | 'national'>('local');

  const city = registeredCity || user.registeredCity || user.location?.city || 'Venice';
  const stateCode = registeredState || user.registeredState || user.location?.state || 'CA';
  const stateName = getStateName(stateCode);
  const isProUser = user.isPro || user.role === 'playground_pro';

  const sportInfo = useMemo(() => {
    const map: Record<string, { name: string; emoji: string }> = {
      volleyball: { name: 'Volleyball', emoji: '🏐' },
      soccer: { name: 'Soccer', emoji: '⚽' },
      pickleball: { name: 'Pickleball', emoji: '🏓' },
      baseball: { name: 'Baseball', emoji: '⚾' },
      softball: { name: 'Softball', emoji: '🥎' },
      football: { name: 'Football', emoji: '🏈' },
      tennis: { name: 'Tennis', emoji: '🎾' },
      basketball: { name: 'Basketball', emoji: '🏀' },
    };
    return map[primarySport] || map.basketball;
  }, [primarySport]);

  const { name: sportName, emoji: sportEmoji } = sportInfo;

  /* ═══════════════════════════════════════════
     DISPLAY METRICS — use real stats if available
     ═══════════════════════════════════════════ */
  const performanceData = useMemo(() => {
    if (regionalStats) {
      // ✅ Real data from backend
      const rank = regionalStats.rank;
      const total = regionalStats.totalAthletes;
      const pct = regionalStats.percentile;

      let title = `Top ${100 - pct}% ${sportName}`;
      if (pct >= 95) title = `Top 5% ${sportName} Elite`;
      else if (pct >= 90) title = `Top 10% ${sportName} Vanguard`;
      else if (pct >= 75) title = `Regional ${sportName} Contender`;

      return {
        percentile: pct,
        rank,
        totalPlayers: total,
        title,
      };
    }

    // Fallback (no data yet)
    return {
      percentile: 50,
      rank: 0,
      totalPlayers: 0,
      title: `Regional ${sportName} Contender`,
    };
  }, [regionalStats, sportName]);

  const sportStat = user.stats?.[primarySport] as any;
  const totalGames = (user.winCount || 0) + (user.lossCount || 0);
  const winRate = totalGames > 0
    ? Math.round(((user.winCount || 0) / totalGames) * 100)
    : 0;

  const handleSelectScope = (targetScope: 'local' | 'state' | 'national') => {
    if (targetScope !== 'local' && !isProUser) {
      onOpenProCheckout?.(
        `State and National Regional Standings are exclusive to Playground PRO athletes. Upgrade to unlock ${targetScope.toUpperCase()} leaderboards!`
      );
      return;
    }
    setScope(targetScope);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-5 md:p-6 rounded-[2.5rem] border border-lime-400/30 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:border-lime-400/60">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-lime-400 text-black rounded-2xl shadow-md">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-lime-400/20 text-lime-300 rounded font-mono border border-lime-400/30">
                REGIONAL STANDING
              </span>
              <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-400" />
                {city}, {stateCode}
              </span>
            </div>
            <h3 className="text-lg font-black italic uppercase text-white mt-0.5 flex items-center gap-2">
              <span>{sportName} Regional Performance</span>
            </h3>
          </div>
        </div>

        {/* Scope Toggle */}
        <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setScope('local')}
            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1 ${
              scope === 'local'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-indigo-200 hover:text-white'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span>Local</span>
          </button>

          {isProUser ? (
            <>
              <button
                type="button"
                onClick={() => setScope('state')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1 ${
                  scope === 'state'
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>State</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('national')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1 ${
                  scope === 'national'
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>National</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                onOpenProCheckout?.(
                  'State and National Regional Standings are exclusive to Playground PRO athletes!'
                )
              }
              className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Unlock PRO 👑</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Percentile */}
        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider">
            Regional Tier
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black italic text-lime-400">
              Top {Math.max(0, 100 - performanceData.percentile)}%
            </span>
          </div>
          <p className="text-[10px] font-medium text-indigo-300/80 truncate">
            {performanceData.title}
          </p>
        </div>

        {/* Rank */}
        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider">
            {scope === 'local' ? `${city} Rank` : scope === 'state' ? `${stateCode} Rank` : 'US Rank'}
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black italic text-white">
              #{performanceData.rank || '—'}
            </span>
            {performanceData.totalPlayers > 0 && (
              <span className="text-[11px] text-indigo-300 font-mono">
                / {performanceData.totalPlayers.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium text-emerald-300 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>
              {performanceData.totalPlayers > 0
                ? `Among ${performanceData.totalPlayers} athletes`
                : 'No athletes in region yet'}
            </span>
          </p>
        </div>

        {/* XP & Win Rate */}
        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider">
            Performance
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black italic text-amber-300">
              {(regionalStats?.userXp ?? user.xp ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-indigo-300 font-mono">XP</span>
          </div>
          <p className="text-[10px] font-medium text-indigo-300/80">
            {winRate}% Win Rate
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-indigo-200/70 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Ranked in {scope === 'local' ? `${city}, ${stateCode}` : scope === 'state' ? stateName : 'United States'}
          </span>
        </span>

        {onNavigateToLeaderboard && (
          <button
            type="button"
            onClick={onNavigateToLeaderboard}
            className="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition flex items-center space-x-1 shrink-0"
          >
            <span>View Full Leaderboard</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};