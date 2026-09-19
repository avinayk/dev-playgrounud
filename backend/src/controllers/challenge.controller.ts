// src/controllers/challenge.controller.ts
import type { Request, Response } from 'express';
import { ChallengeService } from '../services/challenge.service';

export class ChallengeController {
  static async listChallenges(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();
      const sport = String(req.query.sport ?? '').trim();

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const challenges = await ChallengeService.getUserChallenges(athleteId, sport);
      res.json({ success: true, data: challenges });
    } catch (err) {
      console.error('❌ listChallenges:', err);
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  static async completeChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const athleteId = String(req.body.athleteId ?? '').trim();
      const progress = Number(req.body.progress ?? 1);

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'challengeId required' });
        return;
      }

      const result = await ChallengeService.completeChallenge(athleteId, id, progress);
      res.json(result);
    } catch (err) {
      console.error('❌ completeChallenge:', err);
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message });
    }
  }

  static async getXpSummary(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const summary = await ChallengeService.getUserXpSummary(athleteId);
      res.json({ success: true, data: summary });
    } catch (err) {
      console.error('❌ getXpSummary:', err);
      const message = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message });
    }
  }

  static async getCompletedChallenges(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const ids = await ChallengeService.getCompletedChallengeIds(athleteId);
      res.json({ success: true, data: ids });
    } catch (err) {
      console.error('❌ getCompletedChallenges:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}