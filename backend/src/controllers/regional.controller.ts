// backend/src/controllers/regional.controller.ts
import { Request, Response } from 'express';
import { RegionalService } from '../services/regional.service';

export class RegionalController {
  /* GET /api/regional/stats/:athleteId?sport=basketball */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { sport } = req.query;

      const stats = await RegionalService.getRegionalStats(
        athleteId,
        sport as string | undefined
      );

      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('❌ [getStats] error:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* GET /api/regional/tournaments?city=X&state=Y&sport=Z */
  static async getTournaments(req: Request, res: Response): Promise<void> {
    try {
      const { city = '', state = '', sport = 'all', limit = '10' } = req.query;

      const tournaments = await RegionalService.getLocalTournaments(
        String(city),
        String(state),
        String(sport),
        Number(limit)
      );

      res.json({ success: true, data: tournaments });
    } catch (err) {
      console.error('❌ [getTournaments] error:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* GET /api/regional/activity?city=X&state=Y&sport=Z */
  static async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const { city = '', state = '', sport = 'all', limit = '20' } = req.query;

      const activity = await RegionalService.getLocalActivity(
        String(city),
        String(state),
        String(sport),
        Number(limit)
      );

      res.json({ success: true, data: activity });
    } catch (err) {
      console.error('❌ [getActivity] error:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      res.status(500).json({ success: false, message: msg });
    }
  }
}