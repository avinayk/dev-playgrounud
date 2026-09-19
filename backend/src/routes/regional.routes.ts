// backend/src/routes/regional.routes.ts
import { Router } from 'express';
import { RegionalController } from '../controllers/regional.controller';

const router = Router();

router.get('/stats/:athleteId', RegionalController.getStats);
router.get('/tournaments', RegionalController.getTournaments);
router.get('/activity', RegionalController.getActivity);

export default router;