import React, { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  BarChart3,
  Target,
  Activity,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react';

interface Athlete {
  id: string;        // UUID
  name?: string;
  [key: string]: any;
}

interface StatsTabProps {
  athlete?: Athlete | null;
}

interface StatLog {
  id: number;
  sport: string;
  outcome: 'win' | 'loss';
  created_at: string;
  // Basketball
  points?: number;
  assists?: number;
  rebounds?: number;
  three_pt_made?: number;
  steals?: number;
  blocks?: number;
  // Baseball
  base_hits?: number;
  at_bats?: number;
  rbis?: number;
  home_runs?: number;
  // Softball
  softball_hits?: number;
  softball_at_bats?: number;
  softball_rbis?: number;
  stolen_bases?: number;
  // Pickleball
  kitchen_dinks?: number;
  aces_served?: number;
  // Soccer
  goals_scored?: number;
  soccer_assists?: number;
  // Volleyball
  spike_kills?: number;
  service_aces?: number;
  net_blocks?: number;
  ground_digs?: number;
  setting_assists?: number;
  // Football
  passing_yards?: number;
  touchdowns?: number;
  // Tennis
  tennis_aces_served?: number;
  break_points_won?: number;
  [key: string]: any;
}

interface StatsSummary {
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_percentage: number | string;
  avg_points?: number;
  avg_assists?: number;
  avg_rebounds?: number;
  avg_spike_kills?: number;
  avg_base_hits?: number;
}

interface WinLossRow {
  sport: string;
  total_games: number;
  wins: number;
  losses: number;
  win_percentage: number | string;
}

// Base URL from env (fallback to relative so the Vite proxy still works)
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  pickleball: '🏓',
  soccer: '⚽',
  volleyball: '🏐',
  football: '🏈',
  tennis: '🎾',
};

const SPORT_LABEL: Record<string, string> = {
  basketball: 'Basketball',
  baseball: 'Baseball',
  softball: 'Softball',
  pickleball: 'Pickleball',
  soccer: 'Soccer',
  volleyball: 'Volleyball',
  football: 'Football',
  tennis: 'Tennis',
};

// Return the primary stat lines to show for each sport on a game card
function getPrimaryStats(log: StatLog): { label: string; value: number | string }[] {
  switch (log.sport) {
    case 'basketball':
      return [
        { label: 'PTS', value: log.points ?? 0 },
        { label: 'AST', value: log.assists ?? 0 },
        { label: 'REB', value: log.rebounds ?? 0 },
        { label: '3PT', value: log.three_pt_made ?? 0 },
      ];
    case 'baseball':
      return [
        { label: 'H', value: log.base_hits ?? 0 },
        { label: 'AB', value: log.at_bats ?? 0 },
        { label: 'RBI', value: log.rbis ?? 0 },
        { label: 'HR', value: log.home_runs ?? 0 },
      ];
    case 'softball':
      return [
        { label: 'H', value: log.softball_hits ?? 0 },
        { label: 'AB', value: log.softball_at_bats ?? 0 },
        { label: 'RBI', value: log.softball_rbis ?? 0 },
        { label: 'SB', value: log.stolen_bases ?? 0 },
      ];
    case 'pickleball':
      return [
        { label: 'DINKS', value: log.kitchen_dinks ?? 0 },
        { label: 'ACES', value: log.aces_served ?? 0 },
      ];
    case 'soccer':
      return [
        { label: 'G', value: log.goals_scored ?? 0 },
        { label: 'A', value: log.soccer_assists ?? 0 },
      ];
    case 'volleyball':
      return [
        { label: 'K', value: log.spike_kills ?? 0 },
        { label: 'SA', value: log.service_aces ?? 0 },
        { label: 'BLK', value: log.net_blocks ?? 0 },
        { label: 'DIG', value: log.ground_digs ?? 0 },
      ];
    case 'football':
      return [
        { label: 'YDS', value: log.passing_yards ?? 0 },
        { label: 'TD', value: log.touchdowns ?? 0 },
      ];
    case 'tennis':
      return [
        { label: 'ACES', value: log.tennis_aces_served ?? 0 },
        { label: 'BP', value: log.break_points_won ?? 0 },
      ];
    default:
      return [];
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const StatsTab: React.FC<StatsTabProps> = ({ athlete }) => {
  const [logs, setLogs] = useState<StatLog[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [winLoss, setWinLoss] = useState<WinLossRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>('all');

  const fetchAll = useCallback(async () => {
    if (!athlete?.id) return;

    setLoading(true);
    setError(null);

    try {
      const qs = sportFilter !== 'all' ? `?sport=${sportFilter}` : '';

      const [logsRes, summaryRes, wlRes] = await Promise.all([
        fetch(`${API_URL}/stats/athlete/${athlete.id}${qs}`),
        fetch(`${API_URL}/stats/summary?athleteId=${athlete.id}${sportFilter !== 'all' ? `&sport=${sportFilter}` : ''}`),
        fetch(`${API_URL}/stats/win-loss?athleteId=${athlete.id}`),
      ]);

      const logsJson = await logsRes.json();
      const summaryJson = await summaryRes.json();
      const wlJson = await wlRes.json();

      if (!logsRes.ok) throw new Error(logsJson.error || 'Failed to fetch logs');
      if (!summaryRes.ok) throw new Error(summaryJson.error || 'Failed to fetch summary');
      if (!wlRes.ok) throw new Error(wlJson.error || 'Failed to fetch win/loss');

      setLogs(logsJson.data || []);
      setSummary(summaryJson.data || null);
      setWinLoss(wlJson.data || []);
    } catch (err: any) {
      console.error('StatsTab fetch error:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [athlete?.id, sportFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!athlete) {
    return (
      <div className="text-white p-8 text-center">
        <p className="text-indigo-300">Stats not available</p>
      </div>
    );
  }

  return (
    <div className="text-white p-4 sm:p-6 max-w-full">
      <div className="bg-indigo-900/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-white/10 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-lime-400" />
            <h2 className="text-xl font-black italic uppercase">My Stats</h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="bg-indigo-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            >
              <option value="all">All Sports</option>
              {Object.keys(SPORT_LABEL).map((s) => (
                <option key={s} value={s}>
                  {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
                </option>
              ))}
            </select>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2 rounded-xl bg-indigo-800/60 hover:bg-indigo-800 text-white transition disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10 text-indigo-300">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading stats...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {!loading && !error && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              icon={<Trophy className="w-5 h-5" />}
              label="Games"
              value={summary.total_games ?? 0}
              accent="text-lime-400"
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Wins"
              value={summary.total_wins ?? 0}
              accent="text-lime-400"
            />
            <SummaryCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="Losses"
              value={summary.total_losses ?? 0}
              accent="text-rose-400"
            />
            <SummaryCard
              icon={<Target className="w-5 h-5" />}
              label="Win %"
              value={`${summary.win_percentage ?? 0}%`}
              accent="text-amber-400"
            />
          </div>
        )}

        {/* Per-Sport Win/Loss */}
        {!loading && !error && winLoss.length > 0 && (
          <div>
            <h3 className="text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-2">
              By Sport
            </h3>
            <div className="space-y-2">
              {winLoss.map((row) => (
                <div
                  key={row.sport}
                  className="flex items-center justify-between bg-indigo-950/50 border border-white/5 rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{SPORT_EMOJI[row.sport] || '🎯'}</span>
                    <span className="font-medium">{SPORT_LABEL[row.sport] || row.sport}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-indigo-300">
                      {row.wins}W – {row.losses}L
                    </span>
                    <span className="font-bold text-lime-400">
                      {row.win_percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {!loading && !error && (
          <div>
            <h3 className="text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recent Games
            </h3>

            {logs.length === 0 ? (
              <div className="bg-indigo-950/40 border border-dashed border-white/10 rounded-xl p-6 text-center text-indigo-300 text-sm">
                No games logged yet. Tap "Log Stats" to record your first game!
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const isWin = log.outcome === 'win';
                  const primary = getPrimaryStats(log);

                  return (
                    <div
                      key={log.id}
                      className="bg-indigo-950/50 border border-white/5 rounded-xl p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{SPORT_EMOJI[log.sport] || '🎯'}</span>
                          <div>
                            <div className="font-black italic uppercase text-sm">
                              {SPORT_LABEL[log.sport] || log.sport}
                            </div>
                            <div className="text-[11px] text-indigo-400">
                              {formatDate(log.created_at)}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black italic uppercase ${
                            isWin
                              ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isWin ? '🏆 Win' : 'Loss'}
                        </span>
                      </div>

                      {/* Stat pills */}
                      {primary.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {primary.map((p) => (
                            <div
                              key={p.label}
                              className="bg-indigo-900/60 border border-white/5 rounded-lg px-2.5 py-1 text-center min-w-[52px]"
                            >
                              <div className="text-[10px] uppercase text-indigo-400">
                                {p.label}
                              </div>
                              <div className="text-sm font-bold text-white">
                                {p.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty-state when nothing at all */}
        {!loading && !error && !summary && logs.length === 0 && (
          <div className="text-center py-8 text-indigo-300">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stats yet — go log a game!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Small reusable card ----------
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  accent = 'text-white',
}) => (
  <div className="bg-indigo-950/50 border border-white/5 rounded-2xl p-3 sm:p-4">
    <div className={`flex items-center gap-1.5 mb-1 ${accent}`}>
      {icon}
      <span className="text-[11px] uppercase tracking-wider font-bold">{label}</span>
    </div>
    <div className="text-2xl font-black italic">{value}</div>
  </div>
);