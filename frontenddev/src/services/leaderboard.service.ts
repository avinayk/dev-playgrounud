// services/leaderboard.service.ts
import type { AthleteProfile } from '../types/auth.types';

const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function fetchLeaderboardAthletes(
  excludeId?: string,
  limit: number = 500
): Promise<AthleteProfile[]> {
  const params = new URLSearchParams();
  if (excludeId) params.set('excludeId', excludeId);
  params.set('limit', String(limit));

  const res = await fetch(`${API_BASE}/leaderboard?${params.toString()}`);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch leaderboard');
  }

  return (json.data ?? []) as AthleteProfile[];
}