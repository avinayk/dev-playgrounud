// src/controllers/feed.controller.ts
import type { Request, Response } from 'express';
import { FeedService } from '../services/feed.service';

export class FeedController {
  /* GET /api/feed?athleteId=xxx&type=all&friendsOnly=false */
  static async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();
      const type = String(req.query.type ?? 'all').trim();
      const friendsOnly = String(req.query.friendsOnly ?? 'false') === 'true';
      const limit = Math.min(Number(req.query.limit ?? 30), 100);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const posts = await FeedService.getFeed(athleteId, {
        type,
        friendsOnly,
        limit,
        offset,
      });

      res.json({ success: true, data: posts });
    } catch (err) {
      console.error('❌ getFeed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/feed */
  static async createPost(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, type, title, description, ...rest } = req.body;

      if (!athleteId || !type || !title) {
        res
          .status(400)
          .json({ success: false, message: 'athleteId, type, title required' });
        return;
      }

      const post = await FeedService.createPost(String(athleteId), {
        type,
        title,
        description,
        ...rest,
      });

      res.json({ success: true, data: post });
    } catch (err) {
      console.error('❌ createPost:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/feed/:id/like */
  static async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const result = await FeedService.toggleLike(id, String(athleteId));
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ toggleLike:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/feed/:id/comments */
  static async addComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId, text } = req.body;

      if (!athleteId || !text?.trim()) {
        res
          .status(400)
          .json({ success: false, message: 'athleteId and text required' });
        return;
      }

      const comment = await FeedService.addComment(
        id,
        String(athleteId),
        String(text).trim()
      );

      res.json({ success: true, data: comment });
    } catch (err) {
      console.error('❌ addComment:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* DELETE /api/feed/:id */
  static async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      await FeedService.deletePost(id, String(athleteId));
      res.json({ success: true });
    } catch (err) {
      console.error('❌ deletePost:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }
}