// src/controllers/admin/adminCourts.controller.ts
import type { Request, Response } from 'express';
import pool from '../../config/database';

export class AdminCourtsController {
  /* ═══════════════════════════════════════════
     GET /api/admin/courts?status=pending|verified|all
     Get all courts with filters
     ═══════════════════════════════════════════ */
  static async getAllCourts(req: Request, res: Response): Promise<void> {
    try {
      const statusFilter = (req.query.status as string) || 'all';
      let whereClause = '';
      const params: any[] = [];

      if (statusFilter === 'pending') {
        whereClause = `WHERE c.status = 'pending'`;
      } else if (statusFilter === 'verified') {
        whereClause = `WHERE c.status = 'verified'`;
      } else if (statusFilter === 'all') {
        whereClause = '';
      }

      const [rows] = await pool.execute<any[]>(
        `SELECT 
          c.id,
          c.name,
          c.sport,
          c.city,
          c.state,
          c.address,
          c.lat,
          c.lng,
          c.image_url AS imageUrl,
          c.rating,
          c.active_players_now,
          c.is_active,
          c.status,
          c.surface_type AS surfaceType,
          c.lighting,
          c.created_at,
          c.created_by_id AS createdById,
          a.name AS createdByName,
          a.userhandle AS createdByHandle,
          a.profilepicture AS createdByAvatar
         FROM courts c
         LEFT JOIN athletes a ON a.id = c.created_by_id
         ${whereClause}
         ORDER BY 
           CASE c.status
             WHEN 'pending' THEN 1
             WHEN 'verified' THEN 2
             WHEN 'rejected' THEN 3
             ELSE 4
           END,
           c.created_at DESC`
      );

      // Format for frontend
      const courts = rows.map((r) => ({
        id: r.id,
        name: r.name,
        sport: r.sport,
        city: r.city,
        state: r.state,
        address: r.address,
        lat: r.lat ? Number(r.lat) : null,
        lng: r.lng ? Number(r.lng) : null,
        imageUrl: r.imageUrl,
        rating: r.rating ? Number(r.rating) : 4.5,
        activePlayersNow: r.active_players_now || 0,
        isActive: r.is_active === 1,
        status: r.status || 'verified',
        surfaceType: r.surfaceType || 'outdoor',
        lighting: r.lighting === 1,
        createdAt: r.created_at,
        createdById: r.createdById,
        createdByName: r.createdByName || 'Community Athlete',
        createdByHandle: r.createdByHandle || null,
        createdByAvatar: r.createdByAvatar || null,
      }));

      res.status(200).json({
        success: true,
        count: courts.length,
        data: courts,
      });
    } catch (err: any) {
      console.error('❌ Get courts error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch courts',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/courts/:courtId/validate
     body: { action: 'approve' | 'reject', reason?: string }
     ═══════════════════════════════════════════ */
  static async validateCourt(req: Request, res: Response): Promise<void> {
    try {
      const { courtId } = req.params;
      const { action, reason } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'Action must be "approve" or "reject"',
        });
        return;
      }

      const newStatus = action === 'approve' ? 'verified' : 'rejected';
      const isActive = action === 'approve' ? 1 : 0;

      const [result] = await pool.execute<any>(
        `UPDATE courts 
         SET status = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStatus, isActive, courtId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Court not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: action === 'approve' ? 'Court approved & published' : 'Court rejected',
        data: {
          courtId,
          status: newStatus,
          reason: reason || null,
        },
      });
    } catch (err: any) {
      console.error('❌ Validate court error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to validate court',
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/admin/courts/stats
     Pending/Verified/Rejected counts
     ═══════════════════════════════════════════ */
  static async getCourtStats(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
         FROM courts`
      );

      const stats = rows[0] || {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          total: Number(stats.total) || 0,
          pending: Number(stats.pending) || 0,
          verified: Number(stats.verified) || 0,
          rejected: Number(stats.rejected) || 0,
        },
      });
    } catch (err: any) {
      console.error('❌ Court stats error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch court stats',
      });
    }
  }
}