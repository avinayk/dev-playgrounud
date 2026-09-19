// types/profile.types.ts
import { AthleteProfile } from './auth.types';

/**
 * ⭐ Full ProfileTab Props
 * Includes all optional callbacks and state passed from App.tsx
 */
export interface ProfileTabProps {
  // ─── Core ───
  athlete: AthleteProfile | null;
  allAthletes?: AthleteProfile[];   // ⭐ YE ADD KARO (optional)
  onNavigateToDashboard?: () => void;
  onEditProfile?: () => void;
  onSaveProfile?: (patch: Partial<AthleteProfile>) => Promise<void>;

  // ─── Navigation ───
  onNavigateToTab?: (tab: string, target?: any) => void;

  // ─── Modals / Actions ───
  onOpenStatLog?: (prefilledData?: any) => void;
  onOpenUploadHighlight?: () => void;
  onLogout?: () => void;

  // ⭐ ─── Palette / Theme ───
  activePalette?: string;
  onSelectPalette?: (paletteId: string) => void;

  // ─── Offline Sync Queue ───
  pendingQueue?: Array<{
    id: string;
    type: string;
    payload?: any;
    status: 'pending' | 'failed' | 'synced';
    createdAt?: string;
    errorMessage?: string;
  }>;
  onRetryQueueItem?: (id: string) => void;
  onClearSyncedQueue?: () => void;
  onSimulateOfflineAction?: () => void;
}

/**
 * ⭐ ProfileTab internal section config (optional — used by tab navigation)
 */
export interface ProfileSection {
  id: string;
  label: string;
  icon: string;
  component: React.ReactNode;
}

/**
 * ⭐ Aggregate profile stats (used by stat summary cards)
 */
export interface ProfileStats {
  gamesPlayed: number;
  highlights: number;
  followers: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
}

/**
 * ⭐ Palette Definition (used by ProfileTab + App)
 */
export interface Palette {
  id: string;
  name: string;
  description: string;
  vibe: string;
  colors: {
    bg: string;
    card: string;
    accent1: string;
    accent2: string;
  };
}

/**
 * ⭐ Offline Sync Queue Item (matches App.tsx pendingQueue prop)
 */
export interface OfflineQueueItem {
  id: string;
  type: string;
  payload?: any;
  status: 'pending' | 'failed' | 'synced';
  createdAt?: string;
  errorMessage?: string;
}