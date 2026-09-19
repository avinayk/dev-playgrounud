const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function awardXpAPI(
  athleteId: string,
  amount: number,
  source: string,
  referenceId?: string
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const r = await fetch(`${API}/xp/award`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, amount, source, referenceId }),
  });
  const json = await r.json();
  if (!json.success) throw new Error(json.message || 'Failed to award XP');
  return json.data;
}