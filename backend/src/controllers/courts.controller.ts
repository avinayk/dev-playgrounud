// backend/src/controllers/courts.controller.ts
import { Request, Response } from 'express';
import { CourtsService } from '../services/courts.service';

export class CourtsController {
  /* GET /api/courts */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const data = await CourtsService.list({
        sport: req.query.sport as string,
        city: req.query.city as string,
        state: req.query.state as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('❌ [Courts] list:', err);
      res.status(500).json({ success: false, message: 'Failed to load courts' });
    }
  }

  /* GET /api/courts/:id */
  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const court = await CourtsService.getById(req.params.id);
      if (!court) {
        res.status(404).json({ success: false, message: 'Court not found' });
        return;
      }
      res.json({ success: true, data: court });
    } catch (err) {
      console.error('❌ [Courts] getOne:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* POST /api/courts */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const court = await CourtsService.create(req.body);
      res.json({ success: true, data: court });
    } catch (err) {
      console.error('❌ [Courts] create:', err);
      const msg = err instanceof Error ? err.message : 'Failed';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* PUT /api/courts/:id */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const court = await CourtsService.update(req.params.id, req.body);
      if (!court) {
        res.status(404).json({ success: false, message: 'Court not found' });
        return;
      }
      res.json({ success: true, data: court });
    } catch (err) {
      console.error('❌ [Courts] update:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  /* DELETE /api/courts/:id */
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const ok = await CourtsService.delete(req.params.id);
      res.json({ success: ok });
    } catch (err) {
      console.error('❌ [Courts] delete:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }
  /* ✅ NEW: POST /api/courts/:id/radar-ping */
  static async radarPing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { athleteId, message } = req.body;

      if (!athleteId) {
        res.status(400).json({ success: false, message: 'athleteId required' });
        return;
      }

      const result = await CourtsService.radarPing(id, athleteId, message);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ [Courts] radarPing:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send radar ping';
      res.status(500).json({ success: false, message: msg });
    }
  }
}