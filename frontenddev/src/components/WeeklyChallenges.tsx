// components/WeeklyChallenges.tsx — Fully Dynamic
import React, { useState, useEffect, useCallback } from 'react';
import { AthleteProfile } from '../types';
import {
  Trophy,
  Sparkles,
  Award,
  ArrowRight,
  Share2,
  Users,
  Activity,
  Target,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { playSuccessChime } from '../utils/audio';
import { ShareGoalModal } from './ShareGoalModal';
import {
  fetchWeeklyChallengesAPI,
  updateWeeklyProgressAPI,
  claimWeeklyRewardAPI,
  syncWeeklyProgressAPI,
  type WeeklyChallengeDTO,
} from '../services/weeklyChallenges.service';

export type ChallengeCategory = 'Skill' | 'Social' | 'Conditioning';

export interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  icon: string;
  category: ChallengeCategory;
  sportLabel?: string;
  completed: boolean;
  claimed: boolean;
}

interface WeeklyChallengesProps {
  user: AthleteProfile;
  onEarnXp: (amount: number, source: string) => void;
  onOpenStatLog?: () => void;
}

/* ═══════════════════════════════════════════
   MAPPER: DTO → UI Task
   ═══════════════════════════════════════════ */
function dtoToTask(dto: WeeklyChallengeDTO): WeeklyTask {
  const id = dto.id.toLowerCase();
  let category: ChallengeCategory = 'Conditioning';
  if (
    id.includes('shot') ||
    id.includes('pts') ||
    id.includes('point') ||
    id.includes('ast') ||
    id.includes('assist') ||
    id.includes('reb') ||
    id.includes('3pt') ||
    id.includes('kill') ||
    id.includes('ace') ||
    id.includes('goal') ||
    id.includes('hit') ||
    id.includes('td')
  ) {
    category = 'Skill';
  } else if (
    id.includes('court') ||
    id.includes('reel') ||
    id.includes('highlight') ||
    id.includes('team') ||
    id.includes('friend')
  ) {
    category = 'Social';
  }

  const sportMap: Record<string, string> = {
    basketball: 'Basketball',
    volleyball: 'Volleyball',
    soccer: 'Soccer',
    baseball: 'Baseball',
    softball: 'Softball',
    football: 'Football',
    pickleball: 'Pickleball',
    tennis: 'Tennis',
  };

  let unit = 'Progress';
  if (id.includes('shot')) unit = 'Shots';
  else if (id.includes('pts') || id.includes('point')) unit = 'PTS';
  else if (id.includes('ast') || id.includes('assist')) unit = 'Assists';
  else if (id.includes('reb')) unit = 'Rebounds';
  else if (id.includes('3pt')) unit = '3PM';
  else if (id.includes('win')) unit = 'Wins';
  else if (id.includes('game')) unit = 'Games';
  else if (id.includes('xp')) unit = 'XP';
  else if (id.includes('warmup')) unit = 'Warmups';
  else if (id.includes('court')) unit = 'Courts';
  else if (id.includes('reel') || id.includes('highlight')) unit = 'Reels';

  const iconMap: Record<string, string> = {
    target: '🎯',
    trophy: '🏆',
    zap: '⚡',
    award: '🥇',
    flame: '🔥',
    clock: '⏱️',
    shield: '🛡️',
    handshake: '🤝',
    clipboard: '📋',
    gamepad: '🎮',
  };

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    target: dto.targetCount,
    current: dto.progress,
    unit,
    rewardXp: dto.xpReward,
    icon: iconMap[dto.icon] || '🏆',
    category,
    sportLabel: sportMap[dto.sport] || dto.sport,
    completed: dto.isCompleted,
    claimed: dto.xpEarned > 0,
  };
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export const WeeklyChallenges: React.FC<WeeklyChallengesProps> = ({
  user,
  onEarnXp,
  onOpenStatLog,
}) => {
  const athleteId = (user as any)?.id;

  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const [activeStatusFilter, setActiveStatusFilter] = useState<
    'all' | 'in_progress' | 'completed'
  >('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'all' | ChallengeCategory
  >('all');

  const [sharingTask, setSharingTask] = useState<WeeklyTask | null>(null);

  /* LOAD */
  const loadTasks = useCallback(async () => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const data = await fetchWeeklyChallengesAPI(athleteId);
      setTasks(data.map(dtoToTask));
      console.log('✅ [WeeklyChallenges] Loaded:', data.length);
    } catch (err) {
      console.error('❌ Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /* SYNC */
  const handleSync = async () => {
    if (!athleteId) return;
    setIsSyncing(true);
    triggerHaptic('medium');
    try {
      const data = await syncWeeklyProgressAPI(athleteId);
      setTasks(data.map(dtoToTask));
    } catch (err) {
      console.error('❌ Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  /* +1 PROGRESS */
  const handleSimulateProgress = async (task: WeeklyTask) => {
    if (!athleteId) return;
    triggerHaptic('light');
    try {
      const updated = await updateWeeklyProgressAPI(athleteId, task.id, 1);
      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? dtoToTask(updated) : t))
        );
        if (updated.isCompleted) {
          triggerHaptic('success');
          playSuccessChime();
        }
      }
    } catch (err) {
      console.error('❌ Progress update failed:', err);
    }
  };

  /* CLAIM */
const handleClaimReward = async (task: WeeklyTask) => {
  if (!athleteId || task.claimed) return;
  setClaimingId(task.id);
  triggerHaptic('success');
  playSuccessChime();

  try {
    const result = await claimWeeklyRewardAPI(athleteId, task.id);

    console.log('🎉 [WeeklyChallenges] Claim response:', result);

    if (result.alreadyClaimed) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, claimed: true, completed: true } : t
        )
      );
      return;
    }

    // ✅ Update local task state
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, claimed: true, completed: true } : t
      )
    );

    // ✅ Update localStorage with new XP
    try {
      const raw = localStorage.getItem('playground_user');
      if (raw) {
        const stored = JSON.parse(raw);
        const updatedXp =
          result.newXp ?? (stored.valuexp ?? 0) + result.xpEarned;
        const updated = {
          ...stored,
          valuexp: updatedXp,
          xp: updatedXp,
        };
        localStorage.setItem('playground_user', JSON.stringify(updated));
        console.log('💾 [WeeklyChallenges] localStorage updated:', updatedXp);
      }
    } catch (e) {
      console.error('Failed to update localStorage:', e);
    }

    // ✅ Call onEarnXp safely (wrapped in try-catch)
    try {
      if (typeof onEarnXp === 'function') {
        onEarnXp(result.xpEarned, `Weekly Challenge: ${task.title}`);
      }
    } catch (e) {
      console.error('onEarnXp failed:', e);
    }

    // ✅ Dispatch event for other components (safely)
    try {
      window.dispatchEvent(
        new CustomEvent('user:xp-updated', {
          detail: {
            valuexp: result.newXp,
            xp: result.newXp,
          },
        })
      );
      console.log('🎯 [WeeklyChallenges] XP event dispatched');
    } catch (e) {
      console.error('Event dispatch failed:', e);
    }

    // ═══════════════════════════════════════════
    // ✅ FORCE RELOAD — Multiple fallbacks
    // ═══════════════════════════════════════════
    console.log('🔄 [WeeklyChallenges] Scheduling reload in 2.5s...');

    // Method 1: setTimeout (primary)
    const reloadTimer = setTimeout(() => {
      console.log('🔄 [WeeklyChallenges] RELOADING NOW...');
      try {
        window.location.reload();
      } catch (e) {
        // Method 2: Fallback
        window.location.href = window.location.href;
      }
    }, 2500);

    // ✅ Safety: Store timer ID on window so it's not GC'd
    (window as any).__weeklyReloadTimer = reloadTimer;

  } catch (err) {
    console.error('❌ Claim failed:', err);
    // ✅ Even on error, don't reload
    setClaimingId(null);
  }
};
  /* FILTERS */
  const filteredTasks = tasks.filter((t) => {
    if (activeStatusFilter === 'in_progress') {
      if (t.completed || t.claimed) return false;
    }
    if (activeStatusFilter === 'completed') {
      if (!t.completed && !t.claimed) return false;
    }
    if (activeCategoryFilter !== 'all' && t.category !== activeCategoryFilter) {
      return false;
    }
    return true;
  });

  const completedCount = tasks.filter((t) => t.claimed || t.completed).length;

  const getCategoryBadgeColor = (cat: ChallengeCategory) => {
    switch (cat) {
      case 'Skill':
        return 'bg-amber-400/20 text-amber-300 border-amber-400/40';
      case 'Social':
        return 'bg-sky-400/20 text-sky-300 border-sky-400/40';
      case 'Conditioning':
        return 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40';
    }
  };

  const getCategoryIcon = (cat: ChallengeCategory) => {
    switch (cat) {
      case 'Skill':
        return <Target className="w-3 h-3" />;
      case 'Social':
        return <Users className="w-3 h-3" />;
      case 'Conditioning':
        return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div
      id="weekly-challenges-card"
      className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-6 md:p-8 rounded-[2.5rem] border border-lime-400/30 shadow-2xl space-y-6 relative overflow-hidden mt-4"
    >
      <div className="absolute top-0 right-0 w-72 h-72 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-lime-400 to-emerald-400 text-black rounded-2xl shadow-xl shadow-lime-400/20">
            <Trophy className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-3 py-0.5 bg-lime-400 text-black text-[10px] font-mono font-black rounded-full uppercase tracking-wider shadow">
                Weekly Active Tasks ⚡
              </span>
              <span className="text-xs text-indigo-300 font-mono font-bold">
                {completedCount} / {tasks.length} Completed
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight mt-1">
              Weekly Player Challenges & Rewards
            </h2>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-indigo-950/90 p-1 rounded-2xl border border-lime-400/30 text-xs font-mono shadow-inner">
            {(['all', 'Skill', 'Social', 'Conditioning'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveCategoryFilter(cat);
                }}
                className={`px-3 py-1.5 rounded-xl font-black uppercase transition text-[10px] flex items-center space-x-1 ${
                  activeCategoryFilter === cat
                    ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-black shadow-md'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                {cat !== 'all' && getCategoryIcon(cat as ChallengeCategory)}
                <span>{cat === 'all' ? 'All' : cat}</span>
              </button>
            ))}
          </div>

          <div className="flex bg-indigo-950/80 p-1 rounded-2xl border border-white/10 text-xs font-mono">
            {(['all', 'in_progress', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveStatusFilter(filter);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition uppercase text-[10px] ${
                  activeStatusFilter === filter
                    ? 'bg-indigo-800 text-white shadow'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                {filter === 'all'
                  ? 'All'
                  : filter === 'in_progress'
                  ? 'Active'
                  : 'Done'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-white/15 rounded-2xl text-xs font-black italic uppercase transition flex items-center space-x-1.5 shadow"
            title="Sync progress from your stat logs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-lime-400' : ''}`}
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="text-center py-8 relative z-10">
          <RefreshCw className="w-6 h-6 animate-spin text-lime-400 mx-auto" />
          <p className="text-xs text-indigo-300 mt-2 font-mono">
            Loading weekly challenges...
          </p>
        </div>
      )}

      {/* GRID */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-indigo-950/40 rounded-3xl border border-white/5 space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-sm font-bold text-white">
                {tasks.length === 0
                  ? 'No weekly challenges available.'
                  : 'No challenges match your filters.'}
              </p>
              {tasks.length > 0 && (
                <button
                  onClick={() => {
                    setActiveCategoryFilter('all');
                    setActiveStatusFilter('all');
                  }}
                  className="text-xs font-extrabold text-lime-400 hover:underline uppercase"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isFinished = task.completed;
              const percent = Math.min(
                100,
                Math.round((task.current / task.target) * 100)
              );

              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                    task.claimed
                      ? 'bg-indigo-950/50 border-lime-400/30 opacity-80'
                      : isFinished
                      ? 'bg-gradient-to-b from-indigo-950 to-indigo-900 border-lime-400 ring-2 ring-lime-400/40 shadow-xl'
                      : 'bg-indigo-950/80 border-white/10 hover:border-lime-400/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl p-2 bg-indigo-900/90 rounded-2xl border border-white/10 shadow-inner">
                          {task.icon}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">
                            {task.title}
                          </h3>
                          <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-black uppercase flex items-center space-x-1 ${getCategoryBadgeColor(
                                task.category
                              )}`}
                            >
                              {getCategoryIcon(task.category)}
                              <span>{task.category}</span>
                            </span>
                            {task.sportLabel && (
                              <span className="text-[9px] font-mono text-indigo-300 uppercase font-bold">
                                • {task.sportLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-black italic text-amber-300 bg-amber-400/15 px-2.5 py-1 rounded-xl border border-amber-400/30 font-mono shadow">
                        +{task.rewardXp} XP
                      </span>
                    </div>

                    <p className="text-xs text-indigo-200/80 font-medium leading-relaxed">
                      {task.description}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs font-mono font-bold">
                        <span className="text-indigo-200/80 text-[11px]">
                          Progress:
                        </span>
                        <span
                          className={
                            isFinished
                              ? 'text-lime-400 font-extrabold'
                              : 'text-white'
                          }
                        >
                          {task.current} / {task.target} {task.unit} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-indigo-900 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isFinished
                              ? 'bg-gradient-to-r from-lime-400 to-emerald-400 shadow-sm shadow-lime-400'
                              : 'bg-gradient-to-r from-amber-400 to-orange-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex flex-col space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {task.claimed ? (
                        <div className="flex-1 py-2 bg-lime-400/20 text-lime-300 font-black italic text-xs rounded-xl border border-lime-400/40 flex items-center justify-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-lime-400" />
                          <span>Claimed (+{task.rewardXp} XP)</span>
                        </div>
                      ) : isFinished ? (
                        <button
                          type="button"
                          onClick={() => handleClaimReward(task)}
                          disabled={claimingId === task.id}
                          className="flex-1 py-2.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-lime-400/20 hover:scale-105 transition flex items-center justify-center space-x-1.5 disabled:opacity-60"
                        >
                          {claimingId === task.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Claiming...</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4 stroke-[2.5]" />
                              <span>Claim +{task.rewardXp} XP 🔊</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2 w-full justify-between">
                          <button
                            type="button"
                            onClick={() => handleSimulateProgress(task)}
                            className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-white/15 text-xs font-bold uppercase rounded-xl transition"
                          >
                            +1 Progress
                          </button>
                          {onOpenStatLog && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onOpenStatLog();
                              }}
                              className="px-3 py-1.5 bg-lime-400/10 hover:bg-lime-400/20 text-lime-300 border border-lime-400/30 text-xs font-extrabold uppercase rounded-xl transition flex items-center space-x-1"
                            >
                              <span>Log Stats</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSharingTask(task);
                        }}
                        className="px-3 py-2 bg-indigo-900/90 hover:bg-indigo-800 text-lime-300 border border-lime-400/30 rounded-xl text-xs font-black italic uppercase transition flex items-center space-x-1 shrink-0 shadow"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SHARE MODAL */}
      <ShareGoalModal
        isOpen={sharingTask !== null}
        onClose={() => setSharingTask(null)}
        task={sharingTask}
        user={user}
      />
    </div>
  );
};