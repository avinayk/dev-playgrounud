// backend/src/controllers/customGoals.controller.ts
import { Request, Response } from 'express';
import { CustomGoalsService } from '../services/customGoals.service';

export class CustomGoalsController {
  /* POST /api/custom-goals */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        athleteId,
        title,
        description,
        target,
        unit,
        rewardXp,
        type,
        sport,
        targetDate,
      } = req.body;

      if (!athleteId || !title) {
        res.status(400).json({ success: false, message: 'athleteId and title required' });
        return;
      }

      const goal = await CustomGoalsService.createGoal({
        athleteId,
        title,
        description,
        target: Number(target) || 1,
        unit,
        rewardXp: Number(rewardXp) || 100,
        type,
        sport,
        targetDate,
      });

      res.json({ success: true, data: goal });
    } catch (err) {
      console.error('❌ [CustomGoals] create:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* GET /api/custom-goals/:athleteId?type=daily */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const type = req.query.type as 'daily' | 'weekly' | 'season' | undefined;
      const goals = await CustomGoalsService.getGoals(athleteId, type);
      res.json({ success: true, data: goals });
    } catch (err) {
      console.error('❌ [CustomGoals] list:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/custom-goals/:athleteId/:goalId/progress */
  static async progress(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const { increment = 1 } = req.body;
      const updated = await CustomGoalsService.updateProgress(
        athleteId,
        goalId,
        Number(increment)
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('❌ [CustomGoals] progress:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/custom-goals/:athleteId/:goalId/claim */
  static async claim(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const result = await CustomGoalsService.claimReward(athleteId, goalId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [CustomGoals] claim:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* DELETE /api/custom-goals/:athleteId/:goalId */
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, goalId } = req.params;
      const ok = await CustomGoalsService.deleteGoal(athleteId, goalId);
      res.json({ success: ok });
    } catch (err) {
      console.error('❌ [CustomGoals] delete:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }
}