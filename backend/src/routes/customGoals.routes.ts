// backend/src/routes/customGoals.routes.ts
import { Router } from 'express';
import { CustomGoalsController } from '../controllers/customGoals.controller';

const router = Router();

router.post('/', CustomGoalsController.create);
router.get('/:athleteId', CustomGoalsController.list);
router.post('/:athleteId/:goalId/progress', CustomGoalsController.progress);
router.post('/:athleteId/:goalId/claim', CustomGoalsController.claim);
router.delete('/:athleteId/:goalId', CustomGoalsController.remove);

export default router;