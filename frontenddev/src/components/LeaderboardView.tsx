// frontend/src/components/LeaderboardView.tsx
import React, { useState, useEffect } from 'react';
import { AthleteProfile, SportType } from '../types/auth.types';
import { US_STATES, getCitiesForState } from '../data/usLocations';
import {
  ShareConfirmationNotification,
  ShareConfirmationData,
} from './notifications/ShareConfirmationNotification';
import {
  Trophy,
  Award,
  Search,
  Filter,
  Share2,
  Flame,
  Users,
  Sparkles,
  ChevronRight,
  Swords,
  CheckCircle2,
  X,
  Crown,
  Zap,
  BarChart2,
  ArrowRightLeft,
  Check,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from 'recharts';
import { getAthletePerformanceTrends } from '../utils/statTrends';
import { StatTrendIndicator } from './StatTrendIndicator';
import { RegionInspectorCard } from './regional/RegionInspectorCard';

interface LeaderboardViewProps {
  athletes: AthleteProfile[];
  currentUser: AthleteProfile;
  onShareAthlete: (athlete: AthleteProfile) => void;
  onSelectAthlete?: (athlete: AthleteProfile) => void;
  onUpdateUser?: (updated: Partial<AthleteProfile>) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  athletes,
  currentUser,
  onShareAthlete,
  onSelectAthlete,
  onUpdateUser,
}) => {
  const [selectedSport, setSelectedSport] = useState<SportType | 'xp'>(
    (currentUser.primarySport as SportType) || 'basketball'
  );
  const [mainTab, setMainTab] = useState<'overall' | 'drills'>('overall');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [proOnlyFilter, setProOnlyFilter] = useState<boolean>(false);
  const [friendsOnlyFilter, setFriendsOnlyFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [shareConfirmation, setShareConfirmation] =
    useState<ShareConfirmationData | null>(null);

  /* ═══════════════════════════════════════════
     SHARE — async with XP award
     ═══════════════════════════════════════════ */
  const handleShareAthlete = async (athlete: AthleteProfile) => {
    onShareAthlete(athlete);
    setShareConfirmation({
      type: 'leaderboard_rank',
      title: `Rank Card Shared for ${athlete.name}`,
      subtitle: `Lvl ${athlete.level} ${athlete.primarySport?.toUpperCase() || ''} • ${athlete.xp ?? athlete.valuexp ?? 0} XP • Verified Leaderboard Card link copied!`,
      sport: athlete.primarySport,
      xpAwarded: 15,
    });

    try {
      const API =
        import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';
      await fetch(`${API}/xp/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: currentUser.id,
          amount: 15,
          source: 'leaderboard_share',
          referenceId: `share_${athlete.id}_${Date.now()}`,
        }),
      });
    } catch (err) {
      console.warn('XP award failed:', err);
    }
  };

  /* ─── Friend IDs (Set) ─── */
  const friendIds = React.useMemo(() => {
    if (!currentUser?.friendsList) return new Set([currentUser?.id || '']);
    const ids = currentUser.friendsList.map((f) =>
      typeof f === 'string' ? f : f.id
    );
    return new Set([currentUser?.id || '', ...ids]);
  }, [currentUser?.friendsList, currentUser?.id]);

  /* ─── Compare state ─── */
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [modalAthleteAId, setModalAthleteAId] = useState<string>('');
  const [modalAthleteBId, setModalAthleteBId] = useState<string>('');

  /* ─── Sorted athletes ─── */
  const sortedAthletes = [...athletes]
    .filter((a) => {
      const matchesRole = roleFilter === 'all' || a.role === roleFilter;

      const matchesPro =
        !proOnlyFilter ||
        Boolean(a.isPro || a.isVerifiedPro || a.subscriptionTier === 'pro');

      const matchesFriends = !friendsOnlyFilter || friendIds.has(a.id);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        (a.schoolOrLeague || '').toLowerCase().includes(q) ||
        (a.registeredCity || '').toLowerCase().includes(q) ||
        (a.registeredState || '').toLowerCase().includes(q);

      let matchesState = true;
      if (stateFilter !== 'all') {
        const aState = (
          a.registeredState ||
          a.location?.state ||
          ''
        ).toLowerCase();
        const aLocCity = (a.location?.city || '').toLowerCase();
        const aSchool = (a.schoolOrLeague || '').toLowerCase();
        const sQuery = stateFilter.toLowerCase();
        matchesState =
          aState === sQuery ||
          aLocCity.includes(sQuery) ||
          aSchool.includes(sQuery);
      }

      let matchesCity = true;
      if (cityFilter !== 'all') {
        const aCity = (
          a.registeredCity ||
          a.location?.city ||
          ''
        ).toLowerCase();
        const aSchool = (a.schoolOrLeague || '').toLowerCase();
        const cQuery = cityFilter.toLowerCase();
        matchesCity = aCity.includes(cQuery) || aSchool.includes(cQuery);
      }

      return (
        matchesRole &&
        matchesPro &&
        matchesFriends &&
        matchesSearch &&
        matchesState &&
        matchesCity
      );
    })
    .sort((a, b) => {
      if (selectedSport === 'xp') {
        return (b.xp ?? b.valuexp ?? 0) - (a.xp ?? a.valuexp ?? 0);
      }
      if (selectedSport === 'volleyball') {
        const killsA = a.stats?.volleyball?.kills || 0;
        const killsB = b.stats?.volleyball?.kills || 0;
        if (killsA !== killsB) return killsB - killsA;
        return (b.xp ?? 0) - (a.xp ?? 0);
      }
      if (selectedSport === 'basketball') {
        const ppgA =
          (a.stats?.basketball?.pts || 0) /
          (a.stats?.basketball?.gamesPlayed || 1);
        const ppgB =
          (b.stats?.basketball?.pts || 0) /
          (b.stats?.basketball?.gamesPlayed || 1);
        return ppgB - ppgA;
      }
      if (selectedSport === 'baseball') {
        return (
          (b.stats?.baseball?.battingAvg || 0) -
          (a.stats?.baseball?.battingAvg || 0)
        );
      }
      if (selectedSport === 'softball') {
        return (
          (b.stats?.softball?.battingAvg || 0) -
          (a.stats?.softball?.battingAvg || 0)
        );
      }
      if (selectedSport === 'pickleball') {
        return (
          (b.stats?.pickleball?.winRate || 0) -
          (a.stats?.pickleball?.winRate || 0)
        );
      }
      if (selectedSport === 'soccer') {
        return (b.stats?.soccer?.goals || 0) - (a.stats?.soccer?.goals || 0);
      }
      return (b.xp ?? b.valuexp ?? 0) - (a.xp ?? a.valuexp ?? 0);
    });

  /* ─── Local Legends state ─── */
  const [localLegendsFilter, setLocalLegendsFilter] = useState<
    'all' | 'available'
  >('all');
  const [userStatus, setUserStatus] = useState<
    'Online' | 'In-Game' | 'Away' | 'Offline'
  >(currentUser.userStatus || 'Online');

  /* ═══════════════════════════════════════════
     UPDATE STATUS — persist to DB + broadcast
     ═══════════════════════════════════════════ */
  const handleUpdateStatus = async (
    newStatus: 'Online' | 'In-Game' | 'Away' | 'Offline'
  ) => {
    setUserStatus(newStatus);
    onUpdateUser?.({ userStatus: newStatus });

    try {
      const API =
        import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';
      await fetch(`${API}/leaderboard/status/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn('Status update failed:', err);
    }
  };

  /* ═══════════════════════════════════════════
     ✅ PRESENCE HEARTBEAT + AUTO-OFFLINE
     ═══════════════════════════════════════════ */
  useEffect(() => {
  if (!currentUser?.id) return;

  const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

  // 1. Mount pe Online
  handleUpdateStatus('Online');

  // 2. Heartbeat — last_seen_at update
  const hb = setInterval(() => {
    fetch(`${API}/leaderboard/heartbeat/${currentUser.id}`, {
      method: 'POST',
    }).catch(() => {});
  }, 60_000);

  // 3. ✅ Idle detection — 5 min no activity → Away
  let idleTimer: ReturnType<typeof setTimeout>;

  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      handleUpdateStatus('Away');
    }, 5 * 60 * 1000); // 5 min
  };

  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  events.forEach((ev) => window.addEventListener(ev, resetIdle));
  resetIdle();

  // 4. Browser close → Offline
  const onUnload = () => {
    try {
      navigator.sendBeacon(
        `${API}/leaderboard/status/${currentUser.id}`,
        new Blob([JSON.stringify({ status: 'Offline' })], {
          type: 'application/json',
        })
      );
    } catch {}
  };
  window.addEventListener('beforeunload', onUnload);

  return () => {
    clearInterval(hb);
    clearTimeout(idleTimer);
    events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    window.removeEventListener('beforeunload', onUnload);
  };
}, [currentUser?.id]);

  /* ─── Local Legends ─── */
  const myCity = (currentUser.registeredCity || 'New York').trim();
  const myState = (currentUser.registeredState || 'NY').trim();

  /* ═══════════════════════════════════════════
     ATHLETE PRESENCE (real DB status only)
     ═══════════════════════════════════════════ */
  const getAthletePresence = (a: AthleteProfile) => {
    const status =
      a.id === currentUser.id ? userStatus : a.userStatus || 'Offline';

    switch (status) {
      case 'In-Game':
        return {
          label: 'In Game 🎮',
          isAvailable: true,
          dotBg: 'bg-amber-400 animate-pulse',
          badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
        };
      case 'Online':
        return {
          label: 'Online 🟢',
          isAvailable: true,
          dotBg: 'bg-lime-400',
          badgeBg: 'bg-lime-400/20 text-lime-300 border-lime-400/30',
        };
      case 'Away':
        return {
          label: 'Away 🟡',
          isAvailable: false,
          dotBg: 'bg-amber-500',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          label: 'Offline ⚪',
          isAvailable: false,
          dotBg: 'bg-slate-500',
          badgeBg: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
        };
    }
  };

  const localLegends = athletes
    .filter((a) => {
      const aCity = (a.registeredCity || a.location?.city || '').toLowerCase();
      const aState = (
        a.registeredState ||
        a.location?.state ||
        ''
      ).toLowerCase();
      const aSchool = (a.schoolOrLeague || '').toLowerCase();

      const isLocal =
        aCity.includes(myCity.toLowerCase()) ||
        aState === myState.toLowerCase() ||
        aSchool.includes(myCity.toLowerCase());

      if (!isLocal) return false;
      if (localLegendsFilter === 'available') {
        return getAthletePresence(a).isAvailable;
      }
      return true;
    })
    .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
    .slice(0, 8);

  /* ─── Compare toggle ─── */
  const toggleCompareAthlete = (athleteId: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(athleteId)) {
        return prev.filter((id) => id !== athleteId);
      }
      if (prev.length >= 2) {
        return [prev[1], athleteId];
      }
      return [...prev, athleteId];
    });
  };

  const handleOpenModal = () => {
    let aId = selectedCompareIds[0] || currentUser.id;
    let bId =
      selectedCompareIds[1] ||
      athletes.find((a) => a.id !== aId)?.id ||
      currentUser.id;

    if (aId === bId && athletes.length > 1) {
      bId = athletes.find((a) => a.id !== aId)?.id || bId;
    }

    setModalAthleteAId(aId);
    setModalAthleteBId(bId);
    setIsCompareModalOpen(true);
  };

  const athleteA =
    athletes.find((a) => a.id === modalAthleteAId) || currentUser;
  const athleteB =
    athletes.find((a) => a.id === modalAthleteBId) ||
    athletes.find((a) => a.id !== athleteA.id) ||
    currentUser;

  /* ─── Radar chart data ─── */
  const computeRadarData = (athA: AthleteProfile, athB: AthleteProfile) => {
    const ppgA =
      (athA.stats?.basketball?.pts || 0) /
      (athA.stats?.basketball?.gamesPlayed || 1);
    const ppgB =
      (athB.stats?.basketball?.pts || 0) /
      (athB.stats?.basketball?.gamesPlayed || 1);
    const maxPpg = Math.max(35, ppgA, ppgB);
    const scorePpgA = Math.min(100, Math.round((ppgA / maxPpg) * 100));
    const scorePpgB = Math.min(100, Math.round((ppgB / maxPpg) * 100));

    const gamesA = (athA.winCount || 0) + (athA.lossCount || 0) || 1;
    const gamesB = (athB.winCount || 0) + (athB.lossCount || 0) || 1;
    const winRateA = Math.round(((athA.winCount || 0) / gamesA) * 100);
    const winRateB = Math.round(((athB.winCount || 0) / gamesB) * 100);

    const levelScoreA = Math.min(100, Math.round((athA.level / 50) * 100));
    const levelScoreB = Math.min(100, Math.round((athB.level / 50) * 100));

    const apgA =
      (athA.stats?.basketball?.ast || 0) /
      (athA.stats?.basketball?.gamesPlayed || 1);
    const apgB =
      (athB.stats?.basketball?.ast || 0) /
      (athB.stats?.basketball?.gamesPlayed || 1);
    const maxApg = Math.max(12, apgA, apgB);
    const scoreApgA = Math.min(100, Math.round((apgA / maxApg) * 100));
    const scoreApgB = Math.min(100, Math.round((apgB / maxApg) * 100));

    const defA =
      ((athA.stats?.basketball?.reb || 0) +
        (athA.stats?.basketball?.stl || 0) +
        (athA.stats?.basketball?.blk || 0)) /
      (athA.stats?.basketball?.gamesPlayed || 1);
    const defB =
      ((athB.stats?.basketball?.reb || 0) +
        (athB.stats?.basketball?.stl || 0) +
        (athB.stats?.basketball?.blk || 0)) /
      (athB.stats?.basketball?.gamesPlayed || 1);
    const maxDef = Math.max(15, defA, defB);
    const scoreDefA = Math.min(100, Math.round((defA / maxDef) * 100));
    const scoreDefB = Math.min(100, Math.round((defB / maxDef) * 100));

    const fgA =
      (athA.stats?.basketball?.fgAttempted || 0) > 0
        ? Math.round(
            ((athA.stats?.basketball?.fgMade || 0) /
              (athA.stats?.basketball?.fgAttempted || 1)) *
              100
          )
        : 50;
    const fgB =
      (athB.stats?.basketball?.fgAttempted || 0) > 0
        ? Math.round(
            ((athB.stats?.basketball?.fgMade || 0) /
              (athB.stats?.basketball?.fgAttempted || 1)) *
              100
          )
        : 50;

    return [
      {
        subject: 'Scoring Power',
        [athA.name]: scorePpgA,
        [athB.name]: scorePpgB,
        fullMark: 100,
      },
      {
        subject: 'Win Rate %',
        [athA.name]: winRateA,
        [athB.name]: winRateB,
        fullMark: 100,
      },
      {
        subject: 'Level & XP',
        [athA.name]: levelScoreA,
        [athB.name]: levelScoreB,
        fullMark: 100,
      },
      {
        subject: 'Playmaking',
        [athA.name]: scoreApgA,
        [athB.name]: scoreApgB,
        fullMark: 100,
      },
      {
        subject: 'Defense & Rebs',
        [athA.name]: scoreDefA,
        [athB.name]: scoreDefB,
        fullMark: 100,
      },
      {
        subject: 'FG Shooting %',
        [athA.name]: fgA,
        [athB.name]: fgB,
        fullMark: 100,
      },
    ];
  };

  /* ─── Bar chart data ─── */
  const computeBarData = (athA: AthleteProfile, athB: AthleteProfile) => {
    const ppgA = Number(
      (
        (athA.stats?.basketball?.pts || 0) /
        (athA.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );
    const ppgB = Number(
      (
        (athB.stats?.basketball?.pts || 0) /
        (athB.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );
    const rpgA = Number(
      (
        (athA.stats?.basketball?.reb || 0) /
        (athA.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );
    const rpgB = Number(
      (
        (athB.stats?.basketball?.reb || 0) /
        (athB.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );
    const apgA = Number(
      (
        (athA.stats?.basketball?.ast || 0) /
        (athA.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );
    const apgB = Number(
      (
        (athB.stats?.basketball?.ast || 0) /
        (athB.stats?.basketball?.gamesPlayed || 1)
      ).toFixed(1)
    );

    const gamesA = (athA.winCount || 0) + (athA.lossCount || 0) || 1;
    const gamesB = (athB.winCount || 0) + (athB.lossCount || 0) || 1;
    const winRateA = Math.round(((athA.winCount || 0) / gamesA) * 100);
    const winRateB = Math.round(((athB.winCount || 0) / gamesB) * 100);

    const fgA =
      (athA.stats?.basketball?.fgAttempted || 0) > 0
        ? Math.round(
            ((athA.stats?.basketball?.fgMade || 0) /
              (athA.stats?.basketball?.fgAttempted || 1)) *
              100
          )
        : 50;
    const fgB =
      (athB.stats?.basketball?.fgAttempted || 0) > 0
        ? Math.round(
            ((athB.stats?.basketball?.fgMade || 0) /
              (athB.stats?.basketball?.fgAttempted || 1)) *
              100
          )
        : 50;

    return [
      { metric: 'PPG', [athA.name]: ppgA, [athB.name]: ppgB },
      { metric: 'RPG', [athA.name]: rpgA, [athB.name]: rpgB },
      { metric: 'APG', [athA.name]: apgA, [athB.name]: apgB },
      { metric: 'Win Rate %', [athA.name]: winRateA, [athB.name]: winRateB },
      { metric: 'FG %', [athA.name]: fgA, [athB.name]: fgB },
    ];
  };

  const radarData = computeRadarData(athleteA, athleteB);
  const barData = computeBarData(athleteA, athleteB);

  const handleSwapAthletes = () => {
    const temp = modalAthleteAId;
    setModalAthleteAId(modalAthleteBId);
    setModalAthleteBId(temp);
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-24 lg:pb-12 animate-fadeIn text-white relative">
      {/* Main Tabs */}
      <div className="flex items-center space-x-2 bg-indigo-950/80 p-2 rounded-2xl border border-white/10 font-mono">
        <button
          type="button"
          onClick={() => setMainTab('overall')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black italic uppercase transition flex items-center space-x-2 ${
            mainTab === 'overall'
              ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
              : 'text-indigo-200 hover:text-white hover:bg-indigo-900/50'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>🏆 Overall Sport Standings</span>
        </button>
        <button
          type="button"
          onClick={() => setMainTab('drills')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black italic uppercase transition flex items-center space-x-2 ${
            mainTab === 'drills'
              ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
              : 'text-indigo-200 hover:text-white hover:bg-indigo-900/50'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>🏐 Volleyball Drill Leaderboard</span>
        </button>
      </div>

      {mainTab === 'overall' ? (
        <>
          {/* Top Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
            <div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-lime-400" />
                <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
                  Athlete Leaderboard & Head-to-Head
                </h1>
              </div>
              <p className="text-xs text-indigo-200/70 mt-1 font-semibold">
                Top playground, high school, and college athletes ranked by scoring, efficiency, and level XP.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenModal}
                className="px-4 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-lime-400/20 transition flex items-center space-x-2 shrink-0 border border-lime-300/40"
              >
                <Swords className="w-4 h-4" />
                <span>
                  VS Compare Radar ({selectedCompareIds.length}/2)
                </span>
              </button>

              <div className="flex flex-wrap items-center bg-indigo-950 p-1.5 rounded-2xl border border-white/10">
                {(
                  [
                    { id: 'volleyball', label: 'Volleyball Kills 🏐' },
                    { id: 'basketball', label: 'B-Ball PPG 🏀' },
                    { id: 'baseball', label: 'Baseball BA ⚾' },
                    { id: 'softball', label: 'Softball BA 🥎' },
                    { id: 'pickleball', label: 'Pickle Win% 🏓' },
                    { id: 'soccer', label: 'Soccer Goals ⚽' },
                    { id: 'xp', label: 'Total XP ⚡' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSport(s.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition ${
                      selectedSport === s.id
                        ? 'bg-lime-400 text-black shadow-md'
                        : 'text-indigo-200/60 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-3 bg-indigo-900/40 p-4 rounded-2xl border border-white/10">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-indigo-300/60" />
              <input
                type="text"
                placeholder="Search athlete by name, handle, or school/league..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-indigo-950 text-white text-sm font-medium rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-indigo-950 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="all">All Brackets</option>
              <option value="high_school">High School Varsity</option>
              <option value="college">College / Intramural</option>
              <option value="playground_pro">Playground Legend</option>
            </select>

            <button
              type="button"
              onClick={() => setProOnlyFilter(!proOnlyFilter)}
              className={`px-4 py-2 rounded-xl text-xs font-black italic uppercase transition flex items-center space-x-2 border shrink-0 ${
                proOnlyFilter
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black border-amber-300 shadow-lg shadow-amber-400/20 ring-2 ring-amber-400/50'
                  : 'bg-indigo-950 text-indigo-300 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Crown
                className={`w-4 h-4 ${
                  proOnlyFilter ? 'fill-black text-black' : 'text-amber-400'
                }`}
              />
              <span>
                {proOnlyFilter ? 'Pro Athletes Only 👑' : 'Filter Pro Verified'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFriendsOnlyFilter(!friendsOnlyFilter)}
              className={`px-4 py-2 rounded-xl text-xs font-black italic uppercase transition flex items-center space-x-2 border shrink-0 ${
                friendsOnlyFilter
                  ? 'bg-lime-400 text-black border-lime-300 shadow-lg shadow-lime-400/20 ring-2 ring-lime-400/50'
                  : 'bg-indigo-950 text-indigo-300 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Users
                className={`w-4 h-4 ${
                  friendsOnlyFilter ? 'text-black' : 'text-lime-400'
                }`}
              />
              <span>
                {friendsOnlyFilter ? 'Friends-Only League 👥' : 'Friends Only'}
              </span>
            </button>
          </div>

          {/* Regional Filter */}
          <div className="bg-indigo-950/80 p-3.5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[10px] uppercase font-black tracking-widest text-lime-400 shrink-0">
                Regional View:
              </span>
              <button
                type="button"
                onClick={() => {
                  if (currentUser.registeredCity) {
                    setCityFilter(currentUser.registeredCity);
                    setStateFilter('all');
                  } else {
                    setCityFilter('New York');
                    setStateFilter('NY');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition whitespace-nowrap ${
                  cityFilter !== 'all'
                    ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                    : 'bg-indigo-900/60 text-indigo-200 hover:text-white'
                }`}
              >
                📍 Local ({currentUser.registeredCity || 'City'})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentUser.registeredState) {
                    setStateFilter(currentUser.registeredState);
                    setCityFilter('all');
                  } else {
                    setStateFilter('NY');
                    setCityFilter('all');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition whitespace-nowrap ${
                  stateFilter !== 'all' && cityFilter === 'all'
                    ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                    : 'bg-indigo-900/60 text-indigo-200 hover:text-white'
                }`}
              >
                🏛️ Statewide ({currentUser.registeredState || 'State'})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStateFilter('all');
                  setCityFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition whitespace-nowrap ${
                  stateFilter === 'all' && cityFilter === 'all'
                    ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                    : 'bg-indigo-900/60 text-indigo-200 hover:text-white'
                }`}
              >
                🇺🇸 National (All US)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setCityFilter('all');
                }}
                className="bg-indigo-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-lime-400 outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="all">State (All States)</option>
                {US_STATES.map((st) => (
                  <option
                    key={st.code}
                    value={st.code}
                    className="bg-indigo-950 text-white"
                  >
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-indigo-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-cyan-300 outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="all">
                  {stateFilter === 'all'
                    ? 'City / Town (All Cities)'
                    : `All Cities in ${stateFilter}`}
                </option>
                {(stateFilter !== 'all'
                  ? getCitiesForState(stateFilter)
                  : [
                      'New York',
                      'Los Angeles',
                      'Chicago',
                      'Houston',
                      'Miami',
                      'San Francisco',
                      'Dallas',
                      'Seattle',
                      'Atlanta',
                      'Boston',
                      'Philadelphia',
                      'Phoenix',
                    ]
                ).map((city) => (
                  <option
                    key={city}
                    value={city}
                    className="bg-indigo-950 text-white"
                  >
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Local Legends Section */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 rounded-[2.5rem] border-2 border-lime-400/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-400 text-black flex items-center justify-center font-black text-xl shadow-lg">
                  🌟
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-lime-400">
                      NEIGHBORHOOD TALENT SPOTLIGHT
                    </span>
                    <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 text-[10px] font-bold rounded-full border border-lime-400/30">
                      {myCity}, {myState}
                    </span>
                  </div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
                    Local Legends 🏛️
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-indigo-950/90 p-1 rounded-xl border border-lime-400/30 gap-1 text-[10px]">
                  <span className="text-[9px] font-mono font-bold uppercase text-indigo-300 px-1">
                    My Status:
                  </span>
                  {(['Online', 'In-Game', 'Away'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-2 py-0.5 rounded-lg font-black uppercase transition ${
                        userStatus === st
                          ? 'bg-lime-400 text-black shadow'
                          : 'text-indigo-300 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-indigo-950 p-1 rounded-xl border border-white/10 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setLocalLegendsFilter('all')}
                    className={`px-3 py-1 rounded-lg font-black uppercase transition ${
                      localLegendsFilter === 'all'
                        ? 'bg-lime-400 text-black shadow-md'
                        : 'text-indigo-300 hover:text-white'
                    }`}
                  >
                    All Athletes
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalLegendsFilter('available')}
                    className={`px-3 py-1 rounded-lg font-black uppercase transition ${
                      localLegendsFilter === 'available'
                        ? 'bg-lime-400 text-black shadow-md'
                        : 'text-indigo-300 hover:text-white'
                    }`}
                  >
                    Available Now
                  </button>
                </div>
              </div>
            </div>

            {localLegends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {localLegends.map((athlete, idx) => {
                  const isCompared = selectedCompareIds.includes(athlete.id);
                  const rankTitles = [
                    'Neighborhood MVP 👑',
                    'Park Royalty ⚡',
                    'Local Hero 🏆',
                    'Rising Prospect 🔥',
                  ];
                  return (
                    <div
                      key={athlete.id}
                      className="bg-indigo-900/60 p-3.5 rounded-2xl border border-white/10 hover:border-lime-400/50 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative shrink-0">
                          <img
                            src={athlete.avatar}
                            alt={athlete.name}
                            className="w-12 h-12 rounded-xl object-cover ring-2 ring-lime-400/80"
                            referrerPolicy="no-referrer"
                          />
                          {/* ✅ REAL presence — no fake hash */}
                          {(() => {
                            const presence = getAthletePresence(athlete);
                            return (
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${presence.dotBg} border-2 border-indigo-950 shadow`}
                                title={presence.label}
                              />
                            );
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase text-lime-400 block tracking-wider">
                            #{idx + 1} •{' '}
                            {rankTitles[idx] || 'Local Legend'}
                          </span>
                          <h4 className="font-extrabold text-sm text-white truncate flex items-center gap-1">
                            <span>{athlete.name}</span>
                            {athlete.isPro && (
                              <span
                                className="text-[10px]"
                                title="Pro Athlete"
                              >
                                👑
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-indigo-200/70 truncate font-semibold">
                            {athlete.schoolOrLeague ||
                              `${athlete.registeredCity || myCity}, ${
                                athlete.registeredState || myState
                              }`}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 bg-indigo-950/80 rounded-xl border border-white/5 grid grid-cols-3 gap-1 text-center text-[10px]">
                        <div>
                          <span className="text-indigo-300/60 block text-[8px] uppercase font-bold">
                            XP
                          </span>
                          <span className="font-mono font-black text-lime-400">
                            {athlete.xp ?? athlete.valuexp ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-indigo-300/60 block text-[8px] uppercase font-bold">
                            Sport
                          </span>
                          <span className="font-bold text-white capitalize">
                            {athlete.primarySport || 'Bball'}
                          </span>
                        </div>
                        <div>
                          <span className="text-indigo-300/60 block text-[8px] uppercase font-bold">
                            Level
                          </span>
                          <span className="font-mono font-bold text-white">
                            Lvl {athlete.level || 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleCompareAthlete(athlete.id)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase transition flex items-center justify-center space-x-1 border ${
                            isCompared
                              ? 'bg-rose-500 text-white border-rose-400'
                              : 'bg-indigo-900 text-indigo-200 hover:text-white border-white/10'
                          }`}
                        >
                          <Swords className="w-3 h-3" />
                          <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                        </button>
                        <button
                          type="button"
                          className="py-1.5 px-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black text-[10px] uppercase rounded-xl transition"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-indigo-950/50 rounded-2xl text-center text-xs text-indigo-200/70 font-semibold">
                No local registered legends in {myCity} yet. Be the first to
                claim top rank in your city! 🏆
              </div>
            )}
          </div>

          {/* Top 3 Podium */}
          {sortedAthletes.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedAthletes.slice(0, 3).map((athlete, index) => {
                const ranks = [
                  {
                    label: '1st Place',
                    badgeBg: 'bg-lime-400 text-black',
                    ring: 'ring-lime-400',
                    icon: '👑',
                  },
                  {
                    label: '2nd Place',
                    badgeBg: 'bg-rose-500 text-white',
                    ring: 'ring-rose-500',
                    icon: '🥈',
                  },
                  {
                    label: '3rd Place',
                    badgeBg: 'bg-indigo-700 text-white',
                    ring: 'ring-indigo-400',
                    icon: '🥉',
                  },
                ];
                const badgeInfo = ranks[index];
                const isCompared = selectedCompareIds.includes(athlete.id);

                return (
                  <div
                    key={athlete.id}
                    className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl relative flex flex-col items-center text-center space-y-3"
                  >
                    <span
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black italic uppercase ${badgeInfo.badgeBg}`}
                    >
                      {badgeInfo.icon} {badgeInfo.label}
                    </span>

                    <div className="relative mt-2">
                      <img
                        src={athlete.avatar}
                        alt={athlete.name}
                        className={`w-20 h-20 rounded-2xl object-cover ring-4 ${badgeInfo.ring}`}
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-2 -right-2 bg-indigo-950 text-white font-black text-xs px-2 py-0.5 rounded-md border border-white/10">
                        #{athlete.jerseyNumber}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-lg text-white flex items-center justify-center gap-1.5">
                        <span>{athlete.name}</span>
                        {athlete.isPro && (
                          <span className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                            <Crown className="w-3 h-3 fill-black" />
                            <span>PRO</span>
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-indigo-200/70 font-semibold">
                        {athlete.schoolOrLeague}
                      </p>
                    </div>

                    {(() => {
                      const trends = getAthletePerformanceTrends(athlete);
                      return (
                        <div className="w-full bg-indigo-950 p-3 rounded-2xl border border-white/10 flex items-center justify-around text-xs font-bold">
                          <div>
                            <span className="text-[10px] text-indigo-300/60 block font-black uppercase">
                              Level
                            </span>
                            <span className="text-lime-400 font-black italic">
                              Lvl {athlete.level}
                            </span>
                          </div>
                          <div className="border-r border-white/10 h-6" />
                          <div>
                            <span className="text-[10px] text-indigo-300/60 block font-black uppercase">
                              PPG Avg
                            </span>
                            <span className="text-white font-black italic">
                              {(
                                (athlete.stats?.basketball?.pts || 0) /
                                (athlete.stats?.basketball?.gamesPlayed || 1)
                              ).toFixed(1)}
                            </span>
                          </div>
                          <div className="border-r border-white/10 h-6" />
                          <div>
                            <span className="text-[10px] text-indigo-300/60 block font-black uppercase">
                              3G Trend
                            </span>
                            <StatTrendIndicator trend={trends.pts} size="sm" />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-2 w-full pt-1">
                      <button
                        onClick={() => toggleCompareAthlete(athlete.id)}
                        className={`py-2 px-3 rounded-xl font-black italic text-xs uppercase flex items-center justify-center space-x-1.5 transition border ${
                          isCompared
                            ? 'bg-lime-400 text-black border-lime-300'
                            : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border-white/10'
                        }`}
                      >
                        {isCompared ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Swords className="w-3.5 h-3.5" />
                        )}
                        <span>{isCompared ? 'Compared' : 'VS Select'}</span>
                      </button>

                      <button
                        onClick={() => handleShareAthlete(athlete)}
                        className="py-2 px-3 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 font-black italic text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 transition border border-white/10"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-indigo-900/60 rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-black italic uppercase text-white">
                Complete Rankings Table ({sortedAthletes.length} Athletes)
              </h3>
              <span className="text-xs text-indigo-200/60 font-semibold">
                Select any 2 athletes to launch side-by-side radar contrast
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-indigo-200/80">
                <thead className="bg-indigo-950/80 text-xs font-black text-indigo-300/60 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3">VS Compare</th>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Athlete</th>
                    <th className="px-6 py-3">Bracket / League</th>
                    <th className="px-6 py-3">V-Ball Kills 🏐</th>
                    <th className="px-6 py-3">B-Ball PPG</th>
                    <th className="px-6 py-3">Softball BA</th>
                    <th className="px-6 py-3">Pickle Win%</th>
                    <th className="px-6 py-3">Record</th>
                    <th className="px-6 py-3">Total XP</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="space-y-4 max-w-sm mx-auto">
                          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-950 border border-white/10 flex items-center justify-center text-lime-400 shadow-lg">
                            <Trophy className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-black italic uppercase text-white">
                              No Athletes Found
                            </h4>
                            <p className="text-xs text-indigo-200/70">
                              No leaderboard rankings match your athlete search
                              query or active sport filter.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedSport('basketball');
                            }}
                            className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl transition inline-flex items-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reset Search & Filters</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedAthletes.map((athlete, idx) => {
                      const isCurrent = athlete.id === currentUser.id;
                      const isCompared = selectedCompareIds.includes(
                        athlete.id
                      );

                      return (
                        <tr
                          key={athlete.id}
                          className={`hover:bg-indigo-900/40 transition ${
                            isCompared
                              ? 'bg-lime-400/15 font-semibold'
                              : isCurrent
                              ? 'bg-indigo-900/40 font-semibold'
                              : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleCompareAthlete(athlete.id)}
                              className={`p-2 rounded-xl transition flex items-center space-x-1 border ${
                                isCompared
                                  ? 'bg-lime-400 text-black border-lime-300 font-black'
                                  : 'bg-indigo-950 text-indigo-300 hover:text-white border-white/10'
                              }`}
                            >
                              {isCompared ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Swords className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="px-6 py-4 font-black italic text-lime-400">
                            #{idx + 1}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={athlete.avatar}
                                  alt={athlete.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-lime-400/50"
                                  referrerPolicy="no-referrer"
                                />
                                {/* ✅ Real presence dot in table too */}
                                {(() => {
                                  const presence = getAthletePresence(athlete);
                                  return (
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${presence.dotBg} border-2 border-indigo-950`}
                                      title={presence.label}
                                    />
                                  );
                                })()}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center space-x-1">
                                  <span>{athlete.name}</span>
                                  {athlete.isPro && (
                                    <span className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5">
                                      <Crown className="w-2.5 h-2.5 fill-black" />
                                      <span>PRO</span>
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[10px] bg-lime-400 text-black font-black px-1.5 py-0.2 rounded">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-indigo-300/60">
                                  {athlete.handle}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-xs">
                            <span className="font-semibold text-white block">
                              {athlete.schoolOrLeague}
                            </span>
                            <span className="text-indigo-300/60">
                              {athlete.position}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-black italic text-cyan-300">
                            {athlete.stats?.volleyball?.kills || 0} Kills
                          </td>

                          <td className="px-6 py-4 font-black italic text-white">
                            {(
                              (athlete.stats?.basketball?.pts || 0) /
                              (athlete.stats?.basketball?.gamesPlayed || 1)
                            ).toFixed(1)}
                          </td>

                          <td className="px-6 py-4 font-black italic text-rose-300">
                            {athlete.stats?.softball?.battingAvg
                              ? athlete.stats.softball.battingAvg
                                  .toFixed(3)
                                  .replace(/^0/, '')
                              : '.420'}
                          </td>

                          <td className="px-6 py-4 font-black italic text-amber-300">
                            {athlete.stats?.pickleball?.winRate
                              ? `${Math.round(
                                  athlete.stats.pickleball.winRate * 100
                                )}%`
                              : '78%'}
                          </td>

                          <td className="px-6 py-4 text-xs font-black italic text-rose-400">
                            {athlete.winCount || 0}W - {athlete.lossCount || 0}L
                          </td>

                          <td className="px-6 py-4 font-black italic text-lime-400">
                            {athlete.xp ?? athlete.valuexp ?? 0} XP
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleShareAthlete(athlete)}
                              className="p-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-200 transition border border-white/10"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* DRILL LEADERBOARD TAB */
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-lime-400 text-black rounded-2xl shadow-lg">
                <Target className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 font-mono font-black text-[10px] uppercase rounded border border-lime-400/30">
                  VOLLEYBALL DRILL STANDINGS
                </span>
                <h2 className="text-xl font-black italic uppercase text-white mt-1">
                  Top 10 Volleyball Drill Leaders
                </h2>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Ranked specifically by successful Volleyball Skill Challenges
                  & Drills completed.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-indigo-950 px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono">
              <span className="text-indigo-300">Metric:</span>
              <span className="text-lime-400 font-black">
                volleyballDrillCount
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-indigo-300/80 font-mono">
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Athlete Profile</th>
                  <th className="px-6 py-3">School / League</th>
                  <th className="px-6 py-3">Drills Completed 🏐</th>
                  <th className="px-6 py-3">Level & XP ⚡</th>
                  <th className="px-6 py-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...athletes]
                  .sort(
                    (a, b) =>
                      (b.volleyballDrillCount || 0) -
                      (a.volleyballDrillCount || 0)
                  )
                  .slice(0, 10)
                  .map((athlete, index) => {
                    const isCurrentUser = athlete.id === currentUser.id;
                    const rankMedals = ['👑 #1', '🥈 #2', '🥉 #3'];
                    const rankBadge =
                      index < 3 ? rankMedals[index] : `#${index + 1}`;

                    return (
                      <tr
                        key={athlete.id}
                        className={`transition hover:bg-white/5 ${
                          isCurrentUser
                            ? 'bg-lime-400/10 font-bold border-l-4 border-l-lime-400'
                            : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-black italic text-sm font-mono text-lime-400">
                          {rankBadge}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={athlete.avatar}
                              alt={athlete.name}
                              className="w-10 h-10 rounded-xl object-cover ring-2 ring-lime-400/40"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-extrabold text-sm text-white">
                                  {athlete.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.5 bg-lime-400 text-black font-black text-[9px] uppercase rounded">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-indigo-300/60 font-mono block">
                                {athlete.handle}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-indigo-200">
                          {athlete.schoolOrLeague}
                        </td>
                        <td className="px-6 py-4 font-black italic text-lime-400 font-mono text-base">
                          {athlete.volleyballDrillCount || 0} Drills
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-cyan-300">
                          Lvl {athlete.level} (
                          {athlete.xp ?? athlete.valuexp ?? 0} XP)
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleShareAthlete(athlete)}
                            className="p-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-200 transition border border-white/10"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating VS bar */}
      {selectedCompareIds.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-indigo-950/95 backdrop-blur-md border-2 border-lime-400/80 p-3 px-6 rounded-full shadow-2xl shadow-black/80 flex items-center space-x-4 animate-bounce">
          <div className="flex items-center space-x-2">
            <Swords className="w-5 h-5 text-lime-400" />
            <span className="text-xs font-black italic uppercase text-white">
              VS Selected ({selectedCompareIds.length}/2):
            </span>
          </div>

          <div className="flex items-center -space-x-2">
            {selectedCompareIds.map((id) => {
              const ath = athletes.find((a) => a.id === id);
              if (!ath) return null;
              return (
                <img
                  key={id}
                  src={ath.avatar}
                  alt={ath.name}
                  className="w-8 h-8 rounded-full border-2 border-lime-400 object-cover"
                  referrerPolicy="no-referrer"
                />
              );
            })}
          </div>

          <button
            onClick={handleOpenModal}
            className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-full transition shadow-md shadow-lime-400/20"
          >
            Launch Radar Comparison 📊
          </button>

          <button
            onClick={() => setSelectedCompareIds([])}
            className="p-1 text-indigo-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Region Inspector */}
      <RegionInspectorCard
        user={currentUser}
        registeredCity={
          currentUser.registeredCity || currentUser.location?.city
        }
        registeredState={
          currentUser.registeredState || currentUser.location?.state
        }
      />

      {/* Compare Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-indigo-950 border-2 border-lime-400/50 w-full max-w-4xl rounded-[2.5rem] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-lime-400 text-black rounded-2xl">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
                    Head-to-Head Athlete Radar Comparison
                  </h2>
                  <p className="text-xs text-indigo-200/70 font-semibold">
                    Visual contrast of scoring power, win rate, playmaking,
                    defense, and XP progression
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl transition border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-indigo-900/60 p-4 rounded-2xl border border-white/10">
              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] font-black uppercase text-lime-400 block">
                  Athlete A (Lime Radar)
                </label>
                <select
                  value={modalAthleteAId}
                  onChange={(e) => setModalAthleteAId(e.target.value)}
                  className="w-full bg-indigo-950 text-white font-bold text-xs p-2.5 rounded-xl border border-lime-400/40 outline-none focus:ring-2 focus:ring-lime-400"
                >
                  {athletes.map((a) => (
                    <option key={`a-${a.id}`} value={a.id}>
                      {a.name} ({a.schoolOrLeague} - #{a.jerseyNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1 flex justify-center">
                <button
                  onClick={handleSwapAthletes}
                  className="p-2.5 bg-indigo-950 hover:bg-lime-400 hover:text-black text-lime-400 rounded-xl border border-white/10 transition shadow-md"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] font-black uppercase text-rose-400 block">
                  Athlete B (Rose Radar)
                </label>
                <select
                  value={modalAthleteBId}
                  onChange={(e) => setModalAthleteBId(e.target.value)}
                  className="w-full bg-indigo-950 text-white font-bold text-xs p-2.5 rounded-xl border border-rose-400/40 outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {athletes.map((a) => (
                    <option key={`b-${a.id}`} value={a.id}>
                      {a.name} ({a.schoolOrLeague} - #{a.jerseyNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[athleteA, athleteB].map((ath, i) => {
                const isA = i === 0;
                const trends = getAthletePerformanceTrends(ath);
                return (
                  <div
                    key={i}
                    className={`bg-indigo-900/60 p-4 rounded-2xl border-2 flex items-center space-x-4 shadow-lg relative overflow-hidden ${
                      isA ? 'border-lime-400/60' : 'border-rose-500/60'
                    }`}
                  >
                    <div
                      className={`absolute top-0 right-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg ${
                        isA
                          ? 'bg-lime-400 text-black'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      Athlete {isA ? 'A' : 'B'}
                    </div>
                    <img
                      src={ath.avatar}
                      alt={ath.name}
                      className={`w-16 h-16 rounded-2xl object-cover ring-2 shrink-0 ${
                        isA ? 'ring-lime-400' : 'ring-rose-500'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-extrabold text-white text-base truncate flex items-center space-x-1.5">
                        <span>{ath.name}</span>
                        {ath.isPro && (
                          <span className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.2 rounded font-mono">
                            PRO
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            isA ? 'text-lime-400' : 'text-rose-400'
                          }`}
                        >
                          #{ath.jerseyNumber}
                        </span>
                      </h3>
                      <p className="text-xs text-indigo-200/70 truncate">
                        {ath.schoolOrLeague}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isA
                              ? 'bg-lime-400/20 text-lime-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          Lvl {ath.level} ({ath.xp ?? ath.valuexp ?? 0} XP)
                        </span>
                        <StatTrendIndicator trend={trends.pts} size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bar chart */}
            <div className="bg-indigo-900/80 p-5 rounded-3xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black italic uppercase text-lime-400 flex items-center space-x-1.5">
                  <BarChart2 className="w-4 h-4" />
                  <span>Side-by-Side Comparative Bar Chart</span>
                </span>
              </div>
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#312e81" />
                    <XAxis
                      dataKey="metric"
                      tick={{
                        fill: '#c7d2fe',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1b4b',
                        borderColor: '#4338ca',
                        borderRadius: '1rem',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        paddingTop: '10px',
                      }}
                    />
                    <Bar
                      dataKey={athleteA.name}
                      fill="#a3e635"
                      radius={[6, 6, 0, 0]}
                      name={`${athleteA.name} (Athlete A)`}
                    />
                    <Bar
                      dataKey={athleteB.name}
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      name={`${athleteB.name} (Athlete B)`}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar chart */}
            <div className="bg-indigo-900/80 p-5 rounded-3xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black italic uppercase text-lime-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Performance Radar Overlay</span>
                </span>
              </div>
              <div className="w-full h-80 flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#312e81" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{
                        fill: '#c7d2fe',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      stroke="#4338ca"
                      tick={false}
                    />
                    <Radar
                      name={athleteA.name}
                      dataKey={athleteA.name}
                      stroke="#a3e635"
                      fill="#a3e635"
                      fillOpacity={0.45}
                    />
                    <Radar
                      name={athleteB.name}
                      dataKey={athleteB.name}
                      stroke="#f43f5e"
                      fill="#f43f5e"
                      fillOpacity={0.45}
                    />
                    <Legend
                      wrapperStyle={{
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        paddingTop: '10px',
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1b4b',
                        borderColor: '#4338ca',
                        borderRadius: '1rem',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Head-to-Head Detailed Stat Matrix */}
            <div className="bg-indigo-900/40 rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 bg-indigo-950 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-black italic uppercase text-white">
                  Head-to-Head Detailed Stat Matrix
                </span>
                <span className="text-[10px] text-indigo-300/60 italic font-semibold">
                  👑 Crown indicates leader in category
                </span>
              </div>

              <div className="divide-y divide-white/5 text-xs">
                {/* 1. Basketball PPG */}
                {(() => {
                  const gamesA = athleteA.stats?.basketball?.gamesPlayed || 0;
                  const gamesB = athleteB.stats?.basketball?.gamesPlayed || 0;
                  const ppgA = gamesA > 0
                    ? ((athleteA.stats?.basketball?.pts || 0) / gamesA).toFixed(1)
                    : '0.0';
                  const ppgB = gamesB > 0
                    ? ((athleteB.stats?.basketball?.pts || 0) / gamesB).toFixed(1)
                    : '0.0';
                  const numA = parseFloat(ppgA);
                  const numB = parseFloat(ppgB);
                  return (
                    <div className="px-4 py-3 grid grid-cols-3 items-center text-center">
                      <div
                        className={`font-black italic text-base ${
                          numA > numB ? 'text-lime-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {ppgA} PPG {numA > numB && '👑'}
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300/60 tracking-wider">
                        Basketball PPG
                      </div>
                      <div
                        className={`font-black italic text-base ${
                          numB > numA ? 'text-rose-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {ppgB} PPG {numB > numA && '👑'}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Overall Win Rate */}
                {(() => {
                  const totalA = (athleteA.winCount || 0) + (athleteA.lossCount || 0);
                  const totalB = (athleteB.winCount || 0) + (athleteB.lossCount || 0);
                  const wrA = totalA > 0 ? Math.round(((athleteA.winCount || 0) / totalA) * 100) : 0;
                  const wrB = totalB > 0 ? Math.round(((athleteB.winCount || 0) / totalB) * 100) : 0;
                  return (
                    <div className="px-4 py-3 grid grid-cols-3 items-center text-center">
                      <div
                        className={`font-black italic text-base ${
                          wrA > wrB ? 'text-lime-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {wrA}% {wrA > wrB && '👑'}
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300/60 tracking-wider">
                        Overall Win Rate
                      </div>
                      <div
                        className={`font-black italic text-base ${
                          wrB > wrA ? 'text-rose-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {wrB}% {wrB > wrA && '👑'}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Level & Experience */}
                {(() => {
                  const xpA = athleteA.xp ?? athleteA.valuexp ?? 0;
                  const xpB = athleteB.xp ?? athleteB.valuexp ?? 0;
                  return (
                    <div className="px-4 py-3 grid grid-cols-3 items-center text-center">
                      <div
                        className={`font-black italic text-base ${
                          xpA > xpB ? 'text-lime-400' : 'text-indigo-200/70'
                        }`}
                      >
                        Lvl {athleteA.level} ({xpA.toLocaleString()} XP) {xpA > xpB && '👑'}
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300/60 tracking-wider">
                        Level & Experience
                      </div>
                      <div
                        className={`font-black italic text-base ${
                          xpB > xpA ? 'text-rose-400' : 'text-indigo-200/70'
                        }`}
                      >
                        Lvl {athleteB.level} ({xpB.toLocaleString()} XP) {xpB > xpA && '👑'}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Batting Average */}
                {(() => {
                  const rawBA_A = athleteA.stats?.softball?.battingAvg ?? athleteA.stats?.baseball?.battingAvg ?? 0;
                  const rawBA_B = athleteB.stats?.softball?.battingAvg ?? athleteB.stats?.baseball?.battingAvg ?? 0;
                  const baA = rawBA_A > 0 ? rawBA_A : 0;
                  const baB = rawBA_B > 0 ? rawBA_B : 0;
                  const fmt = (v: number) => (v > 0 ? `.${Math.round(v * 1000).toString().padStart(3, '0')}` : '.000');
                  return (
                    <div className="px-4 py-3 grid grid-cols-3 items-center text-center">
                      <div
                        className={`font-black italic text-base ${
                          baA > baB ? 'text-lime-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {fmt(baA)} {baA > baB && '👑'}
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300/60 tracking-wider">
                        Batting Average
                      </div>
                      <div
                        className={`font-black italic text-base ${
                          baB > baA ? 'text-rose-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {fmt(baB)} {baB > baA && '👑'}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Pickleball Win % */}
                {(() => {
                  const pkA = (athleteA.stats?.pickleball?.winRate || 0) * 100;
                  const pkB = (athleteB.stats?.pickleball?.winRate || 0) * 100;
                  return (
                    <div className="px-4 py-3 grid grid-cols-3 items-center text-center">
                      <div
                        className={`font-black italic text-base ${
                          pkA > pkB ? 'text-lime-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {Math.round(pkA)}% {pkA > pkB && '👑'}
                      </div>
                      <div className="text-[10px] font-black uppercase text-indigo-300/60 tracking-wider">
                        Pickleball Win %
                      </div>
                      <div
                        className={`font-black italic text-base ${
                          pkB > pkA ? 'text-rose-400' : 'text-indigo-200/70'
                        }`}
                      >
                        {Math.round(pkB)}% {pkB > pkA && '👑'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => handleShareAthlete(athleteA)}
                className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 font-black italic uppercase text-xs rounded-xl transition border border-white/10 flex items-center space-x-1.5"
              >
                <Share2 className="w-4 h-4 text-lime-400" />
                <span>Share Comparison Card</span>
              </button>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-lime-400/20 transition"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Confirmation */}
      <ShareConfirmationNotification
        data={shareConfirmation}
        onClose={() => setShareConfirmation(null)}
      />
    </div>
  );
};

export default LeaderboardView;