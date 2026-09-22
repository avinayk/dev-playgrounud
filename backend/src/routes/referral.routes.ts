// backend/src/routes/referral.routes.ts
import { Router } from 'express';
import {
  getReferralStats,
  sendReferralInvite,
} from '../controllers/referral.controller';

const router = Router();

// GET  /api/athletes/:id/referrals/stats
router.get('/athletes/:id/referrals/stats', getReferralStats);

// POST /api/athletes/:id/referrals/invite
router.post('/athletes/:id/referrals/invite', sendReferralInvite);

export default router;