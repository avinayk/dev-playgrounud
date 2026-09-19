// src/services/courts.service.ts

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export interface CourtDTO {
  id: string;
  name: string;
  sport: string;
  city: string;
  state: string;
  address: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  rating: number;
  activePlayersNow: number;
  isActive: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RadarPingResult {
  court: CourtDTO;
  notifiedCount: number;
  nearbyAthletes: Array<{
    id: string;
    name: string;
    avatar: string | null;
    distanceMeters: number;
  }>;
  notificationId: string;
}

/* ═══════════════════════════════════════════
   HELPER — API CALL
   ═══════════════════════════════════════════ */
async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let j: any;
  try {
    j = await r.json();
  } catch {
    throw new Error(`Invalid JSON from ${path}`);
  }

  if (!r.ok || !j.success) {
    throw new Error(j.message || `Request failed (${r.status})`);
  }
  return j.data;
}

/* ═══════════════════════════════════════════
   COURTS CRUD API
   ═══════════════════════════════════════════ */

/** List all courts with optional filters */
export async function fetchCourtsAPI(
  filters: {
    sport?: string;
    city?: string;
    state?: string;
    search?: string;
  } = {}
): Promise<CourtDTO[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'all') params.set(k, String(v));
  });
  const q = params.toString();
  return apiCall(`/courts${q ? `?${q}` : ''}`);
}

/** Get single court by ID */
export async function fetchCourtByIdAPI(id: string): Promise<CourtDTO> {
  return apiCall(`/courts/${id}`);
}

/** Create new court */
export async function createCourtAPI(
  payload: Partial<CourtDTO>
): Promise<CourtDTO> {
  return apiCall(`/courts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update existing court */
export async function updateCourtAPI(
  id: string,
  updates: Partial<CourtDTO>
): Promise<CourtDTO> {
  return apiCall(`/courts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/** Delete (soft) court */
export async function deleteCourtAPI(id: string): Promise<boolean> {
  const r = await fetch(`${API_URL}/courts/${id}`, { method: 'DELETE' });
  const j = await r.json();
  return r.ok && j.success;
}

/* ═══════════════════════════════════════════
   ✅ RADAR PING API
   ═══════════════════════════════════════════ */

/**
 * Send a radar ping to notify nearby athletes that user is at this court
 * @param courtId - Court ID where the athlete is located
 * @param athleteId - Sender athlete ID
 * @param message - Optional custom message
 */
export async function sendRadarPingAPI(
  courtId: string,
  athleteId: string,
  message?: string
): Promise<RadarPingResult> {
  return apiCall(`/courts/${courtId}/radar-ping`, {
    method: 'POST',
    body: JSON.stringify({ athleteId, message }),
  });
}