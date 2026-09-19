// src/controllers/friendship.controller.ts
import type { Request, Response } from 'express';
import { FriendshipService } from '../services/friendship.service';

export class FriendshipController {
  /* POST /api/friends/request  body: { userId, friendId } */
  static async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const { userId, friendId } = req.body;

      if (!userId || !friendId) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }

      const friendship = await FriendshipService.sendRequest(userId, friendId);
      res.status(201).json({ success: true, data: friendship });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  /* POST /api/friends/accept  body: { userId, friendId } */
  static async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const { userId, friendId } = req.body;
      if (!userId || !friendId) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }
      await FriendshipService.acceptRequest(userId, friendId);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  /* POST /api/friends/reject  body: { userId, friendId } */
  static async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const { userId, friendId } = req.body;
      if (!userId || !friendId) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }
      await FriendshipService.rejectRequest(userId, friendId);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  /* DELETE /api/friends/:friendId  body: { userId } */
  static async removeFriend(req: Request, res: Response): Promise<void> {
    try {
      const { friendId } = req.params;
      const { userId } = req.body;
      if (!userId || !friendId) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }
      await FriendshipService.removeFriend(userId, friendId);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* GET /api/friends/status?userId=xxx&otherId=yyy */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      const otherId = String(req.query.otherId ?? '').trim();
      if (!userId || !otherId) {
        res.status(400).json({ success: false, message: 'Missing ids' });
        return;
      }
      const status = await FriendshipService.getStatus(userId, otherId);
      res.json({ success: true, data: status });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* GET /api/friends?userId=xxx */
  static async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const friends = await FriendshipService.getFriends(userId);
      res.json({ success: true, data: friends });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* GET /api/friends/pending?userId=xxx */
  static async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const requests = await FriendshipService.getPendingRequests(userId);
      res.json({ success: true, data: requests });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  /* GET /api/friends/sent?userId=xxx */
  static async getSentRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const requests = await FriendshipService.getSentRequests(userId);
      res.json({ success: true, data: requests });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }
}