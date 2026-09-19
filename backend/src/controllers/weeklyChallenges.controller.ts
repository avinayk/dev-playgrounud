// backend/src/controllers/weeklyChallenges.controller.ts
import { Request, Response } from 'express';
import { WeeklyChallengesService } from '../services/weeklyChallenges.service';

export class WeeklyChallengesController {
  static async getUserChallenges(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      await WeeklyChallengesService.syncProgressFromStats(athleteId);
      const list = await WeeklyChallengesService.getUserWeeklyChallenges(athleteId);
      res.json({ success: true, data: list });
    } catch (err) {
      console.error('❌ [WeeklyChallenges] get:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  static async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, challengeId } = req.params;
      const { increment = 1 } = req.body;
      const updated = await WeeklyChallengesService.updateProgress(
        athleteId,
        challengeId,
        Number(increment)
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('❌ [WeeklyChallenges] updateProgress:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  static async claimReward(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, challengeId } = req.params;
      const result = await WeeklyChallengesService.claimReward(athleteId, challengeId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [WeeklyChallenges] claim:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message: msg });
    }
  }

  static async sync(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      await WeeklyChallengesService.syncProgressFromStats(athleteId);
      const list = await WeeklyChallengesService.getUserWeeklyChallenges(athleteId);
      res.json({ success: true, data: list });
    } catch (err) {
      console.error('❌ [WeeklyChallenges] sync:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }
}