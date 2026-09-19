// services/challenge.service.ts
const VITE_API_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  sport: string;
  xpReward: number;
  targetCount: number;
  icon: string;
  progress: number;
  target: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpEarned: number;
  isLocked: boolean;
  periodStart: string;
  periodEnd: string;
  isAvailable: boolean;
}

export interface XpSummary {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  levelProgress: number;
}

export interface CompleteChallengeResult {
  success: boolean;
  progress: number;
  target: number;
  isCompleted: boolean;
  xpEarned: number;
  message: string;
}

/* ═══════════════════════════════════════════
   FETCH CHALLENGES
   ═══════════════════════════════════════════ */
export async function fetchChallenges(
  athleteId: string,
  sport?: string
): Promise<Challenge[]> {
  const params = new URLSearchParams({ athleteId });
  if (sport) params.set('sport', sport);

  const url = `${VITE_API_URL}/challenges?${params.toString()}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch challenges');
  }

  return json.data as Challenge[];
}

/* ═══════════════════════════════════════════
   COMPLETE CHALLENGE
   ═══════════════════════════════════════════ */
export async function completeChallenge(
  challengeId: string,
  athleteId: string,
  progress = 1
): Promise<CompleteChallengeResult> {
  const url = `${VITE_API_URL}/challenges/${challengeId}/complete`;
  console.log('🌐 completeChallenge:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, progress }),
  });

  const json = await res.json();
  console.log('📥 Complete response:', json);

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to complete challenge');
  }

  return json as CompleteChallengeResult;
}

/* ═══════════════════════════════════════════
   FETCH XP SUMMARY
   ═══════════════════════════════════════════ */
export async function fetchXpSummary(athleteId: string): Promise<XpSummary> {
  const url = `${VITE_API_URL}/xp/summary?athleteId=${encodeURIComponent(athleteId)}`;
  console.log('🌐 fetchXpSummary:', url);

  const res = await fetch(url);
  const json = await res.json();

  console.log('📥 XP Summary response:', json);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to fetch XP summary');
  }

  return json.data as XpSummary;
}

export async function fetchCompletedChallengeIds(
  athleteId: string
): Promise<string[]> {
  const r = await fetch(
    `${VITE_API_URL}/video-challenges/completed?athleteId=${encodeURIComponent(athleteId)}`
  );
  
  const json = await r.json();
  console.log(json);
  if (!json.success) throw new Error(json.message || 'Failed');
  return json.data ?? [];
}