// backend/src/controllers/dailyPoints.controller.ts
import { Request, Response } from 'express';
import { DailyPointsService } from '../services/dailyPoints.service';

export class DailyPointsController {
  /* GET /api/daily-points/today/:athleteId?target=25 */
  static async getToday(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { target = '25' } = req.query;

      const result = await DailyPointsService.getTodayPoints(
        athleteId,
        Number(target)
      );

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [DailyPoints] getToday:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/daily-points/check-bonus/:athleteId?target=25 */
  static async checkBonus(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { target = '25' } = req.query;

      const result = await DailyPointsService.checkAndAwardBonus(
        athleteId,
        Number(target)
      );

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [DailyPoints] checkBonus:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }
}