import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { StatLogModal } from './StatLogModal';
import { HostGameModal } from './HostGameModal';
import { ReferralModal } from './ReferralModal';

import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  Trophy,
  MessageSquare,
  User,
  Medal,
  ShieldAlert,
  PlusCircle,
  Flame,
  CalendarCheck,
  UserPlus,
  Lock,
  Award,
  Film,
  Rss,
  RefreshCw,
  CloudUpload,
  CheckCircle2,
  WifiOff,
  Database,
  Sparkles,
  Swords,
  MoreHorizontal,
  X,
  Eye,
  Gift,
  Zap,
} from 'lucide-react';

import { createPickupGame } from '../services/pickupGames';
import type { PickupGameFormData } from '../types/pickupGames';
import { getLevelInfo } from '../utils/leveling';

// ═══════════════════════════════════════════
// ✅ Types — 'courts' added
// ═══════════════════════════════════════════
type NavTab =
  | 'dashboard'
  | 'profile'
  | 'auth'
  | 'chat'
  | 'team-chat'
  | 'stats'
  | 'games'
  | 'highlights'
  | 'pickup-games'
  | 'warmup'
  | 'socialfeed'
  | 'achievements'
  | 'reelschallenge'
  | 'leaderboard'
  | 'tournaments'
  | 'courts'; // ✅ NEW

interface NavigationProps {
  user?: {
    id?: string;
    name?: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    subscriptionTier?: string;
    role?: string;
    avatar?: string;
    primary_sport?: string;
    valuexp?: number;
  };
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenStatLog: () => void;
  onOpenHostGame: () => void;
  onOpenReferralModal?: () => void;
  onPickupGameCreated?: () => void;
  unreadChatCount?: number;
  isLoggedIn?: boolean;
  pendingQueue?: Array<{
    id?: string;
    type: string;
    status?: 'pending' | 'syncing' | 'failed';
    retryCount?: number;
  }>;
  isSyncing?: boolean;
  syncProgress?: { current: number; total: number };
  isOnline?: boolean;
  onSimulateOfflineAction?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenStatLog,
  onOpenHostGame,
  onOpenReferralModal,
  onPickupGameCreated,
  unreadChatCount = 0,
  isLoggedIn = true,
  pendingQueue = [],
  isSyncing = false,
  syncProgress = { current: 0, total: 0 },
  isOnline = true,
  onSimulateOfflineAction,
}) => {
  // Local mirror of the user so we can update XP without a full refresh.
  const [localUser, setLocalUser] = useState<any>(() => {
    const raw = localStorage.getItem('playground_user');
    return raw ? JSON.parse(raw) : (user ?? null);
  });

  // Keep localUser in sync if the parent passes a new user prop
  useEffect(() => {
    if (user) setLocalUser((prev: any) => ({ ...prev, ...user }));
  }, [user]);

  // Listen for XP updates dispatched by StatLogModal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('🎯 [Navigation] XP update received:', detail);

      setLocalUser((prev: any) => {
        if (detail._fullUser) {
          console.log('   ✅ Full user update applied');
          return { ...prev, ...detail._fullUser };
        }

        const next = {
          ...prev,
          ...detail,
        };

        const newXp = detail.valuexp ?? detail.xp ?? prev?.valuexp ?? 0;
        next.valuexp = newXp;
        next.xp = newXp;

        console.log('   ✅ Merged valuexp:', next.valuexp);
        return next;
      });
    };

    window.addEventListener('user:xp-updated', handler);
    return () => window.removeEventListener('user:xp-updated', handler);
  }, []);

  // Load referral data
  useEffect(() => {
    const loadReferralData = async () => {
      if (!localUser?.id) return;
      try {
        const [codeRes, statsRes] = await Promise.all([
          fetch(`/api/athletes/${localUser.id}/referral-code`),
          fetch(`/api/athletes/${localUser.id}/referrals/stats`),
        ]);
        const { referralCode } = await codeRes.json();
        const referralStats = await statsRes.json();

        setLocalUser((prev: any) => ({
          ...prev,
          referralCode,
          referralStats,
        }));

        const raw = localStorage.getItem('playground_user');
        if (raw) {
          const stored = JSON.parse(raw);
          localStorage.setItem(
            'playground_user',
            JSON.stringify({ ...stored, referralCode, referralStats })
          );
        }
      } catch (err) {
        console.error('Failed to load referral data:', err);
      }
    };

    loadReferralData();
  }, [localUser?.id]);

  // Derive level info from localUser
  const levelInfo = getLevelInfo(localUser?.valuexp ?? localUser?.xp ?? 0);

  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [lastToastTime, setLastToastTime] = useState<Record<string, number>>({});
  const [previousLevel, setPreviousLevel] = useState<number>(levelInfo.level);
  const [isStatLogModalOpen, setIsStatLogModalOpen] = useState(false);
  const [isHostGameModalOpen, setIsHostGameModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  interface NavItem {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  // ═══════════════════════════════════════════
  // ✅ NAV ITEMS — Courts & Tournaments added
  // ═══════════════════════════════════════════
  const navItems: NavItem[] = [
    { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard },
    ...(isLoggedIn
      ? [
          { id: 'pickup-games' as const, label: 'Pickup Games', icon: CalendarCheck },
          { id: 'courts' as const, label: 'Courts & Maps', icon: MapPin }, // ✅ NEW
          { id: 'stats' as const, label: 'Stats & Analytics', icon: BarChart3 },
          { id: 'profile' as const, label: 'Profile & Security', icon: User },
          { id: 'team-chat' as const, label: 'Team Chat', icon: MessageSquare },
          { id: 'warmup' as const, label: 'Warmups', icon: Flame },
          { id: 'socialfeed' as const, label: 'Social Feed', icon: Rss },
          { id: 'achievements' as const, label: 'Achievements', icon: Medal },
          { id: 'reelschallenge' as const, label: 'Reels & Challenges', icon: Film },
          { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
          { id: 'tournaments' as const, label: 'Tournaments', icon: Swords },
        ]
      : [{ id: 'auth' as const, label: 'Register & Sign In', icon: UserPlus }]),
  ];

  // Toast for tab switching
  const handleTabChange = (tabId: NavTab) => {
    if (tabId === 'profile' && !isLoggedIn) {
      toast.error('Please log in to access your profile', {
        id: 'profile-login-required',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '🔒',
      });
      return;
    }

    if ((tabId === 'chat' || tabId === 'team-chat') && unreadChatCount > 0) {
      toast.success(`You have ${unreadChatCount} unread messages!`, {
        id: 'unread-chat',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '💬',
      });
    }

    setActiveTab(tabId);
  };

  // Toast for online/offline status changes
  useEffect(() => {
    if (!isOnline) {
      toast.error('You are offline. Changes will be saved locally.', {
        id: 'offline-status',
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#92400e',
          color: '#fff',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        },
        icon: '📶',
      });
    } else if (isOnline && pendingQueue.length > 0) {
      toast.success('Back online! Syncing your data...', {
        id: 'online-status',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '✅',
      });
    }
  }, [isOnline, pendingQueue.length]);

  // Toast for sync progress
  useEffect(() => {
    if (isSyncing) {
      const progress = Math.round(
        ((syncProgress?.current || 0) / (syncProgress?.total || 1)) * 100
      );

      if (progress === 25) {
        toast('Syncing in progress...', {
          id: 'sync-progress-25',
          duration: 1000,
          position: 'top-right',
          icon: '🔄',
          style: {
            background: '#1e1b4b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      } else if (progress === 75) {
        toast.loading('Almost done syncing...', {
          id: 'sync-progress-75',
          duration: 1000,
          position: 'top-right',
        });
      } else if (progress === 100) {
        toast.success('Sync complete! All data updated.', {
          id: 'sync-complete',
          duration: 3000,
          position: 'top-right',
          style: {
            background: '#065f46',
            color: '#fff',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          },
          icon: '✅',
        });
      }
    }
  }, [isSyncing, syncProgress]);

  // Toast for queue updates
  useEffect(() => {
    if (pendingQueue.length > 0 && isOnline) {
      const pendingCount = pendingQueue.length;
      const currentTime = Date.now();

      if (!lastToastTime['queue'] || currentTime - lastToastTime['queue'] > 5000) {
        toast(`📦 ${pendingCount} item(s) pending sync`, {
          id: 'pending-queue',
          duration: 3000,
          position: 'top-right',
          style: {
            background: '#1e1b4b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          icon: '📋',
        });
        setLastToastTime((prev) => ({ ...prev, queue: currentTime }));
      }
    }
  }, [pendingQueue.length, isOnline, lastToastTime]);

  // Level-up toast
  useEffect(() => {
    const currentLevel = levelInfo.level;
    if (currentLevel > previousLevel) {
      toast.success(`🏆 Level Up! You're now Level ${currentLevel}!`, {
        id: 'level-up',
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        },
        icon: '🎉',
      });
      setPreviousLevel(currentLevel);
    }
  }, [levelInfo.level, previousLevel]);

  // Action handlers
  const handleOpenStatLog = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to log game stats', {
        id: 'stat-log-login',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '🔒',
      });
      return;
    }
    setIsStatLogModalOpen(true);
  };

  const handleOpenHostGame = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to host a game', {
        id: 'host-game-login',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '🔒',
      });
      return;
    }
    console.log(user);
    setIsHostGameModalOpen(true);
  };

  const handleSaveHostGame = async (
    gameData: PickupGameFormData
  ): Promise<void> => {
    if (!user?.id) {
      toast.error('You must be logged in to host a game.');
      throw new Error('Not authenticated');
    }

    toast.loading('Creating pickup game...', {
      id: 'host-game-loading',
      position: 'top-right',
    });

    try {
      const created = await createPickupGame(gameData, user.id);
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

      onPickupGameCreated?.();
      setActiveTab('pickup-games');
    } catch (err) {
      console.error('❌ Save failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create game', {
        id: 'host-game-loading',
        position: 'top-right',
      });
      throw err;
    }
  };

  const handleOpenReferralModal = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to refer friends', {
        id: 'referral-login',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '🔒',
      });
      return;
    }
    setIsReferralModalOpen(true);
  };

  const handleReferralAction = (data: any) => {
    if (data.method === 'copy') {
      toast.success('🎁 Referral link copied! Share it to earn XP!', {
        id: 'referral-copied',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#065f46',
          color: '#fff',
          border: '1px solid rgba(52, 211, 153, 0.3)',
        },
        icon: '📋',
      });
    } else if (data.method === 'share') {
      toast.success('🌟 Referral shared! You earn XP when they join!', {
        id: 'referral-shared',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        },
        icon: '🎉',
      });
    } else if (data.method === 'email') {
      toast.success(`📧 Invitation sent to ${data.email}!`, {
        id: 'referral-email',
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#1e1b4b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        icon: '✉️',
      });
      setIsReferralModalOpen(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1b4b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />

      {/* Stat Log Modal */}
      <StatLogModal
        isOpen={isStatLogModalOpen}
        onClose={() => setIsStatLogModalOpen(false)}
        created_by_id={localUser?.id}
        initialSport={localUser?.primary_sport}
        onSave={(data) => {
          console.log('Saved stats:', data);
          setLocalUser((prev: any) => ({
            ...prev,
            valuexp: data.valuexp ?? prev?.valuexp,
            levelTitle: data.levelTitle ?? prev?.levelTitle,
          }));
          onOpenStatLog?.();
        }}
      />

      {/* Host Game Modal */}
      <HostGameModal
        isOpen={isHostGameModalOpen}
        onClose={() => setIsHostGameModalOpen(false)}
        onSave={handleSaveHostGame}
        user={
          localUser
            ? {
                id: localUser?.id?.toString(),
                name: localUser.name || '',
                level: levelInfo.level,
              }
            : undefined
        }
      />

      <ReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        onSave={handleReferralAction}
        user={{
          id: String(localUser?.id ?? ''),
          name: localUser?.name ?? 'Athlete',
          level: levelInfo.level,
          subscriptionTier: localUser?.subscriptionTier,
          referral_xp: localUser?.referral_xp,
          total_referrals : localUser?.total_referrals,
          referralCode: localUser?.referralCode || localUser?.referral_code,
          sent_invites_count: localUser?.sent_invites_count,
        }}
        stats={localUser?.referralStats}
      />

      {/* Desktop Navigation Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-indigo-950/90 dark:bg-indigo-950/90 border-r border-white/10 p-4 space-y-6 shrink-0 min-h-[calc(100vh-4rem)] text-white">
        {/* Quick Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleOpenStatLog}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic rounded-2xl shadow-lg shadow-lime-400/20 transition transform active:scale-95 text-sm uppercase tracking-wider"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Log Game Stats</span>
          </button>

          <button
            onClick={handleOpenHostGame}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-black italic rounded-2xl border border-rose-400/30 transition text-sm uppercase tracking-wider shadow-md shadow-rose-500/20"
          >
            <Flame className="w-4 h-4 fill-white/20" />
            <span>Host Pickup Game</span>
          </button>

          {onOpenReferralModal && (
            <button
              onClick={handleOpenReferralModal}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black italic rounded-2xl transition text-xs uppercase tracking-wider shadow-md shadow-amber-500/20"
            >
              <Gift className="w-4 h-4 stroke-[2.5]" />
              <span>Refer Friends (+150 XP)</span>
            </button>
          )}
        </div>

        {/* Level & XP Progress Card */}
        {isLoggedIn && localUser && (
          <div className="bg-indigo-900/60 p-3.5 rounded-2xl border border-white/10 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-black italic text-lime-400 uppercase tracking-tight">
                <Trophy className="w-4 h-4 text-lime-400" />
                <span>LEVEL {levelInfo.level}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-200/80">
                {levelInfo.xpInCurrentLevel} / {levelInfo.xpRequiredForNextLevel} XP
              </span>
            </div>

            <p className="text-[10px] font-bold italic text-indigo-300/80 truncate">
              {levelInfo.levelTitle}
            </p>

            <div className="w-full bg-indigo-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10 relative">
              <div
                className="bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-300 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-lime-400/40"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Sync / Offline Queue Status */}
        {(isSyncing || (pendingQueue && pendingQueue.length > 0) || !isOnline) && (
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-300 space-y-2.5 ${
              isSyncing
                ? 'bg-indigo-900/90 border-lime-400/60 ring-2 ring-lime-400/20 shadow-lg shadow-lime-400/10'
                : !isOnline
                ? 'bg-amber-500/10 border-amber-400/30'
                : 'bg-indigo-900/40 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 text-lime-400 animate-spin" />
                ) : !isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                ) : (
                  <Database className="w-4 h-4 text-lime-400" />
                )}
                <span className="text-xs font-black italic uppercase tracking-wider text-white">
                  {isSyncing ? 'Adaptive Syncing...' : !isOnline ? 'Offline Queue' : 'Sync Ready'}
                </span>
              </div>

              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  isSyncing
                    ? 'bg-lime-400 text-black'
                    : !isOnline
                    ? 'bg-amber-400 text-black'
                    : 'bg-indigo-800 text-indigo-200'
                }`}
              >
                {isSyncing
                  ? `${Math.round(
                      ((syncProgress?.current || 0) / (syncProgress?.total || 1)) * 100
                    )}%`
                  : `${pendingQueue?.length || 0} Queued`}
              </span>
            </div>

            {isSyncing ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-indigo-200">
                  <span>Adaptive SW Sync</span>
                  <span className="font-bold text-lime-400">
                    {syncProgress?.current || 0} / {syncProgress?.total || 0}
                  </span>
                </div>
                <div className="w-full bg-indigo-950 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
                  <div
                    className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md shadow-lime-400/40 animate-pulse"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((syncProgress?.current || 0) / (syncProgress?.total || 1)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-indigo-300/80 font-bold">
                  <span>{pendingQueue.length} record(s) in queue</span>
                  <div className="flex items-center space-x-2">
                    {onSimulateOfflineAction && (
                      <button
                        onClick={onSimulateOfflineAction}
                        className="text-lime-400 hover:underline font-black uppercase text-[9px]"
                      >
                        + Add Record
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {pendingQueue.map((item, idx) => (
                    <span
                      key={item.id || idx}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center ${
                        item.status === 'failed'
                          ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                          : item.status === 'syncing'
                          ? 'bg-lime-400/20 border-lime-400/40 text-lime-300 animate-pulse'
                          : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                      }`}
                    >
                      {item.type} {item.retryCount ? `(x${item.retryCount})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isSyncing && isOnline && pendingQueue.length === 0 && (
              <p className="text-[10px] text-indigo-200/70 font-medium flex items-center">
                <CheckCircle2 className="w-3 h-3 text-lime-400 mr-1 shrink-0" />
                All records synced to database.
              </p>
            )}
          </div>
        )}

        {/* Primary Nav Links */}
        <nav className="flex-1 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-300/60">
            ATHLETE NAVIGATION
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = !isLoggedIn && item.id !== 'auth';

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-900/90 text-lime-400 font-black italic border-l-4 border-lime-400 shadow-md'
                    : isLocked
                    ? 'text-indigo-300/40 hover:text-indigo-200 hover:bg-indigo-900/20 font-medium'
                    : 'text-indigo-200/70 hover:text-white hover:bg-indigo-900/40 font-bold'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-lime-400'
                        : isLocked
                        ? 'text-indigo-400/30'
                        : 'text-indigo-300/60'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isLocked ? (
                  <span title="Requires Login or Registration">
                    <Lock className="w-3.5 h-3.5 text-indigo-400/50" />
                  </span>
                ) : item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10">
          <div className="p-3 bg-indigo-900/40 rounded-2xl border border-white/5 text-xs text-indigo-200/70 space-y-1">
            <div className="flex items-center justify-between font-bold text-white">
              <span className="font-black italic text-lime-400">PLAYGROUND OS</span>
              <span className="text-[10px] bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full font-black">
                v2.4 Live
              </span>
            </div>
            <p className="text-[11px]">Real-time stat sync & geofence alerts active.</p>
          </div>
        </div>
      </aside>

      {/* Mobile Top Sync Progress Banner */}
      {(isSyncing || (pendingQueue && pendingQueue.length > 0)) && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-indigo-950/95 border-b border-lime-400/30 px-3.5 py-2 backdrop-blur-md flex items-center justify-between text-xs text-white shadow-lg">
          <div className="flex items-center space-x-2">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-lime-400 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="text-[11px] font-black italic uppercase tracking-tight">
              {isSyncing
                ? 'Syncing Offline Records...'
                : `${pendingQueue?.length || 0} Offline Item(s) Pending`}
            </span>
          </div>

          {isSyncing ? (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-black text-lime-400">
                {syncProgress?.current}/{syncProgress?.total}
              </span>
              <div className="w-16 bg-indigo-900 h-2 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="bg-lime-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      ((syncProgress?.current || 0) / (syncProgress?.total || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            onSimulateOfflineAction && (
              <button
                onClick={onSimulateOfflineAction}
                className="px-2.5 py-1 bg-lime-400 text-black font-black text-[9px] uppercase rounded-lg shadow-sm"
              >
                + Add Test Record
              </button>
            )
          )}
        </div>
      )}

      {/* Mobile Slide-Up More Menu Sheet */}
      {isMobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div className="bg-indigo-950 border-t-2 border-lime-400 rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-lime-400" />
                <h3 className="font-black italic uppercase tracking-wider text-sm">
                  All App Views
                </h3>
              </div>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 bg-indigo-900 rounded-full text-indigo-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item.id as NavTab);
                      setIsMobileMoreOpen(false);
                    }}
                    className={`flex items-center space-x-2.5 p-3 rounded-2xl text-xs transition ${
                      isActive
                        ? 'bg-lime-400 text-black font-black italic shadow-lg shadow-lime-400/20'
                        : 'bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800 font-bold'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 border-t border-white/10">
              <button
                onClick={() => {
                  handleOpenStatLog();
                  setIsMobileMoreOpen(false);
                }}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-lime-400 text-black font-black italic rounded-xl text-xs uppercase"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log Stats</span>
              </button>
              <button
                onClick={() => {
                  handleOpenHostGame();
                  setIsMobileMoreOpen(false);
                }}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-rose-500 text-white font-black italic rounded-xl text-xs uppercase"
              >
                <Flame className="w-4 h-4" />
                <span>Host Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-indigo-950/95 border-t border-white/10 px-1.5 py-2 flex items-center justify-around shadow-2xl text-white">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as NavTab)}
              className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] transition ${
                isActive
                  ? 'text-lime-400 font-black italic scale-105'
                  : 'text-indigo-200/60 font-semibold hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}

        <button
          onClick={() => handleTabChange('team-chat' as NavTab)}
          className={`relative flex flex-col items-center justify-center p-1 rounded-xl text-[10px] transition ${
            activeTab === 'team-chat'
              ? 'text-lime-400 font-black italic scale-105'
              : 'text-indigo-200/60 font-semibold'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Chat</span>
          {unreadChatCount > 0 && (
            <span className="absolute top-0.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] transition ${
            isMobileMoreOpen
              ? 'text-lime-400 font-black italic scale-105'
              : 'text-indigo-200/60 font-semibold hover:text-white'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};

export default Navigation;