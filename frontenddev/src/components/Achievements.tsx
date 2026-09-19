// frontend/src/components/Achievements.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { AthleteProfile, HighlightClip, SportType } from '../types';
import {
  getLevelInfo,
  getCumulativeXpForLevel,
  ELITE_CHALLENGES,
} from '../utils/leveling';
import { StreakCalendar } from './StreakCalendar';
import { VolleyballChallengesView } from './VolleyballChallengesView';
import {
  fetchAchievements,
  claimAchievement,
  fetchPinnedBadges,
  savePinnedBadges,
} from '../services/achievementService';
import {
  Trophy, Flame, Award, ShieldCheck, Crown, Target, Users, Film, Zap,
  Star, Sparkles, MapPin, Filter, CheckCircle2, ChevronRight, Medal,
  Dumbbell, Activity, Pin, Play, Video, Eye, Heart, Square, Check,
  Lock, Search, Share2, Download, Copy, X, Image as ImageIcon,
} from 'lucide-react';
import { HighlightReelView } from './HighlightReelView';
import { SportDrillsView } from './SportDrillsView';
/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export interface MilestoneItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SportType | 'general' | 'elite_series';
  tier:
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'platinum'
    | 'diamond'
    | 'pro_elite'
    | 'legendary';
  targetValue: number;
  currentValue: number;
  xpReward: number;
  unlockedAt?: string;
  tips?: string;
  isProVerified?: boolean;
}

type HubTab = 'showcase' | 'achievements' | 'reels' | 'challenges';

interface AchievementsProps {
  user: AthleteProfile;
  milestones?: MilestoneItem[];
  allAthletes?: AthleteProfile[];   // ✅ ADD THIS
  highlightsVersion?: number; 
  onUpdateProfile?: (updated: Partial<AthleteProfile>) => void;
  onOpenUploadModal?: (presetTitle?: string, presetSport?: SportType) => void;
  onOpenReels?: () => void;
  onEarnXp?: (amount: number, source: string) => void;
  initialTab?: HubTab;
}

/* ═══════════════════════════════════════════
   SAFE HELPERS
   ═══════════════════════════════════════════ */
const getUserAvatar = (user: any): string =>
  user?.profilepicture ||
  user?.profilePicture ||
  user?.avatar ||
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

const getUserHandle = (user: any): string => {
  const h = user?.handle || user?.userhandle || user?.user_handle || 'athlete';
  return h.startsWith('@') ? h : `@${h}`;
};

const getUserSport = (user: any): SportType =>
  (user?.primarySport || user?.primary_sport || user?.sport || 'basketball') as SportType;

const getUserValueXp = (user: any): number => {
  const v = user?.valuexp ?? user?.valueXp ?? user?.totalXp ?? user?.xp ?? 0;
  return typeof v === 'number' ? v : 0;
};

const getUserStreak = (user: any): number =>
  user?.dailyStreak ?? user?.daily_streak ?? 1;

/* ═══════════════════════════════════════════
   ICON MAPPER
   ═══════════════════════════════════════════ */
const renderIcon = (iconName: string, className = 'w-5 h-5') => {
  switch (iconName) {
    case 'Trophy': return <Trophy className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Award': return <Award className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Crown': return <Crown className={className} />;
    case 'Target': return <Target className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Film': return <Film className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Star': return <Star className={className} />;
    case 'MapPin': return <MapPin className={className} />;
    case 'Medal': return <Medal className={className} />;
    case 'Dumbbell': return <Dumbbell className={className} />;
    case 'Activity': return <Activity className={className} />;
    default: return <Sparkles className={className} />;
  }
};

/* ═══════════════════════════════════════════
   TIER STYLES
   ═══════════════════════════════════════════ */
const getTierBadge = (tier: MilestoneItem['tier']) => {
  switch (tier) {
    case 'bronze':
      return { label: 'Bronze', bg: 'bg-amber-900/40 text-amber-300 border-amber-600/40' };
    case 'silver':
      return { label: 'Silver', bg: 'bg-slate-800/80 text-slate-200 border-slate-400/40' };
    case 'gold':
      return { label: 'Gold', bg: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/40' };
    case 'platinum':
      return { label: 'Platinum', bg: 'bg-cyan-900/40 text-cyan-300 border-cyan-400/40' };
    case 'diamond':
      return { label: 'Diamond', bg: 'bg-purple-900/40 text-purple-300 border-purple-400/40' };
    case 'pro_elite':
      return {
        label: 'PRO Elite 👑',
        bg: 'bg-gradient-to-r from-amber-400/30 to-yellow-300/30 text-amber-300 border-amber-400/80',
      };
    case 'legendary':
      return {
        label: 'Legendary 👑',
        bg: 'bg-gradient-to-r from-amber-400/50 via-yellow-200/50 to-amber-500/50 text-amber-200 border-amber-300',
      };
  }
};

/* ═══════════════════════════════════════════
   DEFAULT PINNED BY SPORT
   ═══════════════════════════════════════════ */
const defaultPinnedBySport: Record<string, string[]> = {
  volleyball: ['m_vb_spike_cannon', 'm_vb_ace_master', 'm_vb_net_guardian', 'm_rising_star', 'm_first_win'],
  basketball: ['m_100_pts', 'm_50_reb', 'm_25_ast', 'm_rising_star'],
  football: ['m_century_scorer', 'm_first_win', 'm_25_games', 'm_rising_star'],
  soccer: ['m_century_scorer', 'm_dime_dropper', 'm_first_win', 'm_25_games'],
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export const Achievements: React.FC<AchievementsProps> = ({
  user,
  milestones: propMilestones = [],
  allAthletes = [], 
  highlightsVersion = 0,                   // ✅ ADD THIS
  onUpdateProfile,
  onOpenUploadModal,
  onOpenReels,
  onEarnXp,
  initialTab = 'showcase',
}) => {
  /* ─── Derived values ─── */
  const userSport = getUserSport(user);
  const userAvatar = getUserAvatar(user);
  const userHandle = getUserHandle(user);
  const userStreak = getUserStreak(user);
  const userValueXp = getUserValueXp(user);
  const levelInfo = getLevelInfo(userValueXp);
  const athleteId = (user as any)?.id;

  /* ─── Hub Tab ─── */
  const [activeHubTab, setActiveHubTab] = useState<HubTab>(initialTab);

  /* ─── MySQL-backed milestones ─── */
  const [dbMilestones, setDbMilestones] = useState<MilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [claimedFromDb, setClaimedFromDb] = useState<Record<string, boolean>>({});

  /* ─── Pinned badges ─── */
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<string[]>(() => {
    const userPinned = (user as any).pinnedBadgeIds;
    if (Array.isArray(userPinned) && userPinned.length > 0) return userPinned;
    return defaultPinnedBySport[userSport] || defaultPinnedBySport.basketball;
  });

  /* ─── Selection & filter state ─── */
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [showcaseRarityFilter, setShowcaseRarityFilter] = useState<
    'all' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  >('all');
  const [showcaseToastMsg, setShowcaseToastMsg] = useState<string | null>(null);

  /* ─── Achievements tab state ─── */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [claimedBadges, setClaimedBadges] = useState<Record<string, boolean>>({});
  const [previewBadge, setPreviewBadge] = useState<MilestoneItem | null>(null);

  /* ─── Share Snapshot Modal ─── */
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMilestone, setShareMilestone] = useState<MilestoneItem | null>(null);
  const [snapshotToastMsg, setSnapshotToastMsg] = useState<string | null>(null);

  /* ─── Announcement modal ─── */
  const [announcementModal, setAnnouncementModal] = useState<{
    isOpen: boolean;
    level: number;
    challengeTitle: string;
    description: string;
    rewardXp: number;
  } | null>(null);

  /* ─── Confetti ─── */
  const [confettiConfig, setConfettiConfig] = useState<{
    isVisible: boolean;
    tier?: 'standard' | 'legendary';
    title?: string;
    subtitle?: string;
  }>({ isVisible: false, tier: 'standard' });

  /* ─── Toast helper ─── */
  const showToast = (msg: string) => {
    setShowcaseToastMsg(msg);
    setTimeout(() => setShowcaseToastMsg(null), 3500);
  };

  /* ═══════════════════════════════════════════
     FETCH from MySQL on mount / user change
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const { milestones: fetched, claimedIds } = await fetchAchievements(athleteId);
        if (cancelled) return;
        setDbMilestones(fetched);

        const map: Record<string, boolean> = {};
        claimedIds.forEach((id) => { map[id] = true; });
        setClaimedFromDb(map);

        try {
          const pinned = await fetchPinnedBadges(athleteId);
          if (!cancelled && Array.isArray(pinned) && pinned.length > 0) {
            setPinnedBadgeIds(pinned);
          }
        } catch { /* silent */ }
      } catch (err) {
        console.error('Failed to load achievements:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [athleteId]);
  useEffect(() => {
  if (initialTab && initialTab !== activeHubTab) {
    setActiveHubTab(initialTab);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialTab]);
  /* ─── Sync pinnedBadgeIds when user changes ─── */
  useEffect(() => {
    const userPinned = (user as any).pinnedBadgeIds;
    if (Array.isArray(userPinned) && userPinned.length > 0) {
      setPinnedBadgeIds(userPinned);
    }
  }, [user?.id, (user as any)?.pinnedBadgeIds]);

  /* ─── Active milestone list (DB only — props only as fallback) ─── */
  const activeMilestones = useMemo(
    () => (dbMilestones.length > 0 ? dbMilestones : propMilestones),
    [dbMilestones, propMilestones]
  );

  /* ─── Stats ─── */
  const unlockedCount = useMemo(
    () => activeMilestones.filter((m) => m.currentValue >= m.targetValue).length,
    [activeMilestones]
  );
  const totalCount = activeMilestones.length;

  const totalXpEarned = useMemo(
    () =>
      activeMilestones
        .filter((m) => m.currentValue >= m.targetValue)
        .reduce((acc, curr) => acc + curr.xpReward, 0),
    [activeMilestones]
  );

  /* ─── Pinned milestones ─── */
  const pinnedMilestones = useMemo(() => {
    return activeMilestones.filter((m) => {
      if (!pinnedBadgeIds.includes(m.id)) return false;
      if (
        m.category &&
        m.category !== 'general' &&
        m.category !== userSport &&
        m.category !== 'elite_series'
      ) {
        return false;
      }
      if (showcaseRarityFilter === 'all') return true;
      if (showcaseRarityFilter === 'diamond') {
        return m.tier === 'diamond' || m.tier === 'pro_elite' || m.tier === 'legendary';
      }
      return m.tier === showcaseRarityFilter;
    });
  }, [activeMilestones, pinnedBadgeIds, showcaseRarityFilter, userSport]);

  /* ─── Filtered milestones ─── */
  const filteredMilestones = useMemo(() => {
    return activeMilestones.filter((m) => {
      const isUnlocked = m.currentValue >= m.targetValue;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q);
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'unlocked' && isUnlocked) ||
        (filterStatus === 'locked' && !isUnlocked);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeMilestones, searchQuery, filterCategory, filterStatus]);

  /* ═══════════════════════════════════════════
     PIN — MySQL
     ═══════════════════════════════════════════ */
  const handleTogglePin = async (badgeId: string) => {
    const isPinned = pinnedBadgeIds.includes(badgeId);
    const updated = isPinned
      ? pinnedBadgeIds.filter((id) => id !== badgeId)
      : [...pinnedBadgeIds, badgeId];

    setPinnedBadgeIds(updated);
    onUpdateProfile?.({ pinnedBadgeIds: updated } as any);

    try {
      if (athleteId) await savePinnedBadges(athleteId, updated);
    } catch (err) {
      console.error('Failed to save pin:', err);
    }

    showToast(
      isPinned
        ? '📌 Badge unpinned from your Profile Showcase.'
        : '📌 Badge pinned to your Profile Showcase!'
    );
  };

  /* ─── Multi-select ─── */
  const handleToggleSelectBadge = (badgeId: string) => {
    setSelectedBadgeIds((prev) =>
      prev.includes(badgeId) ? prev.filter((id) => id !== badgeId) : [...prev, badgeId]
    );
  };
  const handleDeselectAllBadges = () => setSelectedBadgeIds([]);

  /* ─── Batch pin ─── */
  const handleBatchPinToFeatured = async () => {
    if (selectedBadgeIds.length === 0) return;
    const newPinned = Array.from(new Set([...pinnedBadgeIds, ...selectedBadgeIds]));
    setPinnedBadgeIds(newPinned);
    onUpdateProfile?.({ pinnedBadgeIds: newPinned } as any);

    try {
      if (athleteId) await savePinnedBadges(athleteId, newPinned);
    } catch (err) {
      console.error('Batch pin failed:', err);
    }

    showToast(
      `📌 Pinned ${selectedBadgeIds.length} badge${selectedBadgeIds.length > 1 ? 's' : ''} to your Profile Showcase!`
    );
    setSelectedBadgeIds([]);
  };

  const handleBatchShareSelection = () => {
    if (selectedBadgeIds.length === 0) return;
    showToast(
      `✨ Shared ${selectedBadgeIds.length} badge${selectedBadgeIds.length > 1 ? 's' : ''} to your social feed!`
    );
    setSelectedBadgeIds([]);
  };

  /* ═══════════════════════════════════════════
     CLAIM — MySQL transaction
     ═══════════════════════════════════════════ */
  const handleClaimMilestone = async (m: MilestoneItem) => {
    if (!athleteId) {
      showToast('⚠️ Not signed in');
      return;
    }
    if (claimedFromDb[m.id]) {
      showToast('✅ Already claimed!');
      return;
    }

    try {
      const result = await claimAchievement(athleteId, m.id, m.xpReward, m.name);

      setClaimedBadges((prev) => ({ ...prev, [m.id]: true }));
      setClaimedFromDb((prev) => ({ ...prev, [m.id]: true }));

      const updatedUser = {
        ...user,
        valuexp: result.newXp,
        xp: result.newXp,
        level: result.newLevel,
      } as any;

      onUpdateProfile?.(updatedUser);
      if (onEarnXp) onEarnXp(m.xpReward, m.name);

      const isLegendary =
        m.tier === 'legendary' || m.tier === 'diamond' || m.tier === 'pro_elite';

      setConfettiConfig({
        isVisible: true,
        tier: isLegendary ? 'legendary' : 'standard',
        title: isLegendary ? '👑 LEGENDARY UNLOCKED!' : '🏆 ACHIEVEMENT UNLOCKED!',
        subtitle: `${m.name} (+${m.xpReward} XP)`,
      });
      setTimeout(() => {
        setConfettiConfig((prev) => ({ ...prev, isVisible: false }));
      }, 4500);

      showToast(`🎉 Claimed +${m.xpReward} XP for "${m.name}"!`);

      if (result.isMilestoneReached || result.leveledUp) {
        const announce = result.levelInfo?.eliteChallengeAnnouncement;
        if (announce) {
          setAnnouncementModal({
            isOpen: true,
            level: result.newLevel,
            challengeTitle: announce.title,
            description: announce.description,
            rewardXp: announce.xpReward,
          });
        }
      }
    } catch (err: any) {
      showToast(`⚠️ ${err?.message || 'Failed to claim'}`);
    }
  };

  /* ─── Show announcement for level ─── */
  const handleShowAnnouncementForLevel = (targetLvl: number) => {
    const challenge =
      ELITE_CHALLENGES.find((c) => c.unlockedAtLevel === targetLvl) || {
        id: `challenge_lvl${targetLvl}`,
        unlockedAtLevel: targetLvl,
        title: `Level ${targetLvl} Elite Milestone`,
        description: `Specific high-tier milestone reached at Level ${targetLvl}.`,
        xpReward: targetLvl * 100,
      };
    setAnnouncementModal({
      isOpen: true,
      level: targetLvl,
      challengeTitle: challenge.title,
      description: challenge.description,
      rewardXp: challenge.xpReward,
    });
  };

  /* ─── Share Modal ─── */
  const handleOpenShareModal = (milestone?: MilestoneItem) => {
    const target =
      milestone ||
      activeMilestones.find((m) => m.currentValue >= m.targetValue) ||
      activeMilestones[0];
    if (!target) return;
    setShareMilestone(target);
    setIsShareModalOpen(true);
  };

  /* ─── Canvas Snapshot Generator ─── */
  const generateSnapshotDataUrl = (m: MilestoneItem): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const bgGradStart = '#090d16';
    const bgGradEnd = '#121829';
    const accentHex = '#a3e635';

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, bgGradStart);
    bgGrad.addColorStop(1, bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    const glowGrad = ctx.createRadialGradient(600, 337, 30, 600, 337, 500);
    glowGrad.addColorStop(0, accentHex + '35');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1200, 675);

    ctx.fillStyle = bgGradEnd;
    ctx.strokeStyle = accentHex + '88';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(60, 50, 1080, 575, 40);
    } else {
      ctx.rect(60, 50, 1080, 575);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.font = 'bold italic 22px sans-serif';
    ctx.fillText('PLAYGROUND LEAGUE • ATHLETE SNAPSHOT', 100, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 italic 42px sans-serif';
    ctx.fillText((user?.name || 'Athlete').toUpperCase(), 100, 170);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(
      `${userHandle}  •  LEVEL ${levelInfo.level} ${levelInfo.levelTitle}`,
      100,
      210
    );

    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 240);
    ctx.lineTo(1100, 240);
    ctx.stroke();

    ctx.fillStyle = accentHex + '22';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(100, 280, 160, 160, 30);
    } else {
      ctx.rect(100, 280, 160, 160);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 180, 390);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 italic 46px sans-serif';
    ctx.fillText(m.name.toUpperCase(), 290, 335);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(
      `${m.tier.toUpperCase()} TIER BADGE  •  +${m.xpReward} XP REWARD`,
      290,
      375
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 22px sans-serif';
    const desc = m.description.length > 55 ? m.description.substring(0, 55) + '...' : m.description;
    ctx.fillText(desc, 290, 420);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`UNLOCKED: ${m.unlockedAt || 'Recently Earned'}`, 100, 560);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold italic 22px sans-serif';
    ctx.fillText('VERIFIED ATHLETE BADGE ✓', 800, 560);

    return canvas.toDataURL('image/png');
  };

  /* ─── Highlight clips ─── */
  const showcaseClips: HighlightClip[] = useMemo(() => {
    const hl = (user as any)?.highlights;
    if (!Array.isArray(hl) || hl.length === 0) return [];
    return hl.filter((h: HighlightClip) => {
      if (!h) return false;
      if (!h.sport) return true;
      return h.sport === userSport;
    });
  }, [user, userSport]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6 text-white animate-fadeIn">
      {/* HUB TAB BAR */}
      <div className="flex items-center space-x-2 bg-indigo-950/90 p-2 rounded-3xl border border-white/10 shadow-xl overflow-x-auto">
        {[
          { id: 'showcase' as HubTab, label: 'Profile Showcase', icon: Crown },
          {
            id: 'achievements' as HubTab,
            label: `Badges & Achievements (${unlockedCount}/${totalCount})`,
            icon: Trophy,
          },
          { id: 'reels' as HubTab, label: 'Reels & Community', icon: Film },
          { id: 'challenges' as HubTab, label: 'Sport Drills & Training', icon: Target },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveHubTab(id)}
            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-black italic uppercase text-xs transition shrink-0 ${
              activeHubTab === id
                ? 'bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 text-black shadow-lg shadow-lime-400/20'
                : 'text-indigo-200 hover:text-white hover:bg-indigo-900/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TOAST */}
      {showcaseToastMsg && (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 to-lime-400/20 border border-amber-400/50 rounded-2xl text-center text-xs font-black italic uppercase text-amber-300 animate-fadeIn flex items-center justify-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{showcaseToastMsg}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 1 — PROFILE SHOWCASE
          ═══════════════════════════════════════════ */}
      {activeHubTab === 'showcase' && (
        <div className="space-y-6">
          {/* RANK LEVEL PROGRESS BAR */}
          <div className="bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-950 p-5 rounded-[2rem] border border-lime-400/40 shadow-2xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-lime-400 text-black flex items-center justify-center font-black text-sm shadow-xl shrink-0">
                  L{levelInfo.level}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black italic uppercase text-lime-400 tracking-wider">
                      Rank Progression
                    </span>
                    <span className="text-[10px] bg-indigo-900 text-amber-300 px-2.5 py-0.5 rounded-full font-black border border-amber-400/30">
                      {levelInfo.levelTitle}
                    </span>
                  </div>
                  <p className="text-sm font-black text-white mt-0.5">
                    Level {levelInfo.level} Athlete •{' '}
                    <span className="text-lime-300">{levelInfo.totalXp.toLocaleString()} XP</span>{' '}
                    Total Career Progress
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs font-mono font-bold text-indigo-200">
                {levelInfo.isMaxLevel ? (
                  <span className="text-amber-300 font-black flex items-center space-x-1">
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>MAX LEVEL REACHED</span>
                  </span>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-indigo-300 uppercase font-black">
                      Next Rank Goal: Level {levelInfo.level + 1}
                    </p>
                    <p className="text-xs font-black text-lime-400">
                      {levelInfo.xpInCurrentLevel.toLocaleString()} /{' '}
                      {levelInfo.xpRequiredForNextLevel.toLocaleString()} XP ({levelInfo.progressPct}%)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-4 bg-indigo-950/90 rounded-full overflow-hidden p-0.5 border border-white/15 shadow-inner relative z-10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-lime-400 via-amber-400 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(163,230,53,0.8)] relative"
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
              </motion.div>
            </div>
          </div>

          {/* ATHLETE PROFILE BANNER */}
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 sm:p-8 rounded-[2.5rem] border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative shrink-0">
                  <img
                    src={userAvatar}
                    alt={user?.name || 'Athlete'}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-lime-400/80 shadow-2xl"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center space-x-1">
                    <Crown className="w-3.5 h-3.5 fill-black" />
                    <span>LVL {levelInfo.level}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
                      {user?.name || 'Athlete'}
                    </h1>
                    {(user?.isPro || user?.isVerifiedPro) && (
                      <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center shadow-md">
                        <Crown className="w-3 h-3 mr-0.5 fill-black" /> PRO
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-indigo-300 font-bold">
                    {userHandle} • {user?.levelTitle || levelInfo.levelTitle}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className="bg-indigo-900/80 text-lime-400 border border-lime-400/30 px-2.5 py-1 rounded-xl text-[11px] font-mono font-black flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                      <span>{levelInfo.totalXp.toLocaleString()} XP</span>
                    </span>
                    <span className="bg-indigo-900/80 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-xl text-[11px] font-mono font-black flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{userStreak} Day Streak</span>
                    </span>
                    <span className="bg-indigo-900/80 text-cyan-300 border border-cyan-400/30 px-2.5 py-1 rounded-xl text-[11px] font-mono font-black flex items-center space-x-1">
                      <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{user?.winCount || 0} Wins</span>
                    </span>
                    <span className="bg-indigo-900/80 text-purple-300 border border-purple-400/30 px-2.5 py-1 rounded-xl text-[11px] font-mono font-black uppercase flex items-center space-x-1">
                      <span>🏐 {userSport}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveHubTab('achievements')}
                  className="flex-1 md:flex-none px-4 py-3 bg-indigo-900/90 hover:bg-indigo-800 text-white font-black italic text-xs uppercase rounded-2xl border border-white/15 shadow-lg transition flex items-center justify-center space-x-2"
                >
                  <Pin className="w-4 h-4 text-amber-400" />
                  <span>Pin Badges</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenUploadModal?.()}
                  className="flex-1 md:flex-none px-5 py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic text-xs uppercase rounded-2xl shadow-xl shadow-lime-400/20 transition flex items-center justify-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Upload Highlight</span>
                </button>
              </div>
            </div>
          </div>

          {/* UNIFIED GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Featured Pinned Badges */}
            <div className="bg-indigo-950/80 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-black rounded-2xl shadow-md">
                    <Pin className="w-5 h-5 fill-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black italic uppercase text-white tracking-tight">
                      Featured Badges
                    </h2>
                    <p className="text-[11px] text-indigo-300 font-semibold">
                      Pinned accomplishments for {userSport}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 bg-indigo-900/90 px-3 py-1.5 rounded-xl border border-white/15 text-xs font-black">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <select
                      value={showcaseRarityFilter}
                      onChange={(e) => setShowcaseRarityFilter(e.target.value as any)}
                      className="bg-transparent text-white text-[11px] font-black italic uppercase focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-indigo-950 text-white">All Rarities</option>
                      <option value="bronze" className="bg-indigo-950 text-amber-600">🥉 Bronze</option>
                      <option value="silver" className="bg-indigo-950 text-slate-300">🥈 Silver</option>
                      <option value="gold" className="bg-indigo-950 text-yellow-400">🥇 Gold</option>
                      <option value="platinum" className="bg-indigo-950 text-cyan-300">💎 Platinum</option>
                      <option value="diamond" className="bg-indigo-950 text-purple-300">👑 Legendary</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <Sparkles className="w-10 h-10 text-lime-400 mx-auto animate-pulse" />
                    <p className="text-sm text-indigo-200 mt-2">Loading badges...</p>
                  </div>
                ) : pinnedMilestones.length > 0 ? (
                  pinnedMilestones.map((m) => {
                    const tierMeta = getTierBadge(m.tier);
                    const isSelected = selectedBadgeIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => setPreviewBadge(m)}
                        className={`p-4 bg-gradient-to-r from-indigo-900/90 to-purple-950/80 rounded-2xl border transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] cursor-pointer relative group ${
                          isSelected ? 'border-lime-400 ring-2 ring-lime-400/50 shadow-xl' : 'border-amber-400/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-lime-400 text-black flex items-center justify-center shadow-lg group-hover:rotate-3 transition duration-300">
                                {renderIcon(m.icon, 'w-6 h-6 stroke-[2.5]')}
                              </div>
                              <div className="absolute -top-1.5 -right-1.5 bg-indigo-950 p-1 rounded-full border border-emerald-400/80 shadow-md flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className={`text-[9px] font-black italic uppercase px-2 py-0.5 rounded-full border ${tierMeta.bg}`}>
                                  {tierMeta.label}
                                </span>
                                {(m.isProVerified || user?.isPro) && (
                                  <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center shadow-sm">
                                    <Crown className="w-2.5 h-2.5 mr-0.5 fill-black" /> PRO
                                  </span>
                                )}
                                <span className="text-[10px] font-mono font-black text-lime-400">
                                  +{m.xpReward} XP
                                </span>
                              </div>
                              <h3 className="text-sm font-black italic uppercase text-white mt-1 group-hover:text-amber-300 transition">
                                {m.name}
                              </h3>
                              <p className="text-xs text-indigo-200/80 leading-relaxed line-clamp-2">
                                {m.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectBadge(m.id);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1 border ${
                                isSelected
                                  ? 'bg-lime-400 text-black border-lime-300'
                                  : 'bg-indigo-950/80 text-indigo-300 border-white/20 hover:border-lime-400/50 hover:text-white'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3 h-3" />
                                  <span>Select</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(m.id);
                              }}
                              className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/50 rounded-xl text-[10px] font-black uppercase transition flex items-center space-x-1"
                            >
                              <Pin className="w-3 h-3 fill-current" />
                              <span>Pinned</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-gradient-to-br from-indigo-950/90 via-purple-950/40 to-slate-950/90 rounded-[2rem] border-2 border-dashed border-amber-400/30 space-y-4 shadow-2xl">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/40 shadow-xl relative">
                      <Award className="w-8 h-8 stroke-[2.2]" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-lime-400 animate-ping" />
                    </div>

                    <div className="max-w-xs mx-auto space-y-1.5">
                      <h3 className="text-base font-black italic uppercase text-white">
                        No Badges Displayed
                      </h3>
                      <p className="text-xs text-indigo-200/80 leading-relaxed font-semibold">
                        {activeMilestones.length === 0
                          ? 'No badge catalog loaded yet. Try again in a moment.'
                          : `Pin your top career milestones to showcase them for ${userSport}.`}
                      </p>
                    </div>

                    {activeMilestones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveHubTab('achievements')}
                        className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-lime-400 border border-lime-400/40 text-xs font-black italic uppercase rounded-xl transition flex items-center justify-center space-x-1.5 mx-auto"
                      >
                        <Medal className="w-3.5 h-3.5" />
                        <span>Browse Badges to Pin</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Highlight Reels */}
            <div className="bg-indigo-950/80 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl shadow-md">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black italic uppercase text-white tracking-tight">
                      Best Game Highlights
                    </h2>
                    <p className="text-[11px] text-indigo-300 font-semibold">
                      Featured video clips & gameplay moments
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenReels?.()}
                  className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-lime-400 text-xs font-black italic uppercase rounded-xl border border-lime-400/30 transition flex items-center space-x-1"
                >
                  <span>Reel Theater</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {showcaseClips.length === 0 ? (
                  <div className="p-8 text-center bg-indigo-950/60 rounded-3xl border border-dashed border-white/10 space-y-3">
                    <Film className="w-8 h-8 text-indigo-400 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-indigo-200">No highlight clips yet</p>
                      <p className="text-xs text-indigo-300/70">Upload your first game clip to feature it here.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenUploadModal?.()}
                      className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black text-xs font-black italic uppercase rounded-xl shadow-lg transition inline-flex items-center space-x-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Upload Highlight</span>
                    </button>
                  </div>
                ) : (
                  showcaseClips.map((clip) => (
                    <div
                      key={clip.id}
                      onClick={() => onOpenReels?.()}
                      className="p-3.5 bg-indigo-900/80 rounded-2xl border border-white/10 hover:border-purple-400/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] flex items-center space-x-4 shadow-lg group cursor-pointer"
                    >
                      <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={clip.thumbnailUrl || 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=600'}
                          alt={clip.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-lime-400 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            <Play className="w-4 h-4 fill-black ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                          0:{clip.durationSeconds || 30}
                        </span>
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                            {clip.sport || userSport}
                          </span>
                          <span className="text-[10px] text-indigo-300 font-mono truncate">
                            {clip.createdAt}
                          </span>
                        </div>
                        <h3 className="text-xs font-black italic uppercase text-white line-clamp-1 group-hover:text-purple-300 transition">
                          {clip.title}
                        </h3>
                        <div className="flex items-center space-x-3 text-[10px] text-indigo-200 font-mono">
                          <span className="flex items-center space-x-1 text-cyan-300">
                            <Eye className="w-3 h-3" />
                            <span>{clip.views || 0} views</span>
                          </span>
                          <span className="flex items-center space-x-1 text-rose-400">
                            <Heart className="w-3 h-3 fill-rose-400" />
                            <span>{clip.likes || 0} likes</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReels?.();
                        }}
                        className="p-2 bg-indigo-950 hover:bg-lime-400 text-indigo-300 hover:text-black rounded-xl border border-white/10 transition shrink-0"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2 — BADGES & ACHIEVEMENTS
          ═══════════════════════════════════════════ */}
      {activeHubTab === 'achievements' && (
        <div className="space-y-6">
          {/* TOP BANNER */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 p-6 sm:p-8 rounded-[2.5rem] border border-white/15 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-lime-400 via-amber-400 to-transparent" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center space-x-2 bg-lime-400/20 border border-lime-400/30 px-3 py-1 rounded-full text-xs font-black italic uppercase text-lime-300">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Athlete Achievements & Milestones</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
                  Unlockable <span className="text-lime-400">Badges & XP</span>
                </h2>

                <p className="text-xs text-indigo-200/80 font-semibold leading-relaxed">
                  Track key accomplishments like "First Win", "10 Games Played", and "Century Scorer". Earn bonus XP to level up your athlete profile.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenShareModal()}
                  className="px-5 py-3.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-lime-400/20 transition flex items-center justify-center space-x-2 group shrink-0"
                >
                  <Share2 className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  <span>Share Achievement Snapshot</span>
                </button>

                <div className="bg-indigo-950/80 p-5 rounded-2xl border border-white/10 flex items-center space-x-6 shrink-0 shadow-lg">
                  <div className="text-center space-y-0.5">
                    <span className="text-2xl font-black italic text-lime-400 block">
                      {unlockedCount} / {totalCount}
                    </span>
                    <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider block">
                      Badges Unlocked
                    </span>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="text-center space-y-0.5">
                    <span className="text-2xl font-black italic text-amber-300 block">
                      +{totalXpEarned.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider block">
                      Total XP Earned
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-200">
                <span>Overall Milestone Progress</span>
                <span className="text-lime-400 font-mono font-black">
                  {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}% Completed
                </span>
              </div>
              <div className="w-full h-3 bg-indigo-950 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-lime-400 via-amber-400 to-rose-400 rounded-full transition-all duration-700 shadow-md"
                  style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* LEVEL PROGRESSION CHART */}
          <LevelProgressionRechartsCard user={user} onShowAnnouncement={handleShowAnnouncementForLevel} />

          {/* STREAK CALENDAR */}
          <StreakCalendar user={user} onUpdateProfile={onUpdateProfile} />

          {/* VOLLEYBALL / SPORT DRILLS */}
          <VolleyballChallengesView
            user={user}
            onEarnXp={(amount, reason) => { if (onEarnXp) onEarnXp(amount, reason); }}
            onUpdateProfile={onUpdateProfile}
          />

          {/* FILTER & SEARCH BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-indigo-900/60 p-4 rounded-2xl border border-white/10 shadow-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search milestone or badge name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="p-2 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="all">All Badges</option>
                <option value="unlocked">Unlocked ({unlockedCount})</option>
                <option value="locked">Locked ({totalCount - unlockedCount})</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400 capitalize"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="elite_series">Elite Series 👑</option>
                <option value="volleyball">Volleyball 🏐</option>
                <option value="basketball">Basketball 🏀</option>
                <option value="baseball">Baseball ⚾</option>
                <option value="soccer">Soccer ⚽</option>
              </select>
            </div>
          </div>

          {/* BADGES GRID */}
          {isLoading ? (
            <div className="p-12 text-center">
              <Sparkles className="w-10 h-10 text-lime-400 mx-auto animate-pulse" />
              <p className="text-sm text-indigo-200 mt-2">Loading achievements from server...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMilestones.map((m) => {
                const isUnlocked = m.currentValue >= m.targetValue;
                const progressPct = Math.min(100, Math.round((m.currentValue / Math.max(1, m.targetValue)) * 100));
                const tierStyle = getTierBadge(m.tier);
                const isClaimed = claimedBadges[m.id] || claimedFromDb[m.id];
                const isProBadge =
                  m.isProVerified ||
                  m.tier === 'pro_elite' ||
                  m.category === 'elite_series';

                return (
                  <motion.div
                    key={m.id}
                    onClick={() => setSelectedMilestone(m)}
                    animate={
                      isProBadge && isUnlocked
                        ? {
                            boxShadow: [
                              '0 0 15px rgba(251,191,36,0.3)',
                              '0 0 30px rgba(251,191,36,0.7)',
                              '0 0 15px rgba(251,191,36,0.3)',
                            ],
                          }
                        : undefined
                    }
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className={`group cursor-pointer rounded-3xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      isUnlocked && isProBadge
                        ? 'bg-gradient-to-b from-amber-950/90 via-indigo-950 to-indigo-900 border-2 border-amber-400 shadow-xl'
                        : isProBadge
                        ? 'bg-indigo-950/70 border-amber-400/30 opacity-80 hover:opacity-100'
                        : isUnlocked
                        ? 'bg-gradient-to-b from-indigo-900/90 to-indigo-950 border-white/20 hover:border-lime-400 shadow-xl'
                        : 'bg-indigo-950/60 border-white/10 opacity-75 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-start justify-between">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition group-hover:scale-110 ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-black border-lime-300'
                              : 'bg-indigo-900 text-indigo-400 border-white/10'
                          }`}
                        >
                          {renderIcon(m.icon, 'w-6 h-6 stroke-[2.5]')}
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-[9px] font-black italic uppercase px-2 py-0.5 rounded-full border ${tierStyle.bg}`}>
                            {tierStyle.label}
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                            +{m.xpReward} XP
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-black italic uppercase text-white text-base flex items-center space-x-1.5">
                          <span>{m.name}</span>
                          {isUnlocked && <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />}
                        </h3>
                        <p className="text-xs text-indigo-200/70 font-semibold mt-1 line-clamp-2">
                          {m.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-indigo-300/80">
                          {isUnlocked ? 'Requirement Met' : 'Progress'}
                        </span>
                        <span className="font-mono text-white">
                          {m.currentValue} / {m.targetValue}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-indigo-950 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnlocked ? 'bg-lime-400 shadow-sm shadow-lime-400/50' : 'bg-indigo-700'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        {isUnlocked ? (
                          <span className="text-[10px] text-lime-400 font-bold italic flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-indigo-400 font-bold italic flex items-center">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked ({progressPct}%)
                          </span>
                        )}

                        {isUnlocked && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(m.id);
                              }}
                              className={`px-2 py-1.5 rounded-lg border transition flex items-center space-x-1 text-[10px] font-bold ${
                                pinnedBadgeIds.includes(m.id)
                                  ? 'bg-amber-400 text-black border-amber-300'
                                  : 'bg-indigo-900 hover:bg-amber-400/20 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              <Pin className={`w-3 h-3 ${pinnedBadgeIds.includes(m.id) ? 'fill-black' : ''}`} />
                              <span>{pinnedBadgeIds.includes(m.id) ? 'Pinned' : 'Pin'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenShareModal(m);
                              }}
                              className="p-1.5 bg-indigo-900 hover:bg-indigo-800 text-lime-300 rounded-lg border border-lime-400/30 transition flex items-center space-x-1 text-[10px] font-bold"
                            >
                              <Share2 className="w-3 h-3 text-lime-400" />
                              <span>Snapshot</span>
                            </button>
                          </div>
                        )}

                        {isUnlocked && !isClaimed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimMilestone(m);
                            }}
                            className="px-2.5 py-1 bg-lime-400 hover:bg-lime-300 text-black text-[10px] font-black italic uppercase rounded-lg shadow transition"
                          >
                            Claim XP
                          </button>
                        )}

                        {isClaimed && (
                          <span className="text-[10px] text-lime-300 font-bold bg-lime-400/20 px-2 py-0.5 rounded-md border border-lime-400/30">
                            XP Claimed ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isLoading && filteredMilestones.length === 0 && (
            <div className="p-12 text-center bg-indigo-900/40 rounded-[2.5rem] border border-dashed border-white/10 space-y-2">
              <Trophy className="w-10 h-10 text-indigo-300/50 mx-auto" />
              <p className="text-sm font-bold text-indigo-200">
                No achievements found matching your search.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('all');
                  setFilterStatus('all');
                }}
                className="text-xs font-black italic uppercase text-lime-400 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* MILESTONE DETAIL MODAL */}
          {selectedMilestone && (
            <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-indigo-900 border border-white/15 rounded-[2.5rem] p-6 max-w-md w-full text-white space-y-5 relative shadow-2xl">
                <button
                  onClick={() => setSelectedMilestone(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-indigo-950 text-indigo-200 hover:text-white border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                      selectedMilestone.currentValue >= selectedMilestone.targetValue
                        ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-black border-lime-300'
                        : 'bg-indigo-950 text-indigo-300 border-white/10'
                    }`}
                  >
                    {renderIcon(selectedMilestone.icon, 'w-8 h-8 stroke-[2.5]')}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black italic uppercase px-2 py-0.5 rounded-full bg-indigo-950 border border-white/10 text-indigo-300">
                        {selectedMilestone.category}
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-300">
                        +{selectedMilestone.xpReward} XP
                      </span>
                    </div>
                    <h3 className="text-xl font-black italic uppercase text-white">
                      {selectedMilestone.name}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 bg-indigo-950 p-4 rounded-2xl border border-white/10 text-xs">
                  <div>
                    <span className="text-indigo-300/70 font-bold uppercase text-[10px] block">Description</span>
                    <p className="text-white font-semibold mt-0.5">{selectedMilestone.description}</p>
                  </div>

                  <div>
                    <span className="text-indigo-300/70 font-bold uppercase text-[10px] block">How to Unlock</span>
                    <p className="text-lime-300 font-semibold mt-0.5">
                      {selectedMilestone.tips || 'Log stats or participate in playground matches.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-indigo-200/80 font-bold">Requirement Target:</span>
                    <span className="font-mono text-white font-extrabold">
                      {selectedMilestone.currentValue} / {selectedMilestone.targetValue}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const m = selectedMilestone;
                      setSelectedMilestone(null);
                      handleOpenShareModal(m);
                    }}
                    className="flex-1 py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
                  >
                    <Share2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Share Snapshot</span>
                  </button>

                  <button
                    onClick={() => setSelectedMilestone(null)}
                    className="px-5 py-3 bg-indigo-950 hover:bg-indigo-800 text-white font-bold text-xs uppercase italic rounded-xl border border-white/10 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHARE SNAPSHOT MODAL */}
          {isShareModalOpen && shareMilestone && (
            <div className="fixed inset-0 z-50 bg-indigo-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-indigo-900/95 border border-white/15 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full text-white space-y-6 relative shadow-2xl overflow-y-auto max-h-[92vh]">
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-lime-400 text-black rounded-2xl shadow-lg">
                      <ImageIcon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase text-white tracking-tight">
                        Achievement Snapshot Generator
                      </h3>
                      <p className="text-[10px] text-indigo-300 font-mono">1200 × 675 High-Res PNG</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className="p-2 rounded-full bg-indigo-950 text-indigo-300 hover:text-white border border-white/10 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-200 block">
                    Select Badge to Feature:
                  </label>
                  <select
                    value={shareMilestone.id}
                    onChange={(e) => {
                      const selected = activeMilestones.find((m) => m.id === e.target.value);
                      if (selected) setShareMilestone(selected);
                    }}
                    className="w-full p-3 bg-indigo-950 border border-white/15 rounded-xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    {activeMilestones.map((m) => {
                      const unlocked = m.currentValue >= m.targetValue;
                      return (
                        <option key={m.id} value={m.id}>
                          {unlocked ? '🏆 UNLOCKED' : '🔒 LOCKED'} • {m.name} (
                          {m.tier.toUpperCase()} - +{m.xpReward} XP)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                    <span>Snapshot Preview:</span>
                    <span className="text-[10px] text-lime-300 font-mono">1200 × 675 PNG</span>
                  </span>

                  <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 shadow-inner flex items-center justify-center overflow-hidden">
                    <img
                      src={generateSnapshotDataUrl(shareMilestone)}
                      alt="Achievement Snapshot Preview"
                      className="w-full h-auto max-h-[340px] rounded-xl object-contain shadow-2xl border border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={generateSnapshotDataUrl(shareMilestone)}
                      download={`${user?.name || 'athlete'}_${shareMilestone.id}_snapshot.png`}
                      onClick={() => {
                        setSnapshotToastMsg('Snapshot downloaded! Ready to share. 📸');
                        setTimeout(() => setSnapshotToastMsg(null), 4000);
                      }}
                      className="py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-lime-400/20 transition flex items-center justify-center space-x-2 text-center"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Snapshot (PNG)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const text = `🏆 Unlocked "${shareMilestone.name}" on Playground League! Level ${levelInfo.level} Athlete • +${shareMilestone.xpReward} XP. Check out my profile!`;
                        navigator.clipboard.writeText(text);
                        setSnapshotToastMsg('Social share text copied! 📋');
                        setTimeout(() => setSnapshotToastMsg(null), 4000);
                      }}
                      className="py-3.5 px-4 bg-indigo-950 hover:bg-indigo-800 text-lime-300 border border-lime-400/40 text-xs font-black italic uppercase rounded-2xl transition flex items-center justify-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Social Post Text</span>
                    </button>
                  </div>

                  {snapshotToastMsg && (
                    <div className="p-3 bg-lime-400/20 border border-lime-400/40 rounded-xl text-center text-xs font-bold text-lime-300 animate-fadeIn">
                      {snapshotToastMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3 — REELS */}
      {activeHubTab === 'reels' && (
        <HighlightReelView
          key={`highlights-${highlightsVersion}`}
          user={user}
          allAthletes={allAthletes}
          onOpenUploadModal={onOpenUploadModal || (() => {})}
          onEarnXp={onEarnXp} 
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {/* TAB 4 — DRILLS */}
      {activeHubTab === 'challenges' && (
        <SportDrillsView
          user={user}
          onEarnXp={onEarnXp}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {/* STICKY BATCH ACTIONS BAR */}
      {selectedBadgeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900 border-2 border-lime-400 p-3 sm:px-6 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-4 max-w-xl w-[92vw] animate-slideUp">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-lime-400 animate-ping shrink-0" />
            <span className="text-xs font-black italic uppercase text-white font-mono tracking-wider">
              {selectedBadgeIds.length} Badge{selectedBadgeIds.length > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBatchPinToFeatured}
              className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 shrink-0"
            >
              <Pin className="w-3.5 h-3.5 fill-black" />
              <span>Pin to Featured</span>
            </button>

            <button
              type="button"
              onClick={handleBatchShareSelection}
              className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-amber-300 border border-amber-400/40 font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleDeselectAllBadges}
              className="p-2 bg-indigo-950 hover:bg-rose-900/80 text-rose-300 rounded-xl border border-rose-500/30 transition shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BADGE PREVIEW MODAL */}
      {previewBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 sm:p-8 rounded-[2.5rem] border-2 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] max-w-lg w-full space-y-6 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setPreviewBadge(null)}
              className="absolute top-5 right-5 p-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-full border border-white/20 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black italic uppercase rounded-full font-mono">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>BADGE PREVIEW • {previewBadge.tier.toUpperCase()} TIER</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
                {previewBadge.name}
              </h2>
              <p className="text-xs text-lime-400 font-black font-mono">+{previewBadge.xpReward} XP Reward</p>
            </div>

            <div className="relative p-6 bg-indigo-900/60 rounded-3xl border border-amber-400/40 text-center space-y-4 overflow-hidden">
              <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-300 to-lime-400 text-black flex items-center justify-center shadow-2xl ring-4 ring-amber-400/50">
                {renderIcon(previewBadge.icon, 'w-12 h-12 stroke-[2.5]')}
                <div className="absolute -top-2 -right-2 bg-indigo-950 p-1.5 rounded-full border-2 border-emerald-400 shadow-xl flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              <p className="text-xs text-indigo-200 font-semibold leading-relaxed max-w-sm mx-auto">
                {previewBadge.description}
              </p>
            </div>

            <div className="bg-indigo-950/90 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black italic uppercase text-white tracking-wider">Award Criteria</h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-start justify-between text-indigo-200">
                  <span className="text-indigo-400">Status:</span>
                  <span className="font-bold text-lime-400">
                    {previewBadge.currentValue >= previewBadge.targetValue ? 'EARNED ✓' : 'IN PROGRESS'}
                  </span>
                </div>

                <div className="flex items-start justify-between text-indigo-200">
                  <span className="text-indigo-400">Progress:</span>
                  <span className="font-bold text-white">
                    {previewBadge.currentValue} / {previewBadge.targetValue}
                  </span>
                </div>

                {previewBadge.tips && (
                  <p className="text-[11px] text-amber-200/90 bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/30 italic">
                    💡 {previewBadge.tips}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTogglePin(previewBadge.id)}
                className={`flex-1 py-3 px-4 text-xs font-black italic uppercase rounded-2xl border transition flex items-center justify-center space-x-2 ${
                  pinnedBadgeIds.includes(previewBadge.id)
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/60'
                    : 'bg-indigo-900 text-white border-white/20 hover:bg-indigo-800'
                }`}
              >
                <Pin className="w-4 h-4 fill-current" />
                <span>{pinnedBadgeIds.includes(previewBadge.id) ? 'Pinned' : 'Pin to Featured'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenShareModal(previewBadge);
                  setPreviewBadge(null);
                }}
                className="flex-1 py-3 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELITE CHALLENGE ANNOUNCEMENT MODAL */}
      {announcementModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-amber-950 p-6 sm:p-8 rounded-[2.5rem] border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.6)] max-w-lg w-full space-y-6 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setAnnouncementModal(null)}
              className="absolute top-5 right-5 p-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-full border border-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-400 text-black text-xs font-black italic uppercase rounded-full font-mono shadow-lg">
                <Crown className="w-4 h-4 text-black" />
                <span>ELITE CHALLENGE ⚡</span>
              </div>
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tight">
                LEVEL {announcementModal.level} MILESTONE!
              </h2>
              <p className="text-xs text-amber-300 font-bold font-mono">Official Tier Milestone Unlocked</p>
            </div>

            <div className="bg-indigo-950/80 p-5 rounded-2xl border border-amber-400/40 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/60 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black italic uppercase text-white">
                    {announcementModal.challengeTitle}
                  </h3>
                  <span className="text-xs font-mono text-lime-400 font-extrabold">
                    Reward: +{announcementModal.rewardXp.toLocaleString()} XP
                  </span>
                </div>
              </div>

              <p className="text-xs text-indigo-200/90 italic leading-relaxed">
                {announcementModal.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfettiConfig({
                  isVisible: true,
                  tier: 'legendary',
                  title: '👑 ELITE CHALLENGE!',
                  subtitle: announcementModal.challengeTitle,
                });
                setTimeout(() => {
                  setConfettiConfig((prev) => ({ ...prev, isVisible: false }));
                }, 4000);
                setAnnouncementModal(null);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-amber-400/30 transition text-center flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Accept Challenge</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   LEVEL PROGRESSION RECHARTS CARD
   ═══════════════════════════════════════════ */
export const LevelProgressionRechartsCard: React.FC<{
  user: AthleteProfile;
  onShowAnnouncement?: (lvl: number) => void;
}> = ({ user, onShowAnnouncement }) => {
  const userXp = getUserValueXp(user);
  const levelInfo = getLevelInfo(userXp);

  const chartData = Array.from({ length: 50 }, (_, i) => {
    const lvl = i + 1;
    const cumXp = getCumulativeXpForLevel(lvl);
    const gapXp = Math.round(500 * Math.pow(1.15, i));
    return {
      level: `L${lvl}`,
      lvlNum: lvl,
      cumXp,
      gapXp,
      isCurrent: lvl === levelInfo.level,
      isMilestone: lvl === 10 || lvl === 25 || lvl === 50,
    };
  });

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-amber-950/50 p-6 rounded-[2.5rem] border-2 border-amber-400/50 shadow-2xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-amber-400 text-black text-[10px] font-black uppercase font-mono rounded">
              50-LEVEL ENGINE ⚡
            </span>
            <span className="text-xs text-amber-300 font-bold">15% Compound Growth Curve</span>
          </div>
          <h3 className="text-xl font-black italic uppercase text-white mt-1 flex items-center space-x-2">
            <span>Level {levelInfo.level}: {levelInfo.levelTitle}</span>
            {levelInfo.isMilestoneLevel && (
              <span className="bg-amber-400/20 text-amber-300 text-xs px-2 py-0.5 rounded border border-amber-400/40 font-mono">
                MILESTONE {levelInfo.milestoneLevelTier} 👑
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center space-x-3 bg-indigo-950/80 p-3 rounded-2xl border border-amber-400/30">
          <div className="text-right font-mono">
            <span className="text-[10px] text-indigo-300 uppercase block">Next Level Gap</span>
            <span className="text-sm font-black text-lime-400">
              {levelInfo.xpInCurrentLevel.toLocaleString()} / {levelInfo.xpRequiredForNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center font-black text-amber-300 text-lg">
            {levelInfo.progressPct}%
          </div>
        </div>
      </div>

      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="xpCurveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#312E81" opacity={0.3} />
            <XAxis dataKey="level" stroke="#A5B4FC" fontSize={10} interval={4} />
            <YAxis stroke="#A5B4FC" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B0F2A',
                borderColor: '#F59E0B',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(val: any) => [`${Number(val).toLocaleString()} XP`, 'Cumulative XP']}
            />
            <Area
              type="monotone"
              dataKey="cumXp"
              stroke="#F59E0B"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#xpCurveGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
        {[
          { mTier: 10, title: 'Level 10', badgeIcon: '🔥', color: '#38BDF8' },
          { mTier: 25, title: 'Level 25', badgeIcon: '⚡', color: '#F59E0B' },
          { mTier: 50, title: 'Level 50', badgeIcon: '👑', color: '#A855F7' },
        ].map(({ mTier, title, badgeIcon, color }) => {
          const reqXp = getCumulativeXpForLevel(mTier);
          const isCompleted = levelInfo.level >= mTier;
          const progressPct = isCompleted ? 100 : Math.min(99, Math.round((userXp / reqXp) * 100));

          return (
            <button
              key={mTier}
              type="button"
              onClick={() => onShowAnnouncement?.(mTier)}
              className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                isCompleted
                  ? 'bg-amber-950/40 border-amber-400/60 shadow-lg'
                  : 'bg-indigo-950/80 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">{badgeIcon}</span>
                  <h5 className="text-xs font-black italic uppercase text-white tracking-tight mt-1">
                    {title} Challenge
                  </h5>
                  <p className="text-[10px] font-mono text-indigo-300 mt-0.5">
                    {isCompleted ? 'UNLOCKED ✓' : `${userXp.toLocaleString()} / ${reqXp.toLocaleString()} XP`}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-lg font-black" style={{ color: isCompleted ? '#F59E0B' : color }}>
                    {progressPct}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;