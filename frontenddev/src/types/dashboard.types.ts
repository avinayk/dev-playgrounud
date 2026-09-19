// types/dashboard.types.ts
export interface DashboardTabProps {
  athlete: AthleteProfile | null;
  onStartGame?: () => void;
  onViewStats?: () => void;
  onViewHighlights?: () => void;
}

export interface DashboardStatCard {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  change?: number;
  color?: string;
}

export interface RecentActivity {
  id: string;
  type: 'game' | 'highlight' | 'achievement' | 'follow';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}