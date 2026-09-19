// routes/leaderboard.routes.ts
import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller';

const router = Router();

/* ═══════════════════════════════════════════
   EXISTING
   ═══════════════════════════════════════════ */
router.get('/leaderboard', LeaderboardController.getLeaderboard);

/* ═══════════════════════════════════════════
   PRESENCE / ONLINE-OFFLINE
   ═══════════════════════════════════════════ */

// Update status (Online / In-Game / Away / Offline)
router.patch(
  '/leaderboard/status/:athleteId',
  LeaderboardController.updateStatus
);

// Heartbeat — frontend har 60 sec ping kare
router.post(
  '/leaderboard/heartbeat/:athleteId',
  LeaderboardController.heartbeat
);

// Get single athlete live status
router.get(
  '/leaderboard/status/:athleteId',
  LeaderboardController.getAthleteStatus
);

// Mark stale users offline (cron / admin)
router.post(
  '/leaderboard/mark-offline-stale',
  LeaderboardController.markStaleOffline
);
// routes/leaderboard.routes.ts
router.get('/leaderboard/online-users', LeaderboardController.getOnlineUsers);
export default router;