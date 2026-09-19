export type GameStatus = 'open' | 'full' | 'completed' | 'cancelled';
export type ViewMode = 'grid' | 'list';
/** Form data shape — exactly what HostGameModal sends */
export interface PickupGameFormData {
  gameTitle: string;
  sport: string;
  competitiveLevel: string;
  venue: string;
  location: string;
  lat?: number | null;      // ✅ ADD
  lng?: number | null; 
  date: string;
  time: string;
  maxPlayers: number;
  gameType: string;
  skillLevel: string;
  description: string;
}

/** Row coming from backend */
export interface RawPickupGame {
  id: string;
  title: string;
  sport: string;
  competitive_level: string;
  location: string;
  lat?: number | null;      // ✅ ADD
  lng?: number | null; 
  date: string;
  time: string;
  creator_id: string;
  max_players: number;
  current_players: number;
  description: string | null;
  status: GameStatus;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
  creator_picture?: string | null;
}

/** Normalized client model */
export interface PickupGame {
  id: string;
  title: string;
  sport: string;
  competitiveLevel: string;
  location: string;
  lat?: number | null;      // ✅ ADD
  lng?: number | null; 
  date: string;
  time: string;
  creatorId: string;
  maxPlayers: number;
  currentPlayers: number;
  description: string | null;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  creatorName?: string | null;
  creatorPicture?: string | null;
}
export interface RegionStats {
  totalAthletes: number;
  activeCourts: number;
  liveGames: number;
  topRegion: string;
  stateCourts: number;
  stateAthletes: number;
  densityLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  mapCenter: { lat: number; lng: number };
}
export interface PickupGameFilters {
  search?: string;
  sport?: string;
  level?: string;
  date?: string;
}
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}