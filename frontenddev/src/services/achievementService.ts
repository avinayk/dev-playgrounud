// frontend/src/services/achievementService.ts
import type { MilestoneItem } from '../components/Achievements';

const API =
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:5000/api';

/* ═══════════════════════════════════════════
   GET /api/achievements/:athleteId
   Returns: { milestones: MilestoneItem[], claimedIds: string[] }
   ═══════════════════════════════════════════ */
export async function fetchAchievements(athleteId: string): Promise<{
  milestones: MilestoneItem[];
  claimedIds: string[];
}> {
  const r = await fetch(`${API}/achievements/${encodeURIComponent(athleteId)}`);

  if (!r.ok) {
    throw new Error(`Failed to fetch achievements (${r.status})`);
  }

  const json = await r.json();

  if (!json.success) {
    throw new Error(json.message || 'Failed to fetch achievements');
  }

  return {
    milestones: json.data?.milestones ?? [],
    claimedIds: json.data?.claimedIds ?? [],
  };
}

/* ═══════════════════════════════════════════
   POST /api/achievements/:athleteId/claim
   ═══════════════════════════════════════════ */
export async function claimAchievement(
  athleteId: string,
  milestoneId: string,
  xpReward: number,
  badgeName: string
): Promise<{
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  isMilestoneReached: boolean;
  levelInfo: any;
}> {
  const r = await fetch(
    `${API}/achievements/${encodeURIComponent(athleteId)}/claim`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId, xpReward, badgeName }),
    }
  );

  const json = await r.json();

  if (!r.ok || !json.success) {
    throw new Error(json.message || `Failed to claim (${r.status})`);
  }

  return json.data;
}

/* ═══════════════════════════════════════════
   GET /api/achievements/:athleteId/pinned
   ═══════════════════════════════════════════ */
export async function fetchPinnedBadges(
  athleteId: string
): Promise<string[]> {
  const r = await fetch(
    `${API}/achievements/${encodeURIComponent(athleteId)}/pinned`
  );

  if (!r.ok) return [];

  const json = await r.json();
  return Array.isArray(json.data) ? json.data : [];
}

/* ═══════════════════════════════════════════
   POST /api/achievements/:athleteId/pin
   ═══════════════════════════════════════════ */
export async function savePinnedBadges(
  athleteId: string,
  pinnedBadgeIds: string[]
): Promise<string[]> {
  const r = await fetch(
    `${API}/achievements/${encodeURIComponent(athleteId)}/pin`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedBadgeIds }),
    }
  );

  const json = await r.json();

  if (!r.ok || !json.success) {
    throw new Error(json.message || `Failed to save pins (${r.status})`);
  }

  return json.data ?? pinnedBadgeIds;
}