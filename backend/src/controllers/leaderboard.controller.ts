// controllers/leaderboard.controller.ts
import { Request, Response } from 'express';
import {
  LeaderboardService,
  PresenceStatus,
} from '../services/leaderboard.service';
import pool from '../config/database';
const VALID_STATUSES: PresenceStatus[] = [
  'Online',
  'In-Game',
  'Away',
  'Offline',
];

export class LeaderboardController {
  /* ═══════════════════════════════════════════
     GET /api/leaderboard?excludeId=xxx&limit=500
     ═══════════════════════════════════════════ */
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const excludeId = String(req.query.excludeId ?? '').trim() || undefined;
      const limit = Math.min(Number(req.query.limit) || 500, 1000);

      const data = await LeaderboardService.getLeaderboard(excludeId, limit);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('❌ getLeaderboard:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* ═══════════════════════════════════════════
     PATCH /api/leaderboard/status/:athleteId
     Body: { status: 'Online' | 'In-Game' | 'Away' | 'Offline' }
     ═══════════════════════════════════════════ */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { status } = req.body as { status?: PresenceStatus };

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }
      if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
        });
        return;
      }

      const result = await LeaderboardService.updateStatus(athleteId, status);

      /* ✅ Broadcast to all connected sockets */
      try {
        const { getIO } = require('../socket/socketManager');
        const io = getIO?.();
        if (io) {
          io.emit('presence:update', {
            athleteId,
            status,
            updatedAt: result.updatedAt,
          });
        }
      } catch {
        /* socket optional */
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('❌ updateStatus:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(msg === 'Athlete not found' ? 404 : 500).json({
        success: false,
        message: msg,
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/leaderboard/heartbeat/:athleteId
     ═══════════════════════════════════════════ */
  static async heartbeat(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const result = await LeaderboardService.heartbeat(athleteId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('❌ heartbeat:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(msg === 'Athlete not found' ? 404 : 500).json({
        success: false,
        message: msg,
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/leaderboard/status/:athleteId
     ═══════════════════════════════════════════ */
  static async getAthleteStatus(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const data = await LeaderboardService.getAthleteStatus(athleteId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('❌ getAthleteStatus:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(msg === 'Athlete not found' ? 404 : 500).json({
        success: false,
        message: msg,
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/leaderboard/mark-offline-stale
     (cron / admin only)
     ═══════════════════════════════════════════ */
  static async markStaleOffline(_req: Request, res: Response): Promise<void> {
    try {
      const result = await LeaderboardService.markStaleOffline();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('❌ markStaleOffline:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  // controllers/leaderboard.controller.ts
static async getOnlineUsers(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM athletes 
       WHERE user_status IN ('Online', 'In-Game')
         AND last_seen_at IS NOT NULL
         AND TIMESTAMPDIFF(MINUTE, last_seen_at, NOW()) <= 5`
    );
    const ids = rows.map((r: any) => r.id);
    res.status(200).json({ success: true, data: ids });
  } catch (err) {
    console.error('❌ getOnlineUsers:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
}