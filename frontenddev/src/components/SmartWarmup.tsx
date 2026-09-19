// components/SmartWarmup.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AthleteProfile, SportType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  completeChallenge,
  type Challenge,
} from '../services/challenge.service';
import toast from 'react-hot-toast';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Flame,
  Sparkles,
  CheckCircle2,
  Zap,
  Loader2,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface StretchExercise {
  id: string;
  name: string;
  durationSeconds: number;
  muscleGroups: string[];
  instructions: string;
  icon: string;
}

interface SportWarmupRoutine {
  sport: SportType;
  title: string;
  focusArea: string;
  exercises: StretchExercise[];
}

/* ═══════════════════════════════════════════
   WARMUP ROUTINES (unchanged)
   ═══════════════════════════════════════════ */
const WARMUP_ROUTINES: Record<string, SportWarmupRoutine> = {
  basketball: {
    sport: 'basketball',
    title: '3-Min Hoop Explosiveness & Ankle Warmup',
    focusArea: 'Ankles, Quads, Hips & Shoulder Joint',
    exercises: [
      {
        id: 'bball_1',
        name: 'High Knee Hugs & Butt Kicks',
        durationSeconds: 45,
        muscleGroups: ['Glutes', 'Hip Flexors', 'Quads'],
        instructions:
          'Alternate hugging one knee to chest while walking, then transition to quick butt kicks to fire up hamstrings.',
        icon: '🏃',
      },
      {
        id: 'bball_2',
        name: 'Open & Close the Gate',
        durationSeconds: 45,
        muscleGroups: ['Hip Rotators', 'Groin', 'Adductors'],
        instructions:
          'Lift knee to 90 degrees and rotate outward to open hip joint, then reverse inward for groin activation.',
        icon: '🔄',
      },
      {
        id: 'bball_3',
        name: 'Walking Lunges with Overhead Reach',
        durationSeconds: 45,
        muscleGroups: ['Hamstrings', 'Ankle Mobility', 'Thoracic Spine'],
        instructions:
          'Step into deep lunge, raise both arms high overhead to open T-spine, then drive through front heel.',
        icon: '🧘',
      },
      {
        id: 'bball_4',
        name: 'Defensive Slides & Arm Swings',
        durationSeconds: 45,
        muscleGroups: ['Lateral Quickness', 'Shoulders', 'Calves'],
        instructions:
          'Get low in athletic stance, slide 4 steps left & right while making wide dynamic shoulder circles.',
        icon: '🏀',
      },
    ],
  },
  soccer: {
    sport: 'soccer',
    title: '3-Min Pitch Agility & Groin Warmup',
    focusArea: 'Groin, Hamstrings, Calves & Core',
    exercises: [
      {
        id: 'soccer_1',
        name: 'Dynamic Leg Swings (Front/Back)',
        durationSeconds: 45,
        muscleGroups: ['Hamstrings', 'Hip Flexors'],
        instructions:
          'Hold support post or balance while swinging kicking leg dynamically in a smooth arch.',
        icon: '⚽',
      },
      {
        id: 'soccer_2',
        name: 'Spiderman Lunge with Torso Twist',
        durationSeconds: 45,
        muscleGroups: ['Groin', 'T-Spine', 'Hip Flexors'],
        instructions:
          'Step deep lunge, place opposite hand down, and reach same-side arm up to ceiling with eyes following hand.',
        icon: '🕷️',
      },
      {
        id: 'soccer_3',
        name: 'High Knees & Carioca (Karaoke)',
        durationSeconds: 45,
        muscleGroups: ['Lateral Hips', 'Calves', 'Agility'],
        instructions:
          'Quick crossover footwork left and right to wake up central nervous system and ankle stability.',
        icon: '⚡',
      },
      {
        id: 'soccer_4',
        name: 'Accelerated Strides & Heel Flicks',
        durationSeconds: 45,
        muscleGroups: ['Sprint Activation', 'Hamstrings'],
        instructions:
          'Build speed from 50% to 80% stride over 10 yards with high turnover frequency.',
        icon: '🔥',
      },
    ],
  },
  volleyball: {
    sport: 'volleyball',
    title: '3-Min Shoulder & Spike Landing Prep',
    focusArea: 'Rotator Cuff, Vertical Jump & Landing',
    exercises: [
      {
        id: 'vball_1',
        name: 'Arm Swings & Shoulder Dislocates',
        durationSeconds: 45,
        muscleGroups: ['Rotator Cuff', 'Chest', 'Rear Delts'],
        instructions:
          'Wide chest openers transitioning into big circular arm swings to prep spike velocity.',
        icon: '🏐',
      },
      {
        id: 'vball_2',
        name: 'Calf Hops & Ankle Bounces',
        durationSeconds: 45,
        muscleGroups: ['Achilles Tendon', 'Calves', 'Plantar'],
        instructions:
          'Light rapid stiffness hops off toes to prepare lower legs for high impact jumping.',
        icon: '🦘',
      },
      {
        id: 'vball_3',
        name: 'Lateral Bounds & Touch Ground',
        durationSeconds: 45,
        muscleGroups: ['Glute Medius', 'Lateral Stability'],
        instructions:
          'Bound side-to-side loading outer hip, bending knee softly on stick landing.',
        icon: '💥',
      },
      {
        id: 'vball_4',
        name: 'Approach Jump Shadow Mimic',
        durationSeconds: 45,
        muscleGroups: ['Quads', 'Core', 'Jump Mechanics'],
        instructions:
          'Practice 3-step spike approach timing with full arm swing and explosive vertical leap.',
        icon: '🚀',
      },
    ],
  },
  pickleball: {
    sport: 'pickleball',
    title: '3-Min Kitchen Reactivity & Wrist Warmup',
    focusArea: 'Wrist Extensors, Forearms, Inner Thighs',
    exercises: [
      {
        id: 'pball_1',
        name: 'Wrist & Forearm Rotations',
        durationSeconds: 45,
        muscleGroups: ['Forearms', 'Wrist Extensors', 'Elbow'],
        instructions:
          'Extend arm straight out, gently pull fingers back, then rotate wrists 10 times in both directions.',
        icon: '🏓',
      },
      {
        id: 'pball_2',
        name: 'Lateral Kitchen Shuffles & Tap',
        durationSeconds: 45,
        muscleGroups: ['Adductors', 'Glutes', 'Quick Feet'],
        instructions:
          'Stay low in stance, shuffle side to side simulating kitchen line dink court coverage.',
        icon: '👟',
      },
      {
        id: 'pball_3',
        name: 'Dynamic Quad Pulls with Balance',
        durationSeconds: 45,
        muscleGroups: ['Quads', 'Hip Balance'],
        instructions:
          'Pull heel to glute for 2 seconds while reaching opposite hand upward, alternate legs.',
        icon: '🧘',
      },
      {
        id: 'pball_4',
        name: 'Cross-Body Shoulder Stretch & Twists',
        durationSeconds: 45,
        muscleGroups: ['Shoulders', 'Lower Back'],
        instructions:
          'Pull arm across chest while gently twisting torso to simulate paddle extension swings.',
        icon: '🔄',
      },
    ],
  },
  tennis: {
    sport: 'tennis',
    title: '3-Min Court Coverage & Swing Warmup',
    focusArea: 'Shoulder Girdle, Obliques, Split-Step',
    exercises: [
      {
        id: 'ten_1',
        name: 'Racquet Swing Mimics & Shoulder Circles',
        durationSeconds: 45,
        muscleGroups: ['Shoulder Girdle', 'Forearms'],
        instructions:
          'Shadow forehand & backhand stroke mechanics with fluid shoulder circle rotations.',
        icon: '🎾',
      },
      {
        id: 'ten_2',
        name: 'Side Lunges with Arm Reach',
        durationSeconds: 45,
        muscleGroups: ['Adductors', 'Obliques'],
        instructions:
          'Lunge deep laterally onto right leg, sweeping left arm across body toward right ankle.',
        icon: '💨',
      },
      {
        id: 'ten_3',
        name: 'Split-Step Bounces & High Knees',
        durationSeconds: 45,
        muscleGroups: ['Reaction Time', 'Calves'],
        instructions:
          'Perform light hop split-step on signal then burst 2 high knees, repeating fluidly.',
        icon: '⚡',
      },
      {
        id: 'ten_4',
        name: 'Leg Swings & Ankle Circles',
        durationSeconds: 45,
        muscleGroups: ['Hamstrings', 'Ankle Mobility'],
        instructions:
          'Dynamic pendulum leg swings to open hamstrings for baseline court retrieval.',
        icon: '👟',
      },
    ],
  },
  baseball: {
    sport: 'baseball',
    title: '3-Min Throwing Shoulder & Hip Rotation Warmup',
    focusArea: 'Rotator Cuff, Thoracic Spine, Base Running',
    exercises: [
      {
        id: 'base_1',
        name: 'Rotator Cuff Y-T-W Flutters',
        durationSeconds: 45,
        muscleGroups: ['Rear Delts', 'Scapula', 'Rotator Cuff'],
        instructions:
          'Form Y, T, and W positions with arms pulsing gently to prime throwing arm stability.',
        icon: '⚾',
      },
      {
        id: 'base_2',
        name: 'Walking Hamstring Scoops',
        durationSeconds: 45,
        muscleGroups: ['Hamstrings', 'Calves', 'Lower Back'],
        instructions:
          'Step forward heel down, hinge at hips and scoop hands toward ground dynamically.',
        icon: '🌾',
      },
      {
        id: 'base_3',
        name: 'Standing Hip Rotations',
        durationSeconds: 45,
        muscleGroups: ['Pelvic Mobility', 'Hips'],
        instructions:
          'Rotate hips in wide circles to unlock power generation for batting swings.',
        icon: '🔄',
      },
      {
        id: 'base_4',
        name: 'Short Burst Accelerations',
        durationSeconds: 45,
        muscleGroups: ['Explosive Start', 'Base Running'],
        instructions:
          'Take 3 explosive sprint steps from batting or fielding stance, decelerate smoothly.',
        icon: '🏃',
      },
    ],
  },
  softball: {
    sport: 'softball',
    title: '3-Min Pitcher & Hitter Dynamic Warmup',
    focusArea: 'Shoulder Joint, Chest, Obliques & Hips',
    exercises: [
      {
        id: 'soft_1',
        name: 'Windmill Arm Swings & Chest Openers',
        durationSeconds: 45,
        muscleGroups: ['Underhand Pitch Shoulder', 'Chest'],
        instructions:
          'Full 360-degree windmill arm rotations in both directions to loosen throwing shoulder.',
        icon: '🥎',
      },
      {
        id: 'soft_2',
        name: 'Walking Lunges with Side Lean',
        durationSeconds: 45,
        muscleGroups: ['Hip Flexors', 'Obliques'],
        instructions:
          'Step into lunge and lean torso over front leg to open hip flexor and side obliques.',
        icon: '🧘',
      },
      {
        id: 'soft_3',
        name: 'Carioca & Lateral Shuffles',
        durationSeconds: 45,
        muscleGroups: ['Hip Mobility', 'Footwork'],
        instructions:
          'Perform crossover footwork laterally across 15 yards to prepare for infield quickness.',
        icon: '⚡',
      },
      {
        id: 'soft_4',
        name: 'Hamstring Scoops & Heel Taps',
        durationSeconds: 45,
        muscleGroups: ['Hamstrings', 'Calf Elasticity'],
        instructions:
          'Dynamic scoops walking forward with toe pointed upward to activate posterior chain.',
        icon: '👟',
      },
    ],
  },
  football: {
    sport: 'football',
    title: '3-Min High-Impact Explosive Speed Prep',
    focusArea: 'Quads, Hamstrings, Groin & Nervous System',
    exercises: [
      {
        id: 'fb_1',
        name: 'High Knees & Butt Kicks',
        durationSeconds: 45,
        muscleGroups: ['Quads', 'Hamstring Firing'],
        instructions:
          'Drive knees high to chest at rapid tempo, followed immediately by rapid heel-to-glute kicks.',
        icon: '🏈',
      },
      {
        id: 'fb_2',
        name: 'Spiderman Lunges with Reach',
        durationSeconds: 45,
        muscleGroups: ['Hip Mobility', 'Thoracic Spine'],
        instructions:
          'Deep lunge with elbow inside ankle, reach arm up high to open hip and back for cut changes.',
        icon: '🕷️',
      },
      {
        id: 'fb_3',
        name: 'Carioca & Lateral Shuffles',
        durationSeconds: 45,
        muscleGroups: ['Groin Agility', 'Hip Swivels'],
        instructions:
          'Rapid hips rotation crossover footwork left and right across 10 yards.',
        icon: '⚡',
      },
      {
        id: 'fb_4',
        name: 'Burst Acceleration Starts',
        durationSeconds: 45,
        muscleGroups: ['Nervous System', 'Sprint Start'],
        instructions:
          'Explode out of 3-point or 2-point stance for 5 hard sprint strides.',
        icon: '🚀',
      },
    ],
  },
};

/* ═══════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════ */
interface SmartWarmupProps {
  user: AthleteProfile;
  onEarnXp?: (amount: number, source: string) => void;
  onOpenStatLog?: () => void;
  dailyWarmupChallenge?: Challenge | null;
  weeklyWarmupChallenge?: Challenge | null;
  onChallengeCompleted?: () => void;
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export const SmartWarmup: React.FC<SmartWarmupProps> = ({
  user,
  onEarnXp,
  onOpenStatLog,
  dailyWarmupChallenge,
  weeklyWarmupChallenge,
  onChallengeCompleted,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>(
    user?.primarySport || 'basketball'
  );
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(180);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentRoutine =
    WARMUP_ROUTINES[selectedSport] || WARMUP_ROUTINES.basketball;
  const currentExercise =
    currentRoutine.exercises[activeExerciseIndex] ||
    currentRoutine.exercises[0];

  /* ─── localStorage key: one claim per day per user ─── */
  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const claimedKey = `smartwarmup_claimed_${user.id}_${getTodayKey()}`;

  /* ─── On mount: check if today's warmup already claimed ─── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(claimedKey) === '1') {
        setRewardClaimed(true);
      }
    }
  }, [claimedKey]);

  /* ─── Reset when sport changes ─── */
  useEffect(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveExerciseIndex(0);
    setTimeLeftSeconds(180);
    setIsCompleted(false);
    setRewardClaimed(false);
  }, [selectedSport]);

  /* ─── Live timer ─── */
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsRunning(false);
            setIsCompleted(true);
            triggerHaptic('success');
            return 0;
          }
          const nextVal = prev - 1;
          const elapsedTime = 180 - nextVal;
          const nextIdx = Math.min(3, Math.floor(elapsedTime / 45));
          if (nextIdx !== activeExerciseIndex) {
            setActiveExerciseIndex(nextIdx);
            triggerHaptic('light');
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activeExerciseIndex]);

  /* ─── Controls ─── */
  const handleTogglePlay = () => {
    triggerHaptic('medium');
    if (timeLeftSeconds === 0) {
      setTimeLeftSeconds(180);
      setActiveExerciseIndex(0);
      setIsCompleted(false);
      setRewardClaimed(false);
    }
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    triggerHaptic('light');
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeftSeconds(180);
    setActiveExerciseIndex(0);
    setIsCompleted(false);
  };

  const handleSkipNext = () => {
    triggerHaptic('medium');
    if (activeExerciseIndex < currentRoutine.exercises.length - 1) {
      const nextIdx = activeExerciseIndex + 1;
      setActiveExerciseIndex(nextIdx);
      const newTimeLeft = 180 - nextIdx * 45;
      setTimeLeftSeconds(newTimeLeft);
    } else {
      setIsRunning(false);
      setTimeLeftSeconds(0);
      setIsCompleted(true);
      triggerHaptic('success');
    }
  };

  /* ═══════════════════════════════════════════
     CLAIM REWARD (saves XP to backend)
     ═══════════════════════════════════════════ */
  const handleClaimReward = async () => {
    if (rewardClaimed || claiming) return;

    // Local guard: already claimed today?
    if (typeof window !== 'undefined' && localStorage.getItem(claimedKey) === '1') {
      toast.error('You already completed your warmup today! Come back tomorrow.');
      setRewardClaimed(true);
      return;
    }

    if (!dailyWarmupChallenge) {
      toast.error('Warmup challenge not available right now.');
      return;
    }

    if (dailyWarmupChallenge.isCompleted) {
      toast.error('Warmup already completed today. Resets at midnight.');
      setRewardClaimed(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(claimedKey, '1');
      }
      return;
    }

    setClaiming(true);
    triggerHaptic('medium');

    try {
      // 1) Complete daily warmup challenge
      const result = await completeChallenge(
        dailyWarmupChallenge.id,
        user.id,
        1
      );

      // 2) Award XP immediately
      if (result.isCompleted && result.xpEarned > 0 && onEarnXp) {
        onEarnXp(result.xpEarned, 'smart_warmup');
      }

      // 3) Progress the weekly warmup challenge (best-effort)
      if (weeklyWarmupChallenge && !weeklyWarmupChallenge.isCompleted) {
        try {
          const weeklyResult = await completeChallenge(
            weeklyWarmupChallenge.id,
            user.id,
            1
          );
          if (
            weeklyResult.isCompleted &&
            weeklyResult.xpEarned > 0 &&
            onEarnXp
          ) {
            onEarnXp(weeklyResult.xpEarned, 'smart_warmup_weekly');
          }
        } catch (e) {
          console.warn('Weekly warmup progress failed (non-critical):', e);
        }
      }

      // 4) Mark as claimed locally
      if (typeof window !== 'undefined') {
        localStorage.setItem(claimedKey, '1');
      }
      setRewardClaimed(true);
      triggerHaptic('success');

      toast.success(result.message, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: result.isCompleted ? '#065f46' : '#1e1b4b',
          color: '#fff',
        },
      });

      // 5) Tell parent to refresh challenges list
      onChallengeCompleted?.();
    } catch (err) {
      console.error('❌ Claim warmup reward failed:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to claim warmup reward'
      );
    } finally {
      setClaiming(false);
    }
  };

  /* ─── Helpers ─── */
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalProgressPct = Math.min(
    100,
    Math.round(((180 - timeLeftSeconds) / 180) * 100)
  );

  const availableSports = [
    { type: 'basketball', label: 'Basketball', icon: '🏀' },
    { type: 'soccer', label: 'Soccer', icon: '⚽' },
    { type: 'volleyball', label: 'Volleyball', icon: '🏐' },
    { type: 'pickleball', label: 'Pickleball', icon: '🏓' },
    { type: 'tennis', label: 'Tennis', icon: '🎾' },
    { type: 'baseball', label: 'Baseball', icon: '⚾' },
    { type: 'softball', label: 'Softball', icon: '🥎' },
    { type: 'football', label: 'Football', icon: '🏈' },
  ];

  const xpReward = dailyWarmupChallenge?.xpReward ?? 50;
  const alreadyDoneToday =
    rewardClaimed || dailyWarmupChallenge?.isCompleted === true;

  return (
    <div
      id="smart-warmup-card"
      className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-lime-400/40 shadow-2xl space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-lime-400 to-emerald-400 text-black rounded-2xl shadow-xl shadow-lime-400/20">
            <Flame className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-0.5 bg-lime-400 text-black text-[10px] font-mono font-black rounded-full uppercase tracking-wider shadow">
                Smart Pre-Game Routine ⚡
              </span>
              <span className="text-xs text-indigo-300 font-mono font-bold">
                Tailored for {selectedSport.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight mt-1">
              3-Minute Dynamic Warmup Engine
            </h2>
          </div>
        </div>

        {/* Sport Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          {availableSports.map((sp) => (
            <button
              key={sp.type}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedSport(sp.type);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black italic transition flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                selectedSport === sp.type
                  ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                  : 'bg-indigo-950/80 text-indigo-300 hover:text-white border border-white/10'
              }`}
            >
              <span>{sp.icon}</span>
              <span className="capitalize">{sp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Already completed today banner */}
      {alreadyDoneToday && !isCompleted && (
        <div className="bg-emerald-950/60 border border-emerald-400/40 rounded-2xl p-4 flex items-center space-x-3 relative z-10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-sm">
            <p className="text-emerald-200 font-bold">
              Warmup completed today!
            </p>
            <p className="text-emerald-300/70 text-xs">
              Come back tomorrow to earn more XP.
            </p>
          </div>
        </div>
      )}

      {/* Routine Banner */}
      <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-white text-base">
            {currentRoutine.title}
          </h3>
          <p className="text-xs text-indigo-200/80 font-medium">
            <span className="text-lime-400 font-bold">Focus Area:</span>{' '}
            {currentRoutine.focusArea}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-mono text-indigo-300 block uppercase font-bold">
              Routine Duration
            </span>
            <span className="text-xl font-black italic font-mono text-lime-400">
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={alreadyDoneToday}
            className={`p-3.5 rounded-2xl font-black italic text-xs uppercase shadow-xl transition flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              isRunning
                ? 'bg-amber-400 text-black hover:bg-amber-300'
                : 'bg-gradient-to-r from-lime-400 to-emerald-400 text-black hover:scale-105 shadow-lime-400/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-black" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-black ml-0.5" />
                <span>
                  {timeLeftSeconds < 180 ? 'Resume' : 'Start Warmup'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetTimer}
            className="p-3 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-white/15 rounded-2xl transition"
            title="Reset Warmup Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 relative z-10">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span className="text-indigo-200/80">
            {isRunning
              ? '🔥 Warmup In Progress...'
              : isCompleted
              ? '✅ Routine Complete!'
              : alreadyDoneToday
              ? '✅ Already Completed Today'
              : 'Ready to Start Warmup'}
          </span>
          <span className="text-lime-400 font-black">
            {totalProgressPct}% Complete
          </span>
        </div>
        <div className="w-full bg-indigo-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${totalProgressPct}%` }}
          />
        </div>
      </div>

      {/* Completed Celebration */}
      {isCompleted && (
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-indigo-950 to-emerald-950 rounded-3xl border-2 border-lime-400 text-center space-y-4 relative z-10 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-lime-400 text-black rounded-full flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black italic uppercase text-white">
              Pre-Game Warmup Completed!
            </h3>
            <p className="text-xs text-indigo-200 max-w-md mx-auto">
              Your muscles and joints are primed for maximum speed, vertical
              pop, and injury prevention.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2 flex-wrap gap-2">
            {!alreadyDoneToday ? (
              <button
                type="button"
                onClick={handleClaimReward}
                disabled={claiming}
                className="px-6 py-3 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl hover:scale-105 transition flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>Claim +{xpReward} XP Warmup Bonus</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-5 py-2.5 bg-lime-400/20 text-lime-300 font-black italic text-xs rounded-2xl border border-lime-400/40 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>
                  +{dailyWarmupChallenge?.xpEarned || xpReward} XP Claimed! Ready
                  To Ball
                </span>
              </div>
            )}

            {onOpenStatLog && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenStatLog();
                }}
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-2xl border border-white/15 transition"
              >
                Log Game Stats
              </button>
            )}
          </div>
        </div>
      )}

      {/* Exercise Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {currentRoutine.exercises.map((ex, idx) => {
          const isActive = idx === activeExerciseIndex;
          const isDone = idx < activeExerciseIndex || isCompleted;

          return (
            <div
              key={ex.id}
              className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-900 to-indigo-950 border-lime-400 ring-2 ring-lime-400/50 shadow-2xl scale-[1.02]'
                  : isDone
                  ? 'bg-indigo-950/50 border-lime-400/30 opacity-75'
                  : 'bg-indigo-950/80 border-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl p-2 bg-indigo-900 rounded-2xl border border-white/10">
                    {ex.icon}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] font-mono font-black text-indigo-300 bg-indigo-900 px-2 py-0.5 rounded-lg border border-white/10">
                      STEP {idx + 1}/4
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-lg border border-amber-400/30">
                      {ex.durationSeconds}s
                    </span>
                  </div>
                </div>

                <h4 className="font-extrabold text-sm text-white leading-snug">
                  {ex.name}
                </h4>

                <div className="flex flex-wrap gap-1">
                  {ex.muscleGroups.map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 bg-indigo-900/90 text-lime-300 text-[9px] font-mono font-bold uppercase rounded-md border border-lime-400/20"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-indigo-200/80 font-medium leading-relaxed pt-1">
                  {ex.instructions}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                {isActive ? (
                  <span className="text-lime-400 font-black italic flex items-center space-x-1 animate-pulse">
                    <Zap className="w-3.5 h-3.5 fill-lime-400" />
                    <span>ACTIVE STEP NOW</span>
                  </span>
                ) : isDone ? (
                  <span className="text-lime-300 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                    <span>Step Completed</span>
                  </span>
                ) : (
                  <span className="text-indigo-400 font-medium">
                    Upcoming Step
                  </span>
                )}

                {isActive && (
                  <button
                    type="button"
                    onClick={handleSkipNext}
                    className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-lg text-[10px] font-bold uppercase flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <SkipForward className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartWarmup;