// services/watchParty.service.ts
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface WatchPartySessionRow extends RowDataPacket {
  id: string;
  room_id: string;
  host_id: string;
  clip_id: string;
  clip_title: string | null;
  clip_url: string | null;
  clip_thumbnail: string | null;
  is_active: number;
  created_at: Date;
  ended_at: Date | null;
}

export interface WatchPartyMemberRow extends RowDataPacket {
  id: number;
  session_id: string;
  athlete_id: string;
  role: 'host' | 'viewer';
  joined_at: Date;
  left_at: Date | null;
  name?: string;
  profilepicture?: string;
  userhandle?: string;
}

export interface WatchPartyMessageRow extends RowDataPacket {
  id: string;
  session_id: string;
  sender_id: string;
  text: string;
  message_type: 'text' | 'system' | 'reaction';
  created_at: Date;
  sender_name?: string;
  sender_avatar?: string;
}

export class WatchPartyService {
  static async createSession(payload: {
    roomId: string;
    hostId: string;
    hostName: string;
    hostAvatar: string;
    clipId: string;
    clipTitle?: string;
    clipUrl?: string;
    clipThumbnail?: string;
  }): Promise<{ sessionId: string; roomId: string }> {
    const sessionId = `wps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.execute(
      `INSERT INTO watch_party_sessions 
        (id, room_id, host_id, clip_id, clip_title, clip_url, clip_thumbnail, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        sessionId,
        payload.roomId,
        payload.hostId,
        payload.clipId,
        payload.clipTitle || null,
        payload.clipUrl || null,
        payload.clipThumbnail || null,
      ]
    );

    await pool.execute(
      `INSERT INTO watch_party_members (session_id, athlete_id, role)
       VALUES (?, ?, 'host')`,
      [sessionId, payload.hostId]
    );

    await pool.execute(
      `INSERT INTO watch_party_messages (id, session_id, sender_id, text, message_type)
       VALUES (?, ?, ?, ?, 'system')`,
      [
        `wpmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId,
        payload.hostId,
        `⚡ Watch Party Room created! Synced playback enabled.`,
      ]
    );

    console.log('✅ Session created:', sessionId);
    return { sessionId, roomId: payload.roomId };
  }

  /* ✅ CRITICAL FIX: is_active filter hata diya */
  static async getSessionByRoomId(roomId: string): Promise<WatchPartySessionRow | null> {
    const [rows] = await pool.execute<WatchPartySessionRow[]>(
      `SELECT * FROM watch_party_sessions 
       WHERE room_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [roomId]
    );

    if (rows.length === 0) {
      console.log('❌ No session for roomId:', roomId);
      return null;
    }

    console.log('✅ Session lookup:', rows[0].id, 'active:', rows[0].is_active);
    return rows[0];
  }

  static async getSessionById(sessionId: string): Promise<WatchPartySessionRow | null> {
    const [rows] = await pool.execute<WatchPartySessionRow[]>(
      `SELECT * FROM watch_party_sessions WHERE id = ?`,
      [sessionId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async joinSession(payload: {
    sessionId: string;
    athleteId: string;
  }): Promise<void> {
    await pool.execute(
      `INSERT INTO watch_party_members (session_id, athlete_id, role, joined_at)
       VALUES (?, ?, 'viewer', NOW())
       ON DUPLICATE KEY UPDATE left_at = NULL, joined_at = NOW()`,
      [payload.sessionId, payload.athleteId]
    );
    console.log('✅ Member joined DB:', payload.athleteId);
  }

  static async leaveSession(payload: {
    sessionId: string;
    athleteId: string;
  }): Promise<void> {
    await pool.execute(
      `UPDATE watch_party_members 
       SET left_at = NOW() 
       WHERE session_id = ? AND athlete_id = ? AND left_at IS NULL`,
      [payload.sessionId, payload.athleteId]
    );
  }

  static async getActiveMembers(sessionId: string): Promise<
    Array<{
      id: string;
      name: string;
      avatar: string;
      role: 'host' | 'viewer';
      joinedAt: string;
      isOnline: boolean;
    }>
  > {
    const [rows] = await pool.execute<WatchPartyMemberRow[]>(
      `SELECT 
         m.athlete_id AS id,
         m.role,
         m.joined_at,
         a.name,
         a.profilepicture
       FROM watch_party_members m
       JOIN athletes a ON a.id = m.athlete_id
       WHERE m.session_id = ? AND m.left_at IS NULL
       ORDER BY m.role DESC, m.joined_at ASC`,
      [sessionId]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name || 'Athlete',
      avatar: r.profilepicture || '',
      role: r.role,
      joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : new Date().toISOString(),
      isOnline: true,
    }));
  }

  static async saveMessage(payload: {
    sessionId: string;
    senderId: string;
    text: string;
    messageType?: 'text' | 'system' | 'reaction';
  }): Promise<WatchPartyMessageRow> {
    const messageId = `wpmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    await pool.execute(
      `INSERT INTO watch_party_messages 
        (id, session_id, sender_id, text, message_type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        messageId,
        payload.sessionId,
        payload.senderId,
        payload.text,
        payload.messageType || 'text',
      ]
    );

    const [rows] = await pool.execute<WatchPartyMessageRow[]>(
      `SELECT 
         m.*,
         a.name AS sender_name,
         a.profilepicture AS sender_avatar
       FROM watch_party_messages m
       LEFT JOIN athletes a ON a.id = m.sender_id
       WHERE m.id = ?`,
      [messageId]
    );

    return rows[0];
  }

  /* ✅ CRITICAL FIX: LIMIT ? ki jagah direct injection */
  static async getRecentMessages(
    sessionId: string,
    limit: number = 100
  ): Promise<WatchPartyMessageRow[]> {
    const safeLimit = Math.min(Math.max(1, limit), 500);

    console.log('\n📥 getRecentMessages:', { sessionId, limit: safeLimit });

    try {
      const [rows] = await pool.query<WatchPartyMessageRow[]>(
        `SELECT 
           m.*,
           a.name AS sender_name,
           a.profilepicture AS sender_avatar
         FROM watch_party_messages m
         LEFT JOIN athletes a ON a.id = m.sender_id
         WHERE m.session_id = ?
         ORDER BY m.created_at ASC
         LIMIT ${safeLimit}`,
        [sessionId]
      );

      console.log('   ✅ Returned:', rows.length, 'messages');
      if (rows.length > 0) {
        rows.slice(0, 5).forEach((m, i) => {
          console.log(`      [${i + 1}] ${m.sender_name || 'system'}: "${m.text}"`);
        });
      }

      return rows;
    } catch (err) {
      console.error('   ❌ getRecentMessages ERROR:', err);
      throw err;
    }
  }

  static async reviveSession(sessionId: string): Promise<void> {
    console.log('♻️  reviveSession:', sessionId);
    await pool.execute(
      `UPDATE watch_party_sessions 
       SET is_active = 1, ended_at = NULL 
       WHERE id = ?`,
      [sessionId]
    );
  }

  static async endSession(sessionId: string): Promise<void> {
    await pool.execute(
      `UPDATE watch_party_sessions 
       SET is_active = 0, ended_at = NOW() 
       WHERE id = ?`,
      [sessionId]
    );

    await pool.execute(
      `UPDATE watch_party_members 
       SET left_at = NOW() 
       WHERE session_id = ? AND left_at IS NULL`,
      [sessionId]
    );

    console.log('🛑 Session ended:', sessionId);
  }

  static async getSessionSummary(sessionId: string): Promise<{
    session: WatchPartySessionRow | null;
    memberCount: number;
    messageCount: number;
    durationMinutes: number;
  }> {
    const [sessionRows] = await pool.execute<WatchPartySessionRow[]>(
      `SELECT * FROM watch_party_sessions WHERE id = ?`,
      [sessionId]
    );

    const [counts] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         (SELECT COUNT(*) FROM watch_party_members WHERE session_id = ?) AS memberCount,
         (SELECT COUNT(*) FROM watch_party_messages WHERE session_id = ?) AS messageCount`,
      [sessionId, sessionId]
    );

    const session = sessionRows[0] || null;
    const durationMs = session
      ? (session.ended_at ? new Date(session.ended_at).getTime() : Date.now()) -
        new Date(session.created_at).getTime()
      : 0;

    return {
      session,
      memberCount: Number((counts as any)[0]?.memberCount) || 0,
      messageCount: Number((counts as any)[0]?.messageCount) || 0,
      durationMinutes: Math.round(durationMs / 60000),
    };
  }
}