// frontend/src/services/drills.service.ts
const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export interface DrillHistory {
  id: string;
  drillId: string;
  drillName: string;
  sport: string;
  tier: string;
  score: number;
  target: number;
  xpEarned: number;
  unit: string;
  completedAt: string;
}

export interface DrillStats {
  totalDrills: number;
  totalXp: number;
  bySport: Record<string, number>;
  byTier: Record<string, number>;
}

export interface SaveDrillResponse {
  historyId: string;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  levelInfo: any;
}

export async function saveDrillCompletionAPI(
  athleteId: string,
  data: {
    drillId: string;
    drillName: string;
    sport: string;
    tier: string;
    score: number;
    target: number;
    xpEarned: number;
    unit: string;
  }
): Promise<SaveDrillResponse> {
  const r = await fetch(`${API}/drills/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, ...data }),
  });
  const json = await r.json();
  if (!json.success) throw new Error(json.message || 'Failed to save drill');
  return json.data;
}

export async function fetchDrillHistory(
  athleteId: string,
  options: { sport?: string; limit?: number } = {}
): Promise<DrillHistory[]> {
  const params = new URLSearchParams({
    athleteId,
    sport: options.sport ?? 'all',
    limit: String(options.limit ?? 20),
  });
  const r = await fetch(`${API}/drills/history?${params.toString()}`);
  const json = await r.json();
  if (!json.success) throw new Error(json.message || 'Failed');
  return json.data ?? [];
}

export async function fetchDrillStats(athleteId: string): Promise<DrillStats> {
  const r = await fetch(`${API}/drills/stats?athleteId=${encodeURIComponent(athleteId)}`);
  const json = await r.json();
  if (!json.success) throw new Error(json.message || 'Failed');
  return json.data;
}