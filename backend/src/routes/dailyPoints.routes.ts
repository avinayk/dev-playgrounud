// backend/src/routes/dailyPoints.routes.ts
import { Router } from 'express';
import { DailyPointsController } from '../controllers/dailyPoints.controller';

const router = Router();

router.get('/today/:athleteId', DailyPointsController.getToday);
router.post('/check-bonus/:athleteId', DailyPointsController.checkBonus);

export default router;