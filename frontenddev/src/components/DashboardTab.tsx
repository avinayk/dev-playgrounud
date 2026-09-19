// components/DashboardTab.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { AthleteProfile } from "../types/auth.types";
import { PickupGame, Tournament, CourtPOI, SportType } from "../types";
import { StatLogModal } from './StatLogModal';
import { HostGameModal } from './HostGameModal';
import {
  DashboardStatCard,
  RecentActivity,
} from "../types/dashboard.types";
import { StatsSummary, WinLossRow, StatLog } from "../types/stats.types";
import { getLevelInfo } from '../utils/leveling';
import { createPickupGame } from '../services/pickupGames';
import type { PickupGameFormData } from '../types/pickupGames';
import {
  dailyCheckInAPI,
  getCheckInStatusAPI,
} from '../services/dashboard.service';
import {
  CheckCircle2,
  Gift,
  Sparkles,
  Check,
  Flame,
  RefreshCw,
  Activity,
  Plus,
  PlusCircle,
  Target,
  RotateCcw,
  Dumbbell,
  Calendar,
  Users,
  MapPin,
  Coins,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';
import { RegionalSection } from './regional/RegionalSection';
import {
  getActiveSports,
  getSportLabel,
  getSportStatSummary,
} from '../utils/sportUtils';
import {
  fetchTodayPointsAPI,
  checkBonusAPI,
  type DailyPointsData,
} from '../services/dailyPoints.service';
import { WeeklyChallenges } from './WeeklyChallenges';
import { useSportFilter } from '../hooks/useSportFilter';
import { triggerHaptic } from '../utils/haptics';

/* DAILY CHALLENGES API */
import {
  fetchDailyChallenges,
  rerollDailyChallenges,
  progressDailyChallenge,
  claimDailyReward,
  claimDailyChestAPI,
  type DailyChallengeDTO,
} from '../services/dailyChallenges.service';

/* CUSTOM GOALS API */
import {
  createCustomGoalAPI,
  fetchCustomGoalsAPI,
  progressCustomGoalAPI,
  claimCustomGoalAPI,
  deleteCustomGoalAPI,
  type CustomGoalDTO,
} from '../services/customGoals.service';

/* SEASON GOALS API */
import {
  fetchSeasonGoalsAPI,
  createSeasonGoalAPI,
  progressSeasonGoalAPI,
  claimSeasonGoalAPI,
  type SeasonGoalDTO,
} from '../services/seasonGoals.service';

export interface DashboardTabProps {
  athlete: AthleteProfile | null;
  pickupGames?: PickupGame[];
  tournaments?: Tournament[];
  courts?: CourtPOI[];
  onOpenStatLog: () => void;
  onStartGame: () => void;
  onViewStats: () => void;
  onViewHighlights: () => void;
  onNavigateToTab?: (tab: any) => void;
  onOpenProCheckout?: (msg?: string) => void;
  onJoinGame?: (gameId: string) => void;
  onEarnXp?: (amount: number, source: string) => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || '';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface DailyCard {
  challengeId: string;
  userChallengeId: number;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardXp: number;
  completed: boolean;
  claimed: boolean;
  icon: string;
  actionTab?: string;
}

interface FriendActivityItem {
  id: string;
  friendId: string;
  friendName: string;
  friendHandle: string;
  friendAvatar: string;
  friendRole: string;
  friendSport: SportType;
  actionTitle: string;
  actionDetail: string;
  timeAgo: string;
  cheersCount: number;
  hasCheered?: boolean;
  level: number;
  winCount: number;
}

const ICON_EMOJI: Record<string, string> = {
  trophy: '🏆',
  award: '🥇',
  zap: '⚡',
  flame: '🔥',
  target: '🎯',
  clock: '⏱️',
  shield: '🛡️',
  handshake: '🤝',
  clipboard: '📋',
};

const ACTION_TAB_MAP: Record<string, string> = {
  ch_daily_smartwarmup: 'stats',
  ch_daily_log_stat: 'stats',
  ch_daily_10_shots: 'stats',
  ch_daily_20min_practice: 'stats',
  ch_daily_3_steals: 'stats',
  ch_daily_5_assists: 'stats',
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  athlete,
  pickupGames = [],
  tournaments = [],
  courts = [],
  onOpenStatLog,
  onStartGame,
  onViewStats,
  onViewHighlights,
  onNavigateToTab,
  onOpenProCheckout,
  onJoinGame,
  onEarnXp,
}) => {
  const [activeSection, setActiveSection] = useState<"overview" | "stats" | "games">("overview");
  const [isStatLogModalOpen, setIsStatLogModalOpen] = useState(false);
  const [isHostGameModalOpen, setIsHostGameModalOpen] = useState(false);

  /* ─── CHECK-IN STATE ─── */
  const [checkInStatus, setCheckInStatus] = useState<{
    isCheckedInToday: boolean;
    dailyStreak: number;
    longestStreak: number;
    lastCheckinDate: string | null;
    recentCheckins: string[];
  }>({
    isCheckedInToday: false,
    dailyStreak: 0,
    longestStreak: 0,
    lastCheckinDate: null,
    recentCheckins: [],
  });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [rewardToast, setRewardToast] = useState<{ show: boolean; title: string; xp: number } | null>(null);

  useEffect(() => {
    if (!athlete?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getCheckInStatusAPI(athlete.id);
        if (cancelled) return;
        setCheckInStatus(status);
      } catch (err) {
        console.error('❌ Load check-in status failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [athlete?.id]);

  const handleDailyCheckIn = async () => {
    if (!athlete?.id || checkInStatus.isCheckedInToday || isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const result = await dailyCheckInAPI(athlete.id);
      if (result.alreadyCheckedIn) {
        setCheckInStatus((prev) => ({ ...prev, isCheckedInToday: true, dailyStreak: result.newStreak }));
        return;
      }
      setCheckInStatus((prev) => ({
        isCheckedInToday: true,
        dailyStreak: result.newStreak,
        longestStreak: result.longestStreak,
        lastCheckinDate: result.lastCheckinDate,
        recentCheckins: [result.lastCheckinDate, ...prev.recentCheckins],
      }));
      setRewardToast({ show: true, title: '⚡ DAILY CHECK-IN CLAIMED!', xp: result.xpEarned });
      setTimeout(() => setRewardToast(null), 4000);
      toast.success(`+${result.xpEarned} XP claimed! ${result.newStreak} day streak 🔥`, {
        duration: 3000, position: 'top-right',
        style: { background: '#065f46', color: '#fff' }, icon: '✅',
      });
      setTimeout(() => location.reload(), 2500);
    } catch (err) {
      console.error('❌ Check-in failed:', err);
      toast.error('Check-in failed. Try again!', { duration: 3000, position: 'top-right' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  /* ─── STATS STATE ─── */
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [winLoss, setWinLoss] = useState<WinLossRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<StatLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const levelInfo = getLevelInfo(athlete?.valuexp ?? 0);

  const fetchStats = useCallback(async () => {
    if (!athlete?.id) return;
    setStatsLoading(true);
    try {
      const [s, w, l] = await Promise.all([
        fetch(`${API_URL}/stats/summary?athleteId=${athlete.id}`),
        fetch(`${API_URL}/stats/win-loss?athleteId=${athlete.id}`),
        fetch(`${API_URL}/stats/athlete/${athlete.id}?limit=5`),
      ]);
      const [sJ, wJ, lJ] = await Promise.all([s.json(), w.json(), l.json()]);
      if (s.ok) setSummary(sJ.data || null);
      if (w.ok) setWinLoss(wJ.data || []);
      if (l.ok) setRecentLogs(lJ.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [athlete?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleOpenStatLog = () => {
    if (!athlete) {
      toast.error("Please log in to log game stats", { id: "stat-log-auth-error", duration: 4000, position: "top-right", icon: "🔒" });
      return;
    }
    setIsStatLogModalOpen(true);
  };

  /* ─── DAILY POINTS STATE ─── */
  const [dailyPointsData, setDailyPointsData] = useState<DailyPointsData | null>(null);
  const [isLoadingDailyPoints, setIsLoadingDailyPoints] = useState(false);
  const [isEditingDailyPointGoal, setIsEditingDailyPointGoal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('25');
  const [dailyPointTarget, setDailyPointTarget] = useState<number>(25);

  useEffect(() => {
    if (!athlete?.id) return;
    try {
      const stored = localStorage.getItem(`daily_target_${athlete.id}`);
      if (stored) {
        const parsed = Number(stored);
        if (parsed > 0) { setDailyPointTarget(parsed); setCustomGoalInput(String(parsed)); }
      }
    } catch {}
  }, [athlete?.id]);

  const fetchDailyPoints = useCallback(async () => {
    if (!athlete?.id) return;
    setIsLoadingDailyPoints(true);
    try {
      const data = await fetchTodayPointsAPI(athlete.id, dailyPointTarget);
      setDailyPointsData(data);
      if (data.currentPoints >= data.targetPoints && !data.xpAwarded) {
        const bonus = await checkBonusAPI(athlete.id, data.targetPoints);
        if (bonus.xpAwardedNow) {
          setRewardToast({ show: true, title: `🔥 DAILY TARGET (${bonus.targetPoints} PTS)!`, xp: bonus.xpAmount });
          setTimeout(() => setRewardToast(null), 4000);
          setDailyPointsData({ ...data, xpAwarded: true });
          window.dispatchEvent(new CustomEvent('user:xp-updated', {
            detail: { valuexp: ((athlete as any)?.valuexp ?? 0) + bonus.xpAmount }
          }));
        }
      }
    } catch (err) {
      console.error('❌ Failed to load daily points:', err);
    } finally {
      setIsLoadingDailyPoints(false);
    }
  }, [athlete?.id, dailyPointTarget]);

  useEffect(() => { fetchDailyPoints(); }, [fetchDailyPoints]);

  const handleSaveStats = (data: any) => {
    onOpenStatLog?.();
    toast.success("Stats logged successfully! 🎉", { id: "stats-saved", duration: 3000, position: "top-right", icon: "✅" });
    fetchStats();
    setTimeout(() => fetchDailyPoints(), 300);
  };

  const handleOpenHostGame = () => {
    if (!athlete) {
      toast.error("Please log in to host a game", { id: "host-game-auth-error", duration: 4000, position: "top-right", icon: "🔒" });
      return;
    }
    setIsHostGameModalOpen(true);
  };

  const handleSaveHostGame = async (gameData: PickupGameFormData): Promise<void> => {
    if (!athlete?.id) { toast.error('You must be logged in.'); throw new Error('Not authenticated'); }
    toast.loading('Creating pickup game...', { id: 'host-game-loading', position: 'top-right' });
    try {
      await createPickupGame(gameData, athlete.id);
      toast.success('🏀 Pickup game created!', { id: 'host-game-loading', duration: 3000, position: 'top-right', icon: '🎉' });
      if (typeof onStartGame === 'function') onStartGame();
    } catch (err) {
      console.error('❌ Save failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create game', { id: 'host-game-loading', position: 'top-right' });
      throw err;
    }
  };

  useEffect(() => {
    if (!athlete) {
      toast.error("Please log in to view your dashboard", { id: "dashboard-auth-error", duration: 4000, position: "top-right", icon: "🔒" });
    }
  }, [athlete]);

  const isCheckedInToday = checkInStatus.isCheckedInToday;
  const currentStreak = checkInStatus.dailyStreak || 0;

  const currentSport: SportType =
    ((athlete as any)?.primarySport as SportType) ||
    ((athlete as any)?.primary_sport as SportType) ||
    'basketball';

  const [selectedSport, setSelectedSport] = useState<SportType>(currentSport || 'basketball');

  const activeSports = useMemo(() => {
    try {
      const list = getActiveSports(athlete);
      if (currentSport && !list.includes(currentSport)) return [currentSport, ...list];
      return list;
    } catch { return [currentSport]; }
  }, [athlete, currentSport]);

  const currentStatSummary = useMemo(() => {
    try { return getSportStatSummary(athlete, currentSport); } catch { return []; }
  }, [athlete, currentSport]);

  const handleUpdateDailyPointGoal = (newTarget: number) => {
    if (newTarget <= 0 || newTarget > 1000) return;
    setDailyPointTarget(newTarget);
    setIsEditingDailyPointGoal(false);
    setCustomGoalInput(String(newTarget));
    try { if (athlete?.id) localStorage.setItem(`daily_target_${athlete.id}`, String(newTarget)); } catch {}
  };

  /* ─── DAILY CHALLENGES STATE ─── */
  const [dailyChallenges, setDailyChallenges] = useState<DailyCard[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isChestClaimed, setIsChestClaimed] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [isChestClaiming, setIsChestClaiming] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);

  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [customGoalDesc, setCustomGoalDesc] = useState('');
  const [customGoalTarget, setCustomGoalTarget] = useState(1);
  const [customGoalXp, setCustomGoalXp] = useState(100);

  const mapDTOtoCard = (dto: DailyChallengeDTO): DailyCard => ({
    challengeId: dto.id,
    userChallengeId: dto.userChallengeId,
    title: dto.title,
    description: dto.description,
    target: dto.targetCount,
    current: dto.progress,
    rewardXp: dto.xpReward,
    completed: dto.isCompleted,
    claimed: dto.xpEarned > 0,
    icon: ICON_EMOJI[dto.icon] || '🎯',
    actionTab: ACTION_TAB_MAP[dto.id],
  });

  const loadDailyChallenges = useCallback(async () => {
    if (!athlete?.id) return;
    setDailyLoading(true);
    try {
      const data = await fetchDailyChallenges(athlete.id);
      setDailyChallenges(data.map(mapDTOtoCard));
    } catch (err) {
      console.error('❌ Load daily challenges failed:', err);
    } finally {
      setDailyLoading(false);
    }
  }, [athlete?.id]);

  useEffect(() => { loadDailyChallenges(); }, [loadDailyChallenges]);

  const handleRerollChallenges = async () => {
    if (!athlete?.id || isShuffling) return;
    setIsShuffling(true);
    triggerHaptic('medium');
    try {
      const data = await rerollDailyChallenges(athlete.id);
      setDailyChallenges(data.map(mapDTOtoCard));
      setIsChestClaimed(false);
      toast.success('Daily quests rerolled! 🎲', { id: 'dq-reroll', duration: 2500, position: 'top-right' });
    } catch (err) {
      console.error('❌ Reroll failed:', err);
      toast.error('Failed to reroll', { id: 'dq-reroll-err' });
    } finally {
      setIsShuffling(false);
    }
  };

  const handleProgressChallenge = async (card: DailyCard) => {
    if (!athlete?.id || card.claimed || card.completed) return;
    triggerHaptic('light');
    setDailyChallenges((prev) => prev.map((c) =>
      c.userChallengeId === card.userChallengeId ? { ...c, current: Math.min(c.target, c.current + 1) } : c
    ));
    try {
      const updated = await progressDailyChallenge(athlete.id, card.challengeId, 1);
      if (updated) {
        setDailyChallenges((prev) => prev.map((c) =>
          c.userChallengeId === card.userChallengeId ? { ...c, current: updated.progress, completed: updated.isCompleted } : c
        ));
        if (updated.isCompleted) {
          toast.success(`🎉 "${card.title}" complete!`, { id: `dq-done-${card.userChallengeId}`, duration: 3000, position: 'top-right' });
        }
      }
    } catch (err) {
      console.error('❌ Progress failed:', err);
      loadDailyChallenges();
    }
  };

  const handleClaimChallengeReward = async (card: DailyCard) => {
    if (!athlete?.id || card.claimed || !card.completed) return;
    triggerHaptic('success');
    setClaimingId(card.userChallengeId);
    try {
      const result = await claimDailyReward(athlete.id, card.challengeId);
      if (result.alreadyClaimed) {
        toast('Reward already claimed', { icon: 'ℹ️' });
        setDailyChallenges((prev) => prev.map((c) =>
          c.userChallengeId === card.userChallengeId ? { ...c, claimed: true } : c
        ));
        return;
      }
      if (typeof onEarnXp === 'function') onEarnXp(result.xpEarned, `Daily Quest: ${card.title}`);
      window.dispatchEvent(new CustomEvent('user:xp-updated', { detail: { valuexp: result.newXp } }));
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      setDailyChallenges((prev) => prev.map((c) =>
        c.userChallengeId === card.userChallengeId ? { ...c, claimed: true, completed: true } : c
      ));
      setRewardToast({ show: true, title: `🎉 ${card.title}`, xp: result.xpEarned });
      setTimeout(() => setRewardToast(null), 3500);
      toast.success(`+${result.xpEarned} XP claimed! 🏆`, { id: `dq-claim-${card.userChallengeId}`, duration: 3000, position: 'top-right' });
    } catch (err) {
      console.error('❌ Claim failed:', err);
      toast.error('Failed to claim reward', { id: 'dq-claim-err' });
      loadDailyChallenges();
    } finally {
      setClaimingId(null);
    }
  };

  const allDailyClaimed = dailyChallenges.length > 0 && dailyChallenges.every((c) => c.claimed);

  const handleClaimDailyChest = async () => {
    if (!athlete?.id || isChestClaimed || isChestClaiming) return;
    if (!allDailyClaimed) { toast.error('Complete and claim all daily quests first!'); return; }
    triggerHaptic('success');
    setIsChestClaiming(true);
    try {
      const result = await claimDailyChestAPI(athlete.id);
      if (result.alreadyClaimed) {
        setIsChestClaimed(true);
        toast('Chest already claimed today', { icon: 'ℹ️' });
        return;
      }
      if (typeof onEarnXp === 'function') onEarnXp(result.xpEarned, 'Daily Gold Chest Bonus');
      window.dispatchEvent(new CustomEvent('user:xp-updated', { detail: { valuexp: result.newXp } }));
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      setIsChestClaimed(true);
      setRewardToast({ show: true, title: '🎁 DAILY GOLD CHEST UNLOCKED!', xp: result.xpEarned });
      setTimeout(() => setRewardToast(null), 4000);
      toast.success(`+${result.xpEarned} XP from Gold Chest! 🎁`, { id: 'dq-chest', duration: 3500, position: 'top-right' });
    } catch (err: any) {
      console.error('❌ Chest failed:', err);
      toast.error(err?.message || 'Failed to claim chest', { id: 'dq-chest-err' });
    } finally {
      setIsChestClaiming(false);
    }
  };

  /* ─── RECOMMENDED GAMES ─── */
  const userCity = (athlete as any)?.registeredCity || (athlete as any)?.city || 'New York';
  const { filteredPickupGames } = useSportFilter({
    userSport: currentSport, athletes: [], pickupGames, tournaments: [],
  });

  const recommendedGames = useMemo(() => {
    const cityLower = userCity.toLowerCase();
    const cityMatches = filteredPickupGames.filter((g: any) => {
      const gCity = ((g as any).city || '').toLowerCase();
      const gAddr = (g.address || '').toLowerCase();
      const gCourt = (g.courtName || '').toLowerCase();
      return gCity.includes(cityLower) || gAddr.includes(cityLower) || gCourt.includes(cityLower);
    });
    if (cityMatches.length > 0) return cityMatches;
    return filteredPickupGames.length > 0 ? filteredPickupGames : pickupGames;
  }, [filteredPickupGames, pickupGames, userCity]);

  /* ═══════════════════════════════════════════
     🎯 CUSTOM GOALS
     ═══════════════════════════════════════════ */
  const [activeGoals, setActiveGoals] = useState<CustomGoalDTO[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [claimingGoalId, setClaimingGoalId] = useState<string | null>(null);
  const [progressingGoalId, setProgressingGoalId] = useState<string | null>(null);

  const loadCustomGoals = useCallback(async () => {
    if (!athlete?.id) return;
    setGoalsLoading(true);
    try {
      const goals = await fetchCustomGoalsAPI(athlete.id, 'daily');
      setActiveGoals(goals);
    } catch (err) {
      console.error('❌ Load custom goals failed:', err);
    } finally {
      setGoalsLoading(false);
    }
  }, [athlete?.id]);

  useEffect(() => { loadCustomGoals(); }, [loadCustomGoals]);

  const handleCreateCustomGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalTitle.trim() || !athlete?.id) return;
    triggerHaptic('success');
    try {
      const created = await createCustomGoalAPI({
        athleteId: athlete.id,
        title: customGoalTitle.trim(),
        description: customGoalDesc.trim() || 'Daily athlete engagement target',
        target: customGoalTarget,
        unit: 'target',
        rewardXp: customGoalXp,
        type: 'daily',
        sport: currentSport,
      });
      setActiveGoals((prev) => [created, ...prev]);
      toast.success(`🎯 New goal: "${created.title}"`, { id: 'custom-goal-created', duration: 3000, position: 'top-right', icon: '✅' });
      setRewardToast({ show: true, title: '🎯 NEW DAILY GOAL SET!', xp: 50 });
      setTimeout(() => setRewardToast(null), 3500);
      if (typeof onEarnXp === 'function') onEarnXp(50, `Created Custom Goal: ${created.title}`);
      setIsAddGoalModalOpen(false);
      setCustomGoalTitle('');
      setCustomGoalDesc('');
      setCustomGoalTarget(1);
      setCustomGoalXp(100);
    } catch (err: any) {
      console.error('❌ Create goal failed:', err);
      toast.error(err?.message || 'Failed to create goal', { id: 'custom-goal-err', position: 'top-right' });
    }
  };

  const handleProgressCustomGoal = async (goal: CustomGoalDTO) => {
    if (!athlete?.id || goal.isClaimed || goal.isCompleted) return;
    triggerHaptic('light');
    setProgressingGoalId(goal.id);
    setActiveGoals((prev) => prev.map((g) =>
      g.id === goal.id ? { ...g, current: Math.min(g.target, g.current + 1) } : g
    ));
    try {
      const updated = await progressCustomGoalAPI(athlete.id, goal.id, 1);
      setActiveGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      if (updated.isCompleted) {
        toast.success(`🎉 "${goal.title}" complete!`, { id: `cg-done-${goal.id}`, duration: 3000, position: 'top-right' });
      }
    } catch (err) {
      console.error('❌ Progress failed:', err);
      loadCustomGoals();
    } finally {
      setProgressingGoalId(null);
    }
  };

  const handleClaimCustomGoal = async (goal: CustomGoalDTO) => {
    if (!athlete?.id || goal.isClaimed || !goal.isCompleted) return;
    triggerHaptic('success');
    setClaimingGoalId(goal.id);
    try {
      const result = await claimCustomGoalAPI(athlete.id, goal.id);
      if (typeof onEarnXp === 'function') onEarnXp(result.xpEarned, `Custom Goal: ${goal.title}`);
      window.dispatchEvent(new CustomEvent('user:xp-updated', { detail: { valuexp: result.newXp } }));
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      setActiveGoals((prev) => prev.map((g) =>
        g.id === goal.id ? { ...g, isClaimed: true, isCompleted: true } : g
      ));
      setRewardToast({ show: true, title: `🎉 ${goal.title}`, xp: result.xpEarned });
      setTimeout(() => setRewardToast(null), 3500);
      toast.success(`+${result.xpEarned} XP claimed! 🏆`, { id: `cg-claim-${goal.id}`, duration: 3000, position: 'top-right' });
    } catch (err: any) {
      console.error('❌ Claim failed:', err);
      toast.error(err?.message || 'Failed to claim', { id: 'cg-claim-err', position: 'top-right' });
      loadCustomGoals();
    } finally {
      setClaimingGoalId(null);
    }
  };

  const handleDeleteCustomGoal = async (goal: CustomGoalDTO) => {
    if (!athlete?.id) return;
    triggerHaptic('medium');
    try {
      const ok = await deleteCustomGoalAPI(athlete.id, goal.id);
      if (ok) {
        setActiveGoals((prev) => prev.filter((g) => g.id !== goal.id));
        toast.success('Goal removed', { id: 'cg-del', position: 'top-right', duration: 2000 });
      }
    } catch (err) {
      console.error('❌ Delete failed:', err);
      toast.error('Failed to delete goal', { id: 'cg-del-err' });
    }
  };

  /* ═══════════════════════════════════════════
     🏆 SEASON GOALS (DB-backed)
     ═══════════════════════════════════════════ */
  const [seasonGoals, setSeasonGoals] = useState<SeasonGoalDTO[]>([]);
  const [seasonGoalsLoading, setSeasonGoalsLoading] = useState(false);
  const [claimingSeasonGoalId, setClaimingSeasonGoalId] = useState<string | null>(null);
  const [progressingSeasonGoalId, setProgressingSeasonGoalId] = useState<string | null>(null);

  const [isAddSeasonGoalModalOpen, setIsAddSeasonGoalModalOpen] = useState(false);
  const [seasonGoalTitle, setSeasonGoalTitle] = useState('');
  const [seasonGoalMetric, setSeasonGoalMetric] = useState('Blocks');
  const [seasonGoalTarget, setSeasonGoalTarget] = useState(50);
  const [seasonGoalSport, setSeasonGoalSport] = useState<SportType>('basketball');
  const [seasonGoalXp, setSeasonGoalXp] = useState(350);

  const loadSeasonGoals = useCallback(async () => {
    if (!athlete?.id) return;
    setSeasonGoalsLoading(true);
    try {
      const goals = await fetchSeasonGoalsAPI(athlete.id, currentSport);
      setSeasonGoals(goals);
    } catch (err) {
      console.error('❌ Load season goals failed:', err);
    } finally {
      setSeasonGoalsLoading(false);
    }
  }, [athlete?.id, currentSport]);

  useEffect(() => { loadSeasonGoals(); }, [loadSeasonGoals]);

  const handleCreateSeasonGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonGoalTitle.trim() || !athlete?.id) return;
    triggerHaptic('success');
    try {
      const created = await createSeasonGoalAPI({
        athleteId: athlete.id,
        sport: seasonGoalSport,
        title: seasonGoalTitle.trim(),
        description: `Personal season milestone in ${getSportLabel(seasonGoalSport)}.`,
        unit: seasonGoalMetric,
        targetCount: seasonGoalTarget,
        rewardXp: seasonGoalXp,
      });
      setSeasonGoals((prev) => [created, ...prev]);
      setIsAddSeasonGoalModalOpen(false);
      setSeasonGoalTitle('');
      toast.success(`🏆 Season goal created!`, { id: 'sg-created', duration: 3000, position: 'top-right' });
    } catch (err: any) {
      console.error('❌ Create season goal failed:', err);
      toast.error(err?.message || 'Failed to create goal', { id: 'sg-err' });
    }
  };

  const handleProgressSeasonGoal = async (goal: SeasonGoalDTO, increment = 5) => {
    if (!athlete?.id || goal.isClaimed) return;
    triggerHaptic('light');
    setProgressingSeasonGoalId(goal.id);
    setSeasonGoals((prev) => prev.map((g) =>
      g.id === goal.id ? { ...g, currentCount: Math.min(g.targetCount, g.currentCount + increment) } : g
    ));
    try {
      const updated = await progressSeasonGoalAPI(athlete.id, goal.id, increment);
      setSeasonGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      if (updated.isCompleted) {
        toast.success(`🏆 "${goal.title}" complete!`, { id: `sg-done-${goal.id}`, duration: 3000, position: 'top-right' });
      }
    } catch (err) {
      console.error('❌ Progress failed:', err);
      loadSeasonGoals();
    } finally {
      setProgressingSeasonGoalId(null);
    }
  };

  const handleClaimSeasonGoalReward = async (goal: SeasonGoalDTO) => {
    if (!athlete?.id || goal.isClaimed || !goal.isCompleted) return;
    triggerHaptic('success');
    setClaimingSeasonGoalId(goal.id);
    try {
      const result = await claimSeasonGoalAPI(athlete.id, goal.id);
      if (typeof onEarnXp === 'function') onEarnXp(result.xpEarned, `Season Goal: ${goal.title}`);
      window.dispatchEvent(new CustomEvent('user:xp-updated', { detail: { valuexp: result.newXp } }));
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      setSeasonGoals((prev) => prev.map((g) =>
        g.id === goal.id ? { ...g, isClaimed: true, isCompleted: true } : g
      ));
      setRewardToast({ show: true, title: `🏆 ${goal.title}`, xp: result.xpEarned });
      setTimeout(() => setRewardToast(null), 3500);
      toast.success(`+${result.xpEarned} XP claimed! 🏆`, { id: `sg-claim-${goal.id}`, duration: 3000, position: 'top-right' });
    } catch (err: any) {
      console.error('❌ Claim failed:', err);
      toast.error(err?.message || 'Failed to claim', { id: 'sg-claim-err', position: 'top-right' });
      loadSeasonGoals();
    } finally {
      setClaimingSeasonGoalId(null);
    }
  };

  /* ═══════════════════════════════════════════
     👥 FRIEND ACTIVITY
     ═══════════════════════════════════════════ */
  const [friendActivities, setFriendActivities] = useState<FriendActivityItem[]>([
    {
      id: 'fa_1', friendId: 'fr_marcus', friendName: 'Marcus Vance', friendHandle: '@marcus_vance11',
      friendAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      friendRole: 'Court General • #11', friendSport: 'basketball',
      actionTitle: 'Logged Match Stats 🏀', actionDetail: 'Scored 28 PTS, 12 REB & 6 AST in Basketball Pickup Run at Rucker Park',
      timeAgo: '12m ago', cheersCount: 14, level: 16, winCount: 42,
    },
    {
      id: 'fa_2', friendId: 'fr_sarah', friendName: 'Sarah Lin', friendHandle: '@sarah_spikes7',
      friendAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      friendRole: 'Volleyball Captain • #7', friendSport: 'volleyball',
      actionTitle: 'Completed Season Goal 🏐', actionDetail: 'Reached Season Milestone: "50 Blocks this Season!" (+350 XP Claimed)',
      timeAgo: '45m ago', cheersCount: 22, level: 18, winCount: 56,
    },
    {
      id: 'fa_3', friendId: 'fr_tyler', friendName: 'Tyler Brooks', friendHandle: '@tyler_striker9',
      friendAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      friendRole: 'Playground Starter • #23', friendSport: 'soccer',
      actionTitle: 'Earned Athlete Badge 🏆', actionDetail: 'Unlocked "Triple-Double Titan" Badge & claimed +250 XP reward!',
      timeAgo: '2h ago', cheersCount: 9, level: 12, winCount: 29,
    },
    {
      id: 'fa_4', friendId: 'fr_jordan', friendName: 'Jordan Cole', friendHandle: '@jordan_ace1',
      friendAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      friendRole: 'Playground Pro 👑', friendSport: 'baseball',
      actionTitle: 'Level Up Milestone ⚡', actionDetail: 'Reached Level 15 Athlete and achieved Level Title "Franchise Icon"',
      timeAgo: '4h ago', cheersCount: 31, level: 15, winCount: 61,
    },
  ]);

  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendActivityItem | null>(null);

  const handleCheerFriendActivity = (activityId: string, friendName: string) => {
    triggerHaptic('light');
    setFriendActivities((prev) => prev.map((act) => {
      if (act.id === activityId) {
        const isCheered = !act.hasCheered;
        return { ...act, hasCheered: isCheered, cheersCount: isCheered ? act.cheersCount + 1 : act.cheersCount - 1 };
      }
      return act;
    }));
    setRewardToast({ show: true, title: `🔥 CHEER SENT TO ${friendName.toUpperCase()}!`, xp: 15 });
    setTimeout(() => setRewardToast(null), 3000);
  };

  /* ═══════════════════════════════════════════
     EARLY RETURN
     ═══════════════════════════════════════════ */
  if (!athlete) {
    return (
      <div className="blur">
        <div className="text-white p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black italic uppercase text-white">Welcome back, ABC! 👋</h2>
              <p className="text-indigo-300 mt-1 text-sm">scout_recruiter</p>
            </div>
            <span className="px-4 py-2 bg-lime-400/20 text-lime-300 rounded-2xl text-sm font-bold uppercase border border-lime-400/30">Free Tier</span>
          </div>
        </div>
      </div>
    );
  }

  const stats: DashboardStatCard[] = [{ label: "Games Played", value: summary?.total_games ?? 0, color: "lime-400", change: 0 }];

  const recentActivities: RecentActivity[] = recentLogs.length > 0
    ? recentLogs.map((log) => ({
        id: String(log.id), type: "game" as const,
        description: log.outcome === "win" ? `🏆 Won a ${log.sport} game` : `📉 Lost a ${log.sport} game`,
        timestamp: new Date(log.created_at),
      }))
    : [
        { id: "1", type: "achievement", description: "🎯 Completed first profile setup", timestamp: new Date() },
        { id: "2", type: "follow", description: "👥 Connected with 3 new athletes", timestamp: new Date(Date.now() - 3600000) },
      ];

  const getActivityIcon = (type: RecentActivity["type"]) => {
    const icons = { game: "🏀", highlight: "🎥", achievement: "🏆", follow: "👥" };
    return icons[type] || "📌";
  };

  const totalWins = summary?.total_wins ?? 0;
  const totalLosses = summary?.total_losses ?? 0;
  const winPct = summary?.win_percentage ?? 0;

  const resetCountdown = (() => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Resets in ${h}h ${m}m`;
  })();

  return (
    <>
      <StatLogModal isOpen={isStatLogModalOpen} onClose={() => setIsStatLogModalOpen(false)} onSave={handleSaveStats} created_by_id={athlete.id} />
      <HostGameModal isOpen={isHostGameModalOpen} onClose={() => setIsHostGameModalOpen(false)} onSave={handleSaveHostGame} user={{ name: athlete.name, level: athlete.level }} />

      {/* REWARD TOAST */}
      {rewardToast && rewardToast.show && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-300 text-black p-4 rounded-2xl shadow-2xl border-2 border-white flex items-center space-x-3 animate-bounce">
          <div className="p-2 bg-black text-lime-400 rounded-xl">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Reward Unlocked!</span>
            <h4 className="text-sm font-black italic uppercase">{rewardToast.title}</h4>
            <span className="text-xs font-black font-mono">+{rewardToast.xp} BONUS XP</span>
          </div>
        </div>
      )}

      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-900 p-6 md:p-8 shadow-2xl border border-white/10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="relative">
              <img alt={athlete.name} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover ring-4 ring-lime-400 shadow-xl" src={athlete.profilepicture} />
              <span className="absolute -bottom-2 -right-2 bg-lime-400 text-black font-black italic text-xs px-2.5 py-0.5 rounded-lg shadow">#{athlete.jersey}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 rounded-full bg-lime-400/20 text-lime-400 text-[11px] font-black italic border border-lime-400/30 uppercase">College / League</span>
                <span className="text-xs text-indigo-200/70 font-bold">• Playground League</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black italic tracking-tight mt-1 text-white uppercase flex items-center gap-2 flex-wrap">
                <span>Welcome back, {athlete.name}!</span>
                {athlete.subscriptionTier === "pro" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-xs font-black italic uppercase rounded-full shadow-lg border border-amber-200">
                    <Sparkles className="w-3.5 h-3.5 fill-black" /><span>PRO 👑</span>
                  </span>
                )}
              </h1>
              <p className="text-sm text-indigo-200 mt-0.5 flex items-center space-x-2 font-bold">
                <span>{athlete.position}</span><span>•</span>
                <span className="text-lime-400 font-black italic">Rookie Prospect 🧢</span>
              </p>
            </div>
          </div>

          <div className="bg-indigo-950/80 backdrop-blur-md border border-white/10 rounded-[1.8rem] p-5 flex flex-col min-w-[300px] shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-lime-400" />
                <span className="text-sm font-black italic uppercase text-white">Level {levelInfo.level} Athlete</span>
              </div>
              <span className="text-xs font-black italic text-lime-400 font-mono">
                {levelInfo.xpInCurrentLevel} / {levelInfo.xpRequiredForNextLevel} XP
              </span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 px-3 py-1.5 rounded-xl border border-orange-400/40 mb-2.5">
              <div className="flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
                <span className="text-xs font-black italic uppercase text-orange-300 tracking-wider">{currentStreak} Day Streak!</span>
              </div>
            </div>
            <div className="w-full bg-indigo-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div className="bg-lime-400 h-full rounded-full transition-all duration-700 shadow-sm shadow-lime-400" style={{ width: `${levelInfo.progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-indigo-200">
              <span>Record: <strong className="text-lime-400 font-black">{totalWins}W</strong> - <strong className="text-rose-400 font-black">{totalLosses}L</strong></span>
              <button onClick={onViewStats} className="text-lime-400 font-black italic uppercase hover:underline flex items-center text-[11px]">
                Analytics <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { triggerHaptic('medium'); onOpenStatLog(); }}
              className="px-6 py-3 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-black italic text-sm shadow-lg flex items-center space-x-2 transition uppercase">
              <Plus className="w-4 h-4 stroke-[3]" /><span>Log Recent Game</span>
            </button>
            <button onClick={() => { triggerHaptic('medium'); onOpenHostGame(); }}
              className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black italic text-sm shadow-lg flex items-center space-x-2 transition uppercase">
              <Flame className="w-4 h-4 fill-white/20" /><span>Host Pickup Game</span>
            </button>
          </div>
          <div className="flex items-center space-x-1.5 bg-indigo-950/80 px-3 py-1.5 rounded-xl border border-white/10">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-indigo-200">Streak: <strong className="text-lime-400 font-black italic">{currentStreak} DAYS 🔥</strong></span>
          </div>
        </div>
      </div>

      {/* DAILY CHECK-IN */}
      <div className={`mt-6 p-5 rounded-[2.5rem] border transition-all duration-300 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden ${
        isCheckedInToday ? 'bg-emerald-950/70 border-emerald-400/40'
        : 'bg-gradient-to-r from-amber-500/25 via-indigo-950 to-orange-500/25 border-amber-400/60 ring-2 ring-amber-400/20'
      }`}>
        <div className="flex items-center space-x-4 z-10">
          <div className={`p-3.5 rounded-2xl shrink-0 ${
            isCheckedInToday ? 'bg-emerald-400 text-black' : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-black animate-pulse'
          }`}>
            {isCheckedInToday ? <CheckCircle2 className="w-7 h-7" /> : <Gift className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-mono">DAILY APP CHECK-IN REWARD ⚡</span>
              <span className="text-xs text-orange-300 font-extrabold italic flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>{currentStreak} Day Streak Active</span>
              </span>
            </div>
            <h3 className="text-lg font-black italic uppercase text-white tracking-tight mt-1">
              {isCheckedInToday ? 'Daily Reward Claimed for Today!' : 'Claim Daily App Check-In Reward (+100 XP)'}
            </h3>
            <p className="text-xs text-indigo-200/80 font-medium">
              {isCheckedInToday ? 'Great job! Come back tomorrow for another +100 XP.' : 'Log in daily to maintain your streak & claim +100 XP bonus!'}
            </p>
          </div>
        </div>
        <button disabled={isCheckedInToday || isCheckingIn} onClick={handleDailyCheckIn}
          className={`px-6 py-3.5 rounded-2xl font-black italic uppercase text-xs tracking-wider transition-all shrink-0 flex items-center space-x-2 z-10 shadow-xl ${
            isCheckedInToday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 cursor-default'
            : isCheckingIn ? 'bg-amber-400/50 text-black/60 cursor-wait'
            : 'bg-gradient-to-r from-amber-400 to-amber-400 text-black hover:scale-105 animate-bounce'
          }`}>
          {isCheckedInToday ? (<><Check className="w-4 h-4 stroke-[3]" /><span>Checked In ✓</span></>)
           : isCheckingIn ? (<><RefreshCw className="w-4 h-4 animate-spin" /><span>Checking In...</span></>)
           : (<><Sparkles className="w-4 h-4 fill-black" /><span>Claim +100 XP Bonus</span></>)}
        </button>
      </div>

      {/* REGIONAL */}
      <div className="space-y-6 mt-4">
        <RegionalSection user={athlete} primarySport={currentSport}
          registeredCity={athlete.registeredCity || athlete.location?.city}
          registeredState={athlete.registeredState || athlete.location?.state}
          pickupGames={pickupGames}
          onNavigateToTab={onNavigateToTab || (() => {})}
          onOpenProCheckout={onOpenProCheckout}
          onJoinGame={onJoinGame}
        />
      </div>

      {/* PERFORMANCE */}
      <div className="space-y-4 mt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-indigo-900/60 p-4 sm:p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-lime-400" />
              <h2 className="text-xl font-black italic uppercase tracking-wide text-white">
                {getSportLabel(currentSport)} Performance
              </h2>
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              {activeSports.map((s: any) => (
                <button key={s} onClick={() => setSelectedSport(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition whitespace-nowrap ${
                    currentSport === s ? 'bg-lime-400 text-black shadow-md' : 'bg-indigo-950/80 text-indigo-200 hover:text-white border border-white/10'
                  }`}>
                  {getSportLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentStatSummary.map((stat: any, i: number) => (
            <div key={i} className="bg-indigo-900/50 p-5 rounded-[2rem] border border-white/10 shadow-lg">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300/70">{stat.label}</span>
              <div className={`text-3xl font-black italic mt-1 ${stat.highlight ? 'text-lime-400' : 'text-white'}`}>{stat.value}</div>
              <span className="text-xs text-indigo-200/80 font-medium mt-0.5 block">{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DAILY POINT TRACKER */}
      <div className="bg-gradient-to-br from-indigo-900/90 via-indigo-950 to-indigo-900/90 p-6 rounded-[2.5rem] border-2 border-lime-400/40 shadow-2xl space-y-4 relative overflow-hidden mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-lime-400 text-black rounded-2xl font-black"><Target className="w-6 h-6" /></div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black italic uppercase text-white">Daily Point Target Goal</h3>
                <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 border border-lime-400/40 text-[9px] font-mono font-black uppercase rounded-full">LIVE</span>
              </div>
              <p className="text-xs text-indigo-200/70 font-semibold">Auto-tracked from your logged game stats.</p>
            </div>
          </div>
          <button onClick={() => setIsEditingDailyPointGoal(!isEditingDailyPointGoal)}
            className="px-3.5 py-1.5 bg-indigo-950 hover:bg-indigo-800 text-lime-300 border border-lime-400/30 rounded-xl text-xs font-black uppercase italic transition shrink-0">
            {isEditingDailyPointGoal ? 'Close Edit' : 'Set Goal Target 🎯'}
          </button>
        </div>

        {isEditingDailyPointGoal && (
          <div className="p-4 bg-indigo-950/90 rounded-2xl border border-white/10 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-indigo-200 block">Choose Target:</span>
            <div className="flex flex-wrap gap-2">
              {[15, 25, 40, 60, 100].map((preset) => (
                <button key={preset} onClick={() => handleUpdateDailyPointGoal(preset)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black italic uppercase transition ${
                    dailyPointTarget === preset ? 'bg-lime-400 text-black' : 'bg-indigo-900 text-indigo-200 hover:bg-indigo-800'
                  }`}>{preset} PTS</button>
              ))}
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input type="number" value={customGoalInput} onChange={(e) => setCustomGoalInput(e.target.value)}
                placeholder="Custom..."
                className="w-32 bg-indigo-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-lime-400" />
              <button onClick={() => { const v = parseInt(customGoalInput, 10); if (v > 0) handleUpdateDailyPointGoal(v); }}
                className="px-3 py-1.5 bg-lime-400 text-black rounded-xl text-xs font-black italic uppercase hover:bg-lime-300 transition">Save</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoadingDailyPoints ? (
            <div className="text-center py-4 text-xs text-indigo-300 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading today's points...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-indigo-200 flex items-center space-x-1.5">
                  <span>TODAY'S PROGRESS</span>
                  {(dailyPointsData?.currentPoints ?? 0) >= dailyPointTarget && (
                    <span className="text-lime-400 font-black animate-pulse">🔥 ACHIEVED!</span>
                  )}
                </span>
                <span className="text-lime-400 text-sm font-black">
                  {dailyPointsData?.currentPoints ?? 0} / {dailyPointTarget} PTS ({dailyPointsData?.percentComplete ?? 0}%)
                </span>
              </div>
              <div className="w-full bg-indigo-950 h-5 rounded-2xl overflow-hidden p-1 border border-white/10">
                <div className={`h-full rounded-xl transition-all duration-700 ${
                  (dailyPointsData?.currentPoints ?? 0) >= dailyPointTarget
                    ? 'bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-300' : 'bg-gradient-to-r from-lime-400 to-emerald-400'
                }`} style={{ width: `${dailyPointsData?.percentComplete ?? 0}%` }} />
              </div>
              <p className="text-[11px] text-indigo-300/80 font-medium">
                {(dailyPointsData?.currentPoints ?? 0) >= dailyPointTarget
                  ? dailyPointsData?.xpAwarded ? '✅ Daily bonus claimed today.' : '🎉 Claiming +150 XP...'
                  : `🎯 ${dailyPointsData?.remaining ?? dailyPointTarget} PTS remaining.`}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <span className="text-[10px] font-mono text-indigo-300/70">Points auto-track when you log a game.</span>
          <button onClick={onOpenStatLog}
            className="px-4 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 text-black rounded-xl font-black italic uppercase text-xs shadow-lg hover:scale-105 transition flex items-center space-x-1.5">
            <PlusCircle className="w-4 h-4" /><span>Log Game Stats</span>
          </button>
        </div>
      </div>

      {/* WEEKLY CHALLENGES */}
      <WeeklyChallenges user={athlete}
        onEarnXp={(amount, source) => {
          if (typeof onEarnXp === 'function') onEarnXp(amount, source);
          window.dispatchEvent(new CustomEvent('user:xp-updated', {
            detail: { valuexp: ((athlete as any)?.valuexp ?? 0) + amount }
          }));
        }}
        onOpenStatLog={onOpenStatLog}
      />

      {/* GRID ROW 2: DAILY QUESTS + RECOMMENDED GAMES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* DAILY QUESTS */}
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-lime-400 text-black rounded-xl"><Target className="w-5 h-5 stroke-[2.5]" /></div>
              <div>
                <h3 className="font-black italic uppercase text-white text-base flex items-center">
                  <span>Daily Quests</span>
                  <span className="ml-2 px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold rounded-full">
                    {dailyLoading ? 'LOADING' : 'LIVE'}
                  </span>
                </h3>
                <span className="text-[10px] text-indigo-300 font-semibold block">{resetCountdown}</span>
              </div>
            </div>
            <button onClick={handleRerollChallenges} disabled={isShuffling || dailyLoading}
              className="p-2 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-white/10 rounded-xl transition flex items-center space-x-1 disabled:opacity-50">
              <RotateCcw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin text-lime-400' : ''}`} />
              <span className="text-[10px] font-black uppercase hidden sm:inline">Reroll</span>
            </button>
          </div>

          <p className="text-xs text-indigo-200/70 font-medium">
            Randomized goals assigned daily! Progress targets, claim XP bonuses, and unlock the Daily Gold Chest.
          </p>

          {dailyLoading && dailyChallenges.length === 0 ? (
            <div className="text-center py-6 text-xs text-indigo-300 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading daily quests...
            </div>
          ) : (
            <div className="space-y-3">
              {dailyChallenges.map((ch) => {
                const isFinished = ch.completed || ch.current >= ch.target;
                const percent = Math.min(100, Math.round((ch.current / ch.target) * 100));
                const isClaiming = claimingId === ch.userChallengeId;
                return (
                  <div key={ch.userChallengeId}
                    className={`p-4 rounded-2xl border transition-all duration-300 space-y-2.5 ${
                      ch.claimed ? 'bg-indigo-950/40 border-lime-400/30 opacity-70'
                      : isFinished ? 'bg-gradient-to-r from-indigo-900 to-indigo-950 border-lime-400 ring-1 ring-lime-400/40 shadow-lg'
                      : 'bg-indigo-950/80 border-white/10 hover:border-white/20'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2.5">
                        <span className="text-xl p-1 bg-indigo-900 rounded-xl border border-white/10">{ch.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{ch.title}</h4>
                          <p className="text-[11px] text-indigo-200/70 mt-0.5 font-medium leading-tight">{ch.description}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-black italic text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30 font-mono">+{ch.rewardXp} XP</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-indigo-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          ch.claimed || isFinished ? 'bg-lime-400 shadow-sm shadow-lime-400' : 'bg-rose-500'
                        }`} style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-200">{ch.current}/{ch.target}</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        {!isFinished && (
                          <button onClick={() => handleProgressChallenge(ch)}
                            className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-white/10 text-[10px] font-extrabold uppercase rounded-lg transition">
                            +1 Progress
                          </button>
                        )}
                        {ch.actionTab && !isFinished && (
                          <button onClick={() => onNavigateToTab?.(ch.actionTab)}
                            className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-lime-400 text-[10px] font-extrabold uppercase rounded-lg transition">
                            Go to Tab →
                          </button>
                        )}
                      </div>
                      {ch.claimed ? (
                        <span className="flex items-center space-x-1 text-[11px] font-black italic text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-xl border border-lime-400/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /><span>Claimed</span>
                        </span>
                      ) : isFinished ? (
                        <button onClick={() => handleClaimChallengeReward(ch)} disabled={isClaiming}
                          className={`px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1 ${
                            isClaiming ? 'opacity-60 cursor-wait' : 'animate-pulse'
                          }`}>
                          {isClaiming ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Claiming...</span></>)
                           : (<><Sparkles className="w-3.5 h-3.5" /><span>Claim +{ch.rewardXp} XP</span></>)}
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-indigo-300/60 uppercase">In Progress</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MY CUSTOM GOALS */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-gradient-to-br from-lime-400 to-emerald-400 text-black rounded-lg">
                  <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <h4 className="font-black italic uppercase text-white text-xs tracking-wider">My Custom Goals</h4>
                <span className="px-1.5 py-0.5 bg-lime-400/20 text-lime-300 border border-lime-400/30 text-[9px] font-mono font-bold rounded-full">
                  {activeGoals.filter((g) => !g.isClaimed).length} ACTIVE
                </span>
              </div>
              <button onClick={() => setIsAddGoalModalOpen(true)}
                className="text-[10px] font-black uppercase italic text-lime-400 hover:underline flex items-center space-x-0.5">
                <Plus className="w-3 h-3" /><span>New</span>
              </button>
            </div>

            {goalsLoading && activeGoals.length === 0 ? (
              <div className="text-center py-4 text-[11px] text-indigo-300 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin inline mr-1.5" />Loading goals...
              </div>
            ) : activeGoals.length === 0 ? (
              <div className="text-center py-4 px-3 bg-indigo-950/60 rounded-xl border border-dashed border-white/10">
                <p className="text-[11px] text-indigo-300/70 font-medium">
                  No custom goals yet. Tap <span className="text-lime-400 font-bold">+ Goal</span> below!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeGoals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
                  const isFinished = goal.isCompleted || goal.current >= goal.target;
                  const isClaimed = goal.isClaimed;
                  const isClaiming = claimingGoalId === goal.id;
                  const isProgressing = progressingGoalId === goal.id;
                  return (
                    <div key={goal.id}
                      className={`p-3 rounded-2xl border transition-all duration-300 space-y-2 ${
                        isClaimed ? 'bg-indigo-950/40 border-lime-400/30 opacity-70'
                        : isFinished ? 'bg-gradient-to-r from-indigo-900 to-indigo-950 border-lime-400 ring-1 ring-lime-400/40 shadow-lg'
                        : 'bg-indigo-950/80 border-white/10 hover:border-white/20'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-extrabold text-xs text-white truncate">{goal.title}</h5>
                          {goal.description && (
                            <p className="text-[10px] text-indigo-200/70 font-medium truncate leading-tight">{goal.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-black italic text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30 font-mono">
                          +{goal.rewardXp} XP
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-indigo-900 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            isClaimed || isFinished ? 'bg-lime-400 shadow-sm shadow-lime-400' : 'bg-rose-500'
                          }`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-indigo-200">{goal.current}/{goal.target}</span>
                      </div>
                      <div className="pt-0.5 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          {!isFinished && !isClaimed && (
                            <button disabled={isProgressing} onClick={() => handleProgressCustomGoal(goal)}
                              className={`px-2 py-0.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-white/10 text-[10px] font-extrabold uppercase rounded transition flex items-center space-x-0.5 ${
                                isProgressing ? 'opacity-60 cursor-wait' : ''
                              }`}>
                              {isProgressing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                              <span>+1</span>
                            </button>
                          )}
                          {!isClaimed && (
                            <button onClick={() => handleDeleteCustomGoal(goal)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded transition">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        {isClaimed ? (
                          <span className="flex items-center space-x-0.5 text-[10px] font-black italic text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/30">
                            <CheckCircle2 className="w-3 h-3" /><span>Claimed</span>
                          </span>
                        ) : isFinished ? (
                          <button disabled={isClaiming} onClick={() => handleClaimCustomGoal(goal)}
                            className={`px-2.5 py-1 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-[10px] rounded-lg transition flex items-center space-x-0.5 ${
                              isClaiming ? 'opacity-60 cursor-wait' : 'animate-pulse'
                            }`}>
                            {isClaiming ? (<><RefreshCw className="w-2.5 h-2.5 animate-spin" /><span>Claiming...</span></>)
                             : (<><Sparkles className="w-2.5 h-2.5" /><span>Claim +{goal.rewardXp} XP</span></>)}
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-indigo-300/60 uppercase">In Progress</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GOLD CHEST */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-400/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-black italic uppercase text-amber-300">Daily Gold Chest Bonus</span>
              </div>
              <span className="text-[10px] font-mono font-extrabold text-amber-300">
                {dailyChallenges.filter((c) => c.claimed).length}/3 Claimed
              </span>
            </div>
            {isChestClaimed ? (
              <div className="text-center py-2 text-xs font-black italic text-lime-400 flex items-center justify-center space-x-1">
                <CheckCircle2 className="w-4 h-4" /><span>Gold Chest Claimed (+300 XP)</span>
              </div>
            ) : allDailyClaimed ? (
              <button onClick={handleClaimDailyChest} disabled={isChestClaiming}
                className={`w-full py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black italic text-xs uppercase rounded-xl shadow-xl transition flex items-center justify-center space-x-1.5 ${
                  isChestClaiming ? 'opacity-60 cursor-wait' : 'animate-bounce'
                }`}>
                {isChestClaiming ? (<><RefreshCw className="w-4 h-4 animate-spin" /><span>Opening...</span></>)
                 : (<><Coins className="w-4 h-4 fill-black" /><span>Open Gold Chest (+300 XP)</span></>)}
              </button>
            ) : (
              <p className="text-[11px] text-amber-200/70 font-medium italic text-center">
                Complete and claim all 3 daily challenges to unlock +300 Bonus XP!
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button onClick={() => setIsWorkoutModalOpen(true)}
              className="flex-1 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-lime-400 border border-lime-400/30 rounded-2xl font-black italic uppercase text-xs transition flex items-center justify-center space-x-1.5">
              <Dumbbell className="w-4 h-4" /><span>Log Workout</span>
            </button>
            <button onClick={() => setIsAddGoalModalOpen(true)}
              className="px-3 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-300 border border-white/10 rounded-2xl font-black italic uppercase text-xs transition flex items-center space-x-1">
              <Plus className="w-4 h-4" /><span>Goal</span>
            </button>
          </div>
        </div>

        {/* RECOMMENDED GAMES */}
        <div className="lg:col-span-2 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-lime-400" />
              <div>
                <h3 className="font-black italic uppercase text-white text-base">Recommended Pickup Runs</h3>
                <p className="text-[11px] text-indigo-300 font-mono">
                  Filtered for <span className="text-lime-300 font-bold capitalize">{currentSport}</span> in <span className="text-cyan-300 font-bold">{userCity}</span>
                </p>
              </div>
            </div>
            <button onClick={() => onNavigateToTab?.('pickup-games')}
              className="text-xs font-black italic uppercase text-lime-400 hover:underline shrink-0">
              Browse All Games ({pickupGames.length}) →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedGames.slice(0, 4).map((game: any) => {
              const isJoined = (game.playersList || []).some((p: any) => p.id === athlete.id);
              const isSportMatch = game.sport === currentSport;
              return (
                <div key={game.id} className="p-4 rounded-2xl border border-white/10 bg-indigo-950/80 hover:border-lime-400/50 transition flex flex-col justify-between space-y-3 relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black italic uppercase bg-lime-400 text-black">
                          {game.sport} • {game.level || 'Intermediate'}
                        </span>
                        {isSportMatch && (
                          <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase rounded-full border border-amber-400/30">🎯 Match</span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-200 flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1 text-lime-400" />{game.currentPlayers || 0}/{game.maxPlayers || 10}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white line-clamp-1">{game.title}</h4>
                    <div className="space-y-1 text-xs text-indigo-200/80 font-medium">
                      <p className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400 shrink-0" />
                        <span className="truncate">{game.courtName || game.location || 'TBD'}</span>
                      </p>
                      <p className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-lime-400 shrink-0" />
                        <span>{game.dateTime || `${game.date || ''} ${game.time || ''}`}</span>
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src={game.hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60'} alt={game.hostName || 'Host'}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-lime-400" referrerPolicy="no-referrer" />
                      <span className="text-xs text-indigo-200 font-bold truncate max-w-[100px]">{game.hostName || 'Athlete'}</span>
                    </div>
                    <button onClick={() => onJoinGame?.(game.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black italic uppercase transition ${
                        isJoined ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      }`}>
                      {isJoined ? 'Joined ✓' : 'Join Game'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          GRID ROW 2.5: SEASON GOALS + FRIEND ACTIVITY
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* SEASON GOALS */}
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-lime-400 to-emerald-400 text-black rounded-2xl shadow-lg">
                <Target className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase text-white text-lg flex items-center gap-2">
                  <span>Season Goals</span>
                  <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 border border-lime-400/30 text-[10px] font-mono font-bold rounded-full">
                    {seasonGoals.filter((g) => g.isClaimed).length}/{seasonGoals.length} MET
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/70 font-medium">
                  Define personal season milestones. Auto-updates as you log matches!
                </p>
              </div>
            </div>
            <button onClick={() => setIsAddSeasonGoalModalOpen(true)}
              className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1 shrink-0">
              <Plus className="w-4 h-4 stroke-[3]" /><span>Define Goal</span>
            </button>
          </div>

          {seasonGoalsLoading && seasonGoals.length === 0 ? (
            <div className="text-center py-6 text-xs text-indigo-300 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading season goals...
            </div>
          ) : seasonGoals.length === 0 ? (
            <div className="text-center py-6 px-3 bg-indigo-950/60 rounded-xl border border-dashed border-white/10">
              <p className="text-xs text-indigo-300/70 font-medium">
                No season goals yet. Tap <span className="text-lime-400 font-bold">Define Goal</span> to start!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasonGoals.map((goal) => {
                const isFinished = goal.isCompleted || goal.currentCount >= goal.targetCount;
                const percent = Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));
                const isClaiming = claimingSeasonGoalId === goal.id;
                const isProgressing = progressingSeasonGoalId === goal.id;
                return (
                  <div key={goal.id}
                    className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${
                      goal.isClaimed ? 'bg-indigo-950/40 border-lime-400/30 opacity-70'
                      : isFinished ? 'bg-gradient-to-r from-emerald-950/80 to-indigo-950 border-lime-400 shadow-lg'
                      : 'bg-indigo-950/80 border-white/10 hover:border-lime-400/40'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-white">{goal.title}</span>
                          {goal.sport && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 border border-white/10 uppercase">
                              {goal.sport}
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-[11px] text-indigo-200/70 mt-0.5 font-medium">{goal.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-black italic text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-lg border border-lime-400/30 font-mono shrink-0 ml-2">
                        +{goal.rewardXp} XP
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-200 font-bold">
                          Progress: <strong className="text-lime-400 font-black">{goal.currentCount}</strong> / {goal.targetCount} {goal.unit}
                        </span>
                        <span className="text-lime-300 font-black">{percent}%</span>
                      </div>
                      <div className="w-full bg-indigo-900 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div className={`h-full rounded-full transition-all duration-700 ${
                          isFinished ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-lime-400'
                        }`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <button type="button" onClick={onOpenStatLog}
                          className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-lime-400 text-[10px] font-black uppercase rounded-lg border border-lime-400/30 transition flex items-center space-x-1">
                          <Plus className="w-3 h-3" /><span>Log Stats</span>
                        </button>
                        {!isFinished && (
                          <button type="button" disabled={isProgressing}
                            onClick={() => handleProgressSeasonGoal(goal, 5)}
                            className={`px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 text-[10px] font-extrabold uppercase rounded-lg border border-white/10 transition flex items-center space-x-1 ${
                              isProgressing ? 'opacity-60 cursor-wait' : ''
                            }`}>
                            {isProgressing ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            <span>+5 Progress</span>
                          </button>
                        )}
                      </div>

                      {goal.isClaimed ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-black italic text-lime-400 bg-lime-400/20 px-2.5 py-1 rounded-xl border border-lime-400/40">
                          <CheckCircle2 className="w-3.5 h-3.5" /><span>Claimed</span>
                        </span>
                      ) : isFinished ? (
                        <button type="button" disabled={isClaiming}
                          onClick={() => handleClaimSeasonGoalReward(goal)}
                          className={`px-3.5 py-1 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1 ${
                            isClaiming ? 'opacity-60 cursor-wait' : 'animate-bounce'
                          }`}>
                          {isClaiming ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Claiming...</span></>)
                           : (<><Sparkles className="w-3.5 h-3.5 fill-black" /><span>Claim +{goal.rewardXp} XP</span></>)}
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-indigo-300/60 font-bold uppercase">In Progress</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FRIEND ACTIVITY */}
        {/* <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg">
                <Users className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase text-white text-lg flex items-center gap-2">
                  <span>Friend Activity</span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold rounded-full">LIVE FEED</span>
                </h3>
                <p className="text-xs text-indigo-200/70 font-medium">
                  Recent achievements & stat-log updates from your network.
                </p>
              </div>
            </div>
            <button onClick={() => onNavigateToTab?.('community')}
              className="text-xs font-black italic uppercase text-lime-400 hover:underline flex items-center space-x-1 shrink-0">
              <span>Community Hub</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {friendActivities.map((act) => (
              <div key={act.id}
                className="p-3.5 rounded-2xl bg-indigo-950/80 border border-white/10 hover:border-indigo-400/40 transition flex items-start space-x-3 group">
                <button type="button" onClick={() => setSelectedFriendProfile(act)}
                  className="relative shrink-0 group-hover:scale-105 transition transform">
                  <img src={act.friendAvatar} alt={act.friendName}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-lime-400 shadow-md" referrerPolicy="no-referrer" />
                  <span className="absolute -bottom-1 -right-1 bg-black text-white text-[9px] font-black p-0.5 rounded-full border border-lime-400">
                    Lv.{act.level}
                  </span>
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setSelectedFriendProfile(act)}
                      className="text-xs font-black text-white hover:text-lime-400 transition truncate text-left">
                      {act.friendName} <span className="text-[10px] text-indigo-300 font-bold font-mono">({act.friendHandle})</span>
                    </button>
                    <span className="text-[10px] font-mono text-indigo-300/70 shrink-0 ml-2">{act.timeAgo}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider block">{act.actionTitle}</span>
                  <p className="text-xs text-indigo-200/90 font-medium leading-snug line-clamp-2">{act.actionDetail}</p>
                  <div className="pt-1.5 flex items-center justify-between border-t border-white/5">
                    <span className="text-[10px] text-indigo-300 font-bold">{act.friendRole}</span>
                    <button type="button" onClick={() => handleCheerFriendActivity(act.id, act.friendName)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black italic uppercase transition flex items-center space-x-1 ${
                        act.hasCheered ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-indigo-900 text-indigo-200 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10'
                      }`}>
                      <Flame className={`w-3 h-3 ${act.hasCheered ? 'fill-white' : 'text-orange-400 fill-orange-400'}`} />
                      <span>{act.cheersCount} Cheer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div> */}
      </div>

      {/* CREATE DAILY GOAL MODAL */}
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-indigo-900 border border-white/20 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl space-y-5 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-6 h-6 text-rose-400" />
                <h3 className="font-black italic uppercase text-lg">Create Daily Goal</h3>
              </div>
              <button onClick={() => setIsAddGoalModalOpen(false)}
                className="p-1.5 text-indigo-300 hover:text-white rounded-xl bg-indigo-950 border border-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-indigo-200 font-medium">
              Set a personal daily target to earn <strong className="text-lime-400">+50 XP</strong> instantly!
            </p>
            <form onSubmit={handleCreateCustomGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Goal Title</label>
                <input type="text" required value={customGoalTitle} onChange={(e) => setCustomGoalTitle(e.target.value)}
                  placeholder="e.g. Hit 50 Free Throws"
                  className="w-full bg-indigo-950 text-white placeholder-indigo-300/50 text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Description</label>
                <input type="text" value={customGoalDesc} onChange={(e) => setCustomGoalDesc(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full bg-indigo-950 text-white placeholder-indigo-300/50 text-xs rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Target</label>
                  <input type="number" min={1} max={1000} value={customGoalTarget} onChange={(e) => setCustomGoalTarget(Number(e.target.value))}
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">XP Reward</label>
                  <input type="number" min={25} max={500} step={25} value={customGoalXp} onChange={(e) => setCustomGoalXp(Number(e.target.value))}
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none font-mono" />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setIsAddGoalModalOpen(false)}
                  className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 text-xs font-black italic uppercase rounded-xl border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 stroke-[3]" /><span>Add Goal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SEASON GOAL MODAL */}
      {isAddSeasonGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-indigo-900 border border-white/20 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl space-y-5 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-6 h-6 text-lime-400" />
                <h3 className="font-black italic uppercase text-lg">Define Personal Season Goal</h3>
              </div>
              <button onClick={() => setIsAddSeasonGoalModalOpen(false)}
                className="p-1.5 text-indigo-300 hover:text-white rounded-xl bg-indigo-950 border border-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-indigo-200 font-medium">
              Define a personal season milestone. Progress auto-updates as you log stats!
            </p>
            <form onSubmit={handleCreateSeasonGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Milestone Title</label>
                <input type="text" required value={seasonGoalTitle} onChange={(e) => setSeasonGoalTitle(e.target.value)}
                  placeholder="e.g. Reach 50 Blocks this Season"
                  className="w-full bg-indigo-950 text-white placeholder-indigo-300/50 text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Sport</label>
                  <select value={seasonGoalSport} onChange={(e) => setSeasonGoalSport(e.target.value as SportType)}
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none capitalize">
                    <option value="basketball">Basketball 🏀</option>
                    <option value="volleyball">Volleyball 🏐</option>
                    <option value="soccer">Soccer ⚽</option>
                    <option value="football">Football 🏈</option>
                    <option value="baseball">Baseball ⚾</option>
                    <option value="softball">Softball 🥎</option>
                    <option value="pickleball">Pickleball 🏓</option>
                    <option value="tennis">Tennis 🎾</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Metric / Unit</label>
                  <input type="text" required value={seasonGoalMetric} onChange={(e) => setSeasonGoalMetric(e.target.value)}
                    placeholder="Blocks, Kills..."
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Target Count</label>
                  <input type="number" min={1} max={10000} value={seasonGoalTarget} onChange={(e) => setSeasonGoalTarget(Number(e.target.value))}
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-200">Reward XP</label>
                  <input type="number" min={100} max={2000} step={50} value={seasonGoalXp} onChange={(e) => setSeasonGoalXp(Number(e.target.value))}
                    className="w-full bg-indigo-950 text-white text-xs font-bold rounded-xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none font-mono text-lime-400" />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setIsAddSeasonGoalModalOpen(false)}
                  className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 text-xs font-black italic uppercase rounded-xl border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5">
                  <Target className="w-4 h-4 stroke-[3]" /><span>Set Milestone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </>
  );
};