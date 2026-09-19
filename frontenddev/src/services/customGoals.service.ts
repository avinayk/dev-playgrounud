// src/services/customGoals.service.ts
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export interface CustomGoalDTO {
  id: string;
  athleteId: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  type: 'daily' | 'weekly' | 'season';
  sport: string;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createCustomGoalAPI(payload: {
  athleteId: string;
  title: string;
  description?: string;
  target: number;
  unit?: string;
  rewardXp: number;
  type?: 'daily' | 'weekly' | 'season';
  sport?: string;
  targetDate?: string;
}): Promise<CustomGoalDTO> {
  const r = await fetch(`${API_URL}/custom-goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to create goal');
  return j.data;
}

export async function fetchCustomGoalsAPI(
  athleteId: string,
  type?: 'daily' | 'weekly' | 'season'
): Promise<CustomGoalDTO[]> {
  const url = type
    ? `${API_URL}/custom-goals/${athleteId}?type=${type}`
    : `${API_URL}/custom-goals/${athleteId}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to load goals');
  return j.data;
}

export async function progressCustomGoalAPI(
  athleteId: string,
  goalId: string,
  increment = 1
): Promise<CustomGoalDTO> {
  const r = await fetch(`${API_URL}/custom-goals/${athleteId}/${goalId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to update');
  return j.data;
}

export async function claimCustomGoalAPI(
  athleteId: string,
  goalId: string
): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
}> {
  const r = await fetch(`${API_URL}/custom-goals/${athleteId}/${goalId}/claim`, {
    method: 'POST',
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || 'Failed to claim');
  return j.data;
}

export async function deleteCustomGoalAPI(
  athleteId: string,
  goalId: string
): Promise<boolean> {
  const r = await fetch(`${API_URL}/custom-goals/${athleteId}/${goalId}`, {
    method: 'DELETE',
  });
  const j = await r.json();
  return r.ok && j.success;
}