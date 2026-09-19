// frontend/src/utils/achievementHelpers.ts
import type { AthleteProfile, SportType } from '../types';

/** Normalize a raw MySQL athlete row → AthleteProfile shape used by UI */
export function normalizeAthlete(raw: any): AthleteProfile {
  if (!raw) return raw;

  return {
    ...raw,
    // XP — DB column is valuexp
    valuexp: raw.valuexp ?? raw.valueXp ?? raw.totalXp ?? raw.xp ?? 0,
    xp: raw.valuexp ?? raw.valueXp ?? raw.totalXp ?? raw.xp ?? 0,

    // Handle — DB column is userhandle
    handle: raw.userhandle ?? raw.handle ?? raw.user_handle ?? 'athlete',
    userhandle: raw.userhandle ?? raw.handle ?? 'athlete',

    // Avatar — DB column is profilepicture
    avatar:
      raw.profilepicture ??
      raw.profilePicture ??
      raw.avatar ??
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    profilepicture: raw.profilepicture ?? raw.profilePicture ?? raw.avatar,

    // Sport — DB column is primary_sport
    primarySport: (raw.primary_sport ??
      raw.primarySport ??
      raw.sport ??
      'basketball') as SportType,
    primary_sport: raw.primary_sport ?? raw.primarySport,

    // Level / streak / wins — DB may not have all
    level: raw.level ?? 1,
    dailyStreak: raw.dailyStreak ?? raw.daily_streak ?? 1,
    winCount: raw.winCount ?? raw.win_count ?? 0,

    // Pinned badges — DB column is pinned_badge_ids (JSON)
    pinnedBadgeIds: parsePinnedBadges(
      raw.pinnedBadgeIds ?? raw.pinned_badge_ids
    ),

    // PRO flags
    isPro: !!(raw.isPro ?? raw.is_pro),
    isVerifiedPro: !!(raw.isVerifiedPro ?? raw.is_verified_pro),
  } as AthleteProfile;
}

/** Parse pinned_badge_ids whether it's JSON string, array, or null */
export function parsePinnedBadges(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}