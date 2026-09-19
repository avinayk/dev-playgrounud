// components/ProTipCard.tsx
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AthleteProfile } from '../types';
import {
  Lightbulb,
  TrendingDown,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface ProTipCardProps {
  user: AthleteProfile;
  onNavigateToAnalytics: () => void;
}

export interface ProTipInsight {
  title: string;
  hintMessage: string;
  metricLabel: string;
  recentAvg: string | number;
  benchmarkAvg: string | number;
  pctDiff: number;
  focusArea: string;
  actionableStep: string;
  sportLabel: string;
}

/* ✅ Fallback sport label helper (agar utils mein nahi hai) */
const getSportLabelSafe = (sport: string): string => {
  const map: Record<string, string> = {
    basketball: 'Basketball',
    soccer: 'Soccer',
    volleyball: 'Volleyball',
    pickleball: 'Pickleball',
    tennis: 'Tennis',
    baseball: 'Baseball',
    softball: 'Softball',
    football: 'Football',
  };
  return map[sport] || sport;
};

export const ProTipCard: React.FC<ProTipCardProps> = ({
  user,
  onNavigateToAnalytics,
}) => {
  const primarySport = user.primary_sport || 'basketball';
  const sportLabel = getSportLabelSafe(primarySport);

  const insight: ProTipInsight = useMemo(() => {
    const history = (user as any).statsHistory || [];
    const sportStats = (user as any).stats
      ? (user as any).stats[primarySport]
      : null;

    if (primarySport === 'volleyball') {
      const vbStats =
        sportStats || { kills: 34, aces: 12, blocks: 15, digs: 28, gamesPlayed: 8 };
      const games = vbStats.gamesPlayed || 1;
      const avgKills = vbStats.kills / games;
      const avgDigs = vbStats.digs / games;
      const avgBlocks = vbStats.blocks / games;
      const avgAces = vbStats.aces / games;

      const recentVbGames = history.filter(
        (h: any) => h.sport === 'volleyball'
      );
      let recentDigsAvg = avgDigs;
      let isRecentDrop = false;

      if (recentVbGames.length >= 2) {
        const sumRecentDigs = recentVbGames.reduce(
          (acc: number, g: any) => acc + (g.digs || 0),
          0
        );
        recentDigsAvg = sumRecentDigs / recentVbGames.length;
        if (recentDigsAvg < avgDigs * 0.9) {
          isRecentDrop = true;
        }
      }

      if (avgDigs < 4 || isRecentDrop || avgDigs <= avgKills * 0.8) {
        return {
          title: 'Defensive Digs & Pass Reception',
          hintMessage:
            'Focus on your passing technique this week to improve defense.',
          metricLabel: 'Digs / Match',
          recentAvg: recentDigsAvg.toFixed(1),
          benchmarkAvg: (avgDigs * 1.25).toFixed(1),
          pctDiff: -14,
          focusArea: 'Passing & Defense',
          actionableStep:
            'Keep platform still on contact and angle hips toward target setter during serve receive.',
          sportLabel,
        };
      } else if (avgBlocks < 2) {
        return {
          title: 'Frontrow Block Timing & Press',
          hintMessage:
            'Work on your net jump timing and arm press to increase block rejections.',
          metricLabel: 'Blocks / Match',
          recentAvg: avgBlocks.toFixed(1),
          benchmarkAvg: (avgBlocks * 1.3).toFixed(1),
          pctDiff: -18,
          focusArea: 'Net Defense',
          actionableStep:
            'Penetrate over the net tape before spiker makes contact to close seams.',
          sportLabel,
        };
      } else if (avgAces < 2) {
        return {
          title: 'Serve Consistency & Topspin',
          hintMessage:
            'Focus on serve placement and ball drop to force more out-of-system passes.',
          metricLabel: 'Aces / Match',
          recentAvg: avgAces.toFixed(1),
          benchmarkAvg: '2.5',
          pctDiff: -12,
          focusArea: 'Targeted Serving',
          actionableStep:
            'Pick deep corners or zone 1 seam during high-pressure serve reps.',
          sportLabel,
        };
      } else {
        return {
          title: 'Spike Approach & Wrist Snap',
          hintMessage:
            'Refine 3-step spike approach footwork to maximize attack jump height.',
          metricLabel: 'Kills / Match',
          recentAvg: avgKills.toFixed(1),
          benchmarkAvg: (avgKills * 1.2).toFixed(1),
          pctDiff: -8,
          focusArea: 'Offensive Spiking',
          actionableStep:
            'Accelerate last two steps (Right-Left for righties) and snap down at apex.',
          sportLabel,
        };
      }
    } else if (primarySport === 'basketball') {
      if (!sportStats || !sportStats.gamesPlayed || sportStats.gamesPlayed === 0) {
        return {
            title: 'Start Logging Stats',
            hintMessage: 'Log your first game to unlock personalized AI coaching insights.',
            metricLabel: 'Games Logged',
            recentAvg: '0',
            benchmarkAvg: '5+',
            pctDiff: 0,
            focusArea: 'Data Collection',
            actionableStep: 'Log at least 3 games to receive personalized performance feedback.',
            sportLabel,
        };
    }

        const bkStats = sportStats;
        const games = bkStats.gamesPlayed || 1;
        const avgAst = (bkStats.ast || 0) / games;

      return {
        title: 'Floor General Passing & Dimes',
        hintMessage:
          'Focus on your passing technique this week to elevate teammate scoring.',
        metricLabel: 'Assists / Game',
        recentAvg: avgAst.toFixed(1),
        benchmarkAvg: (avgAst * 1.3).toFixed(1),
        pctDiff: -15,
        focusArea: 'Court Vision',
        actionableStep:
          'Probe the paint on pick-and-rolls and make two-handed chest passes into open shooters.',
        sportLabel,
      };
    } else if (primarySport === 'soccer') {
      const scStats =
        sportStats || { goals: 2, assists: 3, gamesPlayed: 5 };
      const games = scStats.gamesPlayed || 1;
      const avgAst = (scStats.assists || 0) / games;

      return {
        title: 'Through-Ball Passing Precision',
        hintMessage:
          'Focus on your passing technique this week to split defender lines.',
        metricLabel: 'Assists / Match',
        recentAvg: avgAst.toFixed(1),
        benchmarkAvg: (avgAst * 1.35).toFixed(1),
        pctDiff: -16,
        focusArea: 'Midfield Playmaking',
        actionableStep:
          'Weight your lead passes into space for forward strikers on counter-attacks.',
        sportLabel,
      };
    } else {
      return {
        title: 'Consistency & Execution',
        hintMessage:
          'Focus on your fundamental technique this week during warm-up drills.',
        metricLabel: 'Overall Impact',
        recentAvg: '78%',
        benchmarkAvg: '88%',
        pctDiff: -10,
        focusArea: 'Drill Execution',
        actionableStep:
          'Log stats consistently after every run to track recovery and game performance.',
        sportLabel,
      };
    }
  }, [user, primarySport, sportLabel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-indigo-950 via-purple-950/90 to-slate-950 p-5 md:p-6 rounded-[2.2rem] border border-amber-400/40 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left */}
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-black rounded-2xl shadow-xl shrink-0 group-hover:scale-105 transition duration-300">
            <Lightbulb className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>AI COACH PRO-TIP</span>
              </span>
              <span className="text-[10px] text-indigo-300 font-mono font-bold">
                • {insight.sportLabel} Analytics Analysis
              </span>
            </div>

            <h3 className="text-base md:text-lg font-black italic uppercase text-white tracking-tight">
              {insight.title}
            </h3>

            <p className="text-sm font-extrabold text-lime-300 italic bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-lime-400/30 inline-block">
              💡 "{insight.hintMessage}"
            </p>

            <p className="text-xs text-indigo-200/90 font-medium leading-relaxed mt-1">
              {insight.actionableStep}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
          <div className="bg-indigo-900/80 px-4 py-2.5 rounded-2xl border border-white/10 text-left md:text-right space-y-0.5">
            <span className="text-[10px] font-black uppercase text-indigo-300 block">
              {insight.metricLabel}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-rose-400 flex items-center font-mono">
                <TrendingDown className="w-4 h-4 mr-0.5 text-rose-400 stroke-[3]" />
                {insight.pctDiff}%
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {insight.recentAvg}{' '}
                <span className="text-indigo-400 font-normal">
                  / {insight.benchmarkAvg} avg
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToAnalytics}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-black italic text-xs uppercase rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-1.5"
          >
            <span>View Full Analytics</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProTipCard;