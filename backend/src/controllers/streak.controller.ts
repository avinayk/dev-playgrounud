// src/controllers/streak.controller.ts
import type { Request, Response } from 'express';
import { StreakService } from '../services/streak.service';

export class StreakController {
  /* GET /api/streak/:athleteId */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const data = await StreakService.getStatus(athleteId);
      res.json({ success: true, data });
    } catch (err) {
      console.error('❌ getStreakStatus:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/streak/:athleteId/checkin */
  static async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const result = await StreakService.checkIn(athleteId);

      if (!result.success && result.alreadyCheckedIn) {
        res.status(200).json({ success: false, message: result.message });
        return;
      }

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ checkIn:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  }

  /* POST /api/streak/:athleteId/purchase-freeze */
  static async purchaseFreeze(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const costXp = Number(req.body?.costXp) || 250;
      const result = await StreakService.purchaseFreeze(athleteId, costXp);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ purchaseFreeze:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  }
}