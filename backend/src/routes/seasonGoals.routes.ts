// backend/src/routes/seasonGoals.routes.ts
import { Router } from 'express';
import { SeasonGoalsController } from '../controllers/seasonGoals.controller';

const router = Router();

router.get('/:athleteId', SeasonGoalsController.list);
router.post('/', SeasonGoalsController.create);
router.post('/:athleteId/:goalId/progress', SeasonGoalsController.progress);
router.post('/:athleteId/:goalId/claim', SeasonGoalsController.claim);
router.delete('/:athleteId/:goalId', SeasonGoalsController.remove);

export default router;