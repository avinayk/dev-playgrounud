// src/controllers/mvp.controller.ts
import type { Request, Response } from 'express';
import { MvpService } from '../services/mvp.service';

export class MvpController {
  static async getMvp(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = String(req.query.userId ?? '');
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId required' });
        return;
      }
      const data = await MvpService.getMvpData(id, userId);
      res.json({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  static async vote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { voterId, votedForId } = req.body;
      if (!voterId || !votedForId) {
        res.status(400).json({ success: false, message: 'Missing fields' });
        return;
      }
      const result = await MvpService.castVote(id, voterId, votedForId);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  static async announceWinner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const winner = await MvpService.getMvpWinner(id);
      res.json({ success: true, data: winner });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }
}

