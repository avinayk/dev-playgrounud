// backend/src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  /* ═══════════════════════════════════════════
     POST /api/dashboard/checkin/:athleteId
     ═══════════════════════════════════════════ */
  static async dailyCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;

      console.log('📥 [dailyCheckIn] athleteId:', athleteId);

      if (!athleteId) {
        res.status(400).json({
          success: false,
          message: 'athleteId is required',
        });
        return;
      }

      const result = await DashboardService.dailyCheckIn(athleteId);

      console.log('📤 [dailyCheckIn] result:', result);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('❌ [dailyCheckIn] error:', err);
      const msg = err instanceof Error ? err.message : 'Server error';

      res.status(msg === 'Athlete not found' ? 404 : 500).json({
        success: false,
        message: msg,
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/dashboard/checkin-status/:athleteId
     ═══════════════════════════════════════════ */
  static async getCheckInStatus(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;

      console.log('📥 [getCheckInStatus] athleteId:', athleteId);

      if (!athleteId) {
        res.status(400).json({
          success: false,
          message: 'athleteId is required',
        });
        return;
      }

      const result = await DashboardService.getCheckInStatus(athleteId);

      console.log('📤 [getCheckInStatus] result:', result);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('❌ [getCheckInStatus] error:', err);
      const msg = err instanceof Error ? err.message : 'Server error';

      res.status(msg === 'Athlete not found' ? 404 : 500).json({
        success: false,
        message: msg,
      });
    }
  }
}