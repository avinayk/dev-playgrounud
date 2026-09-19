// types/notification.types.ts
export type NotificationType =
  | 'friend_request'
  | 'game_invite'
  | 'chat_mention'
  | 'achievement'
  | 'badge'
  | 'system';

export type NotificationStatus = 'pending' | 'accepted' | 'declined' | 'info';

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  senderId?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  referenceId?: string | null;
  actionUrl?: string | null;
  status: NotificationStatus;
  read: boolean;
  createdAt?: string | number;
  timestamp?: string;
}