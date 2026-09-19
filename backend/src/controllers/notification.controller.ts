// src/controllers/notification.controller.ts
import type { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  /* GET /api/notifications?userId=xxx */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const notifications = await NotificationService.list(userId);
      res.json({ success: true, data: notifications });
    } catch (err) {
      console.error('❌ list:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* GET /api/notifications/unread-count?userId=xxx */
  static async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const count = await NotificationService.unreadCount(userId);
      res.json({ success: true, data: { count } });
    } catch (err) {
      console.error('❌ unreadCount:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* POST /api/notifications/read  body: { notificationId, userId } */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId, userId } = req.body;
      if (!notificationId || !userId) {
        res.status(400).json({ success: false, message: 'Missing fields' });
        return;
      }
      await NotificationService.markRead(notificationId, userId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ markRead:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* POST /api/notifications/read-all  body: { userId } */
  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      await NotificationService.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ markAllRead:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* DELETE /api/notifications/:id?userId=xxx */
  static async deleteOne(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      await NotificationService.delete(id, userId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ deleteOne:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* DELETE /api/notifications?userId=xxx */
  static async clearAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      await NotificationService.clearAll(userId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ clearAll:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* POST /api/notifications/status  body: { notificationId, userId, status } */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId, userId, status } = req.body;
      if (!notificationId || !userId || !status) {
        res.status(400).json({ success: false, message: 'Missing fields' });
        return;
      }
      await NotificationService.updateStatus(notificationId, userId, status);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ updateStatus:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}