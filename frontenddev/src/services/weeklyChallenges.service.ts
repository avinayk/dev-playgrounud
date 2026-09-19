// frontend/src/services/weeklyChallenges.service.ts
const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export interface WeeklyChallengeDTO {
  id: string;
  userChallengeId: number;
  title: string;
  description: string;
  type: 'weekly';
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

export const fetchWeeklyChallengesAPI = async (
  athleteId: string
): Promise<WeeklyChallengeDTO[]> => {
  const res = await fetch(`${API}/weekly-challenges/${athleteId}`, {
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

export const updateWeeklyProgressAPI = async (
  athleteId: string,
  challengeId: string,
  increment: number = 1
): Promise<WeeklyChallengeDTO | null> => {
  const res = await fetch(
    `${API}/weekly-challenges/${athleteId}/${challengeId}/progress`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment }),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

export const claimWeeklyRewardAPI = async (
  athleteId: string,
  challengeId: string
): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
}> => {
  const res = await fetch(
    `${API}/weekly-challenges/${athleteId}/${challengeId}/claim`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

export const syncWeeklyProgressAPI = async (
  athleteId: string
): Promise<WeeklyChallengeDTO[]> => {
  const res = await fetch(`${API}/weekly-challenges/${athleteId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};