import type {
  ApiResponse,
  PickupGame,
  PickupGameFormData,
  RawPickupGame,
  PickupGameFilters,
} from '../types/pickupGames';

const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

function mapGame(row: RawPickupGame): PickupGame {
  return {
    id: row.id,
    title: row.title,
    sport: row.sport,
    competitiveLevel: row.competitive_level,
    location: row.location,
    lat: parseCoord(row.lat),          // ✅ safe
    lng: parseCoord(row.lng), 
    date: row.date,
    time: row.time,
    creatorId: row.creator_id,
    maxPlayers: row.max_players,
    currentPlayers: row.current_players,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorName: row.creator_name ?? null,
    creatorPicture: row.creator_picture ?? null,
  };
}
function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return null;
  return n;
}
export async function createPickupGame(
  form: PickupGameFormData,
  creatorId: string
): Promise<PickupGame> {
  const body = {
    gameTitle: form.gameTitle.trim(),
    sport: form.sport,
    competitiveLevel: form.competitiveLevel,
    venue: form.venue || form.location,
    lat: form.lat ?? null,        // ✅ ADD
    lng: form.lng ?? null,  
    date: form.date,
    time: form.time,
    maxPlayers: Number(form.maxPlayers) || 10,
    description: form.description?.trim() ?? '',
    creatorId,    // ✅ ye MISSING ho sakta hai
  };

  console.log('📤 POST body:', body);   // debug

  const res = await fetch(`${API_BASE}/pickup-games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  console.log('📥 Response:', json);    // debug

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to create pickup game');
  }

  return json.data;
}
export async function fetchRegionStats(): Promise<RegionStats> {
  const url = `${API_BASE}/pickup-games/stats`;
  console.log('🌐 GET:', url);

  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<RegionStats>;

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to fetch region stats');
  }

  return json.data;
}

export async function fetchPickupGames(
  filters: PickupGameFilters = {}
): Promise<PickupGame[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sport && filters.sport !== 'all') params.set('sport', filters.sport);
  if (filters.level && filters.level !== 'all') params.set('level', filters.level);
  if (filters.date) params.set('date', filters.date);
  console.log(params)
  const query = params.toString();
  const url = `${API_BASE}/pickup-games${query ? `?${query}` : ''}`;

  console.log('🌐 GET:', url);
  const res = await fetch(url);
  const json = await res.json();

 

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch pickup games');
  }

  // ✅ Defensive: handle different shapes
  const raw = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json)
    ? json
    : json.data?.rows ?? json.rows ?? [];

  return raw.map(mapGame);
}

// Join game
export async function joinGame(
  gameId: string,
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE}/pickup-games/${gameId}/join`;
  
  console.log('🌐 POST', url);   // ✅ Debug
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to join game');
  }
  return json;
}

// Leave game
export async function leaveGame(
  gameId: string,
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/pickup-games/${gameId}/leave`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to leave game');
  }
  return json;
}

// Get participants
export async function fetchParticipants(gameId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/pickup-games/${gameId}/participants`);
  const json = await res.json();
  if (!res.ok || !json.success) return [];
  return json.data ?? [];
}

// Bulk fetch participants
export async function fetchParticipantsBulk(
  gameIds: string[]
): Promise<Record<string, any[]>> {
  if (!gameIds.length) return {};
  const res = await fetch(`${API_BASE}/pickup-games/participants/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameIds }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) return {};
  return json.data ?? {};
}

// Get user's joined games
export async function fetchUserJoinedGames(
  athleteId: string
): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/pickup-games/user/${athleteId}/joined`
  );
  const json = await res.json();
  if (!res.ok || !json.success) return [];
  return json.data ?? [];
}


export async function sendGameInvites(
  gameId: string,
  emails: string[],
  senderId: string
): Promise<{ sent: number; failed: number }> {
  const res = await fetch(`${API_BASE}/pickup-games/${gameId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails, senderId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to send invites');
  }
  return json.data;
}