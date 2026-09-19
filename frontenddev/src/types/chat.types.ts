// types/chat.types.ts
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  online: boolean;
  isPro: boolean;
  isGroup: boolean;
  otherAthleteId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
  messageType: 'text' | 'image';
  attachmentUrl: string | null;
  attachmentName: string | null;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type FriendStatusType =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'blocked';

export interface FriendStatus {
  status: FriendStatusType;
  friendshipId?: number;
}

export interface Friend {
  id: number;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  friendName: string;
  friendAvatar: string | null;
  friendHandle: string | null;
  friendPosition: string | null;
  friendSport: string | null;
}