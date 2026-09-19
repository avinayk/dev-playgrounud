// frontend/src/components/regional/TrendingLocalTournamentsCarousel.tsx
import React, { useRef } from 'react';
import { AthleteProfile, SportType } from '../../types';
import {
  Trophy, MapPin, Calendar, Users, ChevronLeft, ChevronRight,
  Swords, Flame, ShieldCheck, ArrowRight,
} from 'lucide-react';

/* ✅ DB tournament shape */
export interface DBTournament {
  id: string;
  title: string;
  sport: string;
  city: string;
  state: string;
  courtName: string;
  address: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
  organizerName: string;
  organizerAvatar: string;
  maxTeams: number;
  currentTeams: number;
  prizePool: string;
  entryFee: string;
  bannerUrl: string | null;
}

interface TrendingLocalTournamentsCarouselProps {
  user?: AthleteProfile;
  tournaments?: DBTournament[];
  selectedSport?: SportType;
  registeredCity?: string;
  registeredState?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const TrendingLocalTournamentsCarousel: React.FC<TrendingLocalTournamentsCarouselProps> = ({
  user,
  tournaments = [],
  selectedSport,
  registeredCity,
  registeredState,
  onNavigateToTab,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const city = registeredCity || user?.registeredCity || user?.location?.city || 'Venice';
  const stateCode = registeredState || user?.registeredState || user?.location?.state || 'CA';

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getSportBadgeColor = (sport: string) => {
    const map: Record<string, string> = {
      volleyball: 'from-amber-400 to-amber-500 text-black',
      basketball: 'from-orange-500 to-amber-500 text-white',
      soccer: 'from-emerald-400 to-teal-500 text-black',
      pickleball: 'from-lime-400 to-emerald-500 text-black',
      baseball: 'from-rose-500 to-red-600 text-white',
      softball: 'from-rose-500 to-red-600 text-white',
      football: 'from-indigo-500 to-purple-600 text-white',
      tennis: 'from-yellow-400 to-lime-500 text-black',
    };
    return map[sport] || 'from-cyan-400 to-blue-500 text-black';
  };

  const getSportIcon = (sport: string) => {
    const map: Record<string, string> = {
      volleyball: '🏐', basketball: '🏀', soccer: '⚽', pickleball: '🏓',
      baseball: '⚾', softball: '🥎', football: '🏈', tennis: '🎾',
    };
    return map[sport] || '🏆';
  };

  const sportDisplayName = selectedSport
    ? selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)
    : '';

  /* ✅ No data → empty state */
  if (tournaments.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-6 rounded-[2.5rem] border border-amber-400/30 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-orange-400 text-black rounded-2xl shadow-lg">
            <Swords className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-black italic uppercase text-white">
              Trending Local Tournaments
            </h3>
            <p className="text-xs text-indigo-300">
              {city}, {stateCode}
            </p>
          </div>
        </div>
        <div className="p-8 text-center bg-indigo-950/60 rounded-3xl border-2 border-dashed border-amber-400/30 space-y-3">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
          <p className="text-sm font-bold text-white">
            No local tournaments yet in {city}
          </p>
          <p className="text-xs text-indigo-300">
            Tournaments will appear here once organized in your area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-5 rounded-[2.5rem] border border-amber-400/30 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-orange-400 text-black rounded-2xl shadow-lg shadow-amber-400/20">
            <Swords className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                LOCAL ARENA BRACKETS
              </span>
              <span className="text-[10px] font-mono text-indigo-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-lime-400" />
                {city}, {stateCode}
              </span>
            </div>
            <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
              Trending Local {sportDisplayName ? `${sportDisplayName} ` : ''}Tournaments 🔥
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('tournaments')}
              className="text-xs font-mono font-black text-lime-400 hover:text-lime-300 flex items-center gap-1 transition px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-xl border border-white/10"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-2 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 rounded-xl border border-white/10 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-2 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 rounded-xl border border-white/10 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex items-stretch space-x-4 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {tournaments.map((tourney) => {
          const fillPercentage = Math.min(
            100,
            Math.round((tourney.currentTeams / tourney.maxTeams) * 100)
          );

          return (
            <div
              key={tourney.id}
              className="snap-start shrink-0 w-[300px] sm:w-[340px] bg-slate-900/90 rounded-2xl border border-white/10 hover:border-amber-400/50 p-4 transition-all duration-300 flex flex-col justify-between space-y-3 group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${getSportBadgeColor(tourney.sport)} shadow`}>
                  {getSportIcon(tourney.sport)} {tourney.sport.toUpperCase()}
                </span>

                {tourney.status === 'in_progress' ? (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold rounded-md flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3 text-rose-400" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    OPEN
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black italic uppercase text-white group-hover:text-amber-300 transition line-clamp-1">
                  {tourney.title}
                </h4>
                <div className="text-xs text-indigo-300/80 font-mono flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span className="truncate">
                    {tourney.courtName || `${tourney.city} Arena`}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-indigo-300 uppercase font-black block">
                    Prize Pool
                  </span>
                  <span className="font-extrabold text-amber-300 text-xs truncate block">
                    {tourney.prizePool}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-indigo-300 uppercase font-black block">
                    Start Date
                  </span>
                  <span className="font-bold text-white text-xs truncate block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                    {new Date(tourney.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-indigo-300/80 font-bold flex items-center gap-1">
                    <Users className="w-3 h-3 text-lime-400" />
                    Teams
                  </span>
                  <span className="text-white font-extrabold">
                    {tourney.currentTeams} / {tourney.maxTeams}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab && onNavigateToTab('tournaments')}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-black font-black italic uppercase text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md shadow-amber-400/20"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>View Bracket</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};