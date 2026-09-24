// src/controllers/friendship.controller.ts
import type { Request, Response } from 'express';
import { FriendshipService } from '../services/friendship.service';
import pool from '../config/database';
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
      // ✅ REAL-TIME SOCKET EMIT
      const io = (req as any).io;
      if (io) {
        try {
          // Fetch sender info for notification
          const [senderRows] = await pool.execute<any[]>(
            `SELECT name, profilepicture FROM athletes WHERE id = ?`,
            [userId]
          );
          const senderName = senderRows[0]?.name ?? 'Someone';
          const senderAvatar = senderRows[0]?.profilepicture ?? null;

          // ✅ Notify receiver (User B)
          io.to(`user:${friendId}`).emit('notification:new', {
            id: `notif_fr_${Date.now()}`,
            type: 'friend_request',
            title: `🤝 ${senderName} sent you a friend request`,
            message: `${senderName} wants to connect with you.`,
            sender_id: userId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            reference_id: friendship.id,
            status: 'pending',
            is_read: 0,
            created_at: new Date().toISOString(),
          });

          // ✅ Also emit friend:request_received (frontend listener)
          io.to(`user:${friendId}`).emit('friend:request_received', {
            fromUserId: userId,
            friendship: {
              id: friendship.id,
              friendName: senderName,
              friendAvatar: senderAvatar,
            },
          });

          // ✅ Notify sender's other tabs
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'pending_sent',
          });

          console.log('✅ [Socket] friend:request_received emitted to:', friendId);
        } catch (socketErr) {
          console.error('⚠️ Socket emit failed:', socketErr);
        }
      } else {
        console.warn('⚠️ io not available in req');
      }

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
      // ✅ REAL-TIME SOCKET EMIT
      const io = (req as any).io;
      if (io) {
        try {
          const [acceptorRows] = await pool.execute<any[]>(
            `SELECT name, profilepicture FROM athletes WHERE id = ?`,
            [userId]
          );
          const acceptorName = acceptorRows[0]?.name ?? 'Someone';
          const acceptorAvatar = acceptorRows[0]?.profilepicture ?? null;

          // ✅ Notify original sender (User A)
          io.to(`user:${friendId}`).emit('notification:new', {
            id: `notif_acc_${Date.now()}`,
            type: 'achievement',
            title: `🎉 ${acceptorName} accepted your friend request!`,
            message: `You are now friends with ${acceptorName}.`,
            sender_id: userId,
            sender_name: acceptorName,
            sender_avatar: acceptorAvatar,
            status: 'info',
            is_read: 0,
            created_at: new Date().toISOString(),
          });

          io.to(`user:${friendId}`).emit('friend:status_updated', {
            otherUserId: userId,
            status: 'accepted',
          });

          // ✅ Update accepter's other tabs
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'accepted',
          });

          console.log('✅ [Socket] friend accepted emitted');
        } catch (socketErr) {
          console.error('⚠️ Socket emit failed:', socketErr);
        }
      }
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
      // ✅ REAL-TIME SOCKET EMIT
      const io = (req as any).io;
      if (io) {
        try {
          io.to(`user:${friendId}`).emit('friend:status_updated', {
            otherUserId: userId,
            status: 'none',
          });
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'none',
          });
          console.log('✅ [Socket] friend rejected emitted');
        } catch (socketErr) {
          console.error('⚠️ Socket emit failed:', socketErr);
        }
      }
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