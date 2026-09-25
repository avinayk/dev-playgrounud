// src/services/friendship.service.ts
import { randomUUID } from 'crypto';
import pool from '../config/database';
import type {
  FriendshipRow,
  FriendshipDTO,
  FriendStatus,
  FriendshipStatus,
} from '../models/friendship.model';

export class FriendshipService {
  /* ─── Send friend request ─── */
  static async sendRequest(
    userId: string,
    friendId: string
  ): Promise<FriendshipDTO> {
    if (userId === friendId) {
      throw new Error('Cannot add yourself as friend');
    }

    // Check if any existing friendship (either direction)
    const [existing] = await pool.execute<FriendshipRow[]>(
      `SELECT * FROM friendships
       WHERE (user_id = ? AND friend_id = ?)
          OR (user_id = ? AND friend_id = ?)
       LIMIT 1`,
      [userId, friendId, friendId, userId]
    );

    if (existing[0]) {
      const row = existing[0];

      // If already accepted
      if (row.status === 'accepted') {
        throw new Error('Already friends');
      }

      // If pending from other user → accept it
      if (row.status === 'pending' && row.user_id === friendId) {
        await pool.execute(
          `UPDATE friendships SET status = 'accepted' WHERE id = ?`,
          [row.id]
        );

        // ✅ Update original notification → accepted
        await pool.execute(
          `UPDATE notifications
           SET status = 'accepted', is_read = 1, updated_at = NOW()
           WHERE user_id = ? AND sender_id = ? AND type = 'friend_request'`,
          [userId, friendId]
        );

        // ✅ Notify original sender
        const [meRows] = await pool.execute<any[]>(
          `SELECT name FROM athletes WHERE id = ?`,
          [userId]
        );
        const myName = meRows[0]?.name ?? 'Someone';

        await this.createNotification(
          friendId,
          'achievement',
          `🎉 ${myName} accepted your friend request!`,
          `You are now friends with ${myName}.`,
          userId,
          'info'
        );

        const updated = await this.getById(row.id);
        if (!updated) throw new Error('Update failed');
        return updated;
      }

      // If pending from me → return existing
      if (row.status === 'pending' && row.user_id === userId) {
        return this.mapRow(row);
      }

      // If blocked → throw
      if (row.status === 'blocked') {
        throw new Error('Cannot send request');
      }
    }

    // Create new request
    await pool.execute(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
      [userId, friendId]
    );

    // ✅ Fetch sender name for notification
    const [senderRows] = await pool.execute<any[]>(
      `SELECT name FROM athletes WHERE id = ?`,
      [userId]
    );
    const senderName = senderRows[0]?.name ?? 'Someone';

    // ✅ Insert notification for receiver
    await this.createNotification(
      friendId,
      'friend_request',
      `🤝 ${senderName} sent you a friend request`,
      `${senderName} wants to connect with you on Playground League.`,
      userId,
      'pending'
    );

    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT f.*, 
              a.name AS friend_name,
              a.profilepicture AS friend_avatar,
              a.userhandle AS friend_handle,
              a.position AS friend_position,
              a.primary_sport AS friend_sport
       FROM friendships f
       JOIN athletes a ON a.id = f.friend_id
       WHERE f.user_id = ? AND f.friend_id = ?
       LIMIT 1`,
      [userId, friendId]
    );

    return this.mapRow(rows[0]);
  }

  /* ─── Accept request ─── */
  static async acceptRequest(
    userId: string,
    friendId: string
  ): Promise<void> {
    // user_id = friend (sender), friend_id = me (receiver)
    const [result] = await pool.execute<any>(
      `UPDATE friendships 
       SET status = 'accepted' 
       WHERE user_id = ? AND friend_id = ? AND status = 'pending'`,
      [friendId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('No pending request found');
    }

    // ✅ Update original notification → accepted
    await pool.execute(
      `UPDATE notifications
       SET status = 'accepted', is_read = 1, updated_at = NOW()
       WHERE user_id = ? AND sender_id = ? AND type = 'friend_request'`,
      [userId, friendId]
    );

    // ✅ Notify original sender
    const [meRows] = await pool.execute<any[]>(
      `SELECT name FROM athletes WHERE id = ?`,
      [userId]
    );
    const myName = meRows[0]?.name ?? 'Someone';

    await this.createNotification(
      friendId,
      'achievement',
      `🎉 ${myName} accepted your friend request!`,
      `You are now friends with ${myName}.`,
      userId,
      'info'
    );
  }

  /* ─── Reject / cancel request ─── */
  static async rejectRequest(
    userId: string,
    friendId: string
  ): Promise<void> {
    await pool.execute(
      `DELETE FROM friendships
       WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
         AND status = 'pending'`,
      [userId, friendId, friendId, userId]
    );

    // ✅ Mark original notification as declined
    await pool.execute(
      `UPDATE notifications
       SET status = 'declined', is_read = 1, updated_at = NOW()
       WHERE type = 'friend_request'
         AND ((user_id = ? AND sender_id = ?) OR (user_id = ? AND sender_id = ?))`,
      [userId, friendId, friendId, userId]
    );
  }

  /* ─── Remove friend ─── */
  static async removeFriend(
    userId: string,
    friendId: string
  ): Promise<void> {
    await pool.execute(
      `DELETE FROM friendships
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friendId, friendId, userId]
    );
  }

  /* ─── Get friendship status between two users ─── */
  static async getStatus(
    userId: string,
    otherId: string
  ): Promise<FriendStatus> {
    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT * FROM friendships
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
       LIMIT 1`,
      [userId, otherId, otherId, userId]
    );

    if (!rows[0]) return { status: 'none' };

    const row = rows[0];

    if (row.status === 'accepted') {
      return { status: 'accepted', friendshipId: row.id };
    }

    if (row.status === 'blocked') {
      return { status: 'blocked', friendshipId: row.id };
    }

    // pending
    if (row.user_id === userId) {
      return { status: 'pending_sent', friendshipId: row.id };
    }
    return { status: 'pending_received', friendshipId: row.id };
  }

  /* ─── Get all friends (accepted) ─── */
  static async getFriends(userId: string): Promise<FriendshipDTO[]> {
    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT f.*, 
              a.name AS friend_name,
              a.profilepicture AS friend_avatar,
              a.userhandle AS friend_handle,
              a.position AS friend_position,
              a.primary_sport AS friend_sport,
              a.user_status AS friend_status,        -- ✅ ADD KIYA
            a.last_seen_at AS friend_last_seen 
       FROM friendships f
       JOIN athletes a ON a.id = 
         CASE 
           WHEN f.user_id = ? THEN f.friend_id
           ELSE f.user_id
         END
       WHERE (f.user_id = ? OR f.friend_id = ?)
         AND f.status = 'accepted'
       ORDER BY a.name ASC`,
      [userId, userId, userId]
    );

    return rows.map((row) => this.mapRow(row, userId));
  }

  /* ─── Get pending requests (incoming) ─── */
  static async getPendingRequests(userId: string): Promise<FriendshipDTO[]> {
    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT f.*,
              a.name AS friend_name,
              a.profilepicture AS friend_avatar,
              a.userhandle AS friend_handle,
              a.position AS friend_position,
              a.primary_sport AS friend_sport
       FROM friendships f
       JOIN athletes a ON a.id = f.user_id
       WHERE f.friend_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return rows.map((row) => this.mapRow(row));
  }

  /* ─── Get sent requests (outgoing) ─── */
  static async getSentRequests(userId: string): Promise<FriendshipDTO[]> {
    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT f.*,
              a.name AS friend_name,
              a.profilepicture AS friend_avatar,
              a.userhandle AS friend_handle,
              a.position AS friend_position,
              a.primary_sport AS friend_sport
       FROM friendships f
       JOIN athletes a ON a.id = f.friend_id
       WHERE f.user_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return rows.map((row) => this.mapRow(row));
  }

  /* ─── Get single row by id ─── */
  private static async getById(id: number): Promise<FriendshipDTO | null> {
    const [rows] = await pool.execute<FriendshipRow[]>(
      `SELECT f.*,
              a.name AS friend_name,
              a.profilepicture AS friend_avatar,
              a.userhandle AS friend_handle,
              a.position AS friend_position,
              a.primary_sport AS friend_sport
       FROM friendships f
       JOIN athletes a ON a.id = f.friend_id
       WHERE f.id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    return this.mapRow(rows[0]);
  }

  /* ─── Insert notification helper ─── */
  private static async createNotification(
    userId: string,
    type: 'friend_request' | 'game_invite' | 'chat_mention' | 'achievement' | 'badge' | 'system',
    title: string,
    message: string,
    senderId: string | null,
    status: 'pending' | 'accepted' | 'declined' | 'info'
  ): Promise<void> {
    try {
      await pool.execute(
        `INSERT INTO notifications
          (id, user_id, type, title, message, sender_id, status, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [randomUUID(), userId, type, title, message, senderId, status]
      );
      console.log('✅ [Notification] Inserted for user:', userId);
    } catch (err) {
      console.error('❌ [Notification] Insert failed:', err);
      // Non-blocking — friend request should still succeed
    }
  }

  /* ─── Map row to DTO ─── */
  private static mapRow(
    row: FriendshipRow,
    perspectiveUserId?: string
  ): FriendshipDTO {
    const isSentByMe = perspectiveUserId
      ? row.user_id === perspectiveUserId
      : false;
    // ✅ status ko boolean me convert karo
    const status = (row as any).friend_status || 'Offline';
    const isOnline = status === 'Online' || status === 'In-Game';
    return {
      id: row.id,
      userId: row.user_id,
      friendId: row.friend_id,
      status: row.status,
      createdAt: row.created_at,
      friendName: row.friend_name ?? 'Athlete',
      friendAvatar: row.friend_avatar ?? null,
      friendHandle: row.friend_handle ?? null,
      friendPosition: row.friend_position ?? null,
      friendSport: row.friend_sport ?? null,
      isOnline,                                    // ✅ ADD KIYA
      userStatus: status,                          // ✅ ADD KIYA (raw value)
      lastSeenAt: (row as any).friend_last_seen ?? null,  // ✅ ADD KIYA
    };
  }
}