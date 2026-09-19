// frontend/src/services/dashboard.service.ts
const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

/* ═══════════════════════════════════════════
   DAILY CHECK-IN
   ═══════════════════════════════════════════ */
export const dailyCheckInAPI = async (
  athleteId: string
): Promise<{
  xpEarned: number;
  newStreak: number;
  alreadyCheckedIn: boolean;
  longestStreak: number;
  lastCheckinDate: string;
}> => {
  console.log('📤 [dailyCheckInAPI] athleteId:', athleteId);

  const res = await fetch(`${API}/dashboard/checkin/${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to check in');
  }

  console.log('📥 [dailyCheckInAPI] response:', json.data);
  return json.data;
};

/* ═══════════════════════════════════════════
   GET CHECK-IN STATUS
   ═══════════════════════════════════════════ */
export const getCheckInStatusAPI = async (
  athleteId: string
): Promise<{
  isCheckedInToday: boolean;
  dailyStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  recentCheckins: string[];
}> => {
  console.log('📤 [getCheckInStatusAPI] athleteId:', athleteId);

  const res = await fetch(`${API}/dashboard/checkin-status/${athleteId}`, {
    // ✅ ADD: cache-busting to avoid stale responses
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch status');
  }

  console.log('📥 [getCheckInStatusAPI] response:', json.data);
  return json.data;
};