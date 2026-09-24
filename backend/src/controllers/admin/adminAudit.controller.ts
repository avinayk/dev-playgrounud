// src/controllers/admin/adminAudit.controller.ts
import type { Request, Response } from 'express';
import pool from '../../config/database';

export class AdminAuditController {
  static async createLog(req: Request, res: Response): Promise<void> {
    try {
      const { action, type, category, targetId, targetName, metadata } = req.body;
      const adminEmail = (req as any).adminEmail || req.headers['x-admin-email'] || 'unknown@admin';
      const adminId = (req as any).adminId || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const userAgent = (req.headers['user-agent'] || '').substring(0, 500);

      if (!action || !type || !category) {
        res.status(400).json({ success: false, message: 'action, type, category required' });
        return;
      }

      const [result] = await pool.execute<any>(
        `INSERT INTO admin_audit_logs 
         (admin_id, admin_email, action, type, category, target_id, target_name, metadata, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          adminEmail,
          action,
          type,
          category,
          targetId || null,
          targetName || null,
          metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent,
        ]
      );

      res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (err: any) {
      console.error('❌ Create audit log error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed' });
    }
  }

  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const category = (req.query.category as string) || 'ALL';
      const search = ((req.query.search as string) || '').trim();
      const limit = Math.min(500, parseInt(req.query.limit as string) || 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

      let whereClauses: string[] = [];
      const params: any[] = [];

      if (category !== 'ALL') {
        whereClauses.push('category = ?');
        params.push(category);
      }

      if (search) {
        whereClauses.push(
          `(action LIKE ? OR admin_email LIKE ? OR type LIKE ? OR category LIKE ? OR target_name LIKE ?)`
        );
        const p = `%${search}%`;
        params.push(p, p, p, p, p);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const [countRows] = await pool.execute<any[]>(
        `SELECT COUNT(*) AS total FROM admin_audit_logs ${whereSQL}`,
        params
      );
      const total = Number(countRows[0]?.total) || 0;

      const [rows] = await pool.execute<any[]>(
        `SELECT 
          id, admin_id AS adminId, admin_email AS adminEmail,
          action, type, category,
          target_id AS targetId, target_name AS targetName,
          metadata, ip_address AS ipAddress, created_at AS createdAt
         FROM admin_audit_logs
         ${whereSQL}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      const logs = rows.map((r) => {
        const createdAt = new Date(r.createdAt);
        const diffMs = Date.now() - createdAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeLabel = 'Just now';
        if (diffMins < 1) timeLabel = 'Just now';
        else if (diffMins < 60) timeLabel = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        else if (diffHours < 24) timeLabel = `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        else if (diffDays < 7) timeLabel = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        else timeLabel = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          id: String(r.id),
          time: timeLabel,
          createdAt: r.createdAt,
          action: r.action,
          adminEmail: r.adminEmail,
          type: r.type,
          category: r.category,
          targetId: r.targetId,
          targetName: r.targetName,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
          ipAddress: r.ipAddress,
        };
      });

      res.status(200).json({ success: true, count: logs.length, total, data: logs });
    } catch (err: any) {
      console.error('❌ Get audit logs error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed' });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN category = 'SECURITY_THRESHOLD' THEN 1 ELSE 0 END) AS securityThreshold,
          SUM(CASE WHEN category = 'AUTH_CONFIG' THEN 1 ELSE 0 END) AS authConfig,
          SUM(CASE WHEN category = 'USER_MGMT' THEN 1 ELSE 0 END) AS userMgmt,
          SUM(CASE WHEN category = 'SYSTEM_RESET' THEN 1 ELSE 0 END) AS systemReset,
          SUM(CASE WHEN category = 'GENERAL' THEN 1 ELSE 0 END) AS general
         FROM admin_audit_logs`
      );
      const s = rows[0] || {};
      res.status(200).json({
        success: true,
        data: {
          total: Number(s.total) || 0,
          SECURITY_THRESHOLD: Number(s.securityThreshold) || 0,
          AUTH_CONFIG: Number(s.authConfig) || 0,
          USER_MGMT: Number(s.userMgmt) || 0,
          SYSTEM_RESET: Number(s.systemReset) || 0,
          GENERAL: Number(s.general) || 0,
        },
      });
    } catch (err: any) {
      console.error('❌ Audit stats error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed' });
    }
  }
}