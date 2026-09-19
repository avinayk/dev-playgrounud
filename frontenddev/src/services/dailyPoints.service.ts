// frontend/src/services/dailyPoints.service.ts
const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export interface DailyPointsData {
  currentPoints: number;
  targetPoints: number;
  xpAwarded: boolean;
  remaining: number;
  percentComplete: number;
  totalGamesToday: number;
  lastLogAt: string | null;
  breakdown: Array<{ sport: string; points: number; games: number }>;
}

/* ═══════════════════════════════════════════
   GET TODAY'S POINTS
   ═══════════════════════════════════════════ */
export const fetchTodayPointsAPI = async (
  athleteId: string,
  target: number = 25
): Promise<DailyPointsData> => {
  const res = await fetch(
    `${API}/daily-points/today/${athleteId}?target=${target}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

/* ═══════════════════════════════════════════
   CHECK & AWARD BONUS
   ═══════════════════════════════════════════ */
export const checkBonusAPI = async (
  athleteId: string,
  target: number = 25
): Promise<{
  currentPoints: number;
  targetPoints: number;
  xpAwardedNow: boolean;
  xpAmount: number;
}> => {
  const res = await fetch(
    `${API}/daily-points/check-bonus/${athleteId}?target=${target}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};