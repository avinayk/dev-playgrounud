// src/models/chat.model.ts
import type { RowDataPacket } from 'mysql2';

export interface ConversationRow extends RowDataPacket {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar: string | null;
  created_by: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  unread_count?: number;
  other_athlete_id?: string;
  other_athlete_name?: string;
  other_athlete_avatar?: string;
  other_athlete_online?: number;
}

export interface MessageRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  message_type: 'text' | 'image' | 'voice';   // ✅ voice add
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: 0 | 1;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
}
export interface ConversationDTO {
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

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
  messageType: 'text' | 'image' | 'voice';   // ✅ voice add
  attachmentUrl: string | null;
  attachmentName: string | null;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
}

export interface SendMessageBody {
  conversationId: string;
  senderId: string;
  text: string;
}
export interface MessageRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  message_type: 'text' | 'image';
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: 0 | 1;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
}

export interface MessageDTO {
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