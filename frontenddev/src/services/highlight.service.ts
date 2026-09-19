// services/highlight.service.ts
const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export interface HighlightAPIItem {
  id: string;
  athleteId: string;
  title: string;
  description: string;
  sport: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── CREATE ─── */
export async function createHighlightAPI(
  athleteId: string,
  data: {
    title: string;
    description?: string;
    sport: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }
): Promise<HighlightAPIItem> {
  const res = await fetch(`${API_BASE}/highlights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, ...data }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to create highlight');
  }
  return json.data as HighlightAPIItem;
}

/* ─── LIST BY ATHLETE ─── */
export async function fetchAthleteHighlights(
  athleteId: string,
  options: { sport?: string; limit?: number; offset?: number } = {}
): Promise<HighlightAPIItem[]> {
  const params = new URLSearchParams({
    athleteId,
    sport: options.sport ?? 'all',
    limit: String(options.limit ?? 50),
    offset: String(options.offset ?? 0),
  });

  const res = await fetch(`${API_BASE}/highlights?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch highlights');
  }
  return json.data as HighlightAPIItem[];
}

/* ─── LIST COMMUNITY ─── */
export async function fetchCommunityHighlights(
  options: { sport?: string; limit?: number; offset?: number } = {}
): Promise<HighlightAPIItem[]> {
  const params = new URLSearchParams({
    sport: options.sport ?? 'all',
    limit: String(options.limit ?? 50),
    offset: String(options.offset ?? 0),
  });

  const res = await fetch(
    `${API_BASE}/highlights/community?${params.toString()}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch community highlights');
  }
  return json.data as HighlightAPIItem[];
}

/* ─── INCREMENT VIEW ─── */
export async function incrementHighlightViewsAPI(
  id: string
): Promise<void> {
  await fetch(`${API_BASE}/highlights/${id}/view`, {
    method: 'POST',
  }).catch(() => {});
}

/* ─── TOGGLE LIKE ─── */
export async function toggleHighlightLikeAPI(
  id: string,
  delta: 1 | -1
): Promise<number> {
  const res = await fetch(`${API_BASE}/highlights/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error('Failed to like');
  return Number(json.data.likes) || 0;
}

/* ─── DELETE ─── */
export async function deleteHighlightAPI(
  id: string,
  athleteId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/highlights/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error('Failed to delete');
}