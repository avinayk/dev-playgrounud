// src/routes/stripe.routes.ts
import { Router } from 'express';
import {
  createCheckoutSession,
  createBillingPortalSession,   // ⭐ NEW
  verifySession,
  getSubscriptionStatus,         // ⭐ NEW
  cancelSubscription,
  stripeWebhook,
} from '../controllers/stripe.controller';

const router = Router();

router.post('/webhook', stripeWebhook);

router.post('/create-checkout-session', createCheckoutSession);
router.post('/create-billing-portal-session', createBillingPortalSession);  // ⭐
router.get('/session/:sessionId', verifySession);
router.get('/subscription-status/:athleteId', getSubscriptionStatus);        // ⭐
router.post('/cancel-subscription', cancelSubscription);

export default router;