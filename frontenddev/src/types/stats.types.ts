// types/stats.types.ts
export interface StatsSummary {
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

export interface WinLossRow {
  sport: string;
  total_games: number;
  wins: number;
  losses: number;
  win_percentage: number | string;
}

export interface StatLog {
  id: number;
  sport: string;
  outcome: 'win' | 'loss';
  created_at: string;
  [key: string]: any;
}