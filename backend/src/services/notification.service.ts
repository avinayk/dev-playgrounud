// src/services/notification.service.ts
import { randomUUID } from 'crypto';
import pool from '../config/database';
import type { RowDataPacket } from 'mysql2';

export type NotificationType =
  | 'friend_request'
  | 'game_invite'
  | 'chat_mention'
  | 'achievement'
  | 'badge'
  | 'system';

export interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  sender_id: string | null;
  reference_id: string | null;
  action_url: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'info';
  is_read: 0 | 1;
  created_at: string;
  updated_at: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export class NotificationService {
  /* ─── Get all for user ─── */
  static async list(userId: string): Promise<NotificationRow[]> {
    const [rows] = await pool.execute<NotificationRow[]>(
      `SELECT n.*,
              a.name AS sender_name,
              a.profilepicture AS sender_avatar
       FROM notifications n
       LEFT JOIN athletes a ON a.id = n.sender_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [userId]
    );
    return rows;
  }

  /* ─── Unread count ─── */
  static async unreadCount(userId: string): Promise<number> {
    const [rows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS cnt FROM notifications
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  /* ─── Create ─── */
  static async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    senderId?: string | null;
    referenceId?: string | null;
    actionUrl?: string | null;
    status?: 'pending' | 'accepted' | 'declined' | 'info';
  }): Promise<NotificationRow> {
    const id = randomUUID();

    await pool.execute(
      `INSERT INTO notifications 
        (id, user_id, type, title, message, sender_id, reference_id, action_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.type,
        data.title,
        data.message,
        data.senderId ?? null,
        data.referenceId ?? null,
        data.actionUrl ?? null,
        data.status ?? 'info',
      ]
    );

    const [rows] = await pool.execute<NotificationRow[]>(
      `SELECT n.*, a.name AS sender_name, a.profilepicture AS sender_avatar
       FROM notifications n
       LEFT JOIN athletes a ON a.id = n.sender_id
       WHERE n.id = ?`,
      [id]
    );

    return rows[0];
  }

  /* ─── Mark one read ─── */
  static async markRead(notificationId: string, userId: string): Promise<void> {
    await pool.execute(
      `UPDATE notifications SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
  }

  /* ─── Mark all read ─── */
  static async markAllRead(userId: string): Promise<void> {
    await pool.execute(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
  }

  /* ─── Delete one ─── */
  static async delete(notificationId: string, userId: string): Promise<void> {
    await pool.execute(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
  }

  /* ─── Clear all ─── */
  static async clearAll(userId: string): Promise<void> {
    await pool.execute(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
  }

  /* ─── Update status ─── */
  static async updateStatus(
    notificationId: string,
    userId: string,
    status: 'pending' | 'accepted' | 'declined' | 'info'
  ): Promise<void> {
    await pool.execute(
      `UPDATE notifications SET status = ?, is_read = 1
       WHERE id = ? AND user_id = ?`,
      [status, notificationId, userId]
    );
  }
}