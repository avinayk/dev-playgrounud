// frontend/src/components/StreakCalendar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  ShieldCheck,
  Calendar,
  Trophy,
  Zap,
  Clock,
  Info,
  Sparkles,
  CheckCircle2,
  Loader2,
  Award,
} from 'lucide-react';
import type { AthleteProfile } from '../types';
import {
  fetchStreakStatus,
  checkInAPI,
  purchaseFreezeAPI,
  type StreakStatus,
} from '../services/streak.service';

interface StreakCalendarProps {
  user: AthleteProfile;
  onUpdateProfile?: (updated: Partial<AthleteProfile>) => void;
  onEarnXp?: (amount: number, source: string) => void;
  freezeCostXp?: number;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  user,
  onUpdateProfile,
  onEarnXp,
  freezeCostXp = 250,
}) => {
  const athleteId = (user as any)?.id;
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    dateStr: string;
    status: 'checked' | 'frozen' | 'missed' | 'today';
    dayLabel: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  /* ═══════════════════════════════════════════
     Load streak status from DB
     ═══════════════════════════════════════════ */
  const loadStatus = useCallback(async () => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const data = await fetchStreakStatus(athleteId);
      setStatus(data);
    } catch (err) {
      console.error('Failed to load streak:', err);
      showToast('Failed to load streak status', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  /* ═══════════════════════════════════════════
     Daily check-in
     ═══════════════════════════════════════════ */
  const handleCheckIn = async () => {
    if (!athleteId || isCheckingIn) return;
    if (status?.hasCheckedInToday) {
      showToast('✅ Already checked in today!', 'info');
      return;
    }

    setIsCheckingIn(true);
    try {
      const result = await checkInAPI(athleteId);

      if (result.alreadyCheckedIn) {
        showToast('✅ Already checked in today!', 'info');
      } else {
        showToast(
          `🔥 +${result.xpAwarded} XP! Streak: ${result.newStreak} days`,
          'success'
        );
        // Notify parent to update XP state
        onEarnXp?.(result.xpAwarded, 'Daily Check-in');
        onUpdateProfile?.({
          valuexp: result.newXp,
          xp: result.newXp,
          level: result.newLevel,
          dailyStreak: result.newStreak,
        } as any);
      }

      await loadStatus();
    } catch (err: any) {
      showToast(err?.message || 'Check-in failed', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  /* ═══════════════════════════════════════════
     Purchase streak freeze
     ═══════════════════════════════════════════ */
  const handleBuyStreakFreeze = async () => {
    if (!athleteId || isPurchasing) return;
    const currentXp = (user as any)?.valuexp ?? (user as any)?.xp ?? 0;
    if (currentXp < freezeCostXp) {
      showToast(`⚠️ Need at least ${freezeCostXp} XP to buy a freeze`, 'error');
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await purchaseFreezeAPI(athleteId, freezeCostXp);
      showToast(
        `🛡️ Streak Freeze purchased! You have ${result.freezeCount} token(s).`,
        'success'
      );
      onUpdateProfile?.({ valuexp: result.newXp } as any);
      await loadStatus();
    } catch (err: any) {
      showToast(err?.message || 'Purchase failed', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  /* ═══════════════════════════════════════════
     Build 30-day calendar
     ═══════════════════════════════════════════ */
  const todayStr = new Date().toISOString().split('T')[0];
  const checkInHistory = status?.checkInHistory ?? [];
  const freezeHistory = status?.freezeHistory ?? [];

  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const index = 29 - i;
    const d = new Date();
    d.setDate(d.getDate() - index);
    const dateStr = d.toISOString().split('T')[0];

    const isToday = dateStr === todayStr;
    const isCheckedIn = checkInHistory.includes(dateStr);
    const isFrozen = freezeHistory.includes(dateStr);

    let dayStatus: 'checked' | 'frozen' | 'missed' = 'missed';
    if (isCheckedIn) dayStatus = 'checked';
    else if (isFrozen) dayStatus = 'frozen';

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return { dateStr, dayName, monthDay, isToday, status: dayStatus };
  });

  const totalCheckedIn30Days = calendarDays.filter(
    (d) => d.status === 'checked' || d.status === 'frozen'
  ).length;
  const consistencyPercent = Math.round((totalCheckedIn30Days / 30) * 100);

  const dailyStreak = status?.dailyStreak ?? 0;
  const longestStreak = status?.longestStreak ?? 0;
  const freezeCount = status?.streakFreezeCount ?? 0;
  const hasCheckedInToday = status?.hasCheckedInToday ?? false;

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="bg-indigo-950/90 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-white">
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOAST */}
      {toastMessage && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn border ${
            toastMessage.type === 'success'
              ? 'bg-lime-400/20 border-lime-400/50 text-lime-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
              : 'bg-indigo-900 border-indigo-400/50 text-indigo-200'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-black rounded-2xl shadow-lg shrink-0">
            <Flame className="w-8 h-8 fill-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
                30-DAY CONSISTENCY 🔥
              </span>
              <span className="text-xs text-indigo-200/80 font-bold">
                {consistencyPercent}% Check-in Rate
              </span>
            </div>
            <h3 className="text-2xl font-black italic uppercase text-white tracking-tight mt-1">
              Streak & Login Calendar
            </h3>
            <p className="text-xs text-indigo-200/70 mt-0.5">
              Check in daily to earn +100 XP and build your streak.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {/* CHECK-IN BUTTON */}
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isCheckingIn || hasCheckedInToday || isLoading}
            className={`px-5 py-3 font-black italic uppercase text-xs rounded-2xl shadow-xl transition flex items-center justify-center space-x-2 shrink-0 ${
              hasCheckedInToday
                ? 'bg-lime-400/20 text-lime-300 border border-lime-400/50 cursor-default'
                : 'bg-gradient-to-r from-lime-400 to-emerald-400 hover:scale-105 active:scale-95 text-black'
            } disabled:opacity-60`}
          >
            {isCheckingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasCheckedInToday ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Flame className="w-4 h-4 fill-current" />
            )}
            <span>
              {isCheckingIn
                ? 'Checking in...'
                : hasCheckedInToday
                ? 'Checked In Today ✓'
                : 'Daily Check-In (+100 XP)'}
            </span>
          </button>

          {/* BUY FREEZE BUTTON */}
          <button
            type="button"
            onClick={handleBuyStreakFreeze}
            disabled={isPurchasing || isLoading}
            className="px-5 py-3 bg-gradient-to-r from-sky-400 via-teal-300 to-sky-400 hover:scale-105 active:scale-95 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-sky-400/20 flex items-center justify-center space-x-2 transition shrink-0 disabled:opacity-60"
          >
            {isPurchasing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 fill-black" />
            )}
            <span>Buy Freeze ({freezeCostXp} XP)</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 relative z-10">
        <div className="p-4 bg-indigo-900/60 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-xs text-orange-400 font-extrabold uppercase">
            <Flame className="w-4 h-4 fill-orange-400" />
            <span>Active Streak</span>
          </div>
          <p className="text-2xl font-black italic text-white">
            {isLoading ? '—' : dailyStreak}{' '}
            <span className="text-xs font-normal text-indigo-300/80">Days</span>
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-extrabold uppercase">
            <Trophy className="w-4 h-4 fill-amber-400" />
            <span>Best Record</span>
          </div>
          <p className="text-2xl font-black italic text-white">
            {isLoading ? '—' : longestStreak}{' '}
            <span className="text-xs font-normal text-indigo-300/80">Days</span>
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 border border-sky-400/30 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-xs text-sky-300 font-extrabold uppercase">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Streak Freezes</span>
          </div>
          <p className="text-2xl font-black italic text-sky-300">
            {isLoading ? '—' : freezeCount}{' '}
            <span className="text-xs font-normal text-sky-200/70">Tokens</span>
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 border border-lime-400/30 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-xs text-lime-400 font-extrabold uppercase">
            <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />
            <span>30D Activity</span>
          </div>
          <p className="text-2xl font-black italic text-lime-300">
            {isLoading ? '—' : totalCheckedIn30Days}{' '}
            <span className="text-xs font-normal text-lime-200/70">/ 30 Days</span>
          </p>
        </div>
      </div>

      {/* HEATMAP */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-300">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>30-Day Login Matrix</span>
          </span>
          <span className="text-[10px] text-indigo-300/60 font-mono">
            29 Days Ago → Today
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center bg-indigo-900/40 rounded-3xl border border-white/10">
            <Loader2 className="w-6 h-6 animate-spin text-lime-400 mx-auto mb-2" />
            <p className="text-xs text-indigo-300">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2 p-4 bg-indigo-900/40 rounded-3xl border border-white/10">
            {calendarDays.map((day) => {
              let bgClass =
                'bg-indigo-950/80 border-white/10 text-indigo-400/60';
              let icon = null;

              if (day.status === 'checked') {
                bgClass =
                  'bg-gradient-to-tr from-lime-500/30 to-emerald-500/40 border-lime-400/60 text-lime-300 shadow-md shadow-lime-400/10';
                icon = <Flame className="w-3.5 h-3.5 text-lime-400 fill-lime-400" />;
              } else if (day.status === 'frozen') {
                bgClass =
                  'bg-sky-500/30 border-sky-400/60 text-sky-300 shadow-md shadow-sky-400/10';
                icon = <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />;
              }

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDay({
                      dateStr: day.dateStr,
                      status: day.isToday ? 'today' : day.status,
                      dayLabel: `${day.dayName}, ${day.monthDay}`,
                    })
                  }
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between h-16 transition-all transform hover:scale-110 ${bgClass} ${
                    day.isToday
                      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-indigo-950 animate-pulse'
                      : ''
                  }`}
                  title={`${day.dayName}, ${day.monthDay}: ${day.status}`}
                >
                  <span className="text-[9px] font-mono font-bold uppercase">
                    {day.dayName}
                  </span>
                  <div className="my-0.5">
                    {icon || <span className="w-2 h-2 rounded-full bg-white/20" />}
                  </div>
                  <span className="text-[10px] font-black">
                    {day.monthDay.split(' ')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 flex-wrap text-xs font-bold text-indigo-200 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-lime-400/40 border border-lime-400" />
            <span>Checked In 🔥</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-sky-400/40 border border-sky-400" />
            <span>Streak Freeze Used 🛡️</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-indigo-950 border border-white/20" />
            <span>Missed Day</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded border-2 border-amber-400 bg-amber-400/20" />
            <span>Today ⭐</span>
          </div>
        </div>
      </div>

      {/* SELECTED DAY */}
      {selectedDay && (
        <div className="p-4 bg-indigo-900 border border-amber-400/40 rounded-2xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                {selectedDay.dayLabel} ({selectedDay.dateStr})
              </p>
              <p className="text-indigo-200/80">
                {selectedDay.status === 'checked' &&
                  '🔥 Check-in complete! Streak incremented.'}
                {selectedDay.status === 'frozen' &&
                  '🛡️ Streak Freeze used — streak preserved.'}
                {selectedDay.status === 'missed' && '⚪ No activity logged.'}
                {selectedDay.status === 'today' &&
                  '⭐ Today! Click "Daily Check-In" to earn +100 XP.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-xs text-indigo-300 hover:text-white font-bold underline shrink-0 ml-2"
          >
            Close
          </button>
        </div>
      )}

      {/* INFO */}
      <div className="p-4 bg-sky-950/40 border border-sky-500/20 rounded-2xl flex items-start space-x-3 text-xs text-sky-200">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-sky-300 font-bold">How Streak Freeze Works:</strong>{' '}
          If you miss a day, an active Streak Freeze token will automatically
          consume itself on your next login, preventing your streak from
          resetting to 1.
        </p>
      </div>
    </div>
  );
};

export default StreakCalendar;