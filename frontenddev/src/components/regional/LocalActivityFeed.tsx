// frontend/src/components/regional/LocalActivityFeed.tsx
import React, { useState, useMemo } from 'react';
import { PickupGame, SportType } from '../../types';
import { getStateName } from '../../data/usLocations';
import {
  MapPin, Activity, Trophy, Users, Zap, Megaphone,
  ArrowUpRight, Clock,
} from 'lucide-react';

/* ✅ DB activity shape */
export interface DBActivityItem {
  id: string;
  type: 'pickup' | 'tournament' | 'announcement';
  sport: string;
  title: string;
  description: string;
  location: string;
  city: string;
  state: string;
  time: string;
  attendeesCount?: number;
  gameId?: string;
  isHot?: boolean;
}

interface LocalActivityFeedProps {
  registeredCity?: string;
  registeredState?: string;
  pickupGames?: PickupGame[];
  selectedSport?: SportType;
  activities?: DBActivityItem[];
  onJoinGame?: (gameId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const LocalActivityFeed: React.FC<LocalActivityFeedProps> = ({
  registeredCity = 'Venice',
  registeredState = 'CA',
  pickupGames = [],
  selectedSport,
  activities = [],
  onJoinGame,
  onNavigateToTab,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'tournaments' | 'pickups' | 'alerts'
  >('all');

  const city = registeredCity || 'Venice';
  const stateCode = registeredState || 'CA';
  const stateName = getStateName(stateCode);
  const activeSport = selectedSport || 'basketball';
  const sportLabel = activeSport.charAt(0).toUpperCase() + activeSport.slice(1);

  /* ✅ Use DB activities, fallback to pickupGames if empty */
  const items = useMemo<DBActivityItem[]>(() => {
    if (activities.length > 0) return activities;

    // Fallback: use pickupGames prop
    return pickupGames
      .filter((g) => !selectedSport || g.sport === selectedSport)
      .slice(0, 10)
      .map((g) => ({
        id: `game_${g.id}`,
        type: 'pickup' as const,
        sport: g.sport,
        title: g.title || `${g.sport.toUpperCase()} Pickup Match`,
        description: `${g.currentPlayers || 0}/${g.maxPlayers || 10} players joined at ${g.courtName || 'Local Court'}`,
        location: g.courtName || g.address || city,
        city,
        state: stateCode,
        time: g.dateTime || 'Today',
        attendeesCount: g.currentPlayers || 0,
        gameId: g.id,
        isHot: true,
      }));
  }, [activities, pickupGames, selectedSport, city, stateCode]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'tournaments') return items.filter((i) => i.type === 'tournament');
    if (activeCategory === 'pickups') return items.filter((i) => i.type === 'pickup');
    if (activeCategory === 'alerts') return items.filter((i) => i.type === 'announcement');
    return items;
  }, [items, activeCategory]);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-5 md:p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-cyan-400 text-black rounded-2xl shadow-md">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-cyan-400/20 text-cyan-300 rounded font-mono border border-cyan-400/30">
                LOCAL ACTIVITY FEED
              </span>
              <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-lime-400" />
                {city}, {stateCode}
              </span>
            </div>
            <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
              Regional Happenings & {sportLabel} Alerts
            </h3>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10">
          {[
            { id: 'all', label: 'All' },
            { id: 'pickups', label: 'Pickups' },
            { id: 'tournaments', label: 'Tournaments' },
            { id: 'alerts', label: 'Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition ${
                activeCategory === tab.id
                  ? 'bg-cyan-400 text-black font-extrabold shadow-md'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-indigo-900/50 hover:bg-indigo-900/80 rounded-2xl border border-white/10 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  {item.isHot && (
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] font-mono font-black uppercase rounded border border-rose-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-rose-400 fill-rose-400" />
                      HOT
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase rounded ${
                      item.type === 'tournament'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : item.type === 'pickup'
                        ? 'bg-lime-400/20 text-lime-300 border border-lime-400/30'
                        : 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                    }`}
                  >
                    {item.type.toUpperCase()} • {item.sport.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-xs text-indigo-200/80 font-medium line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center space-x-3 text-[10px] text-indigo-300/80 font-mono pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    <span className="truncate max-w-[200px]">{item.location}</span>
                  </span>
                  {item.attendeesCount != null && item.attendeesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-lime-400" />
                      {item.attendeesCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-2 self-end sm:self-center">
                {item.type === 'pickup' && item.gameId && onJoinGame && (
                  <button
                    type="button"
                    onClick={() => onJoinGame(item.gameId!)}
                    className="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition"
                  >
                    Join Match
                  </button>
                )}

                {item.type === 'tournament' && onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('tournaments')}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition flex items-center space-x-1"
                  >
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {item.type === 'announcement' && onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('pickup-games')}
                    className="px-3.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl border border-white/10 transition"
                  >
                    Court Info
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-indigo-950/60 rounded-2xl border border-white/10 p-4 space-y-2">
            <Megaphone className="w-8 h-8 text-indigo-400/50 mx-auto" />
            <p className="text-xs text-indigo-200/70 font-semibold">
              No updates found for "{activeCategory}" in {city}, {stateCode}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};