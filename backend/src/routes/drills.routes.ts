import { Router } from 'express';
import { DrillsController } from '../controllers/drills.controller';

const router = Router();

router.post('/drills/save', DrillsController.saveDrill);
router.get('/drills/history', DrillsController.getHistory);
router.get('/drills/stats', DrillsController.getStats);

export default router;