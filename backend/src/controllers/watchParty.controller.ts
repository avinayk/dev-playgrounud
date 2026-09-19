// controllers/watchParty.controller.ts
import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { WatchPartyService } from '../services/watchParty.service';
import pool from '../config/database';

export class WatchPartyController {
  /* ═══════════════════════════════════════════
     GET /api/watchparty/session/:roomId
     ═══════════════════════════════════════════ */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const session = await WatchPartyService.getSessionByRoomId(roomId);
      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }
      res.json({ success: true, data: session });
    } catch (err) {
      console.error('❌ getSession:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/watchparty/session/:sessionId/messages
     ═══════════════════════════════════════════ */
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const messages = await WatchPartyService.getRecentMessages(sessionId, limit);
      res.json({ success: true, data: messages });
    } catch (err) {
      console.error('❌ getMessages:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/watchparty/session/:sessionId/summary
     ═══════════════════════════════════════════ */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const summary = await WatchPartyService.getSessionSummary(sessionId);
      res.json({ success: true, data: summary });
    } catch (err) {
      console.error('❌ getSummary:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/watchparty/end/:sessionId
     ═══════════════════════════════════════════ */
  static async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      await WatchPartyService.endSession(sessionId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ endSession:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* ═══════════════════════════════════════════
     ✅ NEW: GET /api/watchparty/active-by-clip/:clipId
     Find active watch party for a clip (30 min window)
     ═══════════════════════════════════════════ */
  static async getActiveSessionByClip(req: Request, res: Response): Promise<void> {
    try {
      const { clipId } = req.params;

      if (!clipId) {
        res.status(400).json({ success: false, message: 'clipId required' });
        return;
      }

      console.log('🔍 Finding active session for clip:', clipId);

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
           id, 
           room_id, 
           host_id, 
           clip_id, 
           clip_title, 
           clip_url, 
           clip_thumbnail, 
           is_active, 
           created_at, 
           ended_at
         FROM watch_party_sessions 
         WHERE clip_id = ? 
           AND is_active = 1
           AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
         ORDER BY created_at DESC 
         LIMIT 1`,
        [clipId]
      );

      if (rows.length === 0) {
        console.log('   ℹ️ No active session found for clip');
        res.json({ success: true, data: null });
        return;
      }

      console.log('   ✅ Active session found:', rows[0].room_id);
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('❌ getActiveSessionByClip:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}