// backend/src/controllers/seasonGoals.controller.ts
import { Request, Response } from 'express';
import { SeasonGoalsService } from '../services/seasonGoals.service';

export class SeasonGoalsController {
  /* GET /api/season-goals/:athleteId?sport=basketball */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const sport = req.query.sport as string | undefined;
      const goals = await SeasonGoalsService.getUserSeasonGoals(athleteId, sport);
      res.json({ success: true, data: goals });
    } catch (err) {
      console.error('❌ [SeasonGoals] list:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/season-goals — Create custom */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, sport, title, description, unit, targetCount, rewardXp } = req.body;

      if (!athleteId || !title || !unit || !targetCount) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const goal = await SeasonGoalsService.createCustomSeasonGoal({
        athleteId,
        sport: sport || 'basketball',
        title,
        description,
        unit,
        targetCount: Number(targetCount),
        rewardXp: Number(rewardXp) || 300,
      });

      res.json({ success: true, data: goal });
    } catch (err) {
      console.error('❌ [SeasonGoals] create:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/season-goals/:athleteId/:goalId/progress */
  static async progress(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const { increment = 1 } = req.body;
      const updated = await SeasonGoalsService.updateProgress(athleteId, goalId, Number(increment));
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('❌ [SeasonGoals] progress:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/season-goals/:athleteId/:goalId/claim */
  static async claim(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const result = await SeasonGoalsService.claimReward(athleteId, goalId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [SeasonGoals] claim:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* DELETE /api/season-goals/:athleteId/:goalId */
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const ok = await SeasonGoalsService.deleteGoal(athleteId, goalId);
      res.json({ success: ok });
    } catch (err) {
      console.error('❌ [SeasonGoals] delete:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }
}