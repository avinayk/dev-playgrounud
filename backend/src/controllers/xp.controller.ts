import type { Request, Response } from 'express';
import { XpService } from '../services/xp.service';

export class XpController {
  static async awardXp(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId, amount, source, referenceId } = req.body;

      if (!athleteId || !amount || !source) {
        res.status(400).json({
          success: false,
          message: 'athleteId, amount, source required',
        });
        return;
      }

      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount === 0) {
        res.status(400).json({ success: false, message: 'Invalid amount' });
        return;
      }

      const result = await XpService.awardXp(
        athleteId,
        numAmount,
        source,
        referenceId
      );

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ awardXp:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  }
}