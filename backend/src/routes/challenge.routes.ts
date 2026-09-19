// src/routes/challenge.routes.ts
import { Router } from 'express';
import { ChallengeController } from '../controllers/challenge.controller';

const router = Router();

router.get('/challenges', ChallengeController.listChallenges);
router.post('/challenges/:id/complete', ChallengeController.completeChallenge);
router.get('/xp/summary', ChallengeController.getXpSummary);
router.get('/video-challenges/completed', ChallengeController.getCompletedChallenges);
export default router;