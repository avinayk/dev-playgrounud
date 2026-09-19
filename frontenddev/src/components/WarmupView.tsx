// components/WarmupView.tsx
import React, { useEffect, useState } from 'react';
import { AthleteProfile } from '../types';
import { ProTipCard } from './ProTipCard';
import { SmartWarmup } from './SmartWarmup';
import { Flame, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import {
  fetchChallenges,
  type Challenge,
} from '../services/challenge.service';

interface WarmupViewProps {
  user: AthleteProfile;
  onEarnXp?: (amount: number, source: string) => void;
  onOpenStatLog?: () => void;
  onNavigateToAnalytics?: () => void;
}

export const WarmupView: React.FC<WarmupViewProps> = ({
  user,
  onEarnXp,
  onOpenStatLog,
  onNavigateToAnalytics,
}) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [challengesError, setChallengesError] = useState<string | null>(null);

  /* ─── Load challenges ─── */
  const loadChallenges = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoadingChallenges(true);
      setChallengesError(null);
      const data = await fetchChallenges(user.id, user.primary_sport);
      setChallenges(data);
    } catch (err) {
      console.error('❌ Load challenges:', err);
      setChallengesError(
        err instanceof Error ? err.message : 'Failed to load challenges'
      );
    } finally {
      setLoadingChallenges(false);
    }
  };

  useEffect(() => {
    loadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  /* ─── Locate warmup challenges ─── */
  const dailyWarmupChallenge =
    challenges.find((c) => c.id === 'ch_daily_smartwarmup') ?? null;
  const weeklyWarmupChallenge =
    challenges.find((c) => c.id === 'ch_weekly_smartwarmup') ?? null;

  /* ─── Header stats ─── */
  const dailyCompletedCount =
    dailyWarmupChallenge?.isCompleted === true ? 1 : 0;
  const dailyTotalCount = dailyWarmupChallenge ? 1 : 0;

  const totalXpAvailable =
    (dailyWarmupChallenge && !dailyWarmupChallenge.isCompleted
      ? dailyWarmupChallenge.xpReward
      : 0) +
    (weeklyWarmupChallenge && !weeklyWarmupChallenge.isCompleted
      ? weeklyWarmupChallenge.xpReward
      : 0);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6">
      {/* ═══════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-[2.5rem] border border-lime-400/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="px-3 py-1 bg-lime-400/20 text-lime-300 font-mono text-xs font-black uppercase rounded-full border border-lime-400/40 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-lime-400 text-lime-400" />
                DAILY / WEEKLY WARMUP
              </span>
              <span className="px-2.5 py-0.5 bg-indigo-900/80 text-indigo-200 text-xs font-bold rounded-full border border-white/10">
                +{totalXpAvailable} XP Available
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase text-white tracking-wide">
              Warmup & Challenges
            </h1>
            <p className="text-indigo-200/90 text-sm max-w-2xl font-medium leading-relaxed">
              Complete the daily warmup to earn XP and climb the leaderboard.
              The daily challenge resets at midnight and the weekly challenge
              resets every Monday.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
            <div className="p-4 bg-indigo-900/70 border border-white/10 rounded-2xl flex items-center space-x-3 text-white shadow-inner">
              <div className="p-2.5 bg-lime-400 text-black rounded-xl font-black">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold block">
                  Completed Today
                </span>
                <span className="text-sm font-black italic text-lime-400">
                  {dailyCompletedCount}/{dailyTotalCount} ⚡
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          1. AI PRO-TIP
          ═══════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-lime-400" />
            <h2 className="text-lg font-black italic uppercase text-white tracking-wide">
              AI Coach Insights & Pro-Tips
            </h2>
          </div>
          <span className="text-xs text-indigo-300 font-mono font-semibold">
            Updated based on recent stat history
          </span>
        </div>

        <ProTipCard
          user={user}
          onNavigateToAnalytics={onNavigateToAnalytics || (() => {})}
        />
      </section>

      {/* ═══════════════════════════════════════════
          2. LOADING / ERROR STATES
          ═══════════════════════════════════════════ */}
      {loadingChallenges && (
        <div className="flex items-center justify-center py-6 text-indigo-300 bg-indigo-950/40 rounded-2xl border border-white/10">
          <span className="w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mr-3" />
          <p className="font-bold text-sm">Loading warmup challenges...</p>
        </div>
      )}

      {!loadingChallenges && challengesError && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-5 text-center">
          <p className="text-red-300 font-bold mb-2 text-sm">
            ❌ {challengesError}
          </p>
          <button
            onClick={() => loadChallenges()}
            className="mt-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl text-xs font-bold transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          3. 3-MINUTE WARMUP (XP engine)
          ═══════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-lg font-black italic uppercase text-white tracking-wide">
              3-Minute Dynamic Warmup Engine
            </h2>
          </div>
          <span className="text-xs text-lime-400 font-mono font-bold px-2.5 py-0.5 bg-lime-400/10 rounded-full border border-lime-400/30">
            +{dailyWarmupChallenge?.xpReward ?? 50} XP Daily Bonus
          </span>
        </div>

        <SmartWarmup
          user={user}
          onEarnXp={onEarnXp}
          onOpenStatLog={onOpenStatLog}
          dailyWarmupChallenge={dailyWarmupChallenge}
          weeklyWarmupChallenge={weeklyWarmupChallenge}
          onChallengeCompleted={() => loadChallenges(true)}
        />
      </section>
    </div>
  );
};

export default WarmupView;