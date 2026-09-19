// src/models/pickupGame.model.ts
import type { RowDataPacket } from 'mysql2';

export type GameStatus = 'open' | 'full' | 'completed' | 'cancelled';

export interface PickupGameRow extends RowDataPacket {
  id: string;
  title: string;
  sport: string;
  competitive_level: string | null;
  location: string;
  lat: number | null;          // ✅ ADD
  lng: number | null;
  date: string;
  time: string;
  creator_id: string;
  max_players: number;
  current_players: number;
  description: string | null;
  is_quick_match: 0 | 1;
  status: GameStatus;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
  creator_picture?: string | null;
}

export interface CreatePickupGameBody {
  gameTitle?: string;
  sport?: string;
  competitiveLevel?: string;
  venue?: string;
  location?: string;
  lat: number | null;          // ✅ ADD
  lng: number | null;
  date?: string;
  time?: string;
  maxPlayers?: number;
  description?: string;
  creatorId?: string;
}

export interface CreatePickupGameDTO {
  id: string;
  title: string;
  sport: string;
  competitiveLevel: string;
  location: string;
  lat: number | null;          // ✅ ADD
  lng: number | null;
  date: string;
  time: string;
  creatorId: string;
  maxPlayers: number;
  description: string | null;
}