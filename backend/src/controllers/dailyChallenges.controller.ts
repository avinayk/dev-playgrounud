// backend/src/controllers/dailyChallenges.controller.ts
import { Request, Response } from 'express';
import { DailyChallengesService } from '../services/dailyChallenges.service';

export class DailyChallengesController {
  /* GET /api/daily-challenges/:athleteId */
  static async getUserChallenges(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const list = await DailyChallengesService.getUserDailyChallenges(athleteId);
      res.json({ success: true, data: list });
    } catch (err) {
      console.error('❌ [DailyChallenges] get:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/daily-challenges/:athleteId/reroll */
  static async reroll(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const list = await DailyChallengesService.rerollDailyChallenges(athleteId);
      res.json({ success: true, data: list });
    } catch (err) {
      console.error('❌ [DailyChallenges] reroll:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/daily-challenges/:athleteId/:challengeId/progress */
  static async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, challengeId } = req.params;
      const { increment = 1 } = req.body;
      const updated = await DailyChallengesService.updateProgress(
        athleteId,
        challengeId,
        Number(increment)
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('❌ [DailyChallenges] progress:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/daily-challenges/:athleteId/:challengeId/claim */
  static async claimReward(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, challengeId } = req.params;
      const result = await DailyChallengesService.claimReward(athleteId, challengeId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [DailyChallenges] claim:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* POST /api/daily-challenges/:athleteId/chest */
  static async claimChest(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const result = await DailyChallengesService.claimDailyChest(athleteId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [DailyChallenges] chest:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message: msg });
    }
  }
}