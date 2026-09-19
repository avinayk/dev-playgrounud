// components/PickupGamesTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Flame,
  Trophy,
  RefreshCw,
  Loader2,
  Search,
  List,
  Grid3X3,
  ChevronDown,
  Layers,
  Share2,
  CheckCheck,
  Send,
} from 'lucide-react';
import { InvitePlayersModal } from './InvitePlayersModal';
import {
  fetchPickupGames,
  createPickupGame,
  joinGame,
  leaveGame,
  fetchParticipantsBulk,
  fetchUserJoinedGames,
} from '../services/pickupGames';
import { getSocket } from '../services/socket';
import { PickupGamesMap } from './PickupGamesMap';
import type { PickupGame, ViewMode, PickupGameFormData } from '../types/pickupGames';
import { AthleteProfile } from '../types/auth.types';
import toast from 'react-hot-toast';
import { HostGameModal } from './HostGameModal';
import { ShareGameModal } from './ShareGameModal';
import { MvpModal } from './MvpModal';

interface PickupGamesTabProps {
  athlete: AthleteProfile | null;
  onHostGame?: () => void;
  refreshKey?: number;
  onStartGame: () => void;
  mySport?: string;
  athleteCity?: string;
  athleteState?: string;
}

/* ✅ Sports with filter value + emoji */
const SPORTS = [
  { value: 'all', label: 'All Sports', emoji: '🏆' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'baseball', label: 'Baseball', emoji: '⚾' },
  { value: 'softball', label: 'Softball', emoji: '🥎' },
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'football', label: 'Football', emoji: '🏈' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'pickleball', label: 'Pickleball', emoji: '🏓' },
];

const LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'casual', label: 'Casual' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'varsity', label: 'Varsity / Intramural' },
];

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  soccer: '⚽',
  volleyball: '🏐',
  football: '🏈',
  tennis: '🎾',
  pickleball: '🏓',
};

export const PickupGamesTab: React.FC<PickupGamesTabProps> = ({
  athlete,
  onHostGame,
  refreshKey = 0,
  onStartGame,
  mySport = 'basketball',
  athleteCity,
  athleteState,
}) => {
  const [games, setGames] = useState<PickupGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [sport, setSport] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Host Game Modal
  const [isHostGameModalOpen, setIsHostGameModalOpen] = useState(false);

  // SHARE MODAL STATE
  const [shareGame, setShareGame] = useState<PickupGame | null>(null);

  // ✅ MVP MODAL STATE
  const [mvpGame, setMvpGame] = useState<PickupGame | null>(null);

  // INVITE MODAL STATE
  const [inviteGame, setInviteGame] = useState<PickupGame | null>(null);

  // JOIN / LEAVE / PARTICIPANTS STATE
  const [joinedGameIds, setJoinedGameIds] = useState<Set<string>>(new Set());
  const [participantsMap, setParticipantsMap] = useState<Record<string, any[]>>({});
  const [processingGameId, setProcessingGameId] = useState<string | null>(null);

  /* ─── Load Games ─── */
  const loadGames = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await fetchPickupGames({
        search,
        sport,
        level,
        date: dateFilter,
      });
      setGames(data);
    } catch (err) {
      console.error('❌ Failed to load pickup games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ─── Debounced reload ─── */
  useEffect(() => {
    const timer = setTimeout(() => loadGames(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sport, level, dateFilter, refreshKey]);

  /* ─── Load joined games ─── */
  useEffect(() => {
    if (!athlete?.id) {
      setJoinedGameIds(new Set());
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const ids = await fetchUserJoinedGames(athlete.id);
        if (!cancelled) setJoinedGameIds(new Set(ids));
      } catch (err) {
        console.error('❌ Load joined games:', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [athlete?.id]);

  /* ─── Load participants when games change ─── */
  useEffect(() => {
    if (!games.length) {
      setParticipantsMap({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const ids = games.map((g) => g.id);
        const data = await fetchParticipantsBulk(ids);
        if (!cancelled) setParticipantsMap(data);
      } catch (err) {
        console.error('❌ Load participants:', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [games]);

  /* ═══════════════════════════════════════════
     ✅ REAL-TIME SOCKET — WATCH ALL GAMES
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athlete?.id || games.length === 0) return;

    const socket = getSocket();
    const gameIds = games.map((g) => g.id);

    // ✅ Watch all displayed games
    gameIds.forEach((id) => {
      socket.emit('game:watch', id);
    });

    console.log('👀 Watching games:', gameIds);

    return () => {
      gameIds.forEach((id) => {
        socket.emit('game:unwatch', id);
      });
    };
  }, [athlete?.id, games.length]);

  /* ═══════════════════════════════════════════
     ✅ REAL-TIME SOCKET — EVENT LISTENERS
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athlete?.id) return;

    const socket = getSocket();
    socket.emit('user:join', athlete.id);

    /* ✅ Participant Joined */
    const handleParticipantJoined = async (payload: {
      gameId: string;
      athleteId: string;
      athleteName: string;
      joinedAt: string;
    }) => {
      console.log('👥 Player joined (real-time):', payload);

      // Show toast (except own join)
      if (payload.athleteId !== athlete.id) {
        toast.success(`🎉 ${payload.athleteName} joined the game!`, {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#065f46',
            color: '#fff',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          },
        });
      }

      // ✅ Refresh participants for that game
      try {
        const data = await fetchParticipantsBulk([payload.gameId]);
        setParticipantsMap((prev) => ({
          ...prev,
          [payload.gameId]: data[payload.gameId] || [],
        }));
      } catch (e) {
        console.error('Refresh participants failed:', e);
      }

      // ✅ Refresh game list (update count)
      loadGames(false).catch((err) =>
        console.error('Background refresh failed:', err)
      );
    };

    /* ✅ Participant Left */
    const handleParticipantLeft = async (payload: {
      gameId: string;
      athleteId: string;
      athleteName: string;
    }) => {
      console.log('🚪 Player left (real-time):', payload);

      if (payload.athleteId !== athlete.id) {
        toast(`${payload.athleteName} left the game`, {
          icon: '🚪',
          duration: 3000,
          position: 'top-right',
        });
      }

      try {
        const data = await fetchParticipantsBulk([payload.gameId]);
        setParticipantsMap((prev) => ({
          ...prev,
          [payload.gameId]: data[payload.gameId] || [],
        }));
      } catch (e) {
        console.error('Refresh failed:', e);
      }

      loadGames(false).catch((err) =>
        console.error('Background refresh failed:', err)
      );
    };

    /* ✅ Vote Cast (broadcast) */
    const handleVoteCast = (payload: {
      gameId: string;
      voterId: string;
      votedForId: string;
      voterName: string;
      votedForName: string;
    }) => {
      console.log('🗳️ Vote cast (real-time):', payload);

      if (payload.voterId !== athlete.id) {
        toast(
          `${payload.voterName} voted for ${payload.votedForName} 🗳️`,
          {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#1e1b4b',
              color: '#fff',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            },
          }
        );
      }
    };

    /* ✅ MVP Data Updated */
    const handleMvpUpdated = (payload: {
      gameId: string;
      participants: any[];
      totalVotes: number;
    }) => {
      console.log('📊 MVP updated (real-time):', payload);

      // ✅ Dispatch event to MvpModal
      window.dispatchEvent(
        new CustomEvent('mvp:updated', {
          detail: payload,
        })
      );
    };

    socket.on('game:participant_joined', handleParticipantJoined);
    socket.on('game:participant_left', handleParticipantLeft);
    socket.on('mvp:vote_cast', handleVoteCast);
    socket.on('mvp:updated', handleMvpUpdated);

    return () => {
      socket.off('game:participant_joined', handleParticipantJoined);
      socket.off('game:participant_left', handleParticipantLeft);
      socket.off('mvp:vote_cast', handleVoteCast);
      socket.off('mvp:updated', handleMvpUpdated);
    };
  }, [athlete?.id]);

  const handleOpenHostGame = () => {
    setIsHostGameModalOpen(true);
  };

  /* ─── Stats from games ─── */
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    if (!games.length) {
      return {
        totalAthletes: 0,
        activeCourts: 0,
        liveGames: 0,
        densityLevel: 'Low' as const,
        mapCenter: { lat: 40.7128, lng: -74.006 },
      };
    }

    const activeCourts = new Set(games.map((g) => g.location)).size;
    const uniqueCreators = new Set(games.map((g) => g.creatorId)).size;
    const liveGames = games.filter((g) => g.date >= today).length;

    let densityLevel: 'Low' | 'Moderate' | 'High' | 'Extreme' = 'Low';
    if (liveGames > 20) densityLevel = 'Extreme';
    else if (liveGames > 10) densityLevel = 'High';
    else if (liveGames > 3) densityLevel = 'Moderate';

    const withCoords = games.filter((g) => {
      const lat = Number(g.lat);
      const lng = Number(g.lng);
      return (
        g.lat != null &&
        g.lng != null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
      );
    });

    let mapCenter = { lat: 40.7128, lng: -74.006 };

    if (withCoords.length > 0) {
      const sumLat = withCoords.reduce((s, g) => s + Number(g.lat), 0);
      const sumLng = withCoords.reduce((s, g) => s + Number(g.lng), 0);
      const avgLat = sumLat / withCoords.length;
      const avgLng = sumLng / withCoords.length;

      if (isFinite(avgLat) && isFinite(avgLng)) {
        mapCenter = { lat: avgLat, lng: avgLng };
      }
    }

    return {
      totalAthletes: uniqueCreators,
      activeCourts,
      liveGames,
      densityLevel,
      mapCenter,
    };
  }, [games]);

  /* ─── Count games per sport ─── */
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: games.length };
    games.forEach((g) => {
      counts[g.sport] = (counts[g.sport] ?? 0) + 1;
    });
    return counts;
  }, [games]);

  /* ─── Games with coordinates ─── */
  const gamesWithCoords = useMemo(() => {
    return games.filter((g) => {
      const lat = Number(g.lat);
      const lng = Number(g.lng);
      return (
        g.lat != null &&
        g.lng != null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng)
      );
    });
  }, [games]);

  const hasAnyCoordinates = gamesWithCoords.length > 0;

  /* ─── Region name ─── */
  const regionName = useMemo(() => {
    if (athleteCity && athleteState) return `${athleteCity} (${athleteState})`;
    if (athleteState) return athleteState;
    return 'Your Region';
  }, [athleteCity, athleteState]);

  /* ─── Density class ─── */
  const densityClass = useMemo(() => {
    const d = stats.densityLevel;
    return {
      Extreme: 'bg-orange-500/20 text-orange-300',
      High: 'bg-lime-400/20 text-lime-300',
      Moderate: 'bg-yellow-500/20 text-yellow-300',
      Low: 'bg-indigo-500/20 text-indigo-300',
    }[d];
  }, [stats.densityLevel]);

  /* ─── Save Host Game ─── */
  const handleSaveHostGame = async (gameData: PickupGameFormData): Promise<void> => {
    if (!athlete?.id) {
      toast.error('You must be logged in to host a game.');
      throw new Error('Not authenticated');
    }

    toast.loading('Creating pickup game...', {
      id: 'host-game-loading',
      position: 'top-right',
    });

    try {
      const created = await createPickupGame(gameData, athlete.id);
      console.log('✅ Saved to DB:', created);

      toast.success('🏀 Pickup game created successfully!', {
        id: 'host-game-loading',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#065f46',
          color: '#fff',
          border: '1px solid rgba(52, 211, 153, 0.3)',
        },
        icon: '🎉',
      });

      setGames((prev) => [created, ...prev]);

      setSport('all');
      setSearch('');
      setDateFilter('');
      setLevel('all');

      loadGames(false).catch((err) =>
        console.error('Background refresh failed:', err)
      );

      if (typeof onStartGame === 'function') {
        onStartGame();
      }

      setIsHostGameModalOpen(false);
    } catch (err) {
      console.error('❌ Save failed:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to create game',
        { id: 'host-game-loading', position: 'top-right' }
      );
      throw err;
    }
  };

  /* ─── Join Game ─── */
  const handleJoin = async (gameId: string) => {
    if (!athlete?.id) {
      toast.error('Please log in to join');
      return;
    }

    setProcessingGameId(gameId);
    try {
      await joinGame(gameId, athlete.id);
      toast.success('🎉 Joined the game!');

      setJoinedGameIds((prev) => new Set([...prev, gameId]));

      await loadGames(false);

      const data = await fetchParticipantsBulk([gameId]);
      setParticipantsMap((prev) => ({
        ...prev,
        [gameId]: data[gameId] || [],
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setProcessingGameId(null);
    }
  };

  /* ─── Leave Game ─── */
  const handleLeave = async (gameId: string) => {
    if (!athlete?.id) return;

    setProcessingGameId(gameId);
    try {
      await leaveGame(gameId, athlete.id);
      toast.success('Left the game');

      setJoinedGameIds((prev) => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });

      await loadGames(false);
      const data = await fetchParticipantsBulk([gameId]);
      setParticipantsMap((prev) => ({
        ...prev,
        [gameId]: data[gameId] || [],
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to leave');
    } finally {
      setProcessingGameId(null);
    }
  };

  return (
    <>
      <div className="text-white p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Host Game Modal */}
        <HostGameModal
          isOpen={isHostGameModalOpen}
          onClose={() => setIsHostGameModalOpen(false)}
          onSave={handleSaveHostGame}
          user={
            athlete
              ? {
                  id: athlete.id,
                  name: athlete.name,
                  level: athlete.level,
                }
              : undefined
          }
        />

        {/* Share Game Modal */}
        <ShareGameModal
          isOpen={shareGame !== null}
          onClose={() => setShareGame(null)}
          game={
            shareGame
              ? {
                  id: shareGame.id,
                  title: shareGame.title,
                  location: shareGame.location,
                  date: shareGame.date,
                  time: shareGame.time,
                }
              : null
          }
        />

        {/* ✅ MVP Modal */}
        <MvpModal
          isOpen={mvpGame !== null}
          onClose={() => setMvpGame(null)}
          game={
            mvpGame
              ? {
                  id: mvpGame.id,
                  title: mvpGame.title,
                  location: mvpGame.location,
                }
              : null
          }
          currentUserId={athlete?.id ?? null}
        />

        {/* Invite Players Modal */}
        <InvitePlayersModal
          isOpen={inviteGame !== null}
          onClose={() => setInviteGame(null)}
          game={
            inviteGame
              ? {
                  id: inviteGame.id,
                  title: inviteGame.title,
                  location: inviteGame.location,
                  date: inviteGame.date,
                  time: inviteGame.time,
                  sport: inviteGame.sport,
                }
              : null
          }
          participants={inviteGame ? participantsMap[inviteGame.id] || [] : []}
          currentUserId={athlete?.id ?? null}
        />

        {/* ─────────── PAGE HEADER ─────────── */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-indigo-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                OpenStreetMap Regional Overlay
              </span>
              <span className="text-xs text-indigo-300 font-semibold">
                State of {athleteState || 'New York'}
                {athleteState ? ` (${athleteState})` : ' (NY)'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black italic uppercase text-white leading-tight">
              Regional Coverage &amp; Court Density Map
            </h1>
          </div>
        </div>

        {/* ─────────── MAP + INSPECTOR ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-indigo-950/60 rounded-3xl border border-white/10 overflow-hidden">
            <div className="relative h-[380px] bg-indigo-900">
              {hasAnyCoordinates ? (
                <>
                  <PickupGamesMap
                    games={gamesWithCoords}
                    center={stats.mapCenter}
                  />

                  <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-lime-400 flex items-center gap-2 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                    Live · {regionName}
                  </div>

                  <div className="absolute top-3 right-3 z-[1000] bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 pointer-events-none">
                    📍 {gamesWithCoords.length}{' '}
                    {gamesWithCoords.length === 1 ? 'Court' : 'Courts'}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <div className="p-4 bg-indigo-800/40 rounded-3xl mb-3 border border-white/10">
                    <MapPin className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black italic uppercase text-indigo-300 mb-1">
                    No Location Data Yet
                  </h3>
                  <p className="text-xs text-indigo-400/80 max-w-xs">
                    {games.length > 0
                      ? "Hosted games don't have coordinates. Select a venue from the dropdown to enable map view."
                      : 'Host your first game to see it on the map.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 px-5 py-2.5 text-xs border-t border-white/10 bg-indigo-950/80">
              <LegendDot color="bg-orange-500" label="Extreme Density" />
              <LegendDot color="bg-lime-400" label="High Density" />
              <LegendDot color="bg-emerald-400" label="Verified Courts" />
            </div>
          </div>

          <div className="bg-indigo-950/60 rounded-3xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-lime-400" />
                <span className="text-xs font-bold uppercase text-lime-400 tracking-wider">
                  Region Inspector
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${densityClass}`}
              >
                {stats.densityLevel} Density
              </span>
            </div>

            <h3 className="text-xl font-black italic uppercase text-white mb-1">
              {regionName}
            </h3>
            <p className="text-xs text-indigo-300 mb-5">
              {games.length > 0
                ? `${games.length} pickup ${
                    games.length === 1 ? 'game' : 'games'
                  } in your area.`
                : 'No games in your area yet.'}
            </p>

            <div className="space-y-2.5">
              <InspectorRow
                label="Registered Athletes"
                value={stats.totalAthletes.toLocaleString()}
              />
              <InspectorRow
                label="Active Courts Listed"
                value={`${stats.activeCourts} Courts`}
              />
              <InspectorRow
                label="Pickup Games Live"
                value={`${stats.liveGames} Matches Today`}
                valueClass="text-lime-400"
              />
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-indigo-400">{regionName} Total Courts:</span>
                <span className="font-bold text-white">{stats.activeCourts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-400">
                  {regionName} Active Athlete Base:
                </span>
                <span className="font-bold text-white">
                  {stats.totalAthletes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-indigo-400">Mapped Courts:</span>
                <span
                  className={`font-bold ${
                    hasAnyCoordinates ? 'text-lime-400' : 'text-amber-400'
                  }`}
                >
                  {gamesWithCoords.length} / {games.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── FILTER BAR ─────────── */}
        <div className="flex items-center gap-2 flex-wrap bg-indigo-950/40 p-2 rounded-2xl border border-white/5">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search venues or games..."
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-indigo-400/60 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition outline-none"
            />
          </div>

          <button
            onClick={() => setSport(mySport)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black italic uppercase whitespace-nowrap transition ${
              sport === mySport
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                : 'bg-indigo-900/60 text-indigo-300 hover:text-white hover:bg-indigo-800/60'
            }`}
          >
            My Sport: {mySport} {SPORT_EMOJI[mySport] ?? '🏀'}
          </button>

          <button
            onClick={() => setSport('all')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black italic uppercase whitespace-nowrap transition ${
              sport === 'all'
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                : 'bg-indigo-900/60 text-indigo-300 hover:text-white hover:bg-indigo-800/60'
            }`}
          >
            All Sports
          </button>

          <FilterDropdown
            value={sport}
            onChange={setSport}
            options={SPORTS.map((s) => ({
              ...s,
              label: `${s.label}${
                sportCounts[s.value] != null ? ` (${sportCounts[s.value]})` : ''
              }`,
            }))}
            width="min-w-[150px]"
          />

          <FilterDropdown
            value={level}
            onChange={setLevel}
            options={LEVELS}
            width="min-w-[130px]"
          />

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-indigo-900/60 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:border-lime-400 transition outline-none [color-scheme:dark]"
            />
          </div>

          <button
            onClick={() => loadGames(true)}
            disabled={refreshing}
            className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800 rounded-xl transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 text-indigo-300 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>

          <div className="flex bg-indigo-900/60 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1 transition ${
                viewMode === 'list'
                  ? 'bg-lime-400 text-black'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1 transition ${
                viewMode === 'grid'
                  ? 'bg-lime-400 text-black'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Grid
            </button>
          </div>

          {onHostGame && (
            <button
              onClick={handleOpenHostGame}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black italic uppercase text-xs rounded-xl transition shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5" /> Host
            </button>
          )}
        </div>

        {/* ─────────── GAMES LIST / GRID ─────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-indigo-300">
            <Loader2 className="w-10 h-10 animate-spin text-lime-400 mb-3" />
            <p className="font-bold">Loading pickup games...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-6 text-center">
            <p className="text-red-300 font-bold mb-2">❌ {error}</p>
            <button
              onClick={() => loadGames()}
              className="mt-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl text-sm font-bold transition"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="bg-indigo-900/40 backdrop-blur-sm rounded-[2.5rem] p-12 border border-white/10 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-lime-400/30 animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-3 rounded-full border border-white/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-950 border border-white/10 flex items-center justify-center relative overflow-hidden">
                  <span className="text-3xl">🏀</span>
                </div>
              </div>
            </div>
            <h2 className="text-xl font-black italic uppercase text-white mb-2">
              No Scheduled Pickup Runs Found
            </h2>
            <p className="text-indigo-300 mb-6 max-w-md mx-auto">
              {sport !== 'all'
                ? `There are currently no active pickup games matching "${sport.toUpperCase()}".`
                : 'Try different filters or be the first to host a game!'}
            </p>
            {onHostGame && (
              <button
                onClick={handleOpenHostGame}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black italic uppercase rounded-2xl transition shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
              >
                <Flame className="w-5 h-5" /> Host First Game
              </button>
            )}
          </div>
        )}

        {!loading && !error && games.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                : 'space-y-4'
            }
          >
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onShare={() => setShareGame(game)}
                onInvite={() => setInviteGame(game)}
                onMvp={() => setMvpGame(game)}
                currentUserId={athlete?.id ?? null}
                isJoined={joinedGameIds.has(game.id)}
                onJoin={handleJoin}
                onLeave={handleLeave}
                participants={participantsMap[game.id] || []}
                processing={processingGameId === game.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────
   Helper Components
   ───────────────────────────────────────────── */

const LegendDot: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
    <span className="text-indigo-300">{label}</span>
  </div>
);

const InspectorRow: React.FC<{
  label: string;
  value: string;
  valueClass?: string;
}> = ({ label, value, valueClass = 'text-white' }) => (
  <div className="flex items-center justify-between bg-indigo-900/60 px-3.5 py-2.5 rounded-xl">
    <span className="text-xs text-indigo-300">{label}</span>
    <span className={`text-sm font-black ${valueClass}`}>{value}</span>
  </div>
);

const FilterDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; emoji?: string }[];
  width?: string;
}> = ({ value, onChange, options, width = '' }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none bg-indigo-900/60 border border-white/10 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white font-bold uppercase focus:border-lime-400 transition outline-none ${width}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-indigo-950">
          {o.emoji ? `${o.emoji} ` : ''}
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
  </div>
);

/* ─────────────────────────────────────────────
   Game Card
   ───────────────────────────────────────────── */
const GameCard: React.FC<{
  game: PickupGame;
  onShare: () => void;
  onInvite: () => void;
  onMvp: () => void;
  currentUserId?: string | null;
  isJoined?: boolean;
  onJoin?: (gameId: string) => void;
  onLeave?: (gameId: string) => void;
  participants?: any[];
  processing?: boolean;
}> = ({
  game,
  onShare,
  onInvite,
  onMvp,
  currentUserId,
  isJoined = false,
  onJoin,
  onLeave,
  participants = [],
  processing = false,
}) => {
  const isFull = game.currentPlayers >= game.maxPlayers;
  const isHost = currentUserId != null && currentUserId === game.creatorId;
  const slotsLeft = game.maxPlayers - game.currentPlayers;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const gameDate = new Date(dateStr);
      gameDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round(
        (gameDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) return "Today's Run";
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';

      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="bg-indigo-900/40 backdrop-blur-sm rounded-3xl p-5 border border-white/10 hover:border-lime-400/30 transition relative overflow-hidden">
      {/* HOSTED BY YOU BADGE */}
      {isHost && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[9px] font-black italic uppercase px-3 py-1 rounded-bl-xl shadow-lg">
          Hosted By You
        </div>
      )}

      {/* Top badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap pt-2">
        <span className="px-2.5 py-1 bg-lime-400 text-black rounded-full text-[10px] font-black italic uppercase">
          {SPORT_EMOJI[game.sport] ?? '🏀'} {game.sport}
        </span>
        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase">
          {game.competitiveLevel}
        </span>
        <span className="px-2.5 py-1 bg-lime-400/20 text-lime-300 rounded-full text-[10px] font-black italic uppercase">
          {formatDate(game.date)} 🔥
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-black italic uppercase text-white mb-2">
        {game.title}
      </h3>

      {/* Description */}
      {game.description && (
        <p className="text-xs text-indigo-300 mb-3 line-clamp-2">
          {game.description}
        </p>
      )}

      {/* Details */}
      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-indigo-200">
          <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="truncate font-semibold">{game.location}</span>
        </div>
        <div className="flex items-center gap-2 text-indigo-200">
          <Clock className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <span className="font-semibold">
            {formatDate(game.date)} • {formatTime(game.time)}
          </span>
        </div>
      </div>

      {/* Roster */}
      <div className="flex items-center justify-between pt-3 mb-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-lime-400" />
          <span className="text-xs font-bold text-white">
            Roster ({game.currentPlayers}/{game.maxPlayers})
          </span>
        </div>
        <span
          className={`text-xs font-black italic ${
            isFull ? 'text-red-400' : 'text-lime-400'
          }`}
        >
          {isFull ? '🔴 Full' : `${slotsLeft} spots open`}
        </span>
      </div>

      {/* Participants Avatars */}
      {participants.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((p, idx) => (
              <img
                key={p.id || p.athlete_id || idx}
                src={p.profilepicture || 'https://via.placeholder.com/32'}
                alt={p.name || 'Player'}
                title={p.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-950 border border-lime-400/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/32';
                }}
              />
            ))}
            {participants.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-indigo-800 text-lime-400 text-[10px] font-black flex items-center justify-center ring-2 ring-indigo-950 border border-lime-400/30">
                +{participants.length - 5}
              </div>
            )}
          </div>
          <span className="text-[10px] text-indigo-300 font-medium">
            {participants.length === 1
              ? `${participants[0].name} joined`
              : `${participants.length} players joined`}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onShare}
          className="flex-1 py-2.5 bg-indigo-800/60 hover:bg-indigo-700 text-white font-black italic uppercase text-xs rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" />
          Quick Invite
        </button>

        {/* MVP + Send icon combined */}
        <div className="flex items-center bg-amber-400 hover:bg-amber-300 text-black rounded-xl overflow-hidden transition">
          <button
            onClick={onMvp}
            className="px-3 py-2.5 font-black italic uppercase text-xs flex items-center gap-1"
          >
            🏆 MVP
          </button>
          <span className="w-px h-5 bg-black/20" />
          <button
            onClick={onInvite}
            className="px-2.5 py-2.5 hover:bg-amber-500 transition flex items-center justify-center"
            title="Invite players via email"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* JOIN / JOINED / HOST button */}
        {isHost ? (
          <button
            disabled
            className="px-3 py-2.5 rounded-xl font-black italic uppercase text-xs bg-rose-500/20 text-rose-300 border border-rose-400/30 cursor-not-allowed"
            title="You are the host"
          >
            <Users className="w-4 h-4" />
          </button>
        ) : isJoined ? (
          <button
            onClick={() => onLeave?.(game.id)}
            disabled={processing}
            className="px-3 py-2.5 rounded-xl font-black italic uppercase text-xs bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/20 transition disabled:opacity-50 flex items-center gap-1.5"
            title="Click to leave"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            onClick={() => onJoin?.(game.id)}
            disabled={isFull || processing}
            className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-xs transition flex items-center gap-1.5 ${
              isFull
                ? 'bg-indigo-800/50 text-indigo-500 cursor-not-allowed'
                : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/20'
            }`}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Users className="w-4 h-4" />
                Join
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PickupGamesTab;