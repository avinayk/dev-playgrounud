// src/controllers/admin/admin.controller.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../../config/database';
import { sendAccountStatusEmail } from '../../services/emailService';
import { getIO } from '../../socket/socketManager';
export class AdminController {
  /* ═══════════════════════════════════════════
     POST /api/admin/login
     ═══════════════════════════════════════════ */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      const [rows] = await pool.execute<any[]>(
        `SELECT id, email, password FROM admin WHERE email = ? LIMIT 1`,
        [email.toLowerCase().trim()]
      );

      if (rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid admin credentials',
        });
        return;
      }

      const admin = rows[0];

      let isValid = false;
      try {
        isValid = await bcrypt.compare(password, admin.password);
      } catch {
        isValid = false;
      }

      if (!isValid && admin.password === password) {
        isValid = true;
      }

      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid admin credentials',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Admin authenticated successfully',
        data: {
          id: admin.id,
          email: admin.email,
          isAdmin: true,
        },
      });
    } catch (err: any) {
      console.error('❌ Admin login error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Admin login failed',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/logout
     ═══════════════════════════════════════════ */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Admin logged out successfully',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err?.message || 'Admin logout failed',
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/admin/users
     Get all athletes for user directory
     ═══════════════════════════════════════════ */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(`
        SELECT 
          id,
          name,
          email,
          userhandle,
          profilepicture,
          bio,
          school,
          level,
          levelTitle,
          totalXp,
          valuexp,
          primary_sport,
          role,
          is_pro,
          subscription_tier,
          is_verified,
          is_verified_pro,
          state,
          city,
          created_at,
          COALESCE(account_status, 'active') AS accountStatus
        FROM athletes
        ORDER BY created_at DESC
      `);

      res.status(200).json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (err: any) {
      console.error('❌ Get all users error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch users',
      });
    }
  }

  /* ═══════════════════════════════════════════
     PATCH /api/admin/users/:userId/status
     Update user status (active / suspended / banned)
     body: { status, reason? }
     ═══════════════════════════════════════════ */
  /* ═══════════════════════════════════════════
   PATCH /api/admin/users/:userId/status
   Update user status (active / suspended / banned)
   body: { status, reason? }
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   PATCH /api/admin/users/:userId/status
   ═══════════════════════════════════════════ */
static async updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
      return;
    }

    // 1. Fetch user info (for email)
    const [userRows] = await pool.execute<any[]>(
      `SELECT id, name, email, userhandle, account_status FROM athletes WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = userRows[0];
    const previousStatus = user.account_status || 'active';

    // 2. Update DB
    const [result] = await pool.execute<any>(
      `UPDATE athletes SET account_status = ? WHERE id = ?`,
      [status, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    /* ═══════════════════════════════════════════
       ✅ REAL-TIME SOCKET EMIT (Auto-Logout)
       ═══════════════════════════════════════════ */
    if (
      previousStatus !== status &&
      (status === 'suspended' || status === 'banned')
    ) {
      try {
        const io = getIO();
        if (io) {
          io.to(`user:${userId}`).emit('account:status-changed', {
            status,
            message:
              status === 'banned'
                ? '🚫 Your account has been permanently banned due to violation of our community guidelines.'
                : '🚫 Your account has been temporarily suspended. Please contact support.',
          });
          console.log(
            `📡 [admin] account:status-changed emitted to user:${userId} (${status})`
          );
        }
      } catch (socketErr) {
        console.warn('⚠️ Socket emit failed:', socketErr);
      }
    }

    // 3. Send email (existing logic)
    if (previousStatus !== status) {
      try {
        const emailResult = await sendAccountStatusEmail({
          to: user.email,
          athleteName: user.name,
          userHandle: user.userhandle || `@${user.name.toLowerCase()}`,
          status: status as 'active' | 'suspended' | 'banned',
          reason: reason || undefined,
        });
        console.log(`📧 Status email sent to ${user.email}:`, emailResult);
      } catch (emailErr) {
        console.error('❌ Failed to send status email:', emailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: {
        userId,
        previousStatus,
        newStatus: status,
        reason: reason || null,
      },
    });
  } catch (err: any) {
    console.error('❌ Update user status error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Failed to update user status',
    });
  }
}

  /* ═══════════════════════════════════════════
     DELETE /api/admin/users/:userId
     Permanently delete an athlete account
     ═══════════════════════════════════════════ */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const [result] = await pool.execute<any>(
        `DELETE FROM athletes WHERE id = ?`,
        [userId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: { userId },
      });
    } catch (err: any) {
      console.error('❌ Delete user error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to delete user',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/users/:userId/reset-password
     Generate a temp password and update user record
     ═══════════════════════════════════════════ */
  static async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const tempPassword = `TEMP-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      const hashed = await bcrypt.hash(tempPassword, 10);

      const [result] = await pool.execute<any>(
        `UPDATE athletes SET password = ? WHERE id = ?`,
        [hashed, userId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        data: { userId, tempPassword },
      });
    } catch (err: any) {
      console.error('❌ Reset user password error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to reset password',
      });
    }
  }

  /* ═══════════════════════════════════════════
     PATCH /api/admin/users/:userId/pro
     Grant or revoke PRO subscription
     body: { isPro: boolean }
     ═══════════════════════════════════════════ */
  static async upgradeUserPro(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { isPro } = req.body;

      if (typeof isPro !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isPro must be a boolean',
        });
        return;
      }

      const [result] = await pool.execute<any>(
        `UPDATE athletes 
         SET is_pro = ?, subscription_tier = ?, is_verified_pro = ? 
         WHERE id = ?`,
        [
          isPro ? 1 : 0,
          isPro ? 'pro' : 'free',
          isPro ? 1 : 0,
          userId,
        ]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: isPro ? 'PRO access granted' : 'PRO access revoked',
        data: { userId, isPro },
      });
    } catch (err: any) {
      console.error('❌ Upgrade user PRO error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to update PRO status',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/users/:userId/reset-stats
     Reset user level, XP, and stats
     ═══════════════════════════════════════════ */
  static async resetUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const [result] = await pool.execute<any>(
        `UPDATE athletes 
         SET level = 1,
             valuexp = 0,
             totalXp = '0',
             xpInCurrentLevel = '0',
             levelTitle = 'Rookie Prospect 🧢'
         WHERE id = ?`,
        [userId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User stats reset successfully',
        data: { userId },
      });
    } catch (err: any) {
      console.error('❌ Reset user stats error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to reset user stats',
      });
    }
  }
}