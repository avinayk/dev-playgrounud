// backend/src/routes/dailyChallenges.routes.ts
import { Router } from 'express';
import { DailyChallengesController } from '../controllers/dailyChallenges.controller';

const router = Router();

router.get('/:athleteId', DailyChallengesController.getUserChallenges);
router.post('/:athleteId/:challengeId/progress', DailyChallengesController.updateProgress);
router.post('/:athleteId/:challengeId/claim', DailyChallengesController.claimReward);
router.post('/:athleteId/chest', DailyChallengesController.claimChest);

export default router;