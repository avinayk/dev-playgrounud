// frontend/src/components/SportDrillsView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { AthleteProfile, SportType } from '../types';
import {
  Trophy, Zap, Clock, Target, CheckCircle2, Sparkles, Play,
  RotateCcw, Award, ChevronRight, Flame, ShieldCheck, Crown,
  Volume2, VolumeX, History, BarChart3, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import {
  saveDrillCompletionAPI,
  fetchDrillHistory,
  type DrillHistory,
} from '../services/drills.service';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
type DifficultyTier = 'Rookie' | 'Pro' | 'Legend';

interface TierConfig {
  name: DifficultyTier;
  targetMultiplier: number;
  xpMultiplier: number;
  color: string;
  badge: string;
}

interface Drill {
  id: string;
  name: string;
  sport: SportType;
  description: string;
  timeLimitSeconds: number;
  baseTargetCount: number;
  baseXpReward: number;
  unit: string;
  accentColor: string;
  badgeGoalName: string;
}

interface SportDrillsViewProps {
  user: AthleteProfile;
  onEarnXp?: (amount: number, source: string, referenceId?: string) => void | Promise<void>;
  onUpdateProfile?: (updated: Partial<AthleteProfile>) => void;
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const DIFFICULTY_TIERS: Record<DifficultyTier, TierConfig> = {
  Rookie: {
    name: 'Rookie',
    targetMultiplier: 1,
    xpMultiplier: 1,
    color: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60',
    badge: '🌱 Rookie',
  },
  Pro: {
    name: 'Pro',
    targetMultiplier: 1.5,
    xpMultiplier: 1.5,
    color: 'text-purple-300 border-purple-400/50 bg-purple-950/70',
    badge: '⚡ Pro',
  },
  Legend: {
    name: 'Legend',
    targetMultiplier: 2,
    xpMultiplier: 2.5,
    color: 'text-amber-300 border-amber-400/80 bg-amber-950/80',
    badge: '👑 Legend',
  },
};

/* ─── DRILLS CATALOG (Multi-Sport) ─── */
const ALL_DRILLS: Drill[] = [
  // VOLLEYBALL
  {
    id: 'vb_service_streak',
    name: 'Service Streak ⚡',
    sport: 'volleyball',
    description: 'Land precision jump serves before the timer expires.',
    timeLimitSeconds: 60,
    baseTargetCount: 10,
    baseXpReward: 350,
    unit: 'Aces',
    accentColor: 'from-amber-400 to-rose-500',
    badgeGoalName: 'Ace Striker (50 Aces)',
  },
  {
    id: 'vb_perfect_set',
    name: 'Perfect Set 🎯',
    sport: 'volleyball',
    description: 'Execute high-arc setting passes under time pressure.',
    timeLimitSeconds: 45,
    baseTargetCount: 12,
    baseXpReward: 300,
    unit: 'Assists',
    accentColor: 'from-cyan-400 to-indigo-500',
    badgeGoalName: 'Setting Maestro (30 Assists)',
  },
  {
    id: 'vb_backcourt_dig',
    name: 'Backcourt Dig 🛡️',
    sport: 'volleyball',
    description: 'React to incoming high-speed attacks and log clean digs.',
    timeLimitSeconds: 60,
    baseTargetCount: 15,
    baseXpReward: 400,
    unit: 'Digs',
    accentColor: 'from-lime-400 to-emerald-500',
    badgeGoalName: 'Backcourt Wall (500 Digs)',
  },
  // BASKETBALL
  {
    id: 'bball_free_throws',
    name: 'Free Throw Streak 🏀',
    sport: 'basketball',
    description: 'Sink consecutive free throws from the charity stripe.',
    timeLimitSeconds: 60,
    baseTargetCount: 10,
    baseXpReward: 300,
    unit: 'Swishes',
    accentColor: 'from-orange-400 to-red-500',
    badgeGoalName: 'Free Throw Machine',
  },
  {
    id: 'bball_3point',
    name: '3-Point Barrage 🎯',
    sport: 'basketball',
    description: 'Hit 3-pointers from beyond the arc under time pressure.',
    timeLimitSeconds: 90,
    baseTargetCount: 8,
    baseXpReward: 450,
    unit: 'Threes',
    accentColor: 'from-purple-400 to-pink-500',
    badgeGoalName: 'Sharpshooter',
  },
  // SOCCER
  {
    id: 'soccer_juggles',
    name: 'Juggle Mastery ⚽',
    sport: 'soccer',
    description: 'Keep the ball in the air with alternating touches.',
    timeLimitSeconds: 60,
    baseTargetCount: 30,
    baseXpReward: 400,
    unit: 'Juggles',
    accentColor: 'from-green-400 to-emerald-500',
    badgeGoalName: 'Juggling King',
  },
  {
    id: 'soccer_penalty',
    name: 'Penalty Precision 🥅',
    sport: 'soccer',
    description: 'Score penalty kicks with corner precision.',
    timeLimitSeconds: 60,
    baseTargetCount: 8,
    baseXpReward: 350,
    unit: 'Goals',
    accentColor: 'from-lime-400 to-green-500',
    badgeGoalName: 'Penalty Specialist',
  },
  // BASEBALL
  {
    id: 'baseball_batting',
    name: 'Batting Cage ⚾',
    sport: 'baseball',
    description: 'Take line-drive swings in the batting cage.',
    timeLimitSeconds: 60,
    baseTargetCount: 12,
    baseXpReward: 350,
    unit: 'Hits',
    accentColor: 'from-blue-400 to-indigo-500',
    badgeGoalName: 'Slugger',
  },
  // FOOTBALL
  {
    id: 'football_targets',
    name: 'Target Precision 🏈',
    sport: 'football',
    description: 'Throw spirals through targets at various distances.',
    timeLimitSeconds: 60,
    baseTargetCount: 10,
    baseXpReward: 400,
    unit: 'Hits',
    accentColor: 'from-amber-400 to-orange-500',
    badgeGoalName: 'QB Elite',
  },
  // PICKLEBALL
  {
    id: 'pickleball_dinks',
    name: 'Kitchen Dinks 🏓',
    sport: 'pickleball',
    description: 'Sustain a rally with soft dinks at the kitchen line.',
    timeLimitSeconds: 60,
    baseTargetCount: 20,
    baseXpReward: 300,
    unit: 'Dinks',
    accentColor: 'from-cyan-400 to-teal-500',
    badgeGoalName: 'Kitchen King',
  },
];

/* ═══════════════════════════════════════════
   AUDIO HELPER
   ═══════════════════════════════════════════ */
const playSoundEffect = (type: 'point' | 'success', isAudioMuted: boolean) => {
  if (isAudioMuted) return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'point') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.28);
      });
    }
  } catch {}
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export const SportDrillsView: React.FC<SportDrillsViewProps> = ({
  user,
  onEarnXp,
  onUpdateProfile,
}) => {
  const athleteId = (user as any)?.id;
  const userSport = ((user as any).primarySport || (user as any).primary_sport || 'volleyball') as SportType;

  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>(userSport);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>('Rookie');
  const [selectedDrill, setSelectedDrill] = useState<Drill>(ALL_DRILLS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDrill.timeLimitSeconds);
  const [currentScore, setCurrentScore] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [drillHistory, setDrillHistory] = useState<DrillHistory[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [completedModal, setCompletedModal] = useState<{
    drillName: string;
    tier: DifficultyTier;
    score: number;
    target: number;
    xpEarned: number;
    badgeName: string;
  } | null>(null);

  /* Filter drills by sport */
  const availableDrills = useMemo(() => {
    return ALL_DRILLS.filter(
      (d) => selectedSport === 'all' || d.sport === selectedSport
    );
  }, [selectedSport]);

  /* Set first drill when sport changes */
  useEffect(() => {
    if (availableDrills.length > 0 && !availableDrills.find((d) => d.id === selectedDrill.id)) {
      setSelectedDrill(availableDrills[0]);
      setCurrentScore(0);
      setTimeLeft(availableDrills[0].timeLimitSeconds);
      setIsRunning(false);
    }
  }, [availableDrills, selectedDrill.id]);

  /* Load drill history from DB */
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    (async () => {
      try {
        const history = await fetchDrillHistory(athleteId, {
          sport: selectedSport === 'all' ? undefined : selectedSport,
          limit: 10,
        });
        if (!cancelled) setDrillHistory(history);
      } catch (err) {
        console.warn('Could not load drill history:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [athleteId, selectedSport]);

  /* Computed target & XP */
  const currentTarget = Math.round(
    selectedDrill.baseTargetCount * DIFFICULTY_TIERS[selectedTier].targetMultiplier
  );
  const currentXpReward = Math.round(
    selectedDrill.baseXpReward * DIFFICULTY_TIERS[selectedTier].xpMultiplier
  );

  /* Timer */
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            checkDrillCompletion(currentScore, currentTarget, currentXpReward);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft, currentScore, currentTarget, currentXpReward]);

  /* Score point */
  const handleScorePoint = () => {
    if (!isRunning) return;
    const newScore = currentScore + 1;
    setCurrentScore(newScore);
    playSoundEffect('point', isAudioMuted);

    if (newScore >= currentTarget) {
      setIsRunning(false);
      checkDrillCompletion(newScore, currentTarget, currentXpReward);
    }
  };

  /* Start drill */
  const startDrill = (drill: Drill) => {
    setSelectedDrill(drill);
    setCurrentScore(0);
    setTimeLeft(drill.timeLimitSeconds);
    setIsRunning(true);
    setCompletedModal(null);
  };

  /* Reset */
  const resetDrill = () => {
    setIsRunning(false);
    setCurrentScore(0);
    setTimeLeft(selectedDrill.timeLimitSeconds);
    setCompletedModal(null);
  };

  /* ═══════════════════════════════════════════
     DRILL COMPLETION — XP awarded ONLY in backend
     ═══════════════════════════════════════════ */
  const checkDrillCompletion = async (
    finalScore: number,
    targetVal: number,
    xpVal: number
  ) => {
    if (finalScore < targetVal) return;
    if (!athleteId) return;
    if (isSaving) return;

    playSoundEffect('success', isAudioMuted);
    setIsSaving(true);

    try {
      // ✅ 1. Backend save (XP awarded HERE — single source of truth)
      const result = await saveDrillCompletionAPI(athleteId, {
        drillId: selectedDrill.id,
        drillName: selectedDrill.name,
        sport: selectedDrill.sport,
        tier: selectedTier,
        score: finalScore,
        target: targetVal,
        xpEarned: xpVal,
        unit: selectedDrill.unit,
      });

      // ✅ 2. Update frontend state from backend response (NO extra API call)
      onUpdateProfile?.({
        valuexp: result.newXp,
        xp: result.newXp,
        level: result.newLevel,
      } as any);

      // ❌ REMOVED: `onEarnXp` call (ye duplicate XP kar raha tha)
      // if (onEarnXp) {
      //   const referenceId = `drill_${selectedDrill.id}_${selectedTier}_${Date.now()}`;
      //   await onEarnXp(xpVal, `Completed ${selectedDrill.name} (${selectedTier})`, referenceId);
      // }

      // ✅ 3. Show success modal
      setCompletedModal({
        drillName: selectedDrill.name,
        tier: selectedTier,
        score: finalScore,
        target: targetVal,
        xpEarned: xpVal,
        badgeName: selectedDrill.badgeGoalName,
      });

      // ✅ 4. Reload drill history from DB
      try {
        const history = await fetchDrillHistory(athleteId, {
          sport: selectedSport === 'all' ? undefined : selectedSport,
          limit: 10,
        });
        setDrillHistory(history);
      } catch {}
    } catch (err) {
      console.error('Failed to save drill:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /* Chart data */
  const chartData = useMemo(() => {
    return [
      { name: 'Drills', current: drillHistory.length, target: 20, fill: '#84CC16' },
      { name: 'Rookie', current: drillHistory.filter((h) => h.tier === 'Rookie').length, target: 10, fill: '#06B6D4' },
      { name: 'Pro', current: drillHistory.filter((h) => h.tier === 'Pro').length, target: 10, fill: '#A855F7' },
      { name: 'Legend', current: drillHistory.filter((h) => h.tier === 'Legend').length, target: 5, fill: '#F59E0B' },
    ].map((d) => ({
      ...d,
      percent: Math.min(100, Math.round((d.current / d.target) * 100)),
    }));
  }, [drillHistory]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* SUCCESS MODAL */}
      {completedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`p-6 md:p-8 rounded-[2.5rem] max-w-lg w-full text-center space-y-6 relative overflow-hidden shadow-2xl ${
              completedModal.tier === 'Legend'
                ? 'bg-gradient-to-br from-amber-950 via-purple-950 to-indigo-950 border-4 border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.6)]'
                : completedModal.tier === 'Pro'
                ? 'bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 border-2 border-purple-400'
                : 'bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 border-2 border-lime-400'
            }`}
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-lime-400/20 rounded-full blur-3xl" />

            <div className="inline-flex items-center justify-center p-4 bg-amber-400 text-black rounded-3xl shadow-xl animate-bounce">
              {completedModal.tier === 'Legend' ? (
                <Crown className="w-12 h-12 stroke-[2.5]" />
              ) : (
                <Trophy className="w-10 h-10 stroke-[2.5]" />
              )}
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-amber-400 text-black font-black text-xs uppercase font-mono rounded-full inline-flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 fill-black" />
                <span>{completedModal.tier.toUpperCase()} CHAMPION</span>
              </span>
              <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white">
                {completedModal.drillName}
              </h2>
              <p className="text-xs text-indigo-200">
                {completedModal.score} / {completedModal.target} reps completed!
              </p>
            </div>

            <div className="bg-indigo-950/90 border border-white/20 rounded-2xl p-4 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs text-indigo-200 font-bold flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />
                  <span>XP EARNED</span>
                </span>
                <span className="text-xl font-black text-lime-400 font-mono">
                  +{completedModal.xpEarned} XP
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-200 font-bold flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>BADGE PROGRESS</span>
                </span>
                <span className="text-xs font-mono font-black text-cyan-300">
                  {completedModal.badgeName}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompletedModal(null)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-black font-black italic uppercase text-sm rounded-2xl shadow-xl transition"
            >
              Claim Rewards & Continue 🚀
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 p-6 md:p-8 rounded-[2.5rem] border-2 border-lime-400/40 shadow-2xl space-y-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-lime-400 text-black font-black text-[10px] uppercase font-mono rounded">
                SPORT DRILLS MODULE
              </span>
              <span className="text-xs text-indigo-200/80 font-bold">Multi-Sport Training</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white mt-1">
              Sport-Specific Skill Drills
            </h2>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
              Execute timed drills across all sports. Higher tiers = bigger XP multipliers!
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-3 rounded-2xl border transition flex items-center space-x-2 text-xs font-mono font-bold ${
                !isAudioMuted
                  ? 'bg-lime-400/20 border-lime-400 text-lime-300'
                  : 'bg-indigo-950 border-white/10 text-indigo-300/60'
              }`}
            >
              {!isAudioMuted ? <Volume2 className="w-5 h-5 text-lime-400" /> : <VolumeX className="w-5 h-5" />}
              <span>{isAudioMuted ? 'Muted' : 'Audio ON'}</span>
            </button>

            <div className="flex items-center space-x-3 bg-indigo-900/80 p-3 rounded-2xl border border-white/10">
              <Trophy className="w-5 h-5 text-lime-400" />
              <div>
                <span className="text-[10px] text-indigo-300 font-mono block">DRILLS DONE</span>
                <span className="text-lg font-black text-lime-400 font-mono">{drillHistory.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SPORT FILTER */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-indigo-200">SELECT SPORT:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['all', 'basketball', 'soccer', 'volleyball', 'baseball', 'football', 'pickleball'] as const).map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition shrink-0 ${
                  selectedSport === sport
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'bg-indigo-950 text-indigo-200 border border-white/10 hover:text-white'
                }`}
              >
                {sport === 'all' ? '🏆 All Sports' : `${sport.charAt(0).toUpperCase() + sport.slice(1)}`}
              </button>
            ))}
          </div>
        </div>

        {/* TIER SELECTOR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-indigo-200 font-bold">DIFFICULTY TIER:</span>
            <span className="text-lime-300">Higher Tiers = XP Multipliers!</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['Rookie', 'Pro', 'Legend'] as DifficultyTier[]).map((tierKey) => {
              const tierConf = DIFFICULTY_TIERS[tierKey];
              const isSelected = selectedTier === tierKey;
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => {
                    setSelectedTier(tierKey);
                    resetDrill();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isSelected
                      ? `${tierConf.color} ring-2 ring-lime-400 shadow-xl scale-[1.02]`
                      : 'bg-indigo-950/60 border-white/10 text-indigo-200/70 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{tierConf.badge}</span>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-black/40 rounded">
                      {tierConf.xpMultiplier}x
                    </span>
                  </div>
                  <span className="text-[11px] font-mono mt-1 opacity-80">
                    Target: {tierConf.targetMultiplier}x
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE DRILL ARENA */}
        <div className="bg-indigo-900/60 p-6 rounded-[2rem] border border-lime-400/30 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-lime-300 uppercase">ACTIVE:</span>
                <span className="px-2 py-0.5 bg-lime-400 text-black text-[10px] font-mono font-black rounded uppercase">
                  {selectedTier} Tier
                </span>
              </div>
              <h3 className="text-xl font-black italic text-white uppercase mt-1">{selectedDrill.name}</h3>
            </div>

            <div className="flex items-center space-x-3 bg-indigo-950 px-4 py-2 rounded-2xl border border-white/10 font-mono">
              <div className="flex items-center space-x-1.5 text-rose-400">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="text-lg font-black">{timeLeft}s</span>
              </div>
              <span className="text-white/30">|</span>
              <div className="flex items-center space-x-1.5 text-lime-400">
                <Target className="w-4 h-4" />
                <span className="text-lg font-black">{currentScore} / {currentTarget}</span>
              </div>
              <span className="text-white/30">|</span>
              <span className="text-amber-300 text-sm font-black">+{currentXpReward} XP</span>
            </div>
          </div>

          <div className="bg-indigo-950/80 p-6 rounded-2xl border border-white/10 text-center space-y-5">
            <p className="text-xs text-indigo-200 max-w-md mx-auto">{selectedDrill.description}</p>

            {!isRunning ? (
              <button
                type="button"
                onClick={() => startDrill(selectedDrill)}
                className="px-6 py-3.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-2xl shadow-xl transition inline-flex items-center space-x-2"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>Start {selectedTier} Drill ({selectedDrill.timeLimitSeconds}s)</span>
              </button>
            ) : (
              <div className="space-y-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={handleScorePoint}
                  className="w-full py-4 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 text-black font-black italic uppercase text-base rounded-2xl shadow-2xl transition transform active:scale-95 flex items-center justify-center space-x-2 border-2 border-lime-300"
                >
                  <Flame className="w-6 h-6 fill-black" />
                  <span>TAP +1 {selectedDrill.unit.toUpperCase()}</span>
                </button>
                <button
                  type="button"
                  onClick={resetDrill}
                  className="text-xs text-indigo-300 hover:text-white underline font-mono block mx-auto"
                >
                  Reset Drill
                </button>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-indigo-300">
                <span>Progress ({currentTarget} {selectedDrill.unit})</span>
                <span>{Math.round((currentScore / currentTarget) * 100)}%</span>
              </div>
              <div className="w-full bg-indigo-900 h-3 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-lime-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentScore / currentTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* DRILL PRESETS */}
        <div className="space-y-3">
          <h4 className="text-sm font-black italic uppercase text-white tracking-wider font-mono">
            SELECT DRILL ({availableDrills.length} available)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableDrills.map((drill) => {
              const isSelected = selectedDrill.id === drill.id;
              const drillTarget = Math.round(drill.baseTargetCount * DIFFICULTY_TIERS[selectedTier].targetMultiplier);
              const drillXp = Math.round(drill.baseXpReward * DIFFICULTY_TIERS[selectedTier].xpMultiplier);

              return (
                <div
                  key={drill.id}
                  onClick={() => startDrill(drill)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950 border-lime-400 shadow-xl ring-2 ring-lime-400/40'
                      : 'bg-indigo-900/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-lime-300 font-mono uppercase">
                      ⏱️ {drill.timeLimitSeconds}s
                    </span>
                    <span className="px-2.5 py-1 bg-lime-400/20 text-lime-300 font-mono font-black text-xs rounded-xl border border-lime-400/30">
                      +{drillXp} XP
                    </span>
                  </div>
                  <h5 className="font-extrabold text-white text-base mb-1">{drill.name}</h5>
                  <p className="text-xs text-indigo-200/70 mb-3 line-clamp-2">{drill.description}</p>
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10 text-indigo-300">
                    <span>Target: {drillTarget} {drill.unit}</span>
                    <span className="text-lime-400 font-bold flex items-center">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART + HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-white/10">
          <div className="lg:col-span-6 bg-indigo-950/80 p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-lime-400" />
              <h4 className="text-sm font-black italic uppercase text-white font-mono">
                Overall Drill Completion
              </h4>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#A3E635', borderRadius: '0.75rem', color: '#FFF' }}
                    formatter={(val: any) => [`${val}%`, 'Progress']}
                  />
                  <Bar dataKey="percent" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 bg-indigo-950/80 p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-lime-400" />
                <h4 className="text-sm font-black italic uppercase text-white font-mono">
                  Recent Drill History
                </h4>
              </div>
              <span className="text-[10px] font-mono text-indigo-300">Last 10 Attempts</span>
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              {drillHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-indigo-300/60">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No drills completed yet</p>
                  <p className="text-[10px] mt-1">Complete a drill to see history here</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase text-indigo-300 font-mono">
                      <th className="pb-2">Drill</th>
                      <th className="pb-2">Tier</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2 text-right">XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {drillHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="py-2.5 font-bold text-white">
                          <div>{item.drillName}</div>
                          <div className="text-[10px] text-indigo-300/60 font-mono">
                            {new Date(item.completedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-black rounded ${DIFFICULTY_TIERS[item.tier as DifficultyTier]?.color || ''}`}>
                            {item.tier}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-cyan-300 font-bold">
                          {item.score}/{item.target}
                        </td>
                        <td className="py-2.5 text-right font-black font-mono text-lime-400">
                          +{item.xpEarned} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportDrillsView;