// types/index.ts

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthProviderSettings {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  appleEnabled: boolean;
  allowedEmailDomains?: string[];
  providerOrder?: string[];
}

export type SportType = 'basketball' | 'baseball' | 'softball' | 'pickleball' | 'soccer' | 'volleyball' | 'football' | 'tennis';
export type UserLevel = 'high_school' | 'college' | 'playground_pro' | 'scout_recruiter';

export type NavTab = 'dashboard' | 'profile' | 'auth' | 'chat' | 'stats' | 'leaderboard' | 'games' | 'messages';

export interface NavigationProps {
  user?: {
    id: string;
    name: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    avatar?: string;
  };
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenStatLog: () => void;
  onOpenHostGame: () => void;
  onOpenReferralModal?: () => void;
  unreadChatCount?: number;
  isLoggedIn?: boolean;
  pendingQueue?: Array<{ id: string; type: string; status: string; retryCount?: number }>;
  isSyncing?: boolean;
  syncProgress?: { current: number; total: number };
  isOnline?: boolean;
  onSimulateOfflineAction?: () => void;
}