// routes/stat.routes.ts
import { Router } from 'express';
import { StatController } from '../controllers/stat.controller';

const router = Router();
const statController = new StatController();

// Helper to wrap controller methods (same as your athlete routes)
const wrap = (fn: Function) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// GET routes
router.get('/stats', wrap(statController.getStatLogs));
router.get('/stats/summary', wrap(statController.getStatsSummary));
router.get('/stats/win-loss', wrap(statController.getWinLossRatio));
router.get('/stats/athlete/:athleteId', wrap(statController.getAthleteStats));

// POST routes
router.post('/stats', wrap(statController.createStatLog));

// DELETE routes
router.delete('/stats/:id', wrap(statController.deleteStatLog));

export default router;