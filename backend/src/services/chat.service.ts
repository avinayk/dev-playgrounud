// src/services/chat.service.ts
import { randomUUID } from 'crypto';
import pool from '../config/database';
import type {
  ConversationRow,
  MessageRow,
  ConversationDTO,
  MessageDTO,
} from '../models/chat.model';

export class ChatService {
  /* ─── Get all conversations for a user ─── */
  static async getConversations(athleteId: string): Promise<ConversationDTO[]> {
    const [rows] = await pool.execute<ConversationRow[]>(
      `
      SELECT
        c.*,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id != ?
            AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
        ) AS unread_count,
        (
          SELECT a.id FROM conversation_members cm2
          JOIN athletes a ON a.id = cm2.athlete_id
          WHERE cm2.conversation_id = c.id AND cm2.athlete_id != ?
          LIMIT 1
        ) AS other_athlete_id,
        (
          SELECT a.name FROM conversation_members cm2
          JOIN athletes a ON a.id = cm2.athlete_id
          WHERE cm2.conversation_id = c.id AND cm2.athlete_id != ?
          LIMIT 1
        ) AS other_athlete_name,
        (
          SELECT a.profilepicture FROM conversation_members cm2
          JOIN athletes a ON a.id = cm2.athlete_id
          WHERE cm2.conversation_id = c.id AND cm2.athlete_id != ?
          LIMIT 1
        ) AS other_athlete_avatar
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.athlete_id = ?
      ORDER BY c.last_message_at DESC, c.created_at DESC
      `,
      [athleteId, athleteId, athleteId, athleteId, athleteId]
    );

    return rows.map((row) => this.mapConversation(row, athleteId));
  }

  /* ─── Get or create a DM between two athletes ─── */
  static async getOrCreateDirect(
    athleteA: string,
    athleteB: string
  ): Promise<ConversationDTO> {
    // Check if exists
    const [existing] = await pool.execute<ConversationRow[]>(
      `
      SELECT c.* FROM conversations c
      JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.athlete_id = ?
      JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.athlete_id = ?
      WHERE c.type = 'direct'
      LIMIT 1
      `,
      [athleteA, athleteB]
    );

    if (existing[0]) {
      return this.mapConversation(existing[0], athleteA);
    }

    // Create new
    const id = randomUUID();
    await pool.execute(
      `INSERT INTO conversations (id, type, created_by) VALUES (?, 'direct', ?)`,
      [id, athleteA]
    );

    await pool.execute(
      `INSERT INTO conversation_members (conversation_id, athlete_id) VALUES (?, ?), (?, ?)`,
      [id, athleteA, id, athleteB]
    );

    const [created] = await pool.execute<ConversationRow[]>(
      `SELECT * FROM conversations WHERE id = ?`,
      [id]
    );

    return this.mapConversation(created[0], athleteA);
  }

  /* ─── Get messages for a conversation ─── */
  static async getMessages(
    conversationId: string,
    athleteId: string,
    limit = 100
  ): Promise<MessageDTO[]> {
    const [rows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, a.name AS sender_name, a.profilepicture AS sender_avatar
      FROM messages m
      JOIN athletes a ON a.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ?`,
      [conversationId, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name ?? 'Unknown',
      senderAvatar: row.sender_avatar ?? null,
      text: row.text,
      messageType: row.message_type,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      isRead: row.is_read === 1,
      createdAt: row.created_at,
      isMe: row.sender_id === athleteId,
    }));
  }

  /* ─── Send a message ─── */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    messageType: 'text' | 'image' = 'text',
    attachmentUrl: string | null = null,
    attachmentName: string | null = null
  ): Promise<MessageDTO> {
    const id = randomUUID();

    await pool.execute(
      `INSERT INTO messages 
        (id, conversation_id, sender_id, text, message_type, attachment_url, attachment_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, conversationId, senderId, text, messageType, attachmentUrl, attachmentName]
    );

    await pool.execute(
      `UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?`,
      [messageType === 'image' ? '📷 Image' : text, conversationId]
    );

    const [rows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, a.name AS sender_name, a.profilepicture AS sender_avatar
      FROM messages m
      JOIN athletes a ON a.id = m.sender_id
      WHERE m.id = ?`,
      [id]
    );

    const row = rows[0];

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name ?? 'Unknown',
      senderAvatar: row.sender_avatar ?? null,
      text: row.text,
      messageType: row.message_type,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      isRead: row.is_read === 1,
      createdAt: row.created_at,
      isMe: false,
    };
  }

  /* ─── Mark conversation as read ─── */
  static async markAsRead(conversationId: string, athleteId: string): Promise<void> {
    await pool.execute(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = ? AND athlete_id = ?`,
      [conversationId, athleteId]
    );
  }

  /* ─── Delete a conversation ─── */
  static async deleteConversation(
    conversationId: string,
    athleteId: string
  ): Promise<void> {
    // Verify user is member
    const [member] = await pool.execute<any[]>(
      `SELECT * FROM conversation_members
      WHERE conversation_id = ? AND athlete_id = ?`,
      [conversationId, athleteId]
    );

    if (!member[0]) {
      throw new Error('Not a member of this conversation');
    }

    // Get conversation type
    const [conv] = await pool.execute<any[]>(
      `SELECT type FROM conversations WHERE id = ?`,
      [conversationId]
    );

    if (!conv[0]) {
      throw new Error('Conversation not found');
    }

    if (conv[0].type === 'group') {
      // Group: just leave (don't delete for others)
      await pool.execute(
        `DELETE FROM conversation_members
        WHERE conversation_id = ? AND athlete_id = ?`,
        [conversationId, athleteId]
      );

      // If no members left, delete the group
      const [remaining] = await pool.execute<any[]>(
        `SELECT COUNT(*) AS cnt FROM conversation_members WHERE conversation_id = ?`,
        [conversationId]
      );

      if (Number(remaining[0]?.cnt) === 0) {
        await pool.execute(
          `DELETE FROM conversations WHERE id = ?`,
          [conversationId]
        );
      }
    } else {
      // Direct: delete for both users (cascade removes members + messages)
      await pool.execute(
        `DELETE FROM conversations WHERE id = ?`,
        [conversationId]
      );
    }
  }

  /* ─── Map row to DTO ─── */
  private static mapConversation(
    row: ConversationRow,
    currentAthleteId: string
  ): ConversationDTO {
    const isDirect = row.type === 'direct';
    const name = isDirect
      ? row.other_athlete_name ?? 'Athlete'
      : row.name ?? 'Group Chat';

    const avatar = isDirect
      ? row.other_athlete_avatar ?? null
      : row.avatar ?? null;

    return {
      id: row.id,
      type: row.type,
      name,
      avatar,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: Number(row.unread_count ?? 0),
      online: Boolean(row.other_athlete_online),
      isPro: false,
      isGroup: !isDirect,
      otherAthleteId: row.other_athlete_id ?? undefined,
    };
  }
}

