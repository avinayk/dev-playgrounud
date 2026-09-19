// components/PlayerCompareRadarChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AthleteProfile, SportType } from '../types';
import {
  BarChart3,
  Crown,
  Sparkles,
  Swords,
  TrendingUp,
  Award,
  Users,
  Zap,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface RadarCategory {
  key:
    | 'scoring'
    | 'playmaking'
    | 'defense'
    | 'efficiency'
    | 'clutch'
    | 'experience';
  label: string;
  icon: string;
}

export const RADAR_CATEGORIES: RadarCategory[] = [
  { key: 'scoring', label: 'Offense & Scoring', icon: '⚡' },
  { key: 'playmaking', label: 'Playmaking & Vision', icon: '🎯' },
  { key: 'defense', label: 'Defense & Grit', icon: '🛡️' },
  { key: 'efficiency', label: 'Efficiency & IQ', icon: '📊' },
  { key: 'clutch', label: 'Clutch & Win Rate', icon: '🔥' },
  { key: 'experience', label: 'Experience & Level', icon: '👑' },
];

export function getAthleteRadarMetrics(
  p: AthleteProfile
): Record<RadarCategory['key'], number> {
  const totalGames = (p as any).winCount + (p as any).lossCount || 1;
  const rawWinRate = Math.round(
    (((p as any).winCount || 0) / totalGames) * 100
  );

  let scoringVal = 50 + p.level * 2.5;
  let playmakingVal = 45 + p.level * 2.2;
  let defenseVal = 50 + p.level * 2.0;
  let efficiencyVal = 55 + (p.level % 5) * 4;

  const stats = (p as any).stats;

  if (p.primarySport === 'basketball' && stats?.basketball) {
    const b = stats.basketball;
    const ppg = b.gamesPlayed ? b.pts / b.gamesPlayed : 18;
    const apg = b.gamesPlayed ? b.ast / b.gamesPlayed : 5;
    const rpg = b.gamesPlayed ? b.reb / b.gamesPlayed : 5;
    const fgPct = b.fgAttempted ? (b.fgMade / b.fgAttempted) * 100 : 48;

    scoringVal = Math.min(99, Math.max(30, Math.round(ppg * 2.5 + p.level * 1.5)));
    playmakingVal = Math.min(99, Math.max(30, Math.round(apg * 7.5 + p.level * 1.8)));
    defenseVal = Math.min(
      99,
      Math.max(30, Math.round(rpg * 5 + (b.stl + b.blk) * 2 + p.level * 1.5))
    );
    efficiencyVal = Math.min(99, Math.max(30, Math.round(fgPct * 0.8 + 15)));
  } else if (p.primarySport === 'soccer' && stats?.soccer) {
    const s = stats.soccer;
    const gpg = s.gamesPlayed ? s.goals / s.gamesPlayed : 1.2;
    const apg = s.gamesPlayed ? s.assists / s.gamesPlayed : 0.8;

    scoringVal = Math.min(99, Math.max(30, Math.round(gpg * 35 + 20)));
    playmakingVal = Math.min(99, Math.max(30, Math.round(apg * 40 + 25)));
    defenseVal = Math.min(99, Math.max(30, Math.round((s.tackles || 12) * 2 + 30)));
    efficiencyVal = Math.min(99, Math.max(30, Math.round(s.passAccuracy || 82)));
  } else if (
    (p.primarySport === 'baseball' || p.primarySport === 'softball') &&
    stats?.baseball
  ) {
    const b = stats.baseball;
    scoringVal = Math.min(99, Math.max(30, Math.round((b.battingAvg || 0.32) * 220)));
    playmakingVal = Math.min(99, Math.max(30, Math.round((b.rbis || 15) * 2 + 20)));
    defenseVal = Math.min(99, Math.max(30, Math.round(50 + p.level * 2)));
    efficiencyVal = Math.min(99, Math.max(30, Math.round((b.slugging || 0.55) * 120)));
  } else if (p.primarySport === 'pickleball' && stats?.pickleball) {
    const pk = stats.pickleball;
    scoringVal = Math.min(99, Math.max(30, Math.round((pk.winRate || 65) * 0.9 + 10)));
    playmakingVal = Math.min(99, Math.max(30, Math.round(55 + (pk.dinksCount || 40) * 0.4)));
    defenseVal = Math.min(99, Math.max(30, Math.round(50 + p.level * 2.2)));
    efficiencyVal = Math.min(99, Math.max(30, Math.round(pk.winRate || 65)));
  }

  const clutchVal = Math.min(
    99,
    Math.max(35, Math.round(rawWinRate * 0.75 + ((p as any).badges?.length || 3) * 3))
  );
  const experienceVal = Math.min(99, Math.max(25, Math.round(p.level * 4.5 + 20)));

  return {
    scoring: scoringVal,
    playmaking: playmakingVal,
    defense: defenseVal,
    efficiency: efficiencyVal,
    clutch: clutchVal,
    experience: experienceVal,
  };
}

interface PlayerCompareRadarChartProps {
  player1: AthleteProfile;
  player2: AthleteProfile;
  allAthletes: AthleteProfile[];
  onSelectPlayer1: (p: AthleteProfile) => void;
  onSelectPlayer2: (p: AthleteProfile) => void;
  onClose?: () => void;
}

export const PlayerCompareRadarChart: React.FC<PlayerCompareRadarChartProps> = ({
  player1,
  player2,
  allAthletes,
  onSelectPlayer1,
  onSelectPlayer2,
  onClose,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<
    RadarCategory['key'] | null
  >(null);

  const p1Metrics = getAthleteRadarMetrics(player1);
  const p2Metrics = getAthleteRadarMetrics(player2);
  
  /* ─── D3 Radar Chart ─── */
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 380;
    const height = 380;
    const margin = 50;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    const totalAxes = RADAR_CATEGORIES.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    /* Grid rings */
    const levels = [20, 40, 60, 80, 100];
    levels.forEach((lvl) => {
      const levelFactor = rScale(lvl);
      const points: [number, number][] = RADAR_CATEGORIES.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return [levelFactor * Math.cos(angle), levelFactor * Math.sin(angle)];
      });
      const lineGenerator = d3
        .line<[number, number]>()
        .curve(d3.curveLinearClosed);

      g.append('path')
        .datum(points)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', lvl === 100 ? '#ffffff30' : '#ffffff15')
        .attr('stroke-width', lvl === 100 ? '1.5' : '1')
        .attr('stroke-dasharray', lvl < 100 ? '3 3' : 'none');

      g.append('text')
        .attr('x', 5)
        .attr('y', -levelFactor)
        .attr('fill', '#818cf8')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('opacity', '0.6')
        .text(`${lvl}`);
    });

    /* Radial axes + category labels */
    RADAR_CATEGORIES.forEach((cat, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x2 = radius * Math.cos(angle);
      const y2 = radius * Math.sin(angle);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#ffffff20')
        .attr('stroke-width', '1');

      const labelFactor = radius + 26;
      const labelX = labelFactor * Math.cos(angle);
      const labelY = labelFactor * Math.sin(angle);

      const labelGroup = g
        .append('g')
        .attr('transform', `translate(${labelX}, ${labelY})`)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredCategory(cat.key))
        .on('mouseleave', () => setHoveredCategory(null));

      labelGroup
        .append('text')
        .attr(
          'text-anchor',
          Math.abs(labelX) < 5 ? 'middle' : labelX > 0 ? 'start' : 'end'
        )
        .attr(
          'dy',
          labelY > 10 ? '0.8em' : labelY < -10 ? '-0.3em' : '0.35em'
        )
        .attr('fill', hoveredCategory === cat.key ? '#a3e635' : '#e0e7ff')
        .attr('font-size', '10px')
        .attr('font-weight', '800')
        .text(`${cat.icon} ${cat.label}`);
    });

    /* Polygon helper */
    const getPolygonPoints = (
      metrics: Record<RadarCategory['key'], number>
    ): [number, number][] => {
      return RADAR_CATEGORIES.map((cat, i) => {
        const val = metrics[cat.key] || 0;
        const r = rScale(val);
        const angle = i * angleSlice - Math.PI / 2;
        return [r * Math.cos(angle), r * Math.sin(angle)];
      });
    };

    const lineClosed = d3.line<[number, number]>().curve(d3.curveLinearClosed);

    const p1Points = getPolygonPoints(p1Metrics);
    const p2Points = getPolygonPoints(p2Metrics);

    /* Player 2 (Cyan) */
    const p2Color = '#06b6d4';
    g.append('path')
      .datum(p2Points)
      .attr('d', lineClosed)
      .attr('fill', `${p2Color}35`)
      .attr('stroke', p2Color)
      .attr('stroke-width', '2.5')
      .attr('stroke-linejoin', 'round');

    p2Points.forEach(([px, py], i) => {
      const catKey = RADAR_CATEGORIES[i].key;
      const isHovered = hoveredCategory === catKey;

      g.append('circle')
        .attr('cx', px)
        .attr('cy', py)
        .attr('r', isHovered ? '7' : '4.5')
        .attr('fill', p2Color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', '1.5')
        .style('filter', 'drop-shadow(0 0 6px #06b6d4)');
    });

    /* Player 1 (Lime) */
    const p1Color = '#a3e635';
    g.append('path')
      .datum(p1Points)
      .attr('d', lineClosed)
      .attr('fill', `${p1Color}40`)
      .attr('stroke', p1Color)
      .attr('stroke-width', '2.8')
      .attr('stroke-linejoin', 'round');

    p1Points.forEach(([px, py], i) => {
      const catKey = RADAR_CATEGORIES[i].key;
      const isHovered = hoveredCategory === catKey;

      g.append('circle')
        .attr('cx', px)
        .attr('cy', py)
        .attr('r', isHovered ? '7' : '4.5')
        .attr('fill', p1Color)
        .attr('stroke', '#000000')
        .attr('stroke-width', '1.5')
        .style('filter', 'drop-shadow(0 0 6px #a3e635)');
    });
  }, [p1Metrics, p2Metrics, hoveredCategory]);

  /* Overall scores */
  const p1TotalScore = Object.values(p1Metrics).reduce((a, b) => a + b, 0);
  const p2TotalScore = Object.values(p2Metrics).reduce((a, b) => a + b, 0);

  const p1Avg = Math.round(p1TotalScore / RADAR_CATEGORIES.length);
  const p2Avg = Math.round(p2TotalScore / RADAR_CATEGORIES.length);

  return (
    <div className="bg-indigo-950/90 border-2 border-lime-400/60 rounded-[2.5rem] p-6 text-white shadow-2xl space-y-6 animate-fadeIn relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <Swords className="w-6 h-6 text-lime-400 animate-pulse stroke-[2.5]" />
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
              <span>Head-to-Head Player Comparison</span>
              <span className="px-2.5 py-0.5 rounded-full bg-lime-400/20 text-lime-300 text-[10px] font-mono font-black border border-lime-400/30">
                D3.JS RADAR ENGINE
              </span>
            </h2>
          </div>
          <p className="text-xs text-indigo-200/70 font-semibold mt-1">
            Compare 6 key athletic attributes side-by-side to identify
            offensive firepower, defensive grit, and clutch dominance.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-300 hover:text-white rounded-xl border border-white/10 transition self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Player Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Player 1 */}
        <div className="p-4 bg-indigo-900/70 rounded-3xl border-2 border-lime-400 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="px-2.5 py-0.5 bg-lime-400 text-black font-black text-[10px] uppercase rounded-full shadow">
              Player 1 (Lime)
            </span>
            <span className="text-xs font-mono font-black text-lime-300">
              {p1Avg} OVR Rating
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <img
              src={player1.profilepicture}
              alt={player1.name}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-lime-400 shadow-md"
            />
            <div className="flex-1 min-w-0">
              <div className="relative">
                <select
                  value={player1.id}
                  onChange={(e) => {
                    const found = allAthletes.find(
                      (a) => a.id === e.target.value
                    );
                    if (found) onSelectPlayer1(found);
                  }}
                  className="w-full bg-indigo-950 text-white font-extrabold text-sm rounded-xl px-3 py-1.5 border border-white/20 focus:border-lime-400 focus:outline-none appearance-none cursor-pointer pr-8 truncate"
                >
                  {allAthletes.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      className="bg-indigo-950 text-white"
                    >
                      {a.name} ({a.levelTitle} • Lvl {a.level})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-lime-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-indigo-300/80 font-bold mt-1">
                {player1.levelTitle} • {player1.position || player1.primarySport}{' '}
                • {player1.schoolOrLeague}
              </p>
            </div>
          </div>
        </div>

        {/* Player 2 */}
        <div className="p-4 bg-indigo-900/70 rounded-3xl border-2 border-cyan-400 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="px-2.5 py-0.5 bg-cyan-400 text-black font-black text-[10px] uppercase rounded-full shadow">
              Player 2 (Cyan)
            </span>
            <span className="text-xs font-mono font-black text-cyan-300">
              {p2Avg} OVR Rating
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <img
              src={player2.avatar}
              alt={player2.name}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-cyan-400 shadow-md"
            />
            <div className="flex-1 min-w-0">
              <div className="relative">
                <select
                  value={player2.id}
                  onChange={(e) => {
                    const found = allAthletes.find(
                      (a) => a.id === e.target.value
                    );
                    if (found) onSelectPlayer2(found);
                  }}
                  className="w-full bg-indigo-950 text-white font-extrabold text-sm rounded-xl px-3 py-1.5 border border-white/20 focus:border-cyan-400 focus:outline-none appearance-none cursor-pointer pr-8 truncate"
                >
                  {allAthletes.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      className="bg-indigo-950 text-white"
                    >
                      {a.name} ({a.levelTitle} • Lvl {a.level})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-indigo-300/80 font-bold mt-1">
                {player2.levelTitle} • {player2.position || player2.primarySport}{' '}
                • {player2.schoolOrLeague}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Radar + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* D3 Radar */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 bg-indigo-900/40 rounded-3xl border border-white/10">
          <svg
            ref={svgRef}
            viewBox="0 0 380 380"
            className="w-full max-w-[380px] h-auto drop-shadow-2xl overflow-visible"
          />

          <div className="flex items-center justify-center space-x-6 mt-2 pt-2 border-t border-white/10 text-xs font-bold w-full">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-lime-400 shadow-lg shadow-lime-400/50 ring-2 ring-lime-300" />
              <span className="text-white font-extrabold">{player1.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 ring-2 ring-cyan-300" />
              <span className="text-white font-extrabold">{player2.name}</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-200 flex items-center justify-between">
            <span>6-Axis Attribute Scores</span>
            <span className="text-[10px] text-lime-400 font-mono">
              0 - 100 Scale
            </span>
          </h3>

          <div className="space-y-2">
            {RADAR_CATEGORIES.map((cat) => {
              const v1 = p1Metrics[cat.key];
              const v2 = p2Metrics[cat.key];
              const diff = v1 - v2;
              const p1Leads = diff > 0;
              const p2Leads = diff < 0;
              const isTied = diff === 0;

              return (
                <div
                  key={cat.key}
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                    hoveredCategory === cat.key
                      ? 'bg-indigo-900 border-lime-400 scale-[1.02]'
                      : 'bg-indigo-950/80 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-black mb-1">
                    <span className="text-lime-400 font-mono w-8 text-left">
                      {v1}
                    </span>
                    <span className="text-white flex items-center space-x-1">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-cyan-400 font-mono w-8 text-right">
                      {v2}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 items-center">
                    <div className="w-full bg-indigo-900 h-2 rounded-full overflow-hidden flex justify-end">
                      <div
                        className="bg-lime-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${v1}%` }}
                      />
                    </div>
                    <div className="w-full bg-indigo-900 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${v2}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-center mt-1 font-bold">
                    {p1Leads && (
                      <span className="text-lime-300">
                        ⚡ {player1.name.split(' ')[0]} +{diff} pts advantage
                      </span>
                    )}
                    {p2Leads && (
                      <span className="text-cyan-300">
                        🛡️ {player2.name.split(' ')[0]} +{Math.abs(diff)} pts
                        advantage
                      </span>
                    )}
                    {isTied && (
                      <span className="text-indigo-300/70">
                        🤝 Perfectly Balanced Matchup
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scouting Report */}
      <div className="bg-indigo-900/60 p-4 rounded-3xl border border-white/10 space-y-3 relative z-10">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-lime-400" />
          <h4 className="font-black italic uppercase text-xs text-white">
            Scouting Takeaway & Strengths Breakdown
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-indigo-950/90 rounded-2xl border border-lime-400/30 space-y-1">
            <p className="font-extrabold text-lime-300 flex items-center space-x-1">
              <span>🏀</span>
              <span>{player1.name}'s Key Strengths:</span>
            </p>
            <p className="text-indigo-200/80 leading-relaxed text-[11px]">
              {p1Metrics.scoring >= p2Metrics.scoring
                ? 'Dominant offensive scorer'
                : 'Relentless motor'}{' '}
              with high efficiency. Best attribute:{' '}
              <strong className="text-white">
                {
                  RADAR_CATEGORIES.find(
                    (c) =>
                      p1Metrics[c.key] === Math.max(...Object.values(p1Metrics))
                  )?.label
                }
              </strong>{' '}
              ({Math.max(...Object.values(p1Metrics))} pts).
            </p>
          </div>

          <div className="p-3 bg-indigo-950/90 rounded-2xl border border-cyan-400/30 space-y-1">
            <p className="font-extrabold text-cyan-300 flex items-center space-x-1">
              <span>🛡️</span>
              <span>{player2.name}'s Key Strengths:</span>
            </p>
            <p className="text-indigo-200/80 leading-relaxed text-[11px]">
              {p2Metrics.defense >= p1Metrics.defense
                ? 'Stout defensive anchor'
                : 'Playmaking vision'}{' '}
              with deep experience. Best attribute:{' '}
              <strong className="text-white">
                {
                  RADAR_CATEGORIES.find(
                    (c) =>
                      p2Metrics[c.key] === Math.max(...Object.values(p2Metrics))
                  )?.label
                }
              </strong>{' '}
              ({Math.max(...Object.values(p2Metrics))} pts).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCompareRadarChart;