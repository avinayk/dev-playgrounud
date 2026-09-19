// services/mvp.service.ts
const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function fetchMvpData(gameId: string, userId: string) {
  const res = await fetch(`${API_BASE}/pickup-games/${gameId}/mvp?userId=${userId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
}

export async function castMvpVote(
  gameId: string,
  voterId: string,
  votedForId: string
) {
  const res = await fetch(`${API_BASE}/pickup-games/${gameId}/mvp/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterId, votedForId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json;
}