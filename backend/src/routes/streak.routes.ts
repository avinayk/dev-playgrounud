// src/routes/streak.routes.ts
import { Router } from 'express';
import { StreakController } from '../controllers/streak.controller';

const router = Router();

router.get('/streak/:athleteId', StreakController.getStatus);
router.post('/streak/:athleteId/checkin', StreakController.checkIn);
router.post('/streak/:athleteId/purchase-freeze', StreakController.purchaseFreeze);

export default router;