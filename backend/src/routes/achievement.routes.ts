// src/routes/achievement.routes.ts
import { Router } from 'express';
import { AchievementController } from '../controllers/achievement.controller';

const router = Router();

router.get('/achievements/:athleteId', AchievementController.listAchievements);
router.post('/achievements/:athleteId/claim', AchievementController.claimAchievement);
router.get('/achievements/:athleteId/pinned', AchievementController.getPinnedBadges);
router.post('/achievements/:athleteId/pin', AchievementController.togglePin);
router.get('/achievements/:athleteId/level-info', AchievementController.getLevelInfoEndpoint);

export default router;