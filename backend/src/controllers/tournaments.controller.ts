// backend/src/controllers/tournaments.controller.ts
import { Request, Response } from 'express';
import { TournamentsService } from '../services/tournaments.service';

export class TournamentsController {
  /* GET /api/tournaments */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const data = await TournamentsService.list({
        sport: req.query.sport as string,
        status: req.query.status as string,
        city: req.query.city as string,
        state: req.query.state as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('❌ [Tournaments] list:', err);
      res.status(500).json({ success: false, message: 'Failed to load tournaments' });
    }
  }

  /* GET /api/tournaments/:id */
  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.getById(req.params.id);
      if (!t) { res.status(404).json({ success: false, message: 'Not found' }); return; }
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] getOne:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /* POST /api/tournaments */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.create(req.body);
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] create:', err);
      const msg = err instanceof Error ? err.message : 'Failed';
      res.status(500).json({ success: false, message: msg });
    }
  }

  /* POST /api/tournaments/:id/register-team */
  static async registerTeam(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.registerTeam(req.params.id, req.body);
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] registerTeam:', err);
      const msg = err instanceof Error ? err.message : 'Failed';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* POST /api/tournaments/:id/matches/:matchId/score */
  static async updateMatchScore(req: Request, res: Response): Promise<void> {
    try {
      const { score1, score2, winnerId, boxScores } = req.body;
      const t = await TournamentsService.updateMatchScore(
        req.params.id, req.params.matchId, Number(score1), Number(score2), winnerId, boxScores
      );
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] score:', err);
      const msg = err instanceof Error ? err.message : 'Failed';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* POST /api/tournaments/:id/matches/:matchId/mvp-vote */
  static async castMvpVote(req: Request, res: Response): Promise<void> {
    try {
      const { voterId, votedForPlayer } = req.body;
      const t = await TournamentsService.castMvpVote(
        req.params.id, req.params.matchId, voterId, votedForPlayer
      );
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] mvp:', err);
      const msg = err instanceof Error ? err.message : 'Failed';
      res.status(400).json({ success: false, message: msg });
    }
  }

  /* POST /api/tournaments/:id/prize-pool */
  static async updatePrizePool(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.updatePrizePool(req.params.id, req.body.prizePool);
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] prize:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  /* POST /api/tournaments/:id/prize-distribution */
  static async updatePrizeDistribution(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.updatePrizeDistribution(req.params.id, req.body);
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] prizeDist:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  /* POST /api/tournaments/:id/teams/:teamId/pay */
  static async markTeamPaid(req: Request, res: Response): Promise<void> {
    try {
      const t = await TournamentsService.markTeamPaid(
        req.params.id, req.params.teamId, req.body.receiptId
      );
      res.json({ success: true, data: t });
    } catch (err) {
      console.error('❌ [Tournaments] pay:', err);
      res.status(400).json({ success: false, message: 'Failed' });
    }
  }

  /* DELETE /api/tournaments/:id */
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const ok = await TournamentsService.delete(req.params.id);
      res.json({ success: ok });
    } catch (err) {
      console.error('❌ [Tournaments] delete:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }
}