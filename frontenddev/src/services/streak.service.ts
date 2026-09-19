// frontend/src/services/streak.service.ts
const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export interface StreakStatus {
  dailyStreak: number;
  longestStreak: number;
  streakFreezeCount: number;
  lastCheckinDate: string | null;
  hasCheckedInToday: boolean;
  checkInHistory: string[];
  freezeHistory: string[];
  todayXpReward: number;
}

export async function fetchStreakStatus(athleteId: string): Promise<StreakStatus> {
  const r = await fetch(`${API}/streak/${encodeURIComponent(athleteId)}`);
  const json = await r.json();
  if (!r.ok || !json.success) throw new Error(json.message || 'Failed to load streak');
  return json.data;
}

export async function checkInAPI(athleteId: string): Promise<{
  success: boolean;
  message: string;
  xpAwarded: number;
  newXp: number;
  newLevel: number;
  newStreak: number;
  leveledUp: boolean;
  alreadyCheckedIn: boolean;
}> {
  const r = await fetch(`${API}/streak/${encodeURIComponent(athleteId)}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.message || 'Check-in failed');
  return json.data ?? json;
}

export async function purchaseFreezeAPI(
  athleteId: string,
  costXp: number = 250
): Promise<{
  success: boolean;
  message: string;
  newXp: number;
  freezeCount: number;
}> {
  const r = await fetch(
    `${API}/streak/${encodeURIComponent(athleteId)}/purchase-freeze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costXp }),
    }
  );
  const json = await r.json();
  if (!r.ok || !json.success) throw new Error(json.message || 'Purchase failed');
  return json.data;
}