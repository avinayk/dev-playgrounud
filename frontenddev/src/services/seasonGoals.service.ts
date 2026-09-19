// src/services/seasonGoals.service.ts
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export interface SeasonGoalDTO {
  id: string;
  athleteId: string;
  templateId: string | null;
  sport: string;
  title: string;
  description: string | null;
  unit: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  seasonYear: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSeasonGoalsAPI(
  athleteId: string,
  sport?: string
): Promise<SeasonGoalDTO[]> {
  const url = sport
    ? `${API_URL}/season-goals/${athleteId}?sport=${sport}`
    : `${API_URL}/season-goals/${athleteId}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to load season goals');
  return j.data;
}

export async function createSeasonGoalAPI(payload: {
  athleteId: string;
  sport: string;
  title: string;
  description?: string;
  unit: string;
  targetCount: number;
  rewardXp: number;
}): Promise<SeasonGoalDTO> {
  const r = await fetch(`${API_URL}/season-goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to create season goal');
  return j.data;
}

export async function progressSeasonGoalAPI(
  athleteId: string,
  goalId: string,
  increment = 1
): Promise<SeasonGoalDTO> {
  const r = await fetch(`${API_URL}/season-goals/${athleteId}/${goalId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to update');
  return j.data;
}

export async function claimSeasonGoalAPI(
  athleteId: string,
  goalId: string
): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
}> {
  const r = await fetch(`${API_URL}/season-goals/${athleteId}/${goalId}/claim`, {
    method: 'POST',
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to claim');
  return j.data;
}

export async function deleteSeasonGoalAPI(
  athleteId: string,
  goalId: string
): Promise<boolean> {
  const r = await fetch(`${API_URL}/season-goals/${athleteId}/${goalId}`, {
    method: 'DELETE',
  });
  const j = await r.json();
  return r.ok && j.success;
}