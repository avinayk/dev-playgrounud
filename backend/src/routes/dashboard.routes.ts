// backend/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

/* ═══════════════════════════════════════════
   DAILY CHECK-IN ROUTES
   ═══════════════════════════════════════════ */

/**
 * POST /api/dashboard/checkin/:athleteId
 * User clicks "Claim +100 XP" button
 * Returns: { xpEarned, newStreak, alreadyCheckedIn, longestStreak, lastCheckinDate }
 */
router.post('/dashboard/checkin/:athleteId', DashboardController.dailyCheckIn);

/**
 * GET /api/dashboard/checkin-status/:athleteId
 * Page load pe check-in status fetch karta hai
 * Returns: { isCheckedInToday, dailyStreak, longestStreak, lastCheckinDate, recentCheckins }
 */
router.get(
  '/dashboard/checkin-status/:athleteId',
  DashboardController.getCheckInStatus
);

router.post('/checkin/:athleteId', DashboardController.dailyCheckIn);
router.get('/checkin-status/:athleteId', DashboardController.getCheckInStatus);

export default router;