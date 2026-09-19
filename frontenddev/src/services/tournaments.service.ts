// src/services/tournaments.service.ts
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export interface TournamentDTO {
  id: string;
  title: string;
  sport: string;
  city: string;
  state: string;
  courtId: string | null;
  courtName: string | null;
  address: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  registrationDeadline: string | null;
  format: string;
  status: string;
  organizerId: string | null;
  organizerName: string | null;
  organizerAvatar: string | null;
  maxTeams: number;
  currentTeams: number;
  prizePool: string | null;
  entryFee: string | null;
  bannerUrl: string | null;
  rules: string | null;
  isActive: boolean;
  registeredTeams: any[];
  matches: any[];
  prizeDistribution: any;
  mvpVotes: any;
  liveFeed: any[];
}

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Request failed');
  return j.data;
}

export async function fetchTournamentsAPI(filters: {
  sport?: string;
  status?: string;
  city?: string;
  state?: string;
  search?: string;
} = {}): Promise<TournamentDTO[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'all') params.set(k, String(v));
  });
  const q = params.toString();
  return apiCall(`/tournaments${q ? `?${q}` : ''}`);
}

export async function fetchTournamentByIdAPI(id: string): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${id}`);
}

export async function createTournamentAPI(payload: any): Promise<TournamentDTO> {
  return apiCall(`/tournaments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerTeamAPI(tournamentId: string, team: any): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/register-team`, {
    method: 'POST',
    body: JSON.stringify(team),
  });
}

export async function updateMatchScoreAPI(
  tournamentId: string,
  matchId: string,
  score1: number,
  score2: number,
  winnerId?: string,
  boxScores?: any[]
): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: 'POST',
    body: JSON.stringify({ score1, score2, winnerId, boxScores }),
  });
}

export async function castMvpVoteAPI(
  tournamentId: string,
  matchId: string,
  voterId: string,
  votedForPlayer: string
): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/matches/${matchId}/mvp-vote`, {
    method: 'POST',
    body: JSON.stringify({ voterId, votedForPlayer }),
  });
}

export async function updatePrizePoolAPI(tournamentId: string, prizePool: string): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/prize-pool`, {
    method: 'POST',
    body: JSON.stringify({ prizePool }),
  });
}

export async function updatePrizeDistributionAPI(tournamentId: string, dist: any): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/prize-distribution`, {
    method: 'POST',
    body: JSON.stringify(dist),
  });
}

export async function markTeamPaidAPI(tournamentId: string, teamId: string, receiptId: string): Promise<TournamentDTO> {
  return apiCall(`/tournaments/${tournamentId}/teams/${teamId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ receiptId }),
  });
}

export async function deleteTournamentAPI(tournamentId: string): Promise<boolean> {
  const r = await fetch(`${API_URL}/tournaments/${tournamentId}`, { method: 'DELETE' });
  const j = await r.json();
  return r.ok && j.success;
}