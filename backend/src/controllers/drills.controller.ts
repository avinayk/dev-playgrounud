import type { Request, Response } from 'express';
import { DrillsService } from '../services/drills.service';

export class DrillsController {
  static async saveDrill(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, drillId, drillName, sport, tier, score, target, xpEarned, unit } = req.body;

      if (!athleteId || !drillId || !drillName || !sport || !tier || !unit) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const result = await DrillsService.saveDrillCompletion(athleteId, {
        drillId, drillName, sport, tier,
        score: Number(score),
        target: Number(target),
        xpEarned: Number(xpEarned),
        unit,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ saveDrill:', err);
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed' });
    }
  }

  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();
      const sport = String(req.query.sport ?? 'all').trim();
      const limit = Math.min(Number(req.query.limit) || 20, 100);

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const history = await DrillsService.getHistory(athleteId, { sport, limit });
      res.json({ success: true, data: history });
    } catch (err) {
      console.error('❌ getDrillHistory:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const athleteId = String(req.query.athleteId ?? '').trim();
      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }
      const stats = await DrillsService.getStats(athleteId);
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('❌ getDrillStats:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }
}