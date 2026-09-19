// frontend/src/services/regional.service.ts
const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

/* ═══════════════════════════════════════════
   REGIONAL STATS
   ═══════════════════════════════════════════ */
export const fetchRegionalStatsAPI = async (
  athleteId: string,
  sport?: string
): Promise<any> => {
  const params = new URLSearchParams();
  if (sport) params.append('sport', sport);

  const res = await fetch(
    `${API}/regional/stats/${athleteId}?${params.toString()}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

/* ═══════════════════════════════════════════
   LOCAL TOURNAMENTS
   ═══════════════════════════════════════════ */
export const fetchLocalTournamentsAPI = async (
  city: string,
  state: string,
  sport: string = 'all',
  limit: number = 10
): Promise<any[]> => {
  const params = new URLSearchParams({
    city,
    state,
    sport,
    limit: String(limit),
  });

  const res = await fetch(`${API}/regional/tournaments?${params}`, {
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};

/* ═══════════════════════════════════════════
   LOCAL ACTIVITY
   ═══════════════════════════════════════════ */
export const fetchLocalActivityAPI = async (
  city: string,
  state: string,
  sport: string = 'all',
  limit: number = 20
): Promise<any[]> => {
  const params = new URLSearchParams({
    city,
    state,
    sport,
    limit: String(limit),
  });

  const res = await fetch(`${API}/regional/activity?${params}`, {
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;
};