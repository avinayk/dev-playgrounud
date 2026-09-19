const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export interface DailyChallengeDTO {
  id: string;
  userChallengeId: number;
  title: string;
  description: string;
  type: 'daily';
  sport: string;
  xpReward: number;
  targetCount: number;
  icon: string;
  progress: number;
  isCompleted: boolean;
  claimedAt: string | null;
  xpEarned: number;
  periodStart: string;
  periodEnd: string;
}

export async function fetchDailyChallenges(athleteId: string): Promise<DailyChallengeDTO[]> {
  const r = await fetch(`${API_URL}/daily-challenges/${athleteId}`);
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to load daily challenges');
  return j.data as DailyChallengeDTO[];
}

export async function rerollDailyChallenges(athleteId: string): Promise<DailyChallengeDTO[]> {
  const r = await fetch(`${API_URL}/daily-challenges/${athleteId}/reroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to reroll');
  return j.data as DailyChallengeDTO[];
}

export async function progressDailyChallenge(
  athleteId: string,
  challengeId: string,
  increment = 1
): Promise<DailyChallengeDTO | null> {
  const r = await fetch(
    `${API_URL}/daily-challenges/${athleteId}/${challengeId}/progress`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment }),
    }
  );
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to update');
  return j.data as DailyChallengeDTO | null;
}

export async function claimDailyReward(
  athleteId: string,
  challengeId: string
): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
  notificationId: string | null;
}> {
  const r = await fetch(
    `${API_URL}/daily-challenges/${athleteId}/${challengeId}/claim`,
    { method: 'POST' }
  );
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to claim');
  return j.data;
}

export async function claimDailyChestAPI(athleteId: string): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
}> {
  const r = await fetch(`${API_URL}/daily-challenges/${athleteId}/chest`, {
    method: 'POST',
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to claim chest');
  return j.data;
}