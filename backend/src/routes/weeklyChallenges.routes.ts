// backend/src/routes/weeklyChallenges.routes.ts
import { Router } from 'express';
import { WeeklyChallengesController } from '../controllers/weeklyChallenges.controller';

const router = Router();

router.get('/:athleteId', WeeklyChallengesController.getUserChallenges);
router.post('/:athleteId/sync', WeeklyChallengesController.sync);
router.post('/:athleteId/:challengeId/progress', WeeklyChallengesController.updateProgress);
router.post('/:athleteId/:challengeId/claim', WeeklyChallengesController.claimReward);

export default router;