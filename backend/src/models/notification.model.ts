// src/models/notification.model.ts
import type { RowDataPacket } from 'mysql2';

export type NotificationType =
  | 'friend_request'
  | 'game_invite'
  | 'chat_mention'
  | 'achievement'
  | 'badge'
  | 'system';

export type NotificationStatus = 'pending' | 'accepted' | 'declined' | 'info';

export interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  sender_id: string | null;
  reference_id: string | null;
  action_url: string | null;
  status: NotificationStatus;
  is_read: 0 | 1;
  created_at: string;
  updated_at: string;
  // joined
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  senderId: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  referenceId: string | null;
  actionUrl: string | null;
  status: NotificationStatus;
  read: boolean;
  createdAt: string;
}