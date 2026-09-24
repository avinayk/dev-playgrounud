// src/routes/admin/admin.routes.ts
import { Router } from 'express';
import { AdminController } from '../../controllers/admin/admin.controller';
import { AdminAnalyticsController } from '../../controllers/admin/adminAnalytics.controller';
import { AdminCourtsController } from '../../controllers/admin/adminCourts.controller';
import { AdminAuditController } from '../../controllers/admin/adminAudit.controller';
import { attachAdminContext } from '../../middleware/adminAuth.middleware';
import { AdminSponsorsController } from '../../controllers/admin/adminSponsors.controller';
import { AdminPayoutsController } from '../../controllers/admin/adminPayouts.controller';
const router = Router();

/* ═══════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════ */
router.post('/admin/login', AdminController.login);
router.post('/admin/logout', AdminController.logout);

/* ═══════════════════════════════════════════
   USER MANAGEMENT
   ═══════════════════════════════════════════ */
router.get('/admin/users', AdminController.getAllUsers);
router.patch('/admin/users/:userId/status', AdminController.updateUserStatus);
router.delete('/admin/users/:userId', AdminController.deleteUser);
router.post('/admin/users/:userId/reset-password', AdminController.resetUserPassword);
router.patch('/admin/users/:userId/pro', AdminController.upgradeUserPro);
router.post('/admin/users/:userId/reset-stats', AdminController.resetUserStats);

/* ═══════════════════════════════════════════
   ANALYTICS & METRICS
   ═══════════════════════════════════════════ */
router.get('/admin/analytics/all', AdminAnalyticsController.getAllAnalytics);
router.get('/admin/analytics/overview', AdminAnalyticsController.getOverview);
router.get('/admin/analytics/concurrency', AdminAnalyticsController.getConcurrency);
router.get('/admin/analytics/top-courts', AdminAnalyticsController.getTopCourts);
router.get('/admin/analytics/activity-trends', AdminAnalyticsController.getActivityTrends);
router.get('/admin/analytics/platform-metrics', AdminAnalyticsController.getPlatformMetrics);

/* ═══════════════════════════════════════════
   COURTS / PARK VERIFICATION
   ═══════════════════════════════════════════ */
router.get('/admin/courts', AdminCourtsController.getAllCourts);
router.get('/admin/courts/stats', AdminCourtsController.getCourtStats);
router.post('/admin/courts/:courtId/validate', AdminCourtsController.validateCourt);

/* ═══════════════════════════════════════════
   AUDIT LOGS
   ═══════════════════════════════════════════ */
router.post('/admin/audit-logs', AdminAuditController.createLog);
router.get('/admin/audit-logs', AdminAuditController.getLogs);
router.get('/admin/audit-logs/stats', AdminAuditController.getStats);

router.use('/admin', attachAdminContext);


/* ═══════════════════════════════════════════
   SPONSORS
   ═══════════════════════════════════════════ */
router.get('/admin/sponsors', AdminSponsorsController.getAllSponsors);
router.post('/admin/sponsors', AdminSponsorsController.createSponsor);
router.patch('/admin/sponsors/:sponsorId', AdminSponsorsController.updateSponsor);
router.delete('/admin/sponsors/:sponsorId', AdminSponsorsController.deleteSponsor);
router.post('/admin/sponsors/seed-demo', AdminSponsorsController.seedDemoSponsors);



/* ═══════════════════════════════════════════
   PAYOUTS & BANK
   ═══════════════════════════════════════════ */
router.get('/admin/payouts/overview', AdminPayoutsController.getOverview);
router.get('/admin/payouts/bank-config', AdminPayoutsController.getBankConfig);
router.put('/admin/payouts/bank-config', AdminPayoutsController.updateBankConfig);
router.get('/admin/payouts/pro-transactions', AdminPayoutsController.getProTransactions);
router.get('/admin/payouts/withdrawals', AdminPayoutsController.getWithdrawals);
router.post('/admin/payouts/withdraw', AdminPayoutsController.createWithdrawal);
export default router;