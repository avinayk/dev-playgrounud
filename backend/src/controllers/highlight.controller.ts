// src/controllers/highlight.controller.ts
import type { Request, Response } from 'express';
import { HighlightService } from '../services/highlight.service';

export class HighlightController {
  /* POST /api/highlights */
  static async createHighlight(req: Request, res: Response): Promise<void> {
    try {
      const {
        athleteId,
        title,
        description,
        sport,
        videoUrl,
        thumbnailUrl,
        durationSeconds,
      } = req.body;

      if (!athleteId || !title?.trim() || !sport || !videoUrl?.trim()) {
        res.status(400).json({
          success: false,
          message: 'athleteId, title, sport, videoUrl required',
        });
        return;
      }

      const clip = await HighlightService.createHighlight(String(athleteId), {
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        sport: String(sport),
        videoUrl: String(videoUrl).trim(),
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : undefined,
        durationSeconds: Number(durationSeconds) || 30,
      });

      res.status(201).json({ success: true, data: clip });
    } catch (err) {
      console.error('❌ createHighlight:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* GET /api/highlights?athleteId=xxx&sport=xxx */
  static async listHighlights(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();
      const sport = String(req.query.sport ?? '').trim();
      const limit = Math.min(Number(req.query.limit ?? 50), 100);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const highlights = await HighlightService.listHighlights(athleteId, {
        sport,
        limit,
        offset,
      });

      res.json({ success: true, data: highlights });
    } catch (err) {
      console.error('❌ listHighlights:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* GET /api/highlights/community?sport=xxx */
  static async listCommunityHighlights(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const sport = String(req.query.sport ?? '').trim();
      const limit = Math.min(Number(req.query.limit ?? 50), 100);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);

      const highlights = await HighlightService.listCommunityHighlights({
        sport,
        limit,
        offset,
      });

      res.json({ success: true, data: highlights });
    } catch (err) {
      console.error('❌ listCommunityHighlights:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/highlights/:id/view */
  static async incrementViews(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await HighlightService.incrementViews(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: 'Failed' });
    }
  }

  /* POST /api/highlights/:id/like */
  static async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const delta = Number(req.body.delta ?? 1);
      const likes = await HighlightService.toggleLike(
        id,
        delta >= 0 ? 1 : -1
      );
      res.json({ success: true, data: { likes } });
    } catch (err) {
      res.status(400).json({ success: false, message: 'Failed' });
    }
  }

  /* DELETE /api/highlights/:id */
  static async deleteHighlight(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      await HighlightService.deleteHighlight(id, String(athleteId));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  }
}