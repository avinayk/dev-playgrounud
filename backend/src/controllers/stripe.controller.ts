// src/controllers/stripe.controller.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import pool from '../config/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

/* ═══════════════════════════════════════════════════════
   DYNAMIC PRICE CREATION
═══════════════════════════════════════════════════════ */
async function getOrCreateProPriceId(): Promise<string> {
  const productName = process.env.STRIPE_PRODUCT_NAME || 'Playground PRO Tier';
  const priceUsd = Number(process.env.STRIPE_PRODUCT_PRICE_USD || 9.99);
  const currency = process.env.STRIPE_PRODUCT_CURRENCY || 'usd';

  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((p) => p.name === productName);

  if (!product) {
    product = await stripe.products.create({
      name: productName,
      description: 'Playground PRO monthly subscription.',
      metadata: { tier: 'pro' },
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existingPrice = prices.data.find(
    (p) =>
      p.unit_amount === Math.round(priceUsd * 100) &&
      p.currency === currency &&
      p.recurring?.interval === 'month'
  );
  if (existingPrice) return existingPrice.id;

  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(priceUsd * 100),
    currency,
    recurring: { interval: 'month' },
    metadata: { tier: 'pro', interval: 'monthly' },
  });

  return newPrice.id;
}

/* ═══════════════════════════════════════════════════════
   ⭐ CREATE CHECKOUT SESSION (New Upgrade)
═══════════════════════════════════════════════════════ */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { athleteId, email } = req.body;
    if (!athleteId) return res.status(400).json({ success: false, message: 'athleteId required' });

    const [rows] = await pool.query<any[]>(
      'SELECT id, email, name, stripe_customer_id FROM athletes WHERE id = ?',
      [athleteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Athlete not found' });
    const athlete = rows[0];

    let customerId = athlete.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || athlete.email,
        name: athlete.name || 'Athlete',
        metadata: { athleteId },
      });
      customerId = customer.id;
      await pool.query('UPDATE athletes SET stripe_customer_id = ? WHERE id = ?', [
        customerId,
        athleteId,
      ]);
    }

    const priceId = await getOrCreateProPriceId();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/?stripe=success&session_id={CHECKOUT_SESSION_ID}&athleteId=${athleteId}`,
      cancel_url: `${process.env.CLIENT_URL}/?stripe=cancel&athleteId=${athleteId}`,
      metadata: { athleteId },
      subscription_data: { metadata: { athleteId } },
    });

    res.json({ success: true, url: session.url, sessionId: session.id, priceId });
  } catch (err: any) {
    console.error('❌ createCheckoutSession:', err);
    res.status(500).json({ success: false, message: err.message || 'Stripe checkout failed' });
  }
};

/* ═══════════════════════════════════════════════════════
   ⭐⭐ NEW: CREATE BILLING PORTAL SESSION
   For existing PRO users to update payment method,
   view invoices, cancel subscription, etc.
═══════════════════════════════════════════════════════ */
export const createBillingPortalSession = async (req: Request, res: Response) => {
  try {
    const { athleteId } = req.body;
    if (!athleteId) return res.status(400).json({ success: false, message: 'athleteId required' });

    const [rows] = await pool.query<any[]>(
      'SELECT id, email, name, stripe_customer_id FROM athletes WHERE id = ?',
      [athleteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Athlete not found' });

    let customerId = rows[0].stripe_customer_id;

    // If no Stripe customer exists yet, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: rows[0].email,
        name: rows[0].name || 'Athlete',
        metadata: { athleteId },
      });
      customerId = customer.id;
      await pool.query('UPDATE athletes SET stripe_customer_id = ? WHERE id = ?', [
        customerId,
        athleteId,
      ]);
    }

    // ⭐ Create Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/?stripe=portal_return&athleteId=${athleteId}`,
    });

    res.json({ success: true, url: portalSession.url });
  } catch (err: any) {
    console.error('❌ createBillingPortalSession:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to open billing portal',
    });
  }
};

/* ═══════════════════════════════════════════════════════
   VERIFY SESSION
═══════════════════════════════════════════════════════ */
export const verifySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const athleteId =
        session.metadata?.athleteId ||
        (session.customer as Stripe.Customer)?.metadata?.athleteId;

      if (athleteId) {
        const subscription = session.subscription as Stripe.Subscription | null;
        const customer = session.customer as Stripe.Customer | null;

        await pool.query(
          `UPDATE athletes SET
             is_pro = 1, is_verified_pro = 1, subscription_tier = 'pro',
             payment_receipt_id = ?, payment_method = ?, payment_date = NOW(),
             stripe_customer_id = ?, stripe_subscription_id = ?
           WHERE id = ?`,
          [
            session.id,
            session.payment_method_types?.[0] || 'card',
            customer?.id || null,
            subscription?.id || null,
            athleteId,
          ]
        );

        const [rows] = await pool.query<any[]>('SELECT * FROM athletes WHERE id = ?', [athleteId]);
        return res.json({ success: true, upgraded: true, athlete: rows[0] });
      }
    }

    res.json({
      success: true,
      upgraded: false,
      paymentStatus: session.payment_status,
      status: session.status,
    });
  } catch (err: any) {
    console.error('❌ verifySession:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   ⭐ FETCH SUBSCRIPTION STATUS FROM STRIPE
   (Optional — for real-time sync)
═══════════════════════════════════════════════════════ */
export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { athleteId } = req.params;
    const [rows] = await pool.query<any[]>(
      'SELECT stripe_customer_id, stripe_subscription_id, is_pro FROM athletes WHERE id = ?',
      [athleteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Athlete not found' });

    const customerId = rows[0].stripe_customer_id;
    const subId = rows[0].stripe_subscription_id;

    let subscriptionInfo: any = null;
    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        subscriptionInfo = {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          priceId: sub.items.data[0]?.price.id,
          amount: sub.items.data[0]?.price.unit_amount,
          currency: sub.items.data[0]?.price.currency,
        };
      } catch (e) {
        console.warn('Subscription fetch failed:', e);
      }
    }

    let paymentMethods: any[] = [];
    if (customerId) {
      try {
        const pms = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });
        paymentMethods = pms.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        }));
      } catch (e) {
        console.warn('Payment methods fetch failed:', e);
      }
    }

    res.json({
      success: true,
      isPro: !!rows[0].is_pro,
      subscription: subscriptionInfo,
      paymentMethods,
    });
  } catch (err: any) {
    console.error('❌ getSubscriptionStatus:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   CANCEL SUBSCRIPTION
═══════════════════════════════════════════════════════ */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { athleteId } = req.body;
    if (!athleteId) return res.status(400).json({ success: false, message: 'athleteId required' });

    const [rows] = await pool.query<any[]>(
      'SELECT stripe_subscription_id FROM athletes WHERE id = ?',
      [athleteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Athlete not found' });

    const subId = rows[0].stripe_subscription_id;
    if (subId) {
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (e) {
        console.warn('Stripe cancel warning:', e);
      }
    }

    await pool.query(
      `UPDATE athletes SET
         is_pro = 0, is_verified_pro = 0, subscription_tier = 'free',
         stripe_subscription_id = NULL
       WHERE id = ?`,
      [athleteId]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('❌ cancelSubscription:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   WEBHOOK
═══════════════════════════════════════════════════════ */
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const athleteId = session.metadata?.athleteId;
      if (athleteId) {
        await pool.query(
          `UPDATE athletes SET
             is_pro = 1, is_verified_pro = 1, subscription_tier = 'pro',
             payment_receipt_id = ?, payment_date = NOW(),
             stripe_customer_id = ?, stripe_subscription_id = ?
           WHERE id = ?`,
          [
            session.id,
            (session.customer as string) || null,
            (session.subscription as string) || null,
            athleteId,
          ]
        );
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const athleteId = sub.metadata?.athleteId;
      if (athleteId) {
        await pool.query(
          `UPDATE athletes SET
             is_pro = 0, is_verified_pro = 0, subscription_tier = 'free',
             stripe_subscription_id = NULL
           WHERE id = ?`,
          [athleteId]
        );
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('❌ Webhook handler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};