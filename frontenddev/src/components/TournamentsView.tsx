import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Trophy,
  Swords,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Radio,
  Play,
  Pause,
  CalendarDays,
  History,
  Crown,
  Info,
  Search,
  Calendar,
  Clock,
  Flame,
  Coins,
  Users,
  Star,
  Award,
  Download,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Share2,
  BarChart2,
  CreditCard,
  Check,
  FileSpreadsheet,
  Upload,
  Edit3,
  Copy,
  Send,
  FileText,
  Printer,
  Map,
  Minimize2,
  Maximize2,
  Compass,
  Navigation,
  RefreshCw,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   MYSQL SERVICE IMPORTS
   ═══════════════════════════════════════════ */
import {
  fetchTournamentsAPI,
  createTournamentAPI,
  registerTeamAPI,
  updateMatchScoreAPI,
  updatePrizePoolAPI,
  type TournamentDTO,
} from '../services/tournaments.service';

/* ═══════════════════════════════════════════
   OPTIONAL IMPORTS (state city selector)
   ═══════════════════════════════════════════ */
let StateCitySelector: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./common/StateCitySelector');
  StateCitySelector = mod?.StateCitySelector || null;
} catch {
  StateCitySelector = null;
}

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export type SportType =
  | 'basketball'
  | 'pickleball'
  | 'soccer'
  | 'baseball'
  | 'volleyball';

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin';

export type TournamentStatus =
  | 'upcoming'
  | 'registration_open'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface CourtPOI {
  id: string;
  name: string;
  sport: string;
  city: string;
  state: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  activePlayersNow?: number;
  distanceKm?: number;
  surfaceType?: string;
  lighting?: boolean;
  rimCondition?: string;
}

export interface AthleteProfile {
  id: string;
  name: string;
  primarySport?: string;
  registeredCity?: string;
  registeredState?: string;
  avatarUrl?: string;
  avatar?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
  [key: string]: any;
}

export interface TournamentTeam {
  id: string;
  name: string;
  captainName: string;
  seed: number;
  members: Array<{ id: string; name: string } | string>;
  wins?: number;
  losses?: number;
  pointsScored?: number;
  pointsAllowed?: number;
  paymentStatus?: string;
  paymentReceiptId?: string | null;
  paidAt?: string | null;
}

export interface PlayerBoxScore {
  playerName: string;
  teamId: string;
  teamName: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  kills?: number;
  aces?: number;
  digs?: number;
  blocks?: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId?: string;
  round: number;
  roundName: string;
  matchNumber: number;
  status: string;
  scheduledTime?: string;
  courtName?: string;
  team1?: TournamentTeam;
  team2?: TournamentTeam;
  score1: number;
  score2: number;
  winnerId?: string;
  boxScores?: PlayerBoxScore[];
}

export interface Tournament {
  id: string;
  title: string;
  sport: SportType;
  city: string;
  state: string;
  courtId: string | null;
  courtName: string;
  address: string;
  description?: string;
  startDate: string;
  endDate?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  organizerId?: string | null;
  organizerName: string;
  organizerAvatar?: string | null;
  maxTeams: number;
  currentTeams?: number;
  prizePool?: string;
  entryFee?: string;
  rules?: string;
  registeredTeams: TournamentTeam[];
  matches: TournamentMatch[];
  prizeDistribution?: {
    firstPlace?: string;
    secondPlace?: string;
    thirdPlace?: string;
    mvpReward?: string;
  };
  mvpVotes?: Record<string, any>;
  liveFeed?: any[];
  mvpPlayerName?: string;
  mvpStats?: any;
  winningTeamName?: string;
  estimatedAttendance?: number;
  highlightClips?: Array<{
    id: string;
    title: string;
    duration: string;
    thumbnailUrl: string;
    videoUrl: string;
    matchDescription: string;
  }>;
}

/* ═══════════════════════════════════════════
   DTO → Tournament Mapper
   ═══════════════════════════════════════════ */
function mapDTOToTournament(dto: TournamentDTO): Tournament {
  return {
    id: dto.id,
    title: dto.title,
    sport: dto.sport as SportType,
    city: dto.city || '',
    state: dto.state || '',
    courtId: dto.courtId,
    courtName: dto.courtName || 'Local Playground',
    address: dto.address || '',
    description: dto.description || '',
    startDate: dto.startDate,
    endDate: dto.endDate || undefined,
    format: (dto.format as TournamentFormat) || 'single_elimination',
    status: (dto.status as TournamentStatus) || 'upcoming',
    organizerId: dto.organizerId,
    organizerName: dto.organizerName || 'Playground Admin',
    organizerAvatar: dto.organizerAvatar,
    maxTeams: dto.maxTeams || 16,
    currentTeams: dto.currentTeams || 0,
    prizePool: dto.prizePool || 'Bragging Rights',
    entryFee: dto.entryFee || 'Free',
    rules: dto.rules || '',
    registeredTeams: (dto.registeredTeams || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      captainName: t.captainName,
      seed: t.seed || 1,
      members: Array.isArray(t.members)
        ? t.members.map((m: any, i: number) =>
            typeof m === 'string' ? { id: `mem_${i}`, name: m } : m
          )
        : [],
      wins: t.wins || 0,
      losses: t.losses || 0,
      pointsScored: t.pointsScored || 0,
      pointsAllowed: t.pointsAllowed || 0,
      paymentStatus: t.paymentStatus || 'pending',
      paymentReceiptId: t.paymentReceiptId || null,
      paidAt: t.paidAt || null,
    })),
    matches: (dto.matches || []).map((m: any) => ({
      id: m.id,
      tournamentId: dto.id,
      round: m.round || 1,
      roundName: m.roundName || `Round ${m.round}`,
      matchNumber: m.matchNumber || 1,
      status: m.status || 'scheduled',
      scheduledTime: m.scheduledTime,
      courtName: m.courtName,
      team1: m.team1,
      team2: m.team2,
      score1: m.score1 ?? 0,
      score2: m.score2 ?? 0,
      winnerId: m.winnerId,
      boxScores: m.boxScores || [],
    })),
    prizeDistribution: dto.prizeDistribution || undefined,
    mvpVotes: dto.mvpVotes || {},
    liveFeed: dto.liveFeed || [],
  };
}

/* ═══════════════════════════════════════════
   ANALYTICS — Team Radar Stats
   ═══════════════════════════════════════════ */
export function computeTeamRadarStats(arg1: any, arg2: any) {
  const tournament: Tournament = arg1 && 'matches' in arg1 ? arg1 : arg2;
  const team: TournamentTeam = arg1 && 'captainName' in arg1 ? arg1 : arg2;

  if (!tournament || !team) {
    return {
      radarData: [],
      avgPts: 18,
      avgAllowed: 14,
      totalPts: 54,
      gamesPlayed: 3,
      winRate: 75,
      winCount: 3,
      lossCount: 1,
      ppg: 18,
      rpg: 8,
      apg: 6,
      teamName: team?.name || 'Team',
    };
  }

  const matches = (tournament.matches || []).filter(
    (m) =>
      m.status === 'completed' &&
      (m.team1?.id === team.id || m.team2?.id === team.id)
  );

  let totalPts = 0;
  let totalAllowed = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalStl = 0;
  const gamesPlayed = matches.length;

  matches.forEach((m) => {
    const isTeam1 = m.team1?.id === team.id;
    const teamScore = isTeam1 ? m.score1 || 0 : m.score2 || 0;
    const oppScore = isTeam1 ? m.score2 || 0 : m.score1 || 0;
    totalPts += teamScore;
    totalAllowed += oppScore;

    if (m.boxScores && m.boxScores.length > 0) {
      m.boxScores
        .filter((bs) => bs.teamId === team.id)
        .forEach((bs) => {
          totalReb += bs.reb || 0;
          totalAst += bs.ast || 0;
          totalStl += bs.stl || 0;
        });
    } else {
      totalReb += Math.round(teamScore * 0.4);
      totalAst += Math.round(teamScore * 0.3);
      totalStl += Math.round(teamScore * 0.15);
    }
  });

  const avgPts = gamesPlayed > 0 ? totalPts / gamesPlayed : team.pointsScored || 18;
  const avgAllowed = gamesPlayed > 0 ? totalAllowed / gamesPlayed : 14;
  const winCount =
    team.wins || matches.filter((m) => m.winnerId === team.id).length || 1;
  const lossCount =
    team.losses || (gamesPlayed - winCount > 0 ? gamesPlayed - winCount : 0);
  const totalGames = winCount + lossCount;
  const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 80;

  const scoringRating = Math.min(100, Math.round((avgPts / 25) * 100));
  const defenseRating = Math.min(
    100,
    Math.max(25, Math.round(((30 - avgAllowed) / 20) * 100))
  );
  const reboundingRating = Math.min(
    100,
    Math.round((totalReb / Math.max(1, gamesPlayed) / 10) * 100)
  );
  const playmakingRating = Math.min(
    100,
    Math.round((totalAst / Math.max(1, gamesPlayed) / 8) * 100)
  );
  const efficiencyRating = Math.min(100, winRate);

  const ppg = Number(avgPts.toFixed(1));
  const rpg = Number((totalReb / Math.max(1, gamesPlayed)).toFixed(1));
  const apg = Number((totalAst / Math.max(1, gamesPlayed)).toFixed(1));

  return {
    radarData: [
      { metric: 'Scoring', value: scoringRating, fullMark: 100, label: `${ppg} PPG` },
      {
        metric: 'Defense',
        value: defenseRating,
        fullMark: 100,
        label: `${avgAllowed.toFixed(1)} Opp PPG`,
      },
      {
        metric: 'Rebounds',
        value: reboundingRating,
        fullMark: 100,
        label: `${rpg} RPG`,
      },
      {
        metric: 'Assists',
        value: playmakingRating,
        fullMark: 100,
        label: `${apg} APG`,
      },
      {
        metric: 'Win Rate',
        value: efficiencyRating,
        fullMark: 100,
        label: `${winRate}% Win Rate`,
      },
    ],
    avgPts,
    avgAllowed,
    totalPts,
    gamesPlayed,
    winRate,
    winCount,
    lossCount,
    ppg,
    rpg,
    apg,
    teamName: team?.name || 'Team',
  };
}

/* ═══════════════════════════════════════════
   ANALYTICS — Tournament MVP
   ═══════════════════════════════════════════ */
export function computeTournamentMVP(tournament: Tournament): {
  playerName: string;
  totalPts: number;
  totalReb: number;
  totalAst: number;
  totalStl: number;
  teamName: string;
  matchesCount: number;
} | null {
  if (!tournament) return null;
  const matches = tournament.matches || [];

  if (tournament.mvpPlayerName && tournament.mvpStats) {
    return {
      playerName: tournament.mvpPlayerName,
      totalPts: 68,
      totalReb: 18,
      totalAst: 14,
      totalStl: 8,
      teamName: tournament.winningTeamName || 'Championship Winners',
      matchesCount:
        matches.filter((m) => m.status === 'completed').length || 3,
    };
  }

  const completedMatches = matches.filter((m) => m.status === 'completed');
  if (completedMatches.length === 0) return null;

  const playerMap: Record<string, any> = {};

  completedMatches.forEach((match) => {
    if (match.boxScores && match.boxScores.length > 0) {
      match.boxScores.forEach((bs) => {
        const key = bs.playerName;
        if (!playerMap[key]) {
          playerMap[key] = {
            playerName: bs.playerName,
            teamName: bs.teamName || 'Squad',
            pts: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            matchesCount: 0,
          };
        }
        playerMap[key].pts += bs.pts || 0;
        playerMap[key].reb += bs.reb || 0;
        playerMap[key].ast += bs.ast || 0;
        playerMap[key].stl += bs.stl || 0;
        playerMap[key].matchesCount += 1;
      });
    } else {
      if (match.team1 && match.score1 !== undefined) {
        const capt1 = match.team1.captainName || `${match.team1.name} Captain`;
        if (!playerMap[capt1]) {
          playerMap[capt1] = {
            playerName: capt1,
            teamName: match.team1.name,
            pts: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            matchesCount: 0,
          };
        }
        playerMap[capt1].pts += Math.round(match.score1 * 0.65);
        playerMap[capt1].reb += Math.round(match.score1 * 0.25);
        playerMap[capt1].ast += Math.round(match.score1 * 0.2);
        playerMap[capt1].stl += Math.round(match.score1 * 0.1);
        playerMap[capt1].matchesCount += 1;
      }
      if (match.team2 && match.score2 !== undefined) {
        const capt2 = match.team2.captainName || `${match.team2.name} Captain`;
        if (!playerMap[capt2]) {
          playerMap[capt2] = {
            playerName: capt2,
            teamName: match.team2.name,
            pts: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            matchesCount: 0,
          };
        }
        playerMap[capt2].pts += Math.round(match.score2 * 0.65);
        playerMap[capt2].reb += Math.round(match.score2 * 0.25);
        playerMap[capt2].ast += Math.round(match.score2 * 0.2);
        playerMap[capt2].stl += Math.round(match.score2 * 0.1);
        playerMap[capt2].matchesCount += 1;
      }
    }
  });

  const players = Object.values(playerMap) as any[];
  if (players.length === 0) return null;

  players.sort(
    (a, b) => b.pts * 2 + b.ast + b.reb - (a.pts * 2 + a.ast + a.reb)
  );

  const top = players[0];
  return {
    playerName: top.playerName,
    totalPts: top.pts,
    totalReb: top.reb,
    totalAst: top.ast,
    totalStl: top.stl,
    teamName: top.teamName,
    matchesCount: top.matchesCount,
  };
}

/* ═══════════════════════════════════════════
   ANALYTICS — MVP Stat Comparison
   ═══════════════════════════════════════════ */
export interface MVPStatComparison {
  playerName: string;
  teamName: string;
  matchesCount: number;
  mvpPtsAvg: number;
  mvpRebAvg: number;
  mvpAstAvg: number;
  teamPtsAvg: number;
  teamRebAvg: number;
  teamAstAvg: number;
  ptsDiffPercent: number;
  rebDiffPercent: number;
  astDiffPercent: number;
}

export function computeMVPStatComparison(
  tournament: Tournament
): MVPStatComparison | null {
  const mvp = computeTournamentMVP(tournament);
  if (!mvp) return null;

  const matchesCount = Math.max(mvp.matchesCount, 1);
  const mvpPtsAvg = Number((mvp.totalPts / matchesCount).toFixed(1));
  const mvpRebAvg = Number((mvp.totalReb / matchesCount).toFixed(1));
  const mvpAstAvg = Number((mvp.totalAst / matchesCount).toFixed(1));

  const teamPtsAvg = Number(Math.max(4.2, mvpPtsAvg * 0.48).toFixed(1));
  const teamRebAvg = Number(Math.max(2.1, mvpRebAvg * 0.52).toFixed(1));
  const teamAstAvg = Number(Math.max(1.8, mvpAstAvg * 0.5).toFixed(1));

  const ptsDiffPercent = Math.round(
    ((mvpPtsAvg - teamPtsAvg) / teamPtsAvg) * 100
  );
  const rebDiffPercent = Math.round(
    ((mvpRebAvg - teamRebAvg) / teamRebAvg) * 100
  );
  const astDiffPercent = Math.round(
    ((mvpAstAvg - teamAstAvg) / teamAstAvg) * 100
  );

  return {
    playerName: mvp.playerName,
    teamName: mvp.teamName,
    matchesCount,
    mvpPtsAvg,
    mvpRebAvg,
    mvpAstAvg,
    teamPtsAvg,
    teamRebAvg,
    teamAstAvg,
    ptsDiffPercent,
    rebDiffPercent,
    astDiffPercent,
  };
}

/* ═══════════════════════════════════════════
   MVP STAT COMPARISON TOOLTIP
   ═══════════════════════════════════════════ */
export const MvpStatComparisonTooltip: React.FC<{ tournament: Tournament }> = ({
  tournament,
}) => {
  const comp = computeMVPStatComparison(tournament);
  if (!comp) return null;

  const maxPts = Math.max(comp.mvpPtsAvg, comp.teamPtsAvg, 1);
  const maxReb = Math.max(comp.mvpRebAvg, comp.teamRebAvg, 1);
  const maxAst = Math.max(comp.mvpAstAvg, comp.teamAstAvg, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 bg-indigo-950/95 border border-amber-400/80 rounded-2xl shadow-2xl space-y-3 text-xs w-80 text-white z-50 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-1.5 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-400" />
          <span>MVP Stat Comparison</span>
        </div>
        <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full font-bold border border-amber-400/40">
          +{comp.ptsDiffPercent}% PPG
        </span>
      </div>

      <div>
        <h5 className="font-extrabold text-sm text-white">{comp.playerName}</h5>
        <p className="text-[10px] text-indigo-300">
          Team: <span className="text-white font-bold">{comp.teamName}</span> •{' '}
          {comp.matchesCount} Matches
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {/* PPG */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-lime-300">Points Per Game</span>
            <span className="font-mono text-lime-400">
              {comp.mvpPtsAvg} PPG{' '}
              <span className="text-indigo-300 text-[9px] font-normal">
                (vs {comp.teamPtsAvg} avg)
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-indigo-900 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(comp.mvpPtsAvg / maxPts) * 100}%` }}
            />
          </div>
        </div>

        {/* RPG */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-indigo-200">Rebounds</span>
            <span className="font-mono text-indigo-200">
              {comp.mvpRebAvg} RPG{' '}
              <span className="text-indigo-400 text-[9px] font-normal">
                (vs {comp.teamRebAvg} avg)
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-indigo-900 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(comp.mvpRebAvg / maxReb) * 100}%` }}
            />
          </div>
        </div>

        {/* APG */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-cyan-300">Assists</span>
            <span className="font-mono text-cyan-300">
              {comp.mvpAstAvg} APG{' '}
              <span className="text-indigo-400 text-[9px] font-normal">
                (vs {comp.teamAstAvg} avg)
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-indigo-900 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${(comp.mvpAstAvg / maxAst) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between text-[10px] text-indigo-300/80 font-medium border-t border-white/10">
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
          <span>MVP Athlete</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          <span>Team Average</span>
        </span>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════
   VISUAL TOURNAMENT BRACKET (INLINE COMPONENT)
   ═══════════════════════════════════════════ */
interface VisualTournamentBracketProps {
  tournament: Tournament;
  onUpdateMatchScore?: (
    tournamentId: string,
    matchId: string,
    score1: number,
    score2: number,
    winnerId?: string,
    boxScores?: PlayerBoxScore[]
  ) => void;
  onSetEditingMatch?: (
    editing: { tournamentId: string; match: TournamentMatch } | null
  ) => void;
  hoveredMatchId?: string | null;
  setHoveredMatchId?: (id: string | null) => void;
  toggleMatchExpanded?: (id: string, e: React.MouseEvent) => void;
  expandedMatchIds?: Record<string, boolean>;
}

const VisualTournamentBracket: React.FC<VisualTournamentBracketProps> = ({
  tournament,
  onSetEditingMatch,
}) => {
  const [bracketMode, setBracketMode] = useState<'visual_tree' | 'compact_list'>(
    'visual_tree'
  );
  const [mvpModalMatch, setMvpModalMatch] = useState<TournamentMatch | null>(null);
  const [selectedMvpPlayer, setSelectedMvpPlayer] = useState<string>('');
  const [mvpVotes, setMvpVotes] = useState<
    Record<string, { playerName: string; votes: number }>
  >({});
  const [mvpToast, setMvpToast] = useState<string | null>(null);

  const displayMatches = useMemo(() => {
    if (tournament.matches && tournament.matches.length > 0) {
      return tournament.matches;
    }

    const teams = tournament.registeredTeams || [];
    const generated: TournamentMatch[] = [];

    generated.push({
      id: `gen_m1`,
      tournamentId: tournament.id,
      round: 1,
      roundName: 'Semifinal #1',
      matchNumber: 1,
      status: 'scheduled',
      scheduledTime: '10:00 AM',
      team1:
        teams[0] ||
        ({
          id: 't1',
          name: 'Seed 1 (Pending)',
          seed: 1,
          captainName: 'TBD',
          members: [],
        } as TournamentTeam),
      team2:
        teams[3] ||
        teams[1] ||
        ({
          id: 't4',
          name: 'Seed 4 (Pending)',
          seed: 4,
          captainName: 'TBD',
          members: [],
        } as TournamentTeam),
      score1: 0,
      score2: 0,
    });

    generated.push({
      id: `gen_m2`,
      tournamentId: tournament.id,
      round: 1,
      roundName: 'Semifinal #2',
      matchNumber: 2,
      status: 'scheduled',
      scheduledTime: '11:30 AM',
      team1:
        teams[1] ||
        ({
          id: 't2',
          name: 'Seed 2 (Pending)',
          seed: 2,
          captainName: 'TBD',
          members: [],
        } as TournamentTeam),
      team2:
        teams[2] ||
        ({
          id: 't3',
          name: 'Seed 3 (Pending)',
          seed: 3,
          captainName: 'TBD',
          members: [],
        } as TournamentTeam),
      score1: 0,
      score2: 0,
    });

    generated.push({
      id: `gen_m3`,
      tournamentId: tournament.id,
      round: 2,
      roundName: 'Championship Final 🏆',
      matchNumber: 3,
      status: 'scheduled',
      scheduledTime: '2:00 PM',
      score1: 0,
      score2: 0,
    });

    return generated;
  }, [tournament]);

  const roundNumbers = useMemo(() => {
    const rounds = Array.from(new Set(displayMatches.map((m) => m.round))).sort(
      (a, b) => a - b
    );
    return rounds.length > 0 ? rounds : [1, 2];
  }, [displayMatches]);

  const championMatch = displayMatches.find(
    (m) => m.round === Math.max(...roundNumbers) && m.status === 'completed'
  );
  const championTeam = championMatch?.winnerId
    ? championMatch.team1?.id === championMatch.winnerId
      ? championMatch.team1
      : championMatch.team2
    : null;

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a3e635', '#38bdf8', '#f59e0b', '#ec4899'],
      });
    } catch {
      /* ignore */
    }
  };

  const handleCastMvpVote = (match: TournamentMatch, playerName: string) => {
    if (!playerName) return;
    const current = mvpVotes[match.id] || { playerName, votes: 0 };
    const updated = { playerName, votes: current.votes + 1 };
    setMvpVotes((prev) => ({ ...prev, [match.id]: updated }));
    setMvpToast(
      `🌟 Voted for ${playerName} as Standout MVP for Match #${match.matchNumber}!`
    );
    triggerCelebration();
    setMvpModalMatch(null);
    setTimeout(() => setMvpToast(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/80 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-lime-400 text-black rounded-xl">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase italic text-white">
              Visual Tournament Bracket
            </h4>
            <p className="text-[10px] text-indigo-300">
              {(tournament.registeredTeams || []).length} Teams •{' '}
              {displayMatches.length} Matches
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-indigo-900/80 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setBracketMode('visual_tree')}
              className={`px-3 py-1 rounded-lg uppercase transition ${
                bracketMode === 'visual_tree'
                  ? 'bg-lime-400 text-black font-black shadow'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              Visual 🌳
            </button>
            <button
              type="button"
              onClick={() => setBracketMode('compact_list')}
              className={`px-3 py-1 rounded-lg uppercase transition ${
                bracketMode === 'compact_list'
                  ? 'bg-lime-400 text-black font-black shadow'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              List 📋
            </button>
          </div>

          {championTeam && (
            <button
              type="button"
              onClick={triggerCelebration}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-lime-400 text-black font-black uppercase text-[10px] rounded-xl shadow-lg transition flex items-center space-x-1"
            >
              <Crown className="w-3.5 h-3.5 fill-black" />
              <span>Celebrate 🎉</span>
            </button>
          )}
        </div>
      </div>

      {/* Bracket Canvas */}
      {bracketMode === 'visual_tree' ? (
        <div className="bg-indigo-950/60 p-6 rounded-2xl border border-white/10 overflow-x-auto">
          <div className="flex items-center space-x-8 min-w-max">
            {roundNumbers.map((roundNum) => {
              const roundMatches = displayMatches.filter(
                (m) => m.round === roundNum
              );
              const roundLabel =
                roundMatches[0]?.roundName ||
                (roundNum === Math.max(...roundNumbers)
                  ? 'Championship Final 🏆'
                  : `Round ${roundNum}`);

              return (
                <div
                  key={roundNum}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="px-3 py-1 bg-lime-400/20 text-lime-300 text-[10px] font-black uppercase rounded-full border border-lime-400/40">
                    {roundLabel}
                  </div>

                  <div className="flex flex-col justify-around space-y-4">
                    {roundMatches.map((m) => {
                      const isCompleted = m.status === 'completed';
                      const team1Won = m.winnerId === m.team1?.id;
                      const team2Won = m.winnerId === m.team2?.id;

                      return (
                        <div
                          key={m.id}
                          className="w-64 bg-indigo-950 rounded-2xl border-2 border-indigo-800 hover:border-lime-400/60 transition shadow-xl p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[9px] text-indigo-300 font-bold">
                            <span>Match #{m.matchNumber}</span>
                            <span className="text-indigo-400 font-mono">
                              {m.scheduledTime || 'TBD'}
                            </span>
                          </div>

                          {/* Team 1 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                              team1Won
                                ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                                : 'bg-indigo-900/60 text-white'
                            }`}
                          >
                            <span className="truncate">
                              {m.team1?.name || 'TBD'}
                            </span>
                            <span className="font-mono font-black text-sm ml-2">
                              {m.score1 ?? 0}
                            </span>
                          </div>

                          {/* Team 2 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                              team2Won
                                ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                                : 'bg-indigo-900/60 text-white'
                            }`}
                          >
                            <span className="truncate">
                              {m.team2?.name || 'TBD'}
                            </span>
                            <span className="font-mono font-black text-sm ml-2">
                              {m.score2 ?? 0}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() =>
                                onSetEditingMatch?.({
                                  tournamentId: tournament.id,
                                  match: m,
                                })
                              }
                              className="text-[10px] text-lime-400 hover:underline font-black uppercase flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Score</span>
                            </button>

                            {isCompleted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMvpModalMatch(m);
                                  const t1 =
                                    m.team1?.members?.map((mem: any) =>
                                      typeof mem === 'string' ? mem : mem.name
                                    ) || [];
                                  const t2 =
                                    m.team2?.members?.map((mem: any) =>
                                      typeof mem === 'string' ? mem : mem.name
                                    ) || [];
                                  setSelectedMvpPlayer(
                                    t1[0] || t2[0] || m.team1?.captainName || ''
                                  );
                                }}
                                className="text-[10px] text-amber-300 hover:underline font-black uppercase flex items-center space-x-1"
                              >
                                <Crown className="w-3 h-3" />
                                <span>Vote MVP</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-indigo-900/30 p-4 rounded-2xl border border-white/5">
          {displayMatches.map((m) => (
            <div
              key={m.id}
              className="p-3 bg-indigo-950 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-900 text-lime-400 font-black flex items-center justify-center text-xs shrink-0">
                  #{m.matchNumber}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-white">
                      {m.roundName || `Round ${m.round}`}
                    </span>
                    <span className="text-[10px] text-indigo-300 font-mono">
                      • {m.scheduledTime || 'TBD'}
                    </span>
                  </div>
                  <div className="text-xs text-indigo-200 mt-0.5 font-bold">
                    <span
                      className={
                        m.winnerId === m.team1?.id ? 'text-lime-400' : ''
                      }
                    >
                      {m.team1?.name || 'TBD'} ({m.score1 ?? 0})
                    </span>{' '}
                    vs{' '}
                    <span
                      className={
                        m.winnerId === m.team2?.id ? 'text-lime-400' : ''
                      }
                    >
                      {m.team2?.name || 'TBD'} ({m.score2 ?? 0})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSetEditingMatch?.({ tournamentId: tournament.id, match: m })
                }
                className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-lime-400" />
                <span>Update Score</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {mvpToast && (
        <div className="p-3 bg-amber-400 text-black text-xs font-black uppercase rounded-2xl shadow-xl border border-amber-300 flex items-center justify-between">
          <span>{mvpToast}</span>
          <button
            onClick={() => setMvpToast(null)}
            className="text-black font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* MVP Voting Modal */}
      <AnimatePresence>
        {mvpModalMatch && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-indigo-950 border-2 border-amber-400/50 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-400 text-black rounded-xl">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase">
                      Vote Match MVP 🌟
                    </h3>
                    <p className="text-[10px] text-indigo-300">
                      {mvpModalMatch.roundName} • {mvpModalMatch.score1} -{' '}
                      {mvpModalMatch.score2}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMvpModalMatch(null)}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[mvpModalMatch.team1, mvpModalMatch.team2].map((team, ti) => {
                  if (!team) return null;
                  const members =
                    team.members?.map((mem: any) =>
                      typeof mem === 'string' ? mem : mem.name
                    ) || [];
                  const list = members.length
                    ? members
                    : [team.captainName || `${team.name} Star`];

                  return (
                    <div key={ti}>
                      <div className="text-[10px] font-black uppercase text-lime-400 py-1">
                        {team.name}
                      </div>
                      {list.map((pName, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => setSelectedMvpPlayer(pName)}
                          className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between border transition mb-1 ${
                            selectedMvpPlayer === pName
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-indigo-900/60 text-white border-white/10'
                          }`}
                        >
                          <span>{pName}</span>
                          {selectedMvpPlayer === pName && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMvpModalMatch(null)}
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleCastMvpVote(mvpModalMatch, selectedMvpPlayer)
                  }
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-1"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Submit Vote</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════
   TOURNAMENT LEADERBOARD SECTION
   ═══════════════════════════════════════════ */
interface TournamentLeaderboardSectionProps {
  tournaments: Tournament[];
  leaderboardMode: 'teams' | 'players';
  setLeaderboardMode: (mode: 'teams' | 'players') => void;
  selectedLeaderboardTournament: string;
  setSelectedLeaderboardTournament: (id: string) => void;
  leaderboardSearch: string;
  setLeaderboardSearch: (search: string) => void;
  selectedSport: string;
}

const TournamentLeaderboardSection: React.FC<
  TournamentLeaderboardSectionProps
> = ({
  tournaments,
  leaderboardMode,
  setLeaderboardMode,
  selectedLeaderboardTournament,
  setSelectedLeaderboardTournament,
  leaderboardSearch,
  setLeaderboardSearch,
  selectedSport,
}) => {
  const activeTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchSport = selectedSport === 'all' || t.sport === selectedSport;
      const matchId =
        selectedLeaderboardTournament === 'all' ||
        t.id === selectedLeaderboardTournament;
      return matchSport && matchId;
    });
  }, [tournaments, selectedSport, selectedLeaderboardTournament]);

  const teamStandings = useMemo(() => {
    const map: Record<string, any> = {};

    activeTournaments.forEach((t) => {
      (t.registeredTeams || []).forEach((team) => {
        const key = `${team.id}_${t.id}`;
        map[key] = {
          teamId: team.id,
          teamName: team.name,
          seed: team.seed || 1,
          tournamentTitle: t.title,
          sport: t.sport,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          ptsScored: 0,
          ptsAllowed: 0,
        };
      });

      t.matches.forEach((m) => {
        if (m.status === 'completed' && m.team1 && m.team2) {
          const k1 = `${m.team1.id}_${t.id}`;
          const k2 = `${m.team2.id}_${t.id}`;
          const s1 = m.score1 || 0;
          const s2 = m.score2 || 0;

          if (map[k1]) {
            map[k1].matchesPlayed += 1;
            map[k1].ptsScored += s1;
            map[k1].ptsAllowed += s2;
            if (m.winnerId === m.team1.id || s1 > s2) map[k1].wins += 1;
            else map[k1].losses += 1;
          }

          if (map[k2]) {
            map[k2].matchesPlayed += 1;
            map[k2].ptsScored += s2;
            map[k2].ptsAllowed += s1;
            if (m.winnerId === m.team2.id || s2 > s1) map[k2].wins += 1;
            else map[k2].losses += 1;
          }
        }
      });
    });

    let list = Object.values(map);
    if (leaderboardSearch) {
      list = list.filter(
        (t: any) =>
          t.teamName.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
          t.tournamentTitle
            .toLowerCase()
            .includes(leaderboardSearch.toLowerCase())
      );
    }

    return list.sort((a: any, b: any) => {
      const winRateA = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
      const winRateB = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
      if (winRateB !== winRateA) return winRateB - winRateA;
      const diffA = a.ptsScored - a.ptsAllowed;
      const diffB = b.ptsScored - b.ptsAllowed;
      return diffB - diffA;
    });
  }, [activeTournaments, leaderboardSearch]);

  const playerLeaders = useMemo(() => {
    const map: Record<string, any> = {};

    activeTournaments.forEach((t) => {
      t.matches.forEach((m) => {
        if (m.status === 'completed' && m.boxScores && m.boxScores.length > 0) {
          m.boxScores.forEach((bs) => {
            const key = bs.playerName;
            if (!map[key]) {
              map[key] = {
                playerName: bs.playerName,
                teamName: bs.teamName || 'Roster',
                tournamentTitle: t.title,
                sport: t.sport,
                gamesPlayed: 0,
                totalPts: 0,
                totalKills: 0,
                totalAces: 0,
                totalBlocks: 0,
                totalDigs: 0,
                totalAst: 0,
                totalReb: 0,
                totalStl: 0,
              };
            }
            map[key].gamesPlayed += 1;
            map[key].totalPts += bs.pts || 0;
            map[key].totalKills += bs.kills || 0;
            map[key].totalAces += bs.aces || 0;
            map[key].totalBlocks += bs.blocks || 0;
            map[key].totalDigs += bs.digs || 0;
            map[key].totalAst += bs.ast || 0;
            map[key].totalReb += bs.reb || 0;
            map[key].totalStl += bs.stl || 0;
          });
        }
      });
    });

    let list = Object.values(map);
    if (leaderboardSearch) {
      list = list.filter(
        (p: any) =>
          p.playerName.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
          p.teamName.toLowerCase().includes(leaderboardSearch.toLowerCase())
      );
    }

    return list.sort((a: any, b: any) => {
      const scoringA = a.totalPts + a.totalKills;
      const scoringB = b.totalPts + b.totalKills;
      return scoringB - scoringA;
    });
  }, [activeTournaments, leaderboardSearch]);

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-amber-950 via-indigo-950 to-amber-950 rounded-3xl border border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1">
            <Crown className="w-4 h-4" />
            <span>Official Standings</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">
            Tournament Leaderboard
          </h2>
        </div>

        <div className="flex items-center space-x-2 bg-indigo-950/80 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setLeaderboardMode('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic transition flex items-center space-x-2 ${
              leaderboardMode === 'teams'
                ? 'bg-amber-400 text-black shadow-lg'
                : 'text-indigo-200 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams</span>
          </button>

          <button
            onClick={() => setLeaderboardMode('players')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic transition flex items-center space-x-2 ${
              leaderboardMode === 'players'
                ? 'bg-amber-400 text-black shadow-lg'
                : 'text-indigo-200 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Players</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-indigo-900/60 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search..."
            value={leaderboardSearch}
            onChange={(e) => setLeaderboardSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <select
          value={selectedLeaderboardTournament}
          onChange={(e) => setSelectedLeaderboardTournament(e.target.value)}
          className="p-2 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-400 max-w-xs"
        >
          <option value="all">All Tournaments ({tournaments.length})</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.sport})
            </option>
          ))}
        </select>
      </div>

      {leaderboardMode === 'teams' ? (
        <div className="bg-indigo-950/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {teamStandings.length === 0 ? (
            <div className="p-8 text-center text-xs text-indigo-300">
              No teams found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-indigo-900/90 text-indigo-200 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Team</th>
                    <th className="p-4">Tournament</th>
                    <th className="p-4 text-center">MP</th>
                    <th className="p-4 text-center">W-L</th>
                    <th className="p-4 text-center">Win%</th>
                    <th className="p-4 text-center">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teamStandings.map((t: any, idx: number) => {
                    const wr =
                      t.matchesPlayed > 0
                        ? Math.round((t.wins / t.matchesPlayed) * 100)
                        : 0;
                    const diff = t.ptsScored - t.ptsAllowed;
                    return (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-4 font-mono font-black">
                          {idx === 0
                            ? '🥇 #1'
                            : idx === 1
                            ? '🥈 #2'
                            : idx === 2
                            ? '🥉 #3'
                            : `#${idx + 1}`}
                        </td>
                        <td className="p-4 font-black text-white">
                          {t.teamName}
                        </td>
                        <td className="p-4 text-indigo-200">
                          {t.tournamentTitle}
                        </td>
                        <td className="p-4 text-center font-mono">
                          {t.matchesPlayed}
                        </td>
                        <td className="p-4 text-center font-mono text-lime-400">
                          {t.wins}-{t.losses}
                        </td>
                        <td className="p-4 text-center font-mono font-black text-amber-400">
                          {wr}%
                        </td>
                        <td
                          className={`p-4 text-center font-mono font-black ${
                            diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {diff >= 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-indigo-950/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {playerLeaders.length === 0 ? (
            <div className="p-8 text-center text-xs text-indigo-300">
              No players found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-indigo-900/90 text-indigo-200 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">Team</th>
                    <th className="p-4 text-center">GP</th>
                    <th className="p-4 text-center">PTS</th>
                    <th className="p-4 text-center">AST</th>
                    <th className="p-4 text-center">REB</th>
                    <th className="p-4 text-center">MVP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {playerLeaders.map((p: any, idx: number) => {
                    const mvpScore = Math.round(
                      p.totalPts * 1.5 +
                        p.totalKills * 1.5 +
                        p.totalAst * 2 +
                        (p.totalReb + p.totalDigs) * 1.2 +
                        (p.totalBlocks + p.totalStl) * 2
                    );

                    return (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-4 font-mono font-black">
                          {idx === 0
                            ? '🥇 #1'
                            : idx === 1
                            ? '🥈 #2'
                            : idx === 2
                            ? '🥉 #3'
                            : `#${idx + 1}`}
                        </td>
                        <td className="p-4 font-black text-white flex items-center space-x-2">
                          <span>{p.playerName}</span>
                          {idx === 0 && <span className="text-amber-400">👑</span>}
                        </td>
                        <td className="p-4 text-indigo-200">{p.teamName}</td>
                        <td className="p-4 text-center font-mono">
                          {p.gamesPlayed}
                        </td>
                        <td className="p-4 text-center font-mono font-black text-lime-400">
                          {p.totalPts + p.totalKills}
                        </td>
                        <td className="p-4 text-center font-mono text-cyan-300">
                          {p.totalAst}
                        </td>
                        <td className="p-4 text-center font-mono text-indigo-200">
                          {p.totalReb + p.totalDigs}
                        </td>
                        <td className="p-4 text-center font-mono font-black text-amber-400 bg-amber-400/10 rounded-xl">
                          {mvpScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
interface TournamentsViewProps {
  courts: CourtPOI[];
  user?: AthleteProfile;
  onUpdateUser?: (updated: Partial<AthleteProfile>) => void;
  onSelectCourtOnMap?: (courtId: string) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  courts,
  user,
  onUpdateUser,
  onSelectCourtOnMap,
}) => {
  /* ───── Core State ───── */
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* ───── Modals ───── */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [showRegisterModal, setShowRegisterModal] = useState<string | null>(
    null
  );
  const [regTeamName, setRegTeamName] = useState('');
  const [regCaptainName, setRegCaptainName] = useState('');
  const [regMember1, setRegMember1] = useState('');
  const [regMember2, setRegMember2] = useState('');
  const [regMember3, setRegMember3] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [editingMatch, setEditingMatch] = useState<{
    tournamentId: string;
    match: TournamentMatch;
  } | null>(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [editingPrizePoolTournament, setEditingPrizePoolTournament] =
    useState<Tournament | null>(null);
  const [editPrizePoolInput, setEditPrizePoolInput] = useState('');

  /* ───── UI State ───── */
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ───── Location ───── */
  const [locationFilter, setLocationFilter] = useState<
    'all' | 'my_state' | 'my_city'
  >('all');
  const [maxDistanceMiles, setMaxDistanceMiles] = useState<number>(50);
  const [stateSearch, setStateSearch] = useState<string>('all');
  const [citySearch, setCitySearch] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [userRegState, setUserRegState] = useState<string>(
    user?.registeredState || 'NY'
  );
  const [userRegCity, setUserRegCity] = useState<string>(
    user?.registeredCity || 'New York'
  );

  /* ───── Ticker ───── */
  const [isTickerPaused, setIsTickerPaused] = useState(false);

  /* ───── View Tab ───── */
  const [viewTab, setViewTab] = useState<
    'current' | 'calendar' | 'history' | 'leaderboard'
  >('current');
  const [isLiveDrawerOpen, setIsLiveDrawerOpen] = useState(false);

  /* ───── Search + Filter ───── */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  /* ───── Current/Hub ───── */
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);
  const [hubSubTab, setHubSubTab] = useState<'bracket' | 'radar' | 'roster'>(
    'bracket'
  );
  const [compareTeam1Id, setCompareTeam1Id] = useState<string>('');
  const [compareTeam2Id, setCompareTeam2Id] = useState<string>('');
  const [expandedMatchIds, setExpandedMatchIds] = useState<
    Record<string, boolean>
  >({});
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  /* ───── Leaderboard ───── */
  const [leaderboardMode, setLeaderboardMode] = useState<'teams' | 'players'>(
    'teams'
  );
  const [selectedLeaderboardTournament, setSelectedLeaderboardTournament] =
    useState<string>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');

  /* ───── Status Board / Payment / Share / Bulk / PDF / Live Feed ───── */
  const [statusBoardFilter, setStatusBoardFilter] = useState<
    'all' | 'match' | 'prize' | 'deadline' | 'payment'
  >('all');
  const [statusBoardAlerts, setStatusBoardAlerts] = useState<any[]>([
    {
      id: 'sb_1',
      tournamentId: '',
      tournamentTitle: 'Rucker Park Summer 3v3 Showdown',
      type: 'match',
      title: '⚡ Semifinal Finalized',
      message:
        'Harlem Kings defeated The Cage Vipers (21 - 15) in Semifinal #1.',
      timestamp: 'Just now',
      badgeColor: 'bg-lime-400 text-black',
    },
    {
      id: 'sb_2',
      tournamentId: '',
      tournamentTitle: 'Rucker Park Summer 3v3 Showdown',
      type: 'prize',
      title: '🏆 Prize Pool Boosted',
      message: 'Purse increased to $1,000 Cash + Championship Ring!',
      timestamp: '15 mins ago',
      badgeColor: 'bg-amber-400 text-black',
    },
    {
      id: 'sb_3',
      tournamentId: '',
      tournamentTitle: 'Rucker Park Summer 3v3 Showdown',
      type: 'deadline',
      title: '⏰ Registration Deadline Approaching',
      message: 'Only 1 team slot left!',
      timestamp: '1 hour ago',
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'sb_4',
      tournamentId: '',
      tournamentTitle: 'Rucker Park Summer 3v3 Showdown',
      type: 'payment',
      title: '💳 Entry Fee Paid & Verified',
      message: 'Harlem Kings paid $20 entry fee.',
      timestamp: '2 hours ago',
      badgeColor: 'bg-cyan-400 text-black',
    },
  ]);

  const [payingTeamData, setPayingTeamData] = useState<{
    tournament: Tournament;
    team: TournamentTeam;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'cashapp'>(
    'card'
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [shareModalTournament, setShareModalTournament] =
    useState<Tournament | null>(null);
  const [sharePostText, setSharePostText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState<string | null>(null);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkTab, setBulkTab] = useState<'paste' | 'upload'>('paste');
  const [bulkParsedTeams, setBulkParsedTeams] = useState<
    Array<{
      name: string;
      captainName: string;
      member1: string;
      member2: string;
      valid: boolean;
      error?: string;
    }>
  >([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const [pdfReportTournament, setPdfReportTournament] =
    useState<Tournament | null>(null);

  const [liveFeedFilter, setLiveFeedFilter] = useState<
    'all' | 'results' | 'mvp' | 'registrations'
  >('all');
  const [feedReactions, setFeedReactions] = useState<Record<string, number>>({});

  /* ───── Court Map State ───── */
  const [selectedMapCourtId, setSelectedMapCourtId] = useState<string | null>(
    null
  );
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapFilterSport, setMapFilterSport] = useState<string>('all');

  /* ───── Create Form ───── */
  const [newTitle, setNewTitle] = useState('');
  const [newSport, setNewSport] = useState('basketball');
  const [newCourtId, setNewCourtId] = useState(courts[0]?.id || '');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newFormat, setNewFormat] = useState('single_elimination');
  const [newMaxTeams, setNewMaxTeams] = useState(4);
  const [newStartDate, setNewStartDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [newEndDate, setNewEndDate] = useState('');
  const [newPrizePool, setNewPrizePool] = useState('');
  const [newEntryFee, setNewEntryFee] = useState('Free');
  const [newDescription, setNewDescription] = useState('');
  const [newRules, setNewRules] = useState('');
  const [newPrizeFirst, setNewPrizeFirst] = useState('$500 Cash');
  const [newPrizeSecond, setNewPrizeSecond] = useState('$250 Cash');
  const [newPrizeThird, setNewPrizeThird] = useState('$150 Gear Voucher');
  const [newPrizeMvp, setNewPrizeMvp] = useState('$100 Pro Shop Credit');

  /* ───── Toast ───── */
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  /* ═══════════════════════════════════════════
     FETCH TOURNAMENTS
     ═══════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(null);

    (async () => {
      try {
        const dtos = await fetchTournamentsAPI();
        if (cancelled) return;
        const mapped = dtos.map(mapDTOToTournament);
        setTournaments(mapped);
        if (mapped.length > 0) {
          setSelectedTournamentId((prev) => prev || mapped[0].id);
        }
      } catch (err: any) {
        console.error('❌ Load tournaments failed:', err);
        if (!cancelled)
          setFetchError(err?.message || 'Failed to load tournaments');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ───── Prefill city/state ───── */
  useEffect(() => {
    if (!newCourtId) return;
    const selectedCourt = courts.find((c) => c.id === newCourtId);
    if (selectedCourt) {
      setNewCity(selectedCourt.city || '');
      setNewState(selectedCourt.state || '');
      setNewAddress(selectedCourt.address || '');
    }
  }, [newCourtId, courts]);

  /* ───── Sync user location ───── */
  useEffect(() => {
    if (user?.registeredCity) setUserRegCity(user.registeredCity);
    if (user?.registeredState) setUserRegState(user.registeredState);
  }, [user?.registeredCity, user?.registeredState]);

  /* ═══════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════ */
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          t.title.toLowerCase().includes(q) ||
          (t.courtName || '').toLowerCase().includes(q) ||
          (t.organizerName || '').toLowerCase().includes(q) ||
          (t.address || '').toLowerCase().includes(q) ||
          (t.city || '').toLowerCase().includes(q) ||
          (t.state || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (selectedSport !== 'all' && t.sport !== selectedSport) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      let matchesLocation = true;

      if (locationFilter === 'my_city') {
        const uCity = (user?.registeredCity || userRegCity || '').toLowerCase();
        const tCity = (t.city || '').toLowerCase();
        matchesLocation =
          tCity.includes(uCity) ||
          (t.address || '').toLowerCase().includes(uCity);
      } else if (locationFilter === 'my_state') {
        const uState = (
          user?.registeredState ||
          userRegState ||
          ''
        ).toLowerCase();
        const tState = (t.state || '').toLowerCase();
        matchesLocation =
          tState === uState ||
          (t.address || '').toLowerCase().includes(uState);
      }

      if (stateSearch !== 'all') {
        const sQuery = stateSearch.toLowerCase();
        const tState = (t.state || '').toLowerCase();
        if (
          tState !== sQuery &&
          !(t.address || '').toLowerCase().includes(sQuery)
        ) {
          matchesLocation = false;
        }
      }

      if (citySearch.trim()) {
        const cQuery = citySearch.trim().toLowerCase();
        const tCity = (t.city || '').toLowerCase();
        if (
          !tCity.includes(cQuery) &&
          !(t.address || '').toLowerCase().includes(cQuery)
        ) {
          matchesLocation = false;
        }
      }

      let estMiles = 75;
      const uCity = (
        user?.registeredCity ||
        userRegCity ||
        'New York'
      ).toLowerCase();
      const uState = (
        user?.registeredState ||
        userRegState ||
        'NY'
      ).toLowerCase();
      const matchedCourt = courts.find(
        (c) =>
          c.id === t.courtId ||
          c.name.toLowerCase() === (t.courtName || '').toLowerCase()
      );

      if (matchedCourt && matchedCourt.distanceKm !== undefined) {
        estMiles = matchedCourt.distanceKm * 0.621371;
      } else if (t.city && t.city.toLowerCase().includes(uCity)) {
        estMiles = 3;
      } else if (t.state && t.state.toLowerCase() === uState) {
        estMiles = 22;
      } else if ((t.address || '').toLowerCase().includes(uCity)) {
        estMiles = 5;
      }

      const matchesDistance =
        maxDistanceMiles >= 100 || estMiles <= maxDistanceMiles;

      return matchesLocation && matchesDistance;
    });
  }, [
    tournaments,
    searchQuery,
    selectedSport,
    selectedStatus,
    locationFilter,
    stateSearch,
    citySearch,
    maxDistanceMiles,
    user?.registeredCity,
    user?.registeredState,
    userRegCity,
    userRegState,
    courts,
  ]);

  const allLiveMatches = useMemo(() => {
    const list: Array<{ match: any; tournament: Tournament }> = [];
    tournaments.forEach((t) => {
      (t.matches || []).forEach((m: any) => {
        list.push({ match: m, tournament: t });
      });
    });

    return list.sort((a, b) => {
      const rank: any = { in_progress: 0, completed: 1, scheduled: 2 };
      return (rank[a.match.status] ?? 3) - (rank[b.match.status] ?? 3);
    });
  }, [tournaments]);

  const tabCounts = useMemo(
    () => ({
      active: tournaments.filter((t) => t.status !== 'completed').length,
      history: tournaments.filter((t) => t.status === 'completed').length,
    }),
    [tournaments]
  );

  const calendarTournaments = useMemo(() => {
    return tournaments
      .filter((t) => t.status !== 'completed')
      .filter((t) => selectedSport === 'all' || t.sport === selectedSport)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }, [tournaments, selectedSport]);

  const teamWinRateData = useMemo(() => {
    const statsMap: Record<string, any> = {};

    tournaments.forEach((t) => {
      (t.matches || []).forEach((m) => {
        if (m.status === 'completed' && m.team1 && m.team2 && m.winnerId) {
          const t1 = m.team1.name;
          const t2 = m.team2.name;
          if (!statsMap[t1])
            statsMap[t1] = { teamName: t1, wins: 0, losses: 0, matches: 0 };
          if (!statsMap[t2])
            statsMap[t2] = { teamName: t2, wins: 0, losses: 0, matches: 0 };
          statsMap[t1].matches += 1;
          statsMap[t2].matches += 1;
          if (m.winnerId === m.team1.id) {
            statsMap[t1].wins += 1;
            statsMap[t2].losses += 1;
          } else if (m.winnerId === m.team2.id) {
            statsMap[t2].wins += 1;
            statsMap[t1].losses += 1;
          }
        }
      });
      (t.registeredTeams || []).forEach((team) => {
        if (!statsMap[team.name]) {
          statsMap[team.name] = {
            teamName: team.name,
            wins: 1,
            losses: 1,
            matches: 2,
          };
        }
      });
    });

    return Object.values(statsMap)
      .map((s: any) => ({
        teamName: s.teamName,
        wins: s.wins,
        losses: s.losses,
        totalMatches: s.matches,
        winRate: s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0,
      }))
      .sort((a: any, b: any) => b.winRate - a.winRate || b.wins - a.wins);
  }, [tournaments]);

  const liveFeedItems = useMemo(() => {
    const items: any[] = [];

    tournaments.forEach((t) => {
      (t.registeredTeams || []).forEach((team, idx) => {
        items.push({
          id: `reg_${t.id}_${team.id}`,
          type: 'registrations',
          title: '📝 New Team Registered',
          description: `"${team.name}" registered for ${t.title}`,
          timestamp: `${(idx + 1) * 14}m ago`,
          tournamentId: t.id,
          tournamentTitle: t.title,
        });
      });

      (t.matches || []).forEach((m) => {
        if (m.status === 'completed' && m.team1 && m.team2) {
          items.push({
            id: `match_${t.id}_${m.id}`,
            type: 'results',
            title: '🏆 Match Score Posted',
            description: `Match #${m.matchNumber}: ${m.team1.name} (${m.score1}) vs ${m.team2.name} (${m.score2})`,
            timestamp: `${m.matchNumber * 12}m ago`,
            tournamentId: t.id,
            tournamentTitle: t.title,
          });
        }
      });

      const mvp = computeTournamentMVP(t);
      if (mvp && (t.status === 'completed' || t.mvpPlayerName)) {
        items.push({
          id: `mvp_${t.id}`,
          type: 'mvp',
          title: '🎖️ Tournament MVP Awarded',
          description: `${mvp.playerName} named MVP of ${t.title}!`,
          timestamp: '1h ago',
          tournamentId: t.id,
          tournamentTitle: t.title,
        });
      }
    });

    return items;
  }, [tournaments]);

  const filteredLiveFeed = useMemo(() => {
    if (liveFeedFilter === 'all') return liveFeedItems;
    return liveFeedItems.filter((item) => item.type === liveFeedFilter);
  }, [liveFeedItems, liveFeedFilter]);

  const filteredMapCourts = useMemo(() => {
    return courts.filter(
      (c) => mapFilterSport === 'all' || c.sport === mapFilterSport
    );
  }, [courts, mapFilterSport]);

  const selectedCourtObj = useMemo(
    () => courts.find((c) => c.id === selectedMapCourtId) || null,
    [courts, selectedMapCourtId]
  );

  const activeTournament = useMemo(
    () =>
      tournaments.find((t) => t.id === selectedTournamentId) ||
      filteredTournaments[0] ||
      tournaments[0],
    [tournaments, selectedTournamentId, filteredTournaments]
  );

  const activeMVP = activeTournament ? computeTournamentMVP(activeTournament) : null;

  /* ═══════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════ */
  const toggleMatchExpanded = (matchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedMatchIds((prev) => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  /* ═══════════════════════════════════════════
     CREATE TOURNAMENT
     ═══════════════════════════════════════════ */
  const resetForm = () => {
    setNewTitle('');
    setNewSport('basketball');
    setNewCourtId(courts[0]?.id || '');
    setNewCity('');
    setNewState('');
    setNewAddress('');
    setNewFormat('single_elimination');
    setNewMaxTeams(4);
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate('');
    setNewPrizePool('');
    setNewEntryFee('Free');
    setNewDescription('');
    setNewRules('');
    setNewPrizeFirst('$500 Cash');
    setNewPrizeSecond('$250 Cash');
    setNewPrizeThird('$150 Gear Voucher');
    setNewPrizeMvp('$100 Pro Shop Credit');
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newTitle.trim()) return setCreateError('Title is required');
    if (!newCity.trim()) return setCreateError('City is required');
    if (!newState.trim()) return setCreateError('State is required');
    if (!newStartDate) return setCreateError('Start date is required');

    setIsCreating(true);
    try {
      const selectedCourt = courts.find((c) => c.id === newCourtId);

      const createdDTO = await createTournamentAPI({
        title: newTitle.trim(),
        sport: newSport,
        city: newCity.trim(),
        state: newState.trim().toUpperCase(),
        courtId: selectedCourt?.id || null,
        courtName: selectedCourt?.name || null,
        address: newAddress.trim() || selectedCourt?.address || null,
        description: newDescription.trim() || null,
        startDate: newStartDate,
        endDate: newEndDate || null,
        registrationDeadline: null,
        format: newFormat,
        status: 'registration_open',
        organizerId: user?.id || null,
        organizerName: user?.name || 'Playground Admin',
        organizerAvatar: user?.avatarUrl || user?.avatar || null,
        maxTeams: Number(newMaxTeams),
        prizePool: newPrizePool.trim() || null,
        entryFee: newEntryFee.trim() || 'Free',
        rules: newRules.trim() || null,
        prizeDistribution: {
          firstPlace: newPrizeFirst,
          secondPlace: newPrizeSecond,
          thirdPlace: newPrizeThird,
          mvpReward: newPrizeMvp,
        },
      });

      const created = mapDTOToTournament(createdDTO);
      setTournaments((prev) => [created, ...prev]);
      setSelectedTournamentId(created.id);
      setCreateSuccess(`Tournament "${created.title}" published! 🏆`);
      triggerToast(`Tournament "${created.title}" published! 🏆`);

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error('❌ Create failed:', err);
      setCreateError(err?.message || 'Failed to create tournament');
    } finally {
      setIsCreating(false);
    }
  };

  /* ═══════════════════════════════════════════
     REGISTER TEAM
     ═══════════════════════════════════════════ */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (!showRegisterModal) return;
    if (!regTeamName.trim()) return setRegisterError('Team name required');
    if (!regCaptainName.trim()) return setRegisterError('Captain required');

    setIsRegistering(true);
    try {
      const membersList = [regCaptainName.trim()];
      if (regMember1.trim()) membersList.push(regMember1.trim());
      if (regMember2.trim()) membersList.push(regMember2.trim());
      if (regMember3.trim()) membersList.push(regMember3.trim());

      const updatedDTO = await registerTeamAPI(showRegisterModal, {
        name: regTeamName.trim(),
        captainName: regCaptainName.trim(),
        members: membersList.map((name, idx) => ({
          id: `mem_${idx}_${Date.now()}`,
          name,
        })),
      });

      const updated = mapDTOToTournament(updatedDTO);
      setTournaments((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setSelectedTournamentId(updated.id);

      triggerToast(`Team "${regTeamName}" registered! 🚀`);
      setShowRegisterModal(null);
      setRegTeamName('');
      setRegCaptainName('');
      setRegMember1('');
      setRegMember2('');
      setRegMember3('');
    } catch (err: any) {
      console.error('❌ Register failed:', err);
      setRegisterError(err?.message || 'Failed to register');
    } finally {
      setIsRegistering(false);
    }
  };

  /* ═══════════════════════════════════════════
     UPDATE MATCH SCORE
     ═══════════════════════════════════════════ */
  const handleScoreSave = async () => {
    if (!editingMatch) return;
    setIsSavingScore(true);
    setScoreError(null);

    try {
      let winnerId: string | undefined;
      if (editScore1 > editScore2 && editingMatch.match.team1)
        winnerId = editingMatch.match.team1.id;
      else if (editScore2 > editScore1 && editingMatch.match.team2)
        winnerId = editingMatch.match.team2.id;

      const updatedDTO = await updateMatchScoreAPI(
        editingMatch.tournamentId,
        editingMatch.match.id,
        editScore1,
        editScore2,
        winnerId
      );
      const updated = mapDTOToTournament(updatedDTO);

      setTournaments((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );

      triggerToast('Match score saved! ✅');
      setEditingMatch(null);
    } catch (err: any) {
      console.error('❌ Save score failed:', err);
      setScoreError(err?.message || 'Failed to save');
    } finally {
      setIsSavingScore(false);
    }
  };

  /* ═══════════════════════════════════════════
     UPDATE PRIZE POOL
     ═══════════════════════════════════════════ */
  const handleSavePrizePool = async () => {
    if (!editingPrizePoolTournament || !editPrizePoolInput.trim()) return;

    try {
      const updatedDTO = await updatePrizePoolAPI(
        editingPrizePoolTournament.id,
        editPrizePoolInput.trim()
      );
      const updated = mapDTOToTournament(updatedDTO);

      setTournaments((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );

      triggerToast('Prize pool updated! 💰');
      setEditingPrizePoolTournament(null);
    } catch (err: any) {
      console.error('❌ Save prize failed:', err);
      triggerToast(err?.message || 'Failed to update');
    }
  };

  /* ═══════════════════════════════════════════
     BULK CSV
     ═══════════════════════════════════════════ */
  const handleParseBulkText = (text: string) => {
    setBulkInputText(text);
    if (!text.trim()) {
      setBulkParsedTeams([]);
      return;
    }

    const lines = text.split('\n');
    const parsed: any[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      if (idx === 0 && (lower.includes('team') || lower.includes('captain')))
        return;

      const parts = trimmed.split(/,|\t/).map((p) => p.trim());
      const name = parts[0] || '';
      const captainName = parts[1] || (name ? `${name} Capt` : 'Captain');
      const member1 = parts[2] || '';
      const member2 = parts[3] || '';

      if (!name) {
        parsed.push({
          name: '',
          captainName: '',
          member1: '',
          member2: '',
          valid: false,
          error: 'Team name required',
        });
      } else {
        parsed.push({ name, captainName, member1, member2, valid: true });
      }
    });

    setBulkParsedTeams(parsed);
  };

  const handleCsvFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleParseBulkText(text);
        triggerToast(`Loaded CSV: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'Team Name, Captain Name, Player 1, Player 2\n' +
      'Venom Elite, Marcus Vance, J. Cole, D. Booker\n' +
      'Harlem Kings, Kevin Durant, Steph Curry, Klay Thompson\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'tournament_teams_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('CSV template downloaded! 📄');
  };

  const handleConfirmBulkRegister = async (tournamentId: string) => {
    const validTeams = bulkParsedTeams.filter((t) => t.valid);
    if (validTeams.length === 0) {
      triggerToast('No valid teams.');
      return;
    }

    setIsBulkImporting(true);
    try {
      let latest: Tournament | null = null;

      for (const teamData of validTeams) {
        const membersList = [teamData.captainName];
        if (teamData.member1) membersList.push(teamData.member1);
        if (teamData.member2) membersList.push(teamData.member2);

        const updatedDTO = await registerTeamAPI(tournamentId, {
          name: teamData.name,
          captainName: teamData.captainName,
          members: membersList.map((name, idx) => ({
            id: `mem_bulk_${idx}_${Date.now()}`,
            name,
          })),
        });
        latest = mapDTOToTournament(updatedDTO);
      }

      if (latest) {
        setTournaments((prev) =>
          prev.map((t) => (t.id === latest!.id ? latest! : t))
        );
        setSelectedTournamentId(latest.id);
      }

      triggerToast(`Registered ${validTeams.length} teams! 🚀`);
      setShowBulkModal(null);
      setBulkInputText('');
      setBulkParsedTeams([]);
    } catch (err: any) {
      console.error('❌ Bulk register failed:', err);
      triggerToast(err?.message || 'Bulk register failed');
    } finally {
      setIsBulkImporting(false);
    }
  };

  /* ═══════════════════════════════════════════
     PAYMENT
     ═══════════════════════════════════════════ */
  const handleSimulatedPayment = () => {
    if (!payingTeamData) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const receiptId = `RCP-PAY-${Math.floor(10000 + Math.random() * 90000)}`;

      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== payingTeamData.tournament.id) return t;
          return {
            ...t,
            registeredTeams: t.registeredTeams.map((tm) =>
              tm.id === payingTeamData.team.id
                ? { ...tm, paymentStatus: 'Paid', paymentReceiptId: receiptId }
                : tm
            ),
          };
        })
      );

      try {
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#a3e635', '#38bdf8', '#f59e0b'],
        });
      } catch {}

      const newAlert = {
        id: `sb_${Date.now()}`,
        tournamentId: payingTeamData.tournament.id,
        tournamentTitle: payingTeamData.tournament.title,
        type: 'payment' as const,
        title: '💳 Payment Verified',
        message: `${payingTeamData.team.name} paid entry fee.`,
        timestamp: 'Just now',
        badgeColor: 'bg-emerald-400 text-black',
      };
      setStatusBoardAlerts((prev) => [newAlert, ...prev]);

      triggerToast(`Payment verified! ${payingTeamData.team.name} confirmed! 🎟️`);
      setIsProcessingPayment(false);
      setPayingTeamData(null);
    }, 1200);
  };

  /* ═══════════════════════════════════════════
     DOWNLOAD BRACKET
     ═══════════════════════════════════════════ */
  const handleDownloadBracket = (t: Tournament) => {
    setPdfReportTournament(t);
    triggerToast(`PDF Report Preview: ${t.title} 📄`);
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6 text-white pb-12">
      {/* ═══════════ HEADER BANNER ═══════════ */}
      <div className="p-6 bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Trophy className="w-72 h-72 text-lime-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-lime-400 text-xs font-black uppercase tracking-widest mb-1">
              <Swords className="w-4 h-4" />
              <span>Court Cups & Leagues</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
              Tournaments & Brackets
            </h1>
            <p className="text-indigo-200/80 text-xs md:text-sm mt-1 max-w-xl font-medium">
              Join bracket-style street elimination or round-robin group cups.
              Track live scores, seedings, and championship glory.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <span className="px-2.5 py-1 bg-indigo-900/80 border border-white/10 rounded-full text-[10px] font-bold text-indigo-200">
                🏆 {tournaments.length} Tournaments
              </span>
              {!isLoading &&
                tournaments.filter((t) => t.status === 'in_progress').length >
                  0 && (
                  <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-[10px] font-bold text-rose-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    {
                      tournaments.filter((t) => t.status === 'in_progress')
                        .length
                    }{' '}
                    Live
                  </span>
                )}
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="self-start md:self-auto px-5 py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic rounded-2xl shadow-lg shadow-lime-400/20 transition transform active:scale-95 flex items-center space-x-2 text-sm uppercase tracking-wider"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Organize Tournament</span>
          </button>
        </div>
      </div>

      {/* ═══════════ LOCATION BAR ═══════════ */}
      <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-400 text-black rounded-xl">
            <MapPin className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-cyan-300">
                REGISTERED ATHLETE LOCATION
              </span>
              <span className="px-2 py-0.5 bg-cyan-400/20 text-cyan-300 text-[10px] font-bold rounded-full">
                LOCAL MATCHING ACTIVE 📍
              </span>
            </div>
            <div className="text-sm font-black italic text-white flex items-center gap-2">
              <span>
                {user?.registeredCity || userRegCity},{' '}
                {user?.registeredState || userRegState}
              </span>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="text-xs text-lime-400 underline hover:text-lime-300 font-bold ml-2"
              >
                Change Registration City/State
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-lime-400 mr-1">
            Regional View:
          </span>
          <button
            type="button"
            onClick={() => {
              setLocationFilter('my_city');
              setStateSearch('all');
              setCitySearch('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              locationFilter === 'my_city'
                ? 'bg-lime-400 text-black shadow-md'
                : 'bg-indigo-900/80 text-indigo-200 hover:text-white'
            }`}
          >
            📍 Local ({user?.registeredCity || userRegCity})
          </button>
          <button
            type="button"
            onClick={() => {
              setLocationFilter('my_state');
              setStateSearch('all');
              setCitySearch('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              locationFilter === 'my_state'
                ? 'bg-lime-400 text-black shadow-md'
                : 'bg-indigo-900/80 text-indigo-200 hover:text-white'
            }`}
          >
            🏛️ Statewide ({user?.registeredState || userRegState})
          </button>
          <button
            type="button"
            onClick={() => {
              setLocationFilter('all');
              setStateSearch('all');
              setCitySearch('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              locationFilter === 'all' && stateSearch === 'all' && !citySearch
                ? 'bg-lime-400 text-black shadow-md'
                : 'bg-indigo-900/80 text-indigo-200 hover:text-white'
            }`}
          >
            🇺🇸 National
          </button>

          <div className="flex items-center space-x-2.5 bg-indigo-900/80 px-3 py-1.5 rounded-xl border border-white/10 ml-auto">
            <span className="text-[10px] uppercase font-black tracking-wider text-lime-400 shrink-0">
              Radius:{' '}
              <span className="font-mono text-white">
                {maxDistanceMiles >= 100 ? 'Any' : `${maxDistanceMiles} mi`}
              </span>
            </span>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={maxDistanceMiles}
              onChange={(e) => setMaxDistanceMiles(Number(e.target.value))}
              className="w-24 sm:w-32 h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-lime-400"
            />
          </div>
        </div>
      </div>

      {/* ═══════════ LIVE TICKER ═══════════ */}
      {allLiveMatches.length > 0 && (
        <div className="bg-slate-950/95 backdrop-blur-md border border-lime-400/40 rounded-2xl p-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 shrink-0">
            <div className="px-3 py-1 bg-gradient-to-r from-rose-500 via-amber-500 to-lime-400 text-black font-black text-[10px] uppercase italic rounded-xl flex items-center space-x-1.5 shadow-md">
              <Radio className="w-3.5 h-3.5 text-black animate-pulse" />
              <span>LIVE SCORES TICKER</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-mono font-bold hidden sm:inline">
              {
                allLiveMatches.filter((m) => m.match.status === 'in_progress')
                  .length
              }{' '}
              Live
            </span>
          </div>

          <div
            className="flex-1 w-full overflow-x-auto no-scrollbar flex items-center space-x-3 py-0.5"
            onMouseEnter={() => setIsTickerPaused(true)}
            onMouseLeave={() => setIsTickerPaused(false)}
          >
            {allLiveMatches.map(({ match, tournament }) => {
              const isInProgress = match.status === 'in_progress';
              const isCompleted = match.status === 'completed';

              return (
                <div
                  key={`ticker_${tournament.id}_${match.id}`}
                  onClick={() => {
                    setSelectedTournamentId(tournament.id);
                    setViewTab('current');
                    triggerToast(`Jumping to ${tournament.title}! 🏀`);
                  }}
                  className={`px-3 py-1.5 rounded-xl border transition shrink-0 flex items-center space-x-2 text-xs font-mono cursor-pointer hover:scale-[1.02] ${
                    isInProgress
                      ? 'bg-gradient-to-r from-rose-950/80 to-indigo-950 border-rose-500/60'
                      : isCompleted
                      ? 'bg-indigo-950/90 border-amber-400/40'
                      : 'bg-indigo-950/60 border-white/10'
                  }`}
                >
                  {isInProgress ? (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded animate-pulse">
                      LIVE
                    </span>
                  ) : isCompleted ? (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-black text-[9px] font-black rounded">
                      FINAL
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-indigo-800 text-indigo-200 text-[9px] font-bold rounded">
                      {match.scheduledTime || 'UPCOMING'}
                    </span>
                  )}

                  <span className="text-sm">
                    {tournament.sport === 'basketball'
                      ? '🏀'
                      : tournament.sport === 'pickleball'
                      ? '🏓'
                      : tournament.sport === 'soccer'
                      ? '⚽'
                      : tournament.sport === 'volleyball'
                      ? '🏐'
                      : '⚾'}
                  </span>

                  <div className="flex items-center space-x-1.5 font-bold">
                    <span className="text-white">
                      {match.team1?.name || 'TBD'}
                    </span>
                    <span className="px-1.5 py-0.5 bg-black/40 rounded text-lime-400 font-extrabold text-[11px]">
                      {match.score1 ?? 0} - {match.score2 ?? 0}
                    </span>
                    <span className="text-white">
                      {match.team2?.name || 'TBD'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsTickerPaused(!isTickerPaused)}
            className="p-1.5 rounded-lg bg-indigo-900/60 hover:bg-white/10 transition"
          >
            {isTickerPaused ? (
              <Play className="w-3.5 h-3.5 text-lime-400" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* ═══════════ SUB-TABS NAV ═══════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-950/80 p-1.5 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          {[
            {
              id: 'current',
              label: 'Active & Upcoming',
              icon: Trophy,
              color: 'lime',
            },
            {
              id: 'calendar',
              label: 'Calendar',
              icon: CalendarDays,
              color: 'cyan',
            },
            { id: 'history', label: 'History', icon: History, color: 'amber' },
            {
              id: 'leaderboard',
              label: 'Leaderboard',
              icon: Crown,
              color: 'amber',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id as any)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase italic transition flex items-center space-x-2 whitespace-nowrap ${
                  isActive
                    ? tab.color === 'lime'
                      ? 'bg-lime-400 text-black shadow-lg'
                      : tab.color === 'cyan'
                      ? 'bg-cyan-400 text-black shadow-lg'
                      : 'bg-amber-400 text-black shadow-lg'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'calendar' && (
                  <span className="px-1.5 py-0.5 bg-black/20 text-black text-[9px] rounded-full font-extrabold">
                    {tabCounts.active}
                  </span>
                )}
                {tab.id === 'history' && (
                  <span className="px-1.5 py-0.5 bg-black/20 text-black text-[9px] rounded-full font-extrabold">
                    {tabCounts.history}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsLiveDrawerOpen(true)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase italic transition flex items-center space-x-2 bg-gradient-to-r from-rose-500/20 via-rose-500/30 to-indigo-900 border border-rose-500/50 text-rose-300 hover:text-white shrink-0"
        >
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Live Feed</span>
          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-black animate-pulse">
            LIVE
          </span>
        </button>
      </div>

      {/* ═══════════ SEARCH + FILTER ═══════════ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tournament name, court, or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-indigo-950/80 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-indigo-300/40 outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Sports' },
              { id: 'volleyball', label: 'Volleyball 🏐' },
              { id: 'basketball', label: 'Basketball 🏀' },
              { id: 'pickleball', label: 'Pickleball 🏓' },
              { id: 'soccer', label: 'Soccer ⚽' },
              { id: 'baseball', label: 'Baseball ⚾' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s.id)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  selectedSport === s.id
                    ? 'bg-lime-400 text-black font-black'
                    : 'bg-indigo-950/80 text-indigo-200/70 hover:text-white border border-white/5'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-black uppercase italic">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'in_progress', label: '⚡ Live' },
            { id: 'registration_open', label: '📝 Open' },
            { id: 'upcoming', label: '📅 Upcoming' },
            { id: 'completed', label: '🥇 Completed' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedStatus === st.id
                  ? 'bg-indigo-900 text-lime-400 border border-lime-400/40'
                  : 'text-indigo-300/60 hover:text-indigo-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-indigo-300 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Showing{' '}
            <strong className="text-lime-400">
              {filteredTournaments.length}
            </strong>{' '}
            of <strong className="text-white">{tournaments.length}</strong>{' '}
            tournaments
          </span>
        </div>
      </div>

      {/* ═══════════ COURT MINI-MAP ═══════════ */}
      {courts.length > 0 && (
        <div className="p-5 bg-indigo-950/90 rounded-3xl border border-white/10 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center space-x-2 text-xs font-black uppercase text-cyan-400 tracking-wider">
                <Map className="w-4 h-4 text-cyan-400" />
                <span>Tournament Venues & Court Map</span>
              </div>
              <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
                Interactive Playground Court Pin Map
              </h3>
              <p className="text-xs text-indigo-200">
                Click any court pin to view venue amenities and get directions.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-indigo-900/80 p-1 rounded-xl border border-white/10 text-xs font-bold">
                {['all', 'basketball', 'pickleball', 'soccer', 'baseball'].map(
                  (sp) => (
                    <button
                      key={`map_sp_${sp}`}
                      type="button"
                      onClick={() => setMapFilterSport(sp)}
                      className={`px-2.5 py-1 rounded-lg uppercase text-[10px] transition ${
                        mapFilterSport === sp
                          ? 'bg-cyan-400 text-black font-black shadow'
                          : 'text-indigo-300 hover:text-white'
                      }`}
                    >
                      {sp === 'all' ? 'All' : sp}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="p-2 bg-indigo-900 hover:bg-indigo-800 rounded-xl text-indigo-200 hover:text-white transition border border-white/10"
              >
                {isMapExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div
            className={`relative w-full rounded-2xl border border-cyan-500/30 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 shadow-inner transition-all ${
              isMapExpanded ? 'h-96' : 'h-64'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

            <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center space-x-2 shadow">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{filteredMapCourts.length} Playground Venues</span>
            </div>

            {filteredMapCourts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs text-indigo-400">
                    No courts available for this filter
                  </p>
                </div>
              </div>
            )}

            {filteredMapCourts.map((court, index) => {
              const minLat = 40.7;
              const maxLat = 40.85;
              const minLng = -74.02;
              const maxLng = -73.9;
              let xPct =
                ((court.lng! - minLng) / (maxLng - minLng)) * 80 + 10;
              let yPct =
                100 - ((court.lat! - minLat) / (maxLat - minLat)) * 80 - 10;

              if (isNaN(xPct) || xPct < 5 || xPct > 95)
                xPct = 15 + ((index * 22) % 75);
              if (isNaN(yPct) || yPct < 5 || yPct > 95)
                yPct = 20 + ((index * 28) % 70);

              const isSelected = selectedMapCourtId === court.id;
              const tourneysAtCourt = tournaments.filter(
                (t) =>
                  t.courtId === court.id ||
                  (t.courtName || '')
                    .toLowerCase()
                    .includes(court.name.toLowerCase())
              );
              const tourneyCount = tourneysAtCourt.length;
              const hasTourneys = tourneyCount > 0;

              return (
                <div
                  key={`court_pin_${court.id}`}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  onClick={() => setSelectedMapCourtId(court.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-all transform hover:scale-125 ${
                    isSelected ? 'scale-125 z-30' : ''
                  }`}
                >
                  {hasTourneys && (
                    <div className="absolute -inset-2 rounded-full bg-lime-400/30 animate-ping pointer-events-none" />
                  )}

                  <div
                    className={`p-2 rounded-2xl shadow-xl border flex items-center space-x-1.5 transition ${
                      isSelected
                        ? 'bg-cyan-400 text-black border-white scale-110 font-extrabold'
                        : hasTourneys
                        ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-black border-lime-300 font-black'
                        : 'bg-indigo-900/90 text-white border-white/20'
                    }`}
                  >
                    <MapPin
                      className={`w-4 h-4 ${
                        isSelected
                          ? 'text-black'
                          : hasTourneys
                          ? 'text-black'
                          : 'text-cyan-400'
                      }`}
                    />
                    <span className="text-[11px] font-black italic whitespace-nowrap max-w-[120px] truncate">
                      {court.name.split(' ')[0]}
                    </span>
                    {hasTourneys && (
                      <span className="px-1.5 bg-black text-lime-400 text-[9px] font-black rounded-full">
                        {tourneyCount}🏆
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setSelectedMapCourtId(null)}
                className="px-3 py-1.5 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 shadow transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {selectedCourtObj && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-indigo-900 rounded-2xl border border-cyan-400/50 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400 text-black font-black flex items-center justify-center text-lg shrink-0">
                      {selectedCourtObj.sport === 'basketball'
                        ? '🏀'
                        : selectedCourtObj.sport === 'pickleball'
                        ? '🏓'
                        : selectedCourtObj.sport === 'soccer'
                        ? '⚽'
                        : '⚾'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-black italic uppercase text-white">
                          {selectedCourtObj.name}
                        </h4>
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold rounded-full border border-cyan-400/30">
                          ⭐ {selectedCourtObj.rating}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-0.5 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                        <span>{selectedCourtObj.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedCourtObj.name +
                            ' ' +
                            selectedCourtObj.address
                        )}`;
                        window.open(mapsUrl, '_blank');
                        triggerToast(`Opening Maps for ${selectedCourtObj.name}! 🗺️`);
                      }}
                      className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
                    >
                      <Navigation className="w-4 h-4 fill-black" />
                      <span>Get Directions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMapCourtId(null)}
                      className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/5">
                    <span className="text-[10px] text-indigo-300 block font-sans uppercase">
                      Surface
                    </span>
                    <span className="font-bold text-white">
                      {selectedCourtObj.surfaceType || 'Asphalt'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/5">
                    <span className="text-[10px] text-indigo-300 block font-sans uppercase">
                      Lighting
                    </span>
                    <span className="font-bold text-lime-400">
                      {selectedCourtObj.lighting
                        ? '💡 Available'
                        : '🚫 Day Only'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/5">
                    <span className="text-[10px] text-indigo-300 block font-sans uppercase">
                      Active
                    </span>
                    <span className="font-bold text-cyan-300">
                      {selectedCourtObj.activePlayersNow || 8} Players
                    </span>
                  </div>
                  <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/5">
                    <span className="text-[10px] text-indigo-300 block font-sans uppercase">
                      Rim
                    </span>
                    <span className="font-bold text-amber-300">
                      {selectedCourtObj.rimCondition || 'Pro Glass'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-indigo-200 font-medium">
                    Tournaments hosted:{' '}
                    <strong className="text-lime-400">
                      {
                        tournaments.filter(
                          (t) =>
                            t.courtId === selectedCourtObj.id ||
                            (t.courtName || '')
                              .toLowerCase()
                              .includes(selectedCourtObj.name.toLowerCase())
                        ).length
                      }{' '}
                      Events
                    </strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery(selectedCourtObj.name.split(' ')[0]);
                      triggerToast(`Filtered for ${selectedCourtObj.name}!`);
                    }}
                    className="text-lime-400 hover:underline font-bold flex items-center space-x-1"
                  >
                    <span>Filter Tournaments →</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════════════════════════
         MAIN CONTENT AREA
         ═══════════════════════════════════════════ */}
      {viewTab === 'calendar' ? (
        /* CALENDAR VIEW */
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-indigo-950 via-cyan-950 to-indigo-950 rounded-3xl border border-cyan-400/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">
                <CalendarDays className="w-4 h-4" />
                <span>Primary Sport Tournament Calendar</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">
                Upcoming Schedule & Registration Deadlines
              </h2>
            </div>

            <div className="p-3.5 bg-cyan-900/60 border border-cyan-400/40 rounded-2xl flex items-center space-x-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-400 text-black font-black flex items-center justify-center text-lg">
                🏀
              </div>
              <div>
                <span className="text-[10px] text-cyan-300 font-bold block uppercase">
                  Primary Sport Focus
                </span>
                <span className="text-sm font-black text-white capitalize">
                  {user?.primarySport || 'Basketball'} Calendar
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-950/90 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-lime-400 text-xs font-bold uppercase">
                <Clock className="w-4 h-4" />
                <span>Next Event</span>
              </div>
              <p className="text-sm font-extrabold text-white truncate">
                {calendarTournaments[0]?.title || 'None'}
              </p>
              <p className="text-xs text-indigo-300 font-mono">
                📅 {calendarTournaments[0]?.startDate || '—'}
              </p>
            </div>

            <div className="p-4 bg-indigo-950/90 rounded-2xl border border-rose-500/30 space-y-1">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase">
                <Flame className="w-4 h-4 animate-pulse" />
                <span>Urgent Registration</span>
              </div>
              <p className="text-sm font-extrabold text-white truncate">
                {calendarTournaments[0]?.title || 'None'}
              </p>
              <p className="text-xs text-rose-300 font-mono font-bold">
                ⏰ Register Soon!
              </p>
            </div>

            <div className="p-4 bg-indigo-950/90 rounded-2xl border border-amber-400/30 space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase">
                <Coins className="w-4 h-4" />
                <span>Prize Pools Ahead</span>
              </div>
              <p className="text-sm font-extrabold text-white">
                {calendarTournaments.length} Events
              </p>
              <p className="text-xs text-amber-200/80">Compete for rewards</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black italic uppercase text-indigo-200 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-lime-400" />
              <span>Scheduled ({calendarTournaments.length})</span>
            </h3>

            {calendarTournaments.length > 0 ? (
              calendarTournaments.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-indigo-950/90 rounded-3xl border border-white/10 hover:border-lime-400/40 transition space-y-4 shadow-xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="px-2.5 py-0.5 bg-indigo-900 text-lime-300 text-[10px] font-black uppercase rounded-full border border-lime-400/30">
                      {t.sport.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold">
                      📅 {t.startDate}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 border border-lime-400/50 flex flex-col items-center justify-center shadow-lg shrink-0">
                        <span className="text-[10px] font-black uppercase text-lime-400">
                          {new Date(t.startDate).toLocaleDateString([], {
                            month: 'short',
                          })}
                        </span>
                        <span className="text-xl font-black text-white font-mono">
                          {new Date(t.startDate).getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black italic uppercase text-white">
                          {t.title}
                        </h4>
                        <p className="text-xs text-indigo-200 mt-0.5 flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                          <span>
                            {t.courtName} ({t.address})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTournamentId(t.id);
                          setViewTab('current');
                        }}
                        className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl font-extrabold text-xs transition border border-white/10 flex items-center space-x-1.5"
                      >
                        <Trophy className="w-3.5 h-3.5 text-lime-400" />
                        <span>View Bracket</span>
                      </button>
                      <button
                        onClick={() => setShowRegisterModal(t.id)}
                        className="px-4 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 text-black font-black uppercase italic rounded-xl text-xs transition shadow-md flex items-center space-x-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </button>
                      <button
                        onClick={() => {
                          setShareModalTournament(t);
                          setSharePostText(
                            `🏆 Join "${t.title}" at ${t.courtName}!`
                          );
                        }}
                        className="p-2 bg-indigo-900 hover:bg-white/10 text-indigo-200 hover:text-white rounded-xl transition border border-white/10"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center bg-indigo-950/80 rounded-3xl border border-white/10 text-xs text-indigo-300">
                No upcoming tournaments.
              </div>
            )}
          </div>
        </div>
      ) : viewTab === 'history' ? (
        /* HISTORY VIEW */
        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-r from-amber-950 via-indigo-950 to-amber-950 rounded-3xl border border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1">
                <Crown className="w-4 h-4" />
                <span>Court Champions Showcase</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">
                Tournament History
              </h2>
            </div>

            <div className="px-4 py-2 bg-amber-400/20 border border-amber-400/40 rounded-2xl flex items-center space-x-3 shrink-0">
              <Trophy className="w-8 h-8 text-amber-400" />
              <div>
                <span className="text-[10px] text-amber-300 font-bold block uppercase">
                  Historical Records
                </span>
                <span className="text-lg font-mono font-black text-white">
                  {tournaments.filter((t) => t.status === 'completed').length}{' '}
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-indigo-950/90 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-lime-400 text-xs font-black uppercase">
              <Star className="w-4 h-4" />
              <span>Team Win-Rate Comparison</span>
            </div>

            {teamWinRateData.length > 0 ? (
              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamWinRateData}
                    margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
                  >
                    <defs>
                      <linearGradient
                        id="winRateGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#a3e635"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#06b6d4"
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="teamName"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight="bold"
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight="bold"
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-indigo-950/95 border border-lime-400/50 p-3 rounded-2xl shadow-2xl text-xs space-y-1">
                              <p className="font-extrabold text-white text-sm">
                                {data.teamName}
                              </p>
                              <div className="text-lime-400 font-mono font-black">
                                Win Rate: {data.winRate}%
                              </div>
                              <p className="text-indigo-200 text-[11px]">
                                W: {data.wins} • L: {data.losses}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="winRate" radius={[8, 8, 0, 0]} maxBarSize={55}>
                      {teamWinRateData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0 ? 'url(#winRateGradient)' : '#38bdf8'
                          }
                          stroke={index === 0 ? '#a3e635' : '#0284c7'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-indigo-900/30 rounded-2xl border border-white/5 text-xs text-indigo-300">
                No match statistics yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tournaments
              .filter((t) => t.status === 'completed' || t.mvpPlayerName)
              .map((hist) => {
                const histMVP = computeTournamentMVP(hist);
                const isFinalExpanded =
                  !!expandedMatchIds[`hist_final_${hist.id}`];

                return (
                  <div
                    key={hist.id}
                    className="p-6 bg-indigo-950/90 rounded-3xl border border-white/10 space-y-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="px-2.5 py-0.5 bg-amber-400 text-black text-[9px] font-black uppercase rounded-full italic">
                          🏆 COMPLETED
                        </span>
                        <h3 className="text-xl font-black italic uppercase text-white mt-1.5">
                          {hist.title}
                        </h3>
                        <div className="flex items-center space-x-3 text-xs text-indigo-200/80 mt-1">
                          <span>📍 {hist.courtName}</span>
                          <span>•</span>
                          <span>📅 {hist.startDate}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadBracket(hist)}
                        className="p-2.5 bg-indigo-900 hover:bg-lime-400 hover:text-black text-lime-300 rounded-xl transition border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-amber-950/70 via-indigo-900/60 to-amber-950/80 rounded-2xl border border-amber-400/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-300 flex items-center space-x-1">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>1ST PLACE</span>
                        </span>
                        <span className="text-xs font-mono font-black text-lime-400">
                          {hist.winningTeamName ||
                            hist.registeredTeams[0]?.name ||
                            'Winners'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 pt-1">
                        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                          🏆
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-white">
                            {hist.winningTeamName ||
                              hist.registeredTeams[0]?.name ||
                              'Champions'}
                          </h4>
                          <p className="text-xs text-amber-200/80">
                            Captain:{' '}
                            {hist.registeredTeams[0]?.captainName || 'Captain'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {histMVP && (
                      <div className="p-4 bg-indigo-900/80 rounded-2xl border border-amber-400/30 space-y-2">
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase rounded-full border border-amber-400/40 flex items-center space-x-1 w-fit">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>MVP BADGE</span>
                        </span>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-black font-black flex items-center justify-center text-sm shadow">
                              {histMVP.playerName.charAt(0)}
                            </div>
                            <div>
                              <h5 className="font-extrabold text-sm text-white">
                                {histMVP.playerName}
                              </h5>
                              <p className="text-[11px] text-indigo-300">
                                {histMVP.teamName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 font-mono text-xs font-bold">
                            <span className="bg-indigo-950 px-2 py-1 rounded-lg text-lime-400">
                              {histMVP.totalPts} PTS
                            </span>
                            <span className="bg-indigo-950 px-2 py-1 rounded-lg text-indigo-200">
                              {histMVP.totalReb} REB
                            </span>
                            <span className="bg-indigo-950 px-2 py-1 rounded-lg text-cyan-300">
                              {histMVP.totalAst} AST
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {hist.matches.length > 0 && (
                      <div className="pt-2 border-t border-white/10">
                        <button
                          onClick={(e) =>
                            toggleMatchExpanded(`hist_final_${hist.id}`, e)
                          }
                          className="w-full py-2 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 flex items-center justify-between px-3 transition"
                        >
                          <span className="flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Final Game Box Score</span>
                          </span>
                          {isFinalExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isFinalExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 overflow-hidden"
                            >
                              <div className="bg-indigo-950 p-3 rounded-2xl border border-white/10 space-y-2 text-xs">
                                {hist.matches.slice(-1).map((m) => (
                                  <div key={m.id} className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-indigo-900/60 rounded-xl font-bold">
                                      <span>{m.team1?.name || 'Team 1'}</span>
                                      <span className="font-mono text-lime-400 text-sm font-black">
                                        {m.score1 || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-indigo-900/60 rounded-xl font-bold">
                                      <span>{m.team2?.name || 'Team 2'}</span>
                                      <span className="font-mono text-lime-400 text-sm font-black">
                                        {m.score2 || 0}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : viewTab === 'leaderboard' ? (
        <TournamentLeaderboardSection
          tournaments={tournaments}
          leaderboardMode={leaderboardMode}
          setLeaderboardMode={setLeaderboardMode}
          selectedLeaderboardTournament={selectedLeaderboardTournament}
          setSelectedLeaderboardTournament={setSelectedLeaderboardTournament}
          leaderboardSearch={leaderboardSearch}
          setLeaderboardSearch={setLeaderboardSearch}
          selectedSport={selectedSport}
        />
      ) : (
        /* CURRENT VIEW */
        <div className="space-y-6">
          {/* Status Board */}
          <div className="p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl border border-lime-400/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-lime-400 text-black rounded-2xl shadow-lg">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black italic uppercase text-white">
                    Real-Time Status Board
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    Live updates for matches, prizes, deadlines & payments
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'match', label: '⚡ Matches' },
                  { id: 'prize', label: '🏆 Prizes' },
                  { id: 'deadline', label: '⏰ Deadlines' },
                  { id: 'payment', label: '💳 Payments' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusBoardFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                      statusBoardFilter === f.id
                        ? 'bg-lime-400 text-black font-black'
                        : 'bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {statusBoardAlerts
                .filter(
                  (a) =>
                    statusBoardFilter === 'all' || a.type === statusBoardFilter
                )
                .slice(0, 4)
                .map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      if (alert.tournamentId)
                        setSelectedTournamentId(alert.tournamentId);
                      triggerToast(`Navigated to ${alert.tournamentTitle}! 🏀`);
                    }}
                    className="p-3.5 bg-indigo-900/50 hover:bg-indigo-900/80 rounded-2xl border border-white/10 hover:border-lime-400/50 transition cursor-pointer space-y-2 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${alert.badgeColor}`}
                        >
                          {alert.title}
                        </span>
                        <span className="text-indigo-400 font-mono font-bold">
                          {alert.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-white font-semibold leading-snug line-clamp-2 mt-1">
                        {alert.message}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-indigo-300">
                      <span className="truncate italic font-mono">
                        {alert.tournamentTitle}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-lime-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Tournament Cards */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-300/70">
                <span>Tournaments ({filteredTournaments.length})</span>
              </div>

              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {filteredTournaments.length === 0 ? (
                  <div className="p-8 text-center bg-indigo-950/80 rounded-3xl border border-white/10">
                    <Trophy className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs text-indigo-300 mb-3">
                      No tournaments match your filter
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedSport('all');
                        setSelectedStatus('all');
                      }}
                      className="px-3 py-1.5 bg-lime-400 text-black text-[11px] font-black uppercase rounded-xl"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  filteredTournaments.map((t) => {
                    const isSelected = activeTournament?.id === t.id;
                    const isRegOpen = t.status === 'registration_open';
                    const isFull =
                      (t.registeredTeams || []).length >= t.maxTeams;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTournamentId(t.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-900/90 border-lime-400 shadow-xl ring-2 ring-lime-400/20'
                            : 'bg-indigo-950/70 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  t.status === 'in_progress'
                                    ? 'bg-amber-400 text-black animate-pulse'
                                    : t.status === 'registration_open'
                                    ? 'bg-lime-400 text-black'
                                    : t.status === 'completed'
                                    ? 'bg-indigo-800 text-indigo-200'
                                    : 'bg-blue-500 text-white'
                                }`}
                              >
                                {t.status.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-indigo-300/70 font-bold uppercase">
                                {t.format.replace('_', ' ')}
                              </span>
                            </div>
                            <h3 className="font-extrabold text-sm text-white mt-1.5">
                              {t.title}
                            </h3>
                          </div>
                          <span className="text-xl">
                            {t.sport === 'basketball'
                              ? '🏀'
                              : t.sport === 'pickleball'
                              ? '🏓'
                              : t.sport === 'soccer'
                              ? '⚽'
                              : '⚾'}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-indigo-200/80 font-medium">
                          <div className="flex items-center space-x-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            <span className="truncate">{t.courtName}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{t.startDate}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                            <span className="font-bold text-white">
                              {(t.registeredTeams || []).length}/{t.maxTeams}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate text-amber-200 font-bold">
                              {t.prizePool || 'Trophy'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTournamentId(t.id);
                            }}
                            className="text-[11px] font-black italic uppercase text-lime-400 hover:underline flex items-center space-x-1"
                          >
                            <span>View Bracket</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {isRegOpen && !isFull && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRegisterModal(t.id);
                              }}
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase rounded-xl transition"
                            >
                              Register
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: Tournament Hub */}
            <div className="lg:col-span-7 space-y-4">
              {activeTournament ? (
                <div className="bg-indigo-950/90 rounded-3xl border border-white/10 p-5 space-y-6 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center space-x-2 text-xs font-black uppercase text-lime-400">
                        <Award className="w-4 h-4" />
                        <span>Tournament Overview</span>
                      </div>
                      <h2 className="text-xl font-black italic uppercase text-white mt-1">
                        {activeTournament.title}
                      </h2>
                      <p className="text-xs text-indigo-200/80 font-medium flex items-center space-x-2 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-lime-400" />
                        <span>
                          {activeTournament.courtName} •{' '}
                          {activeTournament.address}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDownloadBracket(activeTournament)}
                        className="px-3.5 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => {
                          setShareModalTournament(activeTournament);
                          setSharePostText(
                            `🏆 Join "${activeTournament.title}" at ${activeTournament.courtName}!`
                          );
                        }}
                        className="px-3 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-100 rounded-xl text-xs font-bold border border-white/10 transition flex items-center space-x-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>

                      {onSelectCourtOnMap && activeTournament.courtId && (
                        <button
                          onClick={() =>
                            onSelectCourtOnMap(activeTournament.courtId!)
                          }
                          className="px-3 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-100 rounded-xl text-xs font-bold border border-white/10 transition flex items-center space-x-1.5"
                        >
                          <Map className="w-4 h-4" />
                          <span>View Court Map</span>
                        </button>
                      )}

                      {activeTournament.status === 'registration_open' &&
                        activeTournament.registeredTeams.length <
                          activeTournament.maxTeams && (
                          <button
                            onClick={() =>
                              setShowRegisterModal(activeTournament.id)
                            }
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black italic text-xs uppercase rounded-xl shadow-lg transition"
                          >
                            + Join
                          </button>
                        )}
                    </div>
                  </div>

                  {activeMVP && (
                    <div className="p-4 bg-gradient-to-r from-amber-950/80 via-indigo-950 to-amber-950/90 rounded-2xl border border-amber-400/50 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[10px] uppercase rounded-full flex items-center space-x-1">
                          <Award className="w-3.5 h-3.5 text-black" />
                          <span>MVP BADGE</span>
                        </span>
                        <span className="text-[11px] font-mono font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/30">
                          Top Scorer 🏆
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 pt-1">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-lg shrink-0">
                          <div className="w-full h-full bg-indigo-950 rounded-[14px] flex items-center justify-center font-black text-amber-300 text-lg">
                            {activeMVP.playerName.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-base text-white">
                            {activeMVP.playerName}
                          </h4>
                          <p className="text-xs text-amber-200/80">
                            {activeMVP.teamName}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-indigo-900/80 p-2.5 rounded-xl border border-white/10 text-xs">
                          <div className="text-center px-1">
                            <span className="text-[9px] text-amber-300/70 font-black uppercase block">
                              PTS
                            </span>
                            <span className="font-mono font-extrabold text-lime-400 text-sm">
                              {activeMVP.totalPts}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-white/10" />
                          <div className="text-center px-1">
                            <span className="text-[9px] text-amber-300/70 font-black uppercase block">
                              REB
                            </span>
                            <span className="font-mono font-extrabold text-white text-sm">
                              {activeMVP.totalReb}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-white/10" />
                          <div className="text-center px-1">
                            <span className="text-[9px] text-amber-300/70 font-black uppercase block">
                              AST
                            </span>
                            <span className="font-mono font-extrabold text-cyan-300 text-sm">
                              {activeMVP.totalAst}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-indigo-900/50 rounded-2xl border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-indigo-300/60 font-black uppercase block">
                        Format
                      </span>
                      <span className="font-bold text-white capitalize">
                        {activeTournament.format.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-900/50 rounded-2xl border border-white/5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-indigo-300/60 font-black uppercase">
                          Prize Pool
                        </span>
                        <button
                          onClick={() => {
                            setEditingPrizePoolTournament(activeTournament);
                            setEditPrizePoolInput(
                              activeTournament.prizePool || '$1,000 Cash'
                            );
                          }}
                          className="text-[10px] text-amber-300 hover:text-white underline font-bold"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="font-extrabold text-amber-300 flex items-center space-x-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {activeTournament.prizePool || 'Glory'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-900/50 rounded-2xl border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-indigo-300/60 font-black uppercase block">
                        Entry Fee
                      </span>
                      <span className="font-bold text-lime-400">
                        {activeTournament.entryFee || 'Free'}
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-900/50 rounded-2xl border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-indigo-300/60 font-black uppercase block">
                        Organizer
                      </span>
                      <span className="font-bold text-white truncate block">
                        {activeTournament.organizerName}
                      </span>
                    </div>
                  </div>

                  {/* Hub Sub-Tabs */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 font-bold text-xs">
                    <button
                      onClick={() => setHubSubTab('bracket')}
                      className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                        hubSubTab === 'bracket'
                          ? 'bg-lime-400 text-black font-black shadow-lg'
                          : 'bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900 hover:text-white'
                      }`}
                    >
                      <Swords className="w-4 h-4" />
                      <span>Bracket ({activeTournament.matches.length})</span>
                    </button>
                    <button
                      onClick={() => setHubSubTab('radar')}
                      className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                        hubSubTab === 'radar'
                          ? 'bg-lime-400 text-black font-black shadow-lg'
                          : 'bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900 hover:text-white'
                      }`}
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>Radar</span>
                    </button>
                    <button
                      onClick={() => setHubSubTab('roster')}
                      className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                        hubSubTab === 'roster'
                          ? 'bg-lime-400 text-black font-black shadow-lg'
                          : 'bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>
                        Rosters ({activeTournament.registeredTeams.length})
                      </span>
                    </button>
                  </div>

                  {/* BRACKET SUBTAB — Visual Bracket */}
                  {hubSubTab === 'bracket' && (
                    <VisualTournamentBracket
                      tournament={activeTournament}
                      onSetEditingMatch={setEditingMatch}
                    />
                  )}

                  {/* RADAR SUBTAB */}
                  {hubSubTab === 'radar' && (
                    <div className="space-y-5">
                      {activeTournament.registeredTeams.length >= 2 && (
                        <div className="flex items-center space-x-2 text-xs justify-end">
                          <select
                            value={
                              compareTeam1Id ||
                              activeTournament.registeredTeams[0]?.id
                            }
                            onChange={(e) => setCompareTeam1Id(e.target.value)}
                            className="px-2.5 py-1.5 bg-indigo-950 border border-lime-400/40 rounded-xl font-bold text-lime-300 outline-none"
                          >
                            {activeTournament.registeredTeams.map((tm) => (
                              <option key={tm.id} value={tm.id}>
                                {tm.name}
                              </option>
                            ))}
                          </select>
                          <span className="font-mono text-indigo-400 font-bold">
                            VS
                          </span>
                          <select
                            value={
                              compareTeam2Id ||
                              activeTournament.registeredTeams[1]?.id
                            }
                            onChange={(e) => setCompareTeam2Id(e.target.value)}
                            className="px-2.5 py-1.5 bg-indigo-950 border border-cyan-400/40 rounded-xl font-bold text-cyan-300 outline-none"
                          >
                            {activeTournament.registeredTeams.map((tm) => (
                              <option key={tm.id} value={tm.id}>
                                {tm.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {activeTournament.registeredTeams.length > 0 ? (
                        <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 h-72">
                          {(() => {
                            const team1 =
                              activeTournament.registeredTeams.find(
                                (tm) =>
                                  tm.id ===
                                  (compareTeam1Id ||
                                    activeTournament.registeredTeams[0]?.id)
                              ) || activeTournament.registeredTeams[0];
                            const team2 =
                              activeTournament.registeredTeams.find(
                                (tm) =>
                                  tm.id ===
                                  (compareTeam2Id ||
                                    activeTournament.registeredTeams[1]?.id)
                              ) || activeTournament.registeredTeams[1];
                            const t1Stats = computeTeamRadarStats(
                              team1,
                              activeTournament
                            );
                            const t2Stats = team2
                              ? computeTeamRadarStats(team2, activeTournament)
                              : null;

                            const comparisonData = t1Stats.radarData.map(
                              (item, idx) => ({
                                subject: item.metric,
                                Team1: item.value,
                                Team2: t2Stats
                                  ? t2Stats.radarData[idx]?.value || 0
                                  : 0,
                                fullMark: 100,
                              })
                            );

                            return (
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart
                                  cx="50%"
                                  cy="50%"
                                  outerRadius="75%"
                                  data={comparisonData}
                                >
                                  <PolarGrid stroke="#4338ca" />
                                  <PolarAngleAxis
                                    dataKey="subject"
                                    stroke="#a5b4fc"
                                    tick={{ fill: '#c7d2fe', fontSize: 11 }}
                                  />
                                  <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    stroke="#6366f1"
                                  />
                                  <Radar
                                    name={t1Stats.teamName}
                                    dataKey="Team1"
                                    stroke="#a3e635"
                                    fill="#a3e635"
                                    fillOpacity={0.4}
                                  />
                                  {t2Stats && (
                                    <Radar
                                      name={t2Stats.teamName}
                                      dataKey="Team2"
                                      stroke="#38bdf8"
                                      fill="#38bdf8"
                                      fillOpacity={0.3}
                                    />
                                  )}
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#0f172a',
                                      borderColor: '#334155',
                                      borderRadius: '12px',
                                      color: '#fff',
                                      fontSize: '11px',
                                    }}
                                  />
                                </RadarChart>
                              </ResponsiveContainer>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-indigo-300 italic p-4 text-center">
                          No teams registered yet.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ROSTER SUBTAB */}
                  {hubSubTab === 'roster' && (
                    <div className="space-y-4">
                      {activeTournament.registeredTeams.length > 0 ? (
                        activeTournament.registeredTeams.map((team, idx) => (
                          <div
                            key={team.id || idx}
                            className="p-4 bg-indigo-900/40 rounded-2xl border border-white/10 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center space-x-2.5">
                                <span className="w-7 h-7 rounded-xl bg-lime-400 text-black font-black text-xs flex items-center justify-center font-mono">
                                  #{team.seed || idx + 1}
                                </span>
                                <div>
                                  <h4 className="font-extrabold text-sm text-white">
                                    {team.name}
                                  </h4>
                                  <span className="text-xs text-indigo-300">
                                    Captain: {team.captainName}
                                  </span>
                                </div>
                              </div>

                              {team.paymentStatus === 'Paid' ? (
                                <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Paid</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setPayingTeamData({
                                      tournament: activeTournament,
                                      team,
                                    })
                                  }
                                  className="px-4 py-1.5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>
                                    Pay {activeTournament.entryFee || '$20'}
                                  </span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] text-indigo-300 font-bold uppercase block">
                                Members ({team.members.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {team.members.map((mem, mIdx) => (
                                  <span
                                    key={mIdx}
                                    className="px-2.5 py-1 bg-indigo-950 text-indigo-200 rounded-lg text-xs font-medium border border-white/5"
                                  >
                                    👤{' '}
                                    {typeof mem === 'string'
                                      ? mem
                                      : (mem as any)?.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-indigo-900/20 rounded-2xl border border-white/5 text-xs text-indigo-300">
                          No teams registered yet.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-indigo-900/30 rounded-2xl border border-white/5 space-y-2 text-xs">
                    <h4 className="font-black uppercase italic text-indigo-200">
                      Rules & Format
                    </h4>
                    <p className="text-indigo-200/80 font-medium leading-relaxed">
                      {activeTournament.rules ||
                        activeTournament.description ||
                        'Standard playground rules apply.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-indigo-300/50 bg-indigo-950/50 rounded-3xl border border-white/10">
                  Select a tournament.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
         MODALS
         ═══════════════════════════════════════════ */}

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 text-white shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-lime-400" />
                  <h3 className="text-lg font-black italic uppercase">
                    Organize Court Tournament
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="p-1 rounded-full hover:bg-white/10 transition text-indigo-300 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createSuccess && (
                <div className="p-3 bg-lime-400/10 border border-lime-400/40 rounded-xl flex items-center gap-2 text-xs text-lime-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {createError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Tournament Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harlem Summer 3v3"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      Sport *
                    </label>
                    <select
                      value={newSport}
                      onChange={(e) => setNewSport(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <option value="basketball">Basketball 🏀</option>
                      <option value="pickleball">Pickleball 🏓</option>
                      <option value="soccer">Soccer ⚽</option>
                      <option value="baseball">Baseball ⚾</option>
                      <option value="volleyball">Volleyball 🏐</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      Format *
                    </label>
                    <select
                      value={newFormat}
                      onChange={(e) => setNewFormat(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <option value="single_elimination">Single Elim</option>
                      <option value="double_elimination">Double Elim</option>
                      <option value="round_robin">Round Robin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Venue Court
                  </label>
                  <select
                    value={newCourtId}
                    onChange={(e) => setNewCourtId(e.target.value)}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    <option value="">— Manual address —</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city}, {c.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="New York"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      placeholder="NY"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="155th St & Frederick Douglass Blvd"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      Max Teams *
                    </label>
                    <select
                      value={newMaxTeams}
                      onChange={(e) => setNewMaxTeams(Number(e.target.value))}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <option value={4}>4 Teams</option>
                      <option value={8}>8 Teams</option>
                      <option value={16}>16 Teams</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-indigo-200 block mb-1">
                      Entry Fee
                    </label>
                    <input
                      type="text"
                      placeholder="Free or $20"
                      value={newEntryFee}
                      onChange={(e) => setNewEntryFee(e.target.value)}
                      className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Prize Pool
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $1,000 + Trophies"
                    value={newPrizePool}
                    onChange={(e) => setNewPrizePool(e.target.value)}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="p-3 bg-indigo-900/50 rounded-2xl border border-amber-400/30 space-y-2">
                  <span className="text-[10px] font-mono font-black uppercase text-amber-300 block">
                    Prize Distribution 🏆
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="🥇 1st"
                      value={newPrizeFirst}
                      onChange={(e) => setNewPrizeFirst(e.target.value)}
                      className="w-full p-2 bg-indigo-950 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <input
                      type="text"
                      placeholder="🥈 2nd"
                      value={newPrizeSecond}
                      onChange={(e) => setNewPrizeSecond(e.target.value)}
                      className="w-full p-2 bg-indigo-950 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <input
                      type="text"
                      placeholder="🥉 3rd"
                      value={newPrizeThird}
                      onChange={(e) => setNewPrizeThird(e.target.value)}
                      className="w-full p-2 bg-indigo-950 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <input
                      type="text"
                      placeholder="🏆 MVP"
                      value={newPrizeMvp}
                      onChange={(e) => setNewPrizeMvp(e.target.value)}
                      className="w-full p-2 bg-indigo-950 border border-white/10 rounded-lg text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Rules
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Games to 21..."
                    value={newRules}
                    onChange={(e) => setNewRules(e.target.value)}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isCreating ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REGISTER MODAL */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-lime-400" />
                  <h3 className="text-lg font-black italic uppercase">
                    Register Squad
                  </h3>
                </div>
                <button
                  onClick={() => !isRegistering && setShowRegisterModal(null)}
                  disabled={isRegistering}
                  className="p-1 rounded-full hover:bg-white/10 transition disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-indigo-300" />
                </button>
              </div>

              {registerError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{registerError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brooklyn Flight"
                    value={regTeamName}
                    onChange={(e) => setRegTeamName(e.target.value)}
                    disabled={isRegistering}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-indigo-200 block mb-1">
                    Captain Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Bell"
                    value={regCaptainName}
                    onChange={(e) => setRegCaptainName(e.target.value)}
                    disabled={isRegistering}
                    className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="font-bold text-indigo-300 block">
                    Additional Members (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Member #2"
                    value={regMember1}
                    onChange={(e) => setRegMember1(e.target.value)}
                    disabled={isRegistering}
                    className="w-full p-2 bg-indigo-900/60 border border-white/10 rounded-xl text-white font-bold outline-none disabled:opacity-50"
                  />
                  <input
                    type="text"
                    placeholder="Member #3"
                    value={regMember2}
                    onChange={(e) => setRegMember2(e.target.value)}
                    disabled={isRegistering}
                    className="w-full p-2 bg-indigo-900/60 border border-white/10 rounded-xl text-white font-bold outline-none disabled:opacity-50"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const tId = showRegisterModal;
                      setShowRegisterModal(null);
                      setShowBulkModal(tId);
                    }}
                    disabled={isRegistering}
                    className="px-3 py-2 bg-indigo-900 hover:bg-indigo-800 text-lime-300 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 border border-white/10 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-lime-400" />
                    <span>Bulk CSV Import</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(null)}
                      disabled={isRegistering}
                      className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl font-bold transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black italic uppercase rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isRegistering && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isRegistering ? 'Registering...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MATCH SCORE MODAL */}
      <AnimatePresence>
        {editingMatch && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-black italic uppercase text-lime-400">
                    Update Match Score
                  </h3>
                  <span className="text-[10px] text-indigo-300 font-bold">
                    {editingMatch.match.roundName} • Match #
                    {editingMatch.match.matchNumber}
                  </span>
                </div>
                <button
                  onClick={() => !isSavingScore && setEditingMatch(null)}
                  disabled={isSavingScore}
                  className="p-1 rounded-full hover:bg-white/10 transition disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-indigo-300" />
                </button>
              </div>

              {scoreError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{scoreError}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-bold text-indigo-200 block">
                    {editingMatch.match.team1?.name || 'Team 1'} Score:
                  </label>
                  <input
                    type="number"
                    value={editScore1}
                    onChange={(e) => setEditScore1(Number(e.target.value))}
                    disabled={isSavingScore}
                    className="w-full p-3 bg-indigo-900 border border-white/10 rounded-xl font-mono text-lg font-black text-lime-400 outline-none disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-indigo-200 block">
                    {editingMatch.match.team2?.name || 'Team 2'} Score:
                  </label>
                  <input
                    type="number"
                    value={editScore2}
                    onChange={(e) => setEditScore2(Number(e.target.value))}
                    disabled={isSavingScore}
                    className="w-full p-3 bg-indigo-900 border border-white/10 rounded-xl font-mono text-lg font-black text-lime-400 outline-none disabled:opacity-50"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingMatch(null)}
                    disabled={isSavingScore}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScoreSave}
                    disabled={isSavingScore}
                    className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase rounded-xl shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingScore && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSavingScore ? 'Saving...' : 'Save Score'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PRIZE POOL MODAL */}
      <AnimatePresence>
        {editingPrizePoolTournament && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-black italic uppercase">
                    Set Prize Pool
                  </h3>
                </div>
                <button
                  onClick={() => setEditingPrizePoolTournament(null)}
                  className="p-1 rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5 text-indigo-300" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-indigo-200/80">
                  Reward for{' '}
                  <strong>{editingPrizePoolTournament.title}</strong>
                </p>
                <input
                  type="text"
                  value={editPrizePoolInput}
                  onChange={(e) => setEditPrizePoolInput(e.target.value)}
                  placeholder="e.g. $1,500 Cash"
                  className="w-full p-3 bg-indigo-900 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-400"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[
                    '$500 Cash',
                    '$1,000 Cash',
                    '$2,500 Purse',
                    '$5,000 Championship',
                    'Trophy & Rings',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditPrizePoolInput(preset)}
                      className="px-2.5 py-1 bg-indigo-900 hover:bg-amber-400 hover:text-black text-amber-300 rounded-lg text-[10px] font-bold border border-amber-400/20 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingPrizePoolTournament(null)}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePrizePool}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-black italic uppercase rounded-xl shadow-md transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {shareModalTournament && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-lime-400 text-black rounded-xl">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase">
                      Share Bracket
                    </h3>
                    <p className="text-xs text-indigo-300">
                      Generate deep links or post to Social
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShareModalTournament(null)}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 rounded-2xl border border-lime-400/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-lime-400 text-black text-[9px] font-black uppercase rounded-full">
                    🏆 OFFICIAL BRACKET
                  </span>
                  <span className="text-xs font-mono font-bold text-lime-300">
                    {shareModalTournament.sport.toUpperCase()}
                  </span>
                </div>

                <h4 className="text-xl font-black italic uppercase text-white">
                  {shareModalTournament.title}
                </h4>
                <p className="text-xs text-indigo-200">
                  📍 {shareModalTournament.courtName} • 📅{' '}
                  {shareModalTournament.startDate}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-200 block uppercase">
                  Deep Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://playgroundleague.app/tournament/${shareModalTournament.id}?ref=bracket_share`}
                    className="flex-1 bg-indigo-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-indigo-200 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://playgroundleague.app/tournament/${shareModalTournament.id}`
                      );
                      setShareCopied(true);
                      triggerToast('Link copied! 📋');
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-lime-400 hover:bg-lime-300 text-black rounded-xl text-xs font-black transition flex items-center space-x-1 shrink-0"
                  >
                    {shareCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{shareCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-200 block uppercase">
                  Caption
                </label>
                <textarea
                  value={sharePostText}
                  onChange={(e) => setSharePostText(e.target.value)}
                  rows={3}
                  className="w-full bg-indigo-900/80 border border-white/10 rounded-2xl p-3 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShareModalTournament(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    try {
                      const newPost = {
                        id: `bracket_post_${Date.now()}`,
                        authorId: user?.id || 'u_current',
                        authorName: user?.name || 'Marcus Vance',
                        authorAvatar:
                          user?.avatarUrl ||
                          user?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                        content: sharePostText,
                        timestamp: 'Just now',
                        likesCount: 1,
                        commentsCount: 0,
                        sport: shareModalTournament.sport,
                        badgeName: 'Tournament Bracket Host 🏆',
                        isBracketPost: true,
                        tournamentId: shareModalTournament.id,
                        tournamentTitle: shareModalTournament.title,
                      };

                      const existingRaw = localStorage.getItem(
                        'playground_social_posts'
                      );
                      const existing = existingRaw
                        ? JSON.parse(existingRaw)
                        : [];
                      localStorage.setItem(
                        'playground_social_posts',
                        JSON.stringify([newPost, ...existing])
                      );
                    } catch (e) {
                      console.error('Error saving', e);
                    }

                    triggerToast('Shared to Social Feed! 🚀');
                    setShareModalTournament(null);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 text-black font-black uppercase italic rounded-xl text-xs transition shadow-lg flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Post</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK CSV MODAL */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-lime-400/50 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-lime-400 text-black rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase">
                      Bulk Team Registration
                    </h3>
                    <p className="text-xs text-indigo-300">
                      Import teams via CSV
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowBulkModal(null);
                    setBulkInputText('');
                    setBulkParsedTeams([]);
                  }}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 bg-indigo-900/60 p-1.5 rounded-2xl border border-white/10">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBulkTab('paste')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
                      bulkTab === 'paste'
                        ? 'bg-lime-400 text-black shadow'
                        : 'text-indigo-200 hover:text-white'
                    }`}
                  >
                    Paste CSV
                  </button>
                  <button
                    onClick={() => setBulkTab('upload')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
                      bulkTab === 'upload'
                        ? 'bg-lime-400 text-black shadow'
                        : 'text-indigo-200 hover:text-white'
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                <button
                  onClick={handleDownloadCsvTemplate}
                  className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-lime-300 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample CSV</span>
                </button>
              </div>

              {bulkTab === 'upload' ? (
                <div className="p-6 border-2 border-dashed border-lime-400/40 rounded-2xl bg-indigo-900/30 text-center space-y-3">
                  <Upload className="w-10 h-10 text-lime-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-white">
                    Upload .csv or .txt
                  </h4>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvFileUpload(file);
                    }}
                    className="hidden"
                    id="csv_file_input"
                  />
                  <label
                    htmlFor="csv_file_input"
                    className="inline-block px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-xs rounded-xl cursor-pointer shadow transition"
                  >
                    Choose File
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-200 block uppercase">
                    Paste CSV:
                  </label>
                  <textarea
                    rows={5}
                    value={bulkInputText}
                    onChange={(e) => handleParseBulkText(e.target.value)}
                    placeholder={`Team Name, Captain Name, Player 1, Player 2`}
                    className="w-full bg-indigo-900/80 border border-white/10 rounded-2xl p-3 text-xs font-mono text-white outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              )}

              {bulkParsedTeams.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-lime-400">
                    Parsed: {bulkParsedTeams.filter((t) => t.valid).length} valid
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-2xl bg-indigo-950/90">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-indigo-900 text-[10px] uppercase">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Team</th>
                          <th className="p-2">Captain</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bulkParsedTeams.map((t, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-indigo-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-white">
                              {t.name || '—'}
                            </td>
                            <td className="p-2 text-indigo-200">
                              {t.captainName || '—'}
                            </td>
                            <td className="p-2">
                              {t.valid ? (
                                <span className="text-lime-300 text-[10px]">
                                  ✓ Ready
                                </span>
                              ) : (
                                <span className="text-rose-300 text-[10px]">
                                  ⚠ {t.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowBulkModal(null);
                    setBulkInputText('');
                    setBulkParsedTeams([]);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-white/5"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    bulkParsedTeams.filter((t) => t.valid).length === 0 ||
                    isBulkImporting
                  }
                  onClick={() => handleConfirmBulkRegister(showBulkModal)}
                  className="px-5 py-2.5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 disabled:opacity-40 text-black font-black uppercase italic rounded-xl text-xs transition shadow-lg flex items-center space-x-2"
                >
                  {isBulkImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {isBulkImporting
                      ? 'Importing...'
                      : `Confirm (${bulkParsedTeams.filter((t) => t.valid).length})`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF REPORT MODAL */}
      <AnimatePresence>
        {pdfReportTournament && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-lime-400/40 rounded-3xl p-6 max-w-3xl w-full space-y-6 shadow-2xl relative text-white my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-lime-400 text-black rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase">
                      Official Bracket PDF Report
                    </h3>
                    <p className="text-xs text-indigo-300">
                      Print-ready certificate
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 text-black font-black uppercase text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Export</span>
                  </button>
                  <button
                    onClick={() => setPdfReportTournament(null)}
                    className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-950 rounded-2xl border border-white/10 space-y-6 text-white">
                <div className="border-b-2 border-lime-400 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-lime-400 font-mono text-xs uppercase tracking-widest font-black">
                      <Trophy className="w-4 h-4" />
                      <span>PLAYGROUND LEAGUE • OFFICIAL</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black italic uppercase text-white mt-1">
                      {pdfReportTournament.title}
                    </h1>
                    <p className="text-xs text-indigo-200 mt-1">
                      📍 {pdfReportTournament.courtName} • 📅{' '}
                      {pdfReportTournament.startDate}
                    </p>
                  </div>

                  <div className="text-right font-mono text-xs text-indigo-300">
                    <span className="px-3 py-1 bg-lime-400 text-black font-black uppercase rounded-full inline-block mb-1">
                      {pdfReportTournament.sport.toUpperCase()}
                    </span>
                    <p className="text-amber-300 font-bold">
                      Prize: {pdfReportTournament.prizePool || '$500'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-amber-950 via-indigo-950 to-amber-950 rounded-2xl border border-amber-400 space-y-2">
                    <span className="px-2.5 py-0.5 bg-amber-400 text-black text-[10px] font-black uppercase rounded-full">
                      🥇 CHAMPION
                    </span>
                    <h3 className="text-xl font-black italic uppercase text-white">
                      {pdfReportTournament.winningTeamName ||
                        pdfReportTournament.registeredTeams[0]?.name ||
                        'Winner'}
                    </h3>
                  </div>

                  {computeTournamentMVP(pdfReportTournament) && (
                    <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl border border-lime-400/60 space-y-2">
                      <span className="px-2.5 py-0.5 bg-lime-400 text-black text-[10px] font-black uppercase rounded-full">
                        🎖️ MVP
                      </span>
                      {(() => {
                        const mvp = computeTournamentMVP(pdfReportTournament)!;
                        return (
                          <div>
                            <h3 className="text-xl font-black italic uppercase text-white">
                              {mvp.playerName}
                            </h3>
                            <p className="text-xs text-lime-300 font-mono font-bold">
                              {mvp.totalPts} PTS • {mvp.totalReb} REB •{' '}
                              {mvp.totalAst} AST
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="p-4 bg-indigo-900/50 rounded-2xl border border-cyan-400/50 space-y-2">
                    <span className="px-2.5 py-0.5 bg-cyan-400 text-black text-[10px] font-black uppercase rounded-full">
                      🏟️ ATTENDANCE
                    </span>
                    <h3 className="text-xl font-black italic uppercase text-white">
                      {pdfReportTournament.estimatedAttendance || 1250}{' '}
                      Spectators
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-indigo-200 border-b border-white/10 pb-1 flex items-center space-x-1">
                    <Swords className="w-4 h-4 text-lime-400" />
                    <span>Match Results ({pdfReportTournament.matches.length})</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-indigo-900/80 text-lime-400 uppercase text-[10px]">
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Round</th>
                          <th className="p-2.5">Team 1</th>
                          <th className="p-2.5 text-center">Score</th>
                          <th className="p-2.5">Team 2</th>
                          <th className="p-2.5">Winner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pdfReportTournament.matches.map((m) => {
                          const winnerName =
                            m.winnerId === m.team1?.id
                              ? m.team1?.name
                              : m.winnerId === m.team2?.id
                              ? m.team2?.name
                              : 'TBD';

                          return (
                            <tr key={m.id} className="hover:bg-white/5">
                              <td className="p-2.5 text-indigo-300">
                                #{m.matchNumber}
                              </td>
                              <td className="p-2.5 text-white">
                                {m.roundName}
                              </td>
                              <td
                                className={`p-2.5 ${
                                  m.winnerId === m.team1?.id
                                    ? 'text-lime-400 font-extrabold'
                                    : 'text-indigo-200'
                                }`}
                              >
                                {m.team1?.name || 'TBD'}
                              </td>
                              <td className="p-2.5 text-center font-black bg-black/40 text-amber-300 rounded">
                                {m.score1} - {m.score2}
                              </td>
                              <td
                                className={`p-2.5 ${
                                  m.winnerId === m.team2?.id
                                    ? 'text-lime-400 font-extrabold'
                                    : 'text-indigo-200'
                                }`}
                              >
                                {m.team2?.name || 'TBD'}
                              </td>
                              <td className="p-2.5 font-extrabold text-lime-300">
                                {m.status === 'completed'
                                  ? `🏆 ${winnerName}`
                                  : 'Scheduled'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-white/10 flex items-center justify-between text-[10px] font-mono text-indigo-300">
                  <span>Report ID: {pdfReportTournament.id}</span>
                  <span>
                    Generated: {new Date().toLocaleDateString()} • Playground
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  onClick={() => {
                    const summaryText = `🏆 TOURNAMENT REPORT: ${pdfReportTournament.title}\nVenue: ${pdfReportTournament.courtName}\nWinner: ${
                      pdfReportTournament.winningTeamName ||
                      pdfReportTournament.registeredTeams[0]?.name ||
                      'TBD'
                    }\nMatches: ${pdfReportTournament.matches.length}\nPrize: ${
                      pdfReportTournament.prizePool
                    }`;
                    navigator.clipboard.writeText(summaryText);
                    triggerToast('Summary copied! 📋');
                  }}
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold border border-white/10 flex items-center space-x-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Summary</span>
                </button>

                <button
                  onClick={() => setPdfReportTournament(null)}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {payingTeamData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-indigo-950 border border-amber-400/50 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2.5 bg-amber-400 text-black rounded-2xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase">
                      Entry Fee Payment
                    </h3>
                    <p className="text-xs text-indigo-300">Simulated checkout</p>
                  </div>
                </div>
                <button
                  onClick={() => setPayingTeamData(null)}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-300">Tournament:</span>
                  <span className="font-bold text-white truncate max-w-[180px]">
                    {payingTeamData.tournament.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-300">Squad:</span>
                  <span className="font-bold text-lime-400">
                    {payingTeamData.team.name}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-mono font-extrabold">
                  <span className="text-amber-300">Total Due:</span>
                  <span className="text-amber-300 text-base">
                    {payingTeamData.tournament.entryFee || '$20.00'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-indigo-200 block uppercase">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border transition text-left flex items-center space-x-2 ${
                      paymentMethod === 'card'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-indigo-900/40 border-white/10 text-indigo-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('apple')}
                    className={`p-3 rounded-2xl border transition text-left flex items-center space-x-2 ${
                      paymentMethod === 'apple'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-indigo-900/40 border-white/10 text-indigo-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Apple Pay</span>
                  </button>
                </div>

                <div className="p-3 bg-indigo-900/80 rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300 text-[10px]">
                      Cardholder:
                    </span>
                    <span className="font-bold text-white">
                      {payingTeamData.team.captainName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-lime-300 font-bold">
                    <span>Card:</span>
                    <span>•••• •••• •••• 4242</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleSimulatedPayment}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 hover:from-amber-300 text-black font-black italic uppercase text-xs rounded-2xl transition shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Confirm & Pay{' '}
                      {payingTeamData.tournament.entryFee || '$20.00'}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIVE FEED DRAWER */}
      <AnimatePresence>
        {isLiveDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLiveDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-full max-w-md bg-indigo-950 border-l border-white/10 p-6 shadow-2xl flex flex-col h-full z-10 text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase">
                      Live Tournament Feed
                    </h3>
                    <p className="text-xs text-indigo-300">
                      Real-time updates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLiveDrawerOpen(false)}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'results', label: '🏆 Scores' },
                  { id: 'mvp', label: '🎖️ MVPs' },
                  { id: 'registrations', label: '📝 Teams' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLiveFeedFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                      liveFeedFilter === f.id
                        ? 'bg-rose-500 text-white font-black'
                        : 'bg-indigo-900/60 text-indigo-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredLiveFeed.length > 0 ? (
                  filteredLiveFeed.map((item) => {
                    const reactionCount = feedReactions[item.id] || 0;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-indigo-900/40 rounded-2xl border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-black uppercase text-rose-300">
                            {item.title}
                          </span>
                          <span className="text-indigo-400 font-mono font-bold">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          <span className="text-[10px] text-indigo-300/80 italic font-mono">
                            {item.tournamentTitle}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setFeedReactions((prev) => ({
                                  ...prev,
                                  [item.id]: (prev[item.id] || 0) + 1,
                                }));
                                triggerToast('Cheered! 👏');
                              }}
                              className="px-2 py-1 bg-white/5 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                            >
                              <Flame className="w-3 h-3" />
                              <span>
                                Cheer {reactionCount > 0 && `(${reactionCount})`}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTournamentId(item.tournamentId);
                                setViewTab('current');
                                setIsLiveDrawerOpen(false);
                              }}
                              className="px-2 py-1 bg-lime-400/20 hover:bg-lime-400 text-lime-300 hover:text-black rounded-lg text-[11px] font-bold transition"
                            >
                              Jump →
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-indigo-300">
                    No live updates.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOCATION MODAL */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-indigo-950 border border-white/10 rounded-3xl p-6 max-w-md w-full text-white space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-400 text-black rounded-2xl">
                  <MapPin className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase">
                    Update Location
                  </h3>
                  <p className="text-xs text-indigo-300">
                    Set city and state for local matching
                  </p>
                </div>
              </div>

              {StateCitySelector ? (
                <StateCitySelector
                  selectedState={userRegState}
                  selectedCity={userRegCity}
                  onStateChange={(newState: string, defaultCity: string) => {
                    setUserRegState(newState);
                    setUserRegCity(defaultCity);
                  }}
                  onCityChange={(newCity: string) => setUserRegCity(newCity)}
                  selectClassName="w-full bg-indigo-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-400"
                  labelClassName="block text-xs font-black uppercase text-indigo-200 mb-1"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-indigo-200 block mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={userRegState}
                      onChange={(e) =>
                        setUserRegState(e.target.value.toUpperCase())
                      }
                      maxLength={2}
                      className="w-full bg-indigo-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-indigo-200 block mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={userRegCity}
                      onChange={(e) => setUserRegCity(e.target.value)}
                      className="w-full bg-indigo-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onUpdateUser) {
                      onUpdateUser({
                        registeredState: userRegState,
                        registeredCity: userRegCity,
                        location: {
                          ...(user?.location || {
                            address: `${userRegCity}, ${userRegState}`,
                            lat: 40.7128,
                            lng: -74.006,
                          }),
                          city: userRegCity,
                          state: userRegState,
                        },
                      });
                    }
                    triggerToast(
                      `Location updated to ${userRegCity}, ${userRegState}! 📍`
                    );
                    setShowLocationModal(false);
                  }}
                  className="flex-1 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase italic rounded-xl shadow-lg transition"
                >
                  Save 📍
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-lime-400 text-black rounded-2xl font-black text-xs shadow-2xl flex items-center space-x-2 border border-black/20"
          >
            <Sparkles className="w-4 h-4 text-black shrink-0 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TournamentsView;