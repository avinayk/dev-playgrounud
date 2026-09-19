// components/VolleyballChallengesView.tsx
import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Zap,
  Clock,
  Target,
  CheckCircle2,
  Sparkles,
  Play,
  RotateCcw,
  Award,
  ChevronRight,
  Flame,
  ShieldCheck,
  Crown,
  Volume2,
  VolumeX,
  History,
  BarChart3,
  Star,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { AthleteProfile } from '../types';

interface VolleyballChallengesViewProps {
  user: AthleteProfile;
  onEarnXp?: (amount: number, reason: string) => void;
  onUpdateProfile?: (updated: Partial<AthleteProfile>) => void;
}

type DifficultyTier = 'Rookie' | 'Pro' | 'Legend';

interface TierConfig {
  name: DifficultyTier;
  targetMultiplier: number;
  xpMultiplier: number;
  color: string;
  badge: string;
}

const DIFFICULTY_TIERS: Record<DifficultyTier, TierConfig> = {
  Rookie: {
    name: 'Rookie',
    targetMultiplier: 1,
    xpMultiplier: 1,
    color: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60',
    badge: '🌱 Rookie Tier',
  },
  Pro: {
    name: 'Pro',
    targetMultiplier: 1.5,
    xpMultiplier: 1.5,
    color: 'text-purple-300 border-purple-400/50 bg-purple-950/70',
    badge: '⚡ Pro Tier',
  },
  Legend: {
    name: 'Legend',
    targetMultiplier: 2,
    xpMultiplier: 2.5,
    color: 'text-amber-300 border-amber-400/80 bg-amber-950/80',
    badge: '👑 Legend Tier',
  },
};

interface Drill {
  id: string;
  name: string;
  description: string;
  timeLimitSeconds: number;
  baseTargetCount: number;
  baseXpReward: number;
  unit: string;
}

const DRILL_PRESETS: Drill[] = [
  {
    id: 'drill_service_streak',
    name: 'Service Streak Challenge ⚡',
    description: 'Land precision jump serves before the timer expires!',
    timeLimitSeconds: 60,
    baseTargetCount: 10,
    baseXpReward: 350,
    unit: 'Aces',
  },
  {
    id: 'drill_perfect_set',
    name: 'Perfect Set Drill 🎯',
    description: 'Execute high-arc setting passes under time pressure.',
    timeLimitSeconds: 45,
    baseTargetCount: 12,
    baseXpReward: 300,
    unit: 'Assists',
  },
  {
    id: 'drill_backcourt_dig',
    name: 'Backcourt Dig Reflex 🛡️',
    description: 'React to incoming high-speed attacks and log clean digs.',
    timeLimitSeconds: 60,
    baseTargetCount: 15,
    baseXpReward: 400,
    unit: 'Digs',
  },
];

export const VolleyballChallengesView: React.FC<
  VolleyballChallengesViewProps
> = ({ user, onEarnXp, onUpdateProfile }) => {
  const [selectedDrill, setSelectedDrill] = useState<Drill>(DRILL_PRESETS[0]);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>('Rookie');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDrill.timeLimitSeconds);
  const [currentScore, setCurrentScore] = useState(0);
  const [completedMsg, setCompletedMsg] = useState<string | null>(null);

  const currentTarget = Math.round(
    selectedDrill.baseTargetCount * DIFFICULTY_TIERS[selectedTier].targetMultiplier
  );
  const currentXpReward = Math.round(
    selectedDrill.baseXpReward * DIFFICULTY_TIERS[selectedTier].xpMultiplier
  );

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            checkCompletion(currentScore);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft, currentScore]);

  const handleScorePoint = () => {
    if (!isRunning) return;
    const next = currentScore + 1;
    setCurrentScore(next);

    if (next >= currentTarget) {
      setIsRunning(false);
      checkCompletion(next);
    }
  };

  const startDrill = (drill: Drill) => {
    setSelectedDrill(drill);
    setCurrentScore(0);
    setTimeLeft(drill.timeLimitSeconds);
    setIsRunning(true);
    setCompletedMsg(null);
  };

  const resetDrill = () => {
    setIsRunning(false);
    setCurrentScore(0);
    setTimeLeft(selectedDrill.timeLimitSeconds);
    setCompletedMsg(null);
  };

  const checkCompletion = (finalScore: number) => {
    if (finalScore >= currentTarget) {
      if (onEarnXp) {
        onEarnXp(
          currentXpReward,
          `Completed ${selectedDrill.name} (${selectedTier})`
        );
      }
      if (onUpdateProfile) {
        onUpdateProfile({
          valuexp: ((user as any).valuexp ?? 0) + currentXpReward,
        } as any);
      }
      setCompletedMsg(
        `🎉 Drill Complete! +${currentXpReward} XP awarded.`
      );
      setTimeout(() => setCompletedMsg(null), 4000);
    }
  };

  const chartData = [
    { name: 'Aces', current: 12, target: 50, fill: '#F59E0B' },
    { name: 'Sets', current: 18, target: 30, fill: '#06B6D4' },
    { name: 'Digs', current: 28, target: 100, fill: '#84CC16' },
    { name: 'Blocks', current: 15, target: 25, fill: '#A855F7' },
  ];

  return (
    <div className="space-y-6">
      {completedMsg && (
        <div className="p-3 bg-lime-400 text-black font-black text-xs uppercase rounded-xl shadow-lg border border-lime-300 font-mono flex items-center justify-between">
          <span>{completedMsg}</span>
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 p-6 md:p-8 rounded-[2.5rem] border-2 border-lime-400/40 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-lime-400 text-black font-black text-[10px] uppercase font-mono rounded">
                VOLLEYBALL DRILLS
              </span>
              <span className="text-xs text-indigo-200/80 font-bold">
                Weekly Bonus XP
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white mt-1">
              Sport Drills & Training
            </h2>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
              Execute timed drills. Pick a tier for XP multipliers.
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
              {!isAudioMuted ? (
                <Volume2 className="w-5 h-5 text-lime-400" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
              <span>{isAudioMuted ? 'Muted' : 'Audio ON'}</span>
            </button>

            <div className="flex items-center space-x-3 bg-indigo-900/80 p-3 rounded-2xl border border-white/10">
              <Trophy className="w-5 h-5 text-lime-400" />
              <div>
                <span className="text-[10px] text-indigo-300 font-mono block">
                  DRILLS DONE
                </span>
                <span className="text-lg font-black text-lime-400 font-mono">
                  {(user as any).volleyballDrillCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-indigo-200 font-bold">
              SELECT DIFFICULTY TIER:
            </span>
            <span className="text-lime-300">Higher = more XP</span>
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
                    <span className="font-extrabold text-sm">
                      {tierConf.badge}
                    </span>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-black/40 rounded">
                      {tierConf.xpMultiplier}x XP
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Drill */}
        <div className="bg-indigo-900/60 p-6 rounded-[2rem] border border-lime-400/30 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-lime-300 uppercase">
                ACTIVE: {selectedTier} Tier
              </span>
              <h3 className="text-xl font-black italic text-white uppercase mt-1">
                {selectedDrill.name}
              </h3>
            </div>

            <div className="flex items-center space-x-3 bg-indigo-950 px-4 py-2 rounded-2xl border border-white/10 font-mono">
              <div className="flex items-center space-x-1.5 text-rose-400">
                <Clock className="w-4 h-4" />
                <span className="text-lg font-black">{timeLeft}s</span>
              </div>
              <span className="text-white/30">|</span>
              <div className="flex items-center space-x-1.5 text-lime-400">
                <Target className="w-4 h-4" />
                <span className="text-lg font-black">
                  {currentScore} / {currentTarget}
                </span>
              </div>
              <span className="text-white/30">|</span>
              <span className="text-amber-300 text-sm font-black">
                +{currentXpReward} XP
              </span>
            </div>
          </div>

          <div className="bg-indigo-950/80 p-6 rounded-2xl border border-white/10 text-center space-y-5">
            <p className="text-xs text-indigo-200 max-w-md mx-auto">
              {selectedDrill.description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={() => startDrill(selectedDrill)}
                  className="px-6 py-3.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-2xl shadow-xl transition flex items-center space-x-2"
                >
                  <Play className="w-5 h-5 fill-black" />
                  <span>Start {selectedTier} Drill</span>
                </button>
              ) : (
                <div className="space-y-3 w-full max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={handleScorePoint}
                    className="w-full py-4 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 text-black font-black italic uppercase text-base rounded-2xl shadow-2xl transition transform active:scale-95 flex items-center justify-center space-x-2 border-2 border-lime-300"
                  >
                    <Flame className="w-6 h-6 fill-black" />
                    <span>TAP TO LOG +1</span>
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
            </div>

            {/* Progress */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-indigo-300">
                <span>
                  Progress toward {currentTarget} {selectedDrill.unit}
                </span>
                <span>
                  {Math.round((currentScore / currentTarget) * 100)}%
                </span>
              </div>
              <div className="w-full bg-indigo-900 h-3 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-lime-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentScore / currentTarget) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Drill Presets */}
        <div className="space-y-3">
          <h4 className="text-sm font-black italic uppercase text-white tracking-wider font-mono">
            SELECT DRILL TYPE
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DRILL_PRESETS.map((drill) => {
              const isSelected = selectedDrill.id === drill.id;
              const drillTarget = Math.round(
                drill.baseTargetCount *
                  DIFFICULTY_TIERS[selectedTier].targetMultiplier
              );
              const drillXp = Math.round(
                drill.baseXpReward *
                  DIFFICULTY_TIERS[selectedTier].xpMultiplier
              );

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

                  <h5 className="font-extrabold text-white text-base mb-1">
                    {drill.name}
                  </h5>
                  <p className="text-xs text-indigo-200/70 mb-3">
                    {drill.description}
                  </p>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10 text-indigo-300">
                    <span>
                      Target: {drillTarget} {drill.unit}
                    </span>
                    <span className="text-lime-400 font-bold flex items-center space-x-1">
                      <span>Select</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Chart */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-lime-400" />
            <h4 className="text-sm font-black italic uppercase text-white font-mono">
              Overall Drill Category Completion (%)
            </h4>
          </div>

          <div className="h-60 w-full bg-indigo-950/80 p-4 rounded-2xl border border-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#A3E635',
                    borderRadius: '0.75rem',
                    color: '#FFF',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Progress']}
                />
                <Bar dataKey="current" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolleyballChallengesView;