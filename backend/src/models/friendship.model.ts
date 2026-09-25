// src/models/friendship.model.ts
import type { RowDataPacket } from 'mysql2';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipRow extends RowDataPacket {
  id: number;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  // joined fields
  friend_name?: string;
  friend_avatar?: string | null;
  friend_handle?: string | null;
  friend_position?: string | null;
  friend_sport?: string | null;
}

export interface FriendshipDTO {
  id: number;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: string;
  // friend details
  friendName: string;
  friendAvatar: string | null;
  friendHandle: string | null;
  friendPosition: string | null;
  friendSport: string | null;
  isOnline?: boolean;        // ✅ ADD KARO
  userStatus?: string;       // ✅ ADD KARO
  lastSeenAt?: string | null; 
}

export interface FriendStatus {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';
  friendshipId?: number;
}