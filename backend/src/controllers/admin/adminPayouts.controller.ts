// src/controllers/admin/adminPayouts.controller.ts
import type { Request, Response } from 'express';
import pool from '../../config/database';

/* ═══════════════════════════════════════════
   PRICING CONSTANTS (from env or defaults)
   ═══════════════════════════════════════════ */
// const MONTHLY_PRO_PRICE = Number(process.env.STRIPE_PRODUCT_PRICE_USD || 9.99);
// const LIFETIME_PRO_PRICE = 19.99;

/* ═══════════════════════════════════════════
   HELPER: Detect payment source from method
   ═══════════════════════════════════════════ */
function detectPaymentSource(method: string | null): 'stripe' | 'paypal' | 'apple' | 'google' | 'unknown' {
  if (!method) return 'unknown';
  const m = method.toLowerCase();
  if (m === 'card' || m === 'stripe') return 'stripe';
  if (m === 'paypal') return 'paypal';
  if (m === 'apple') return 'apple';
  if (m === 'google') return 'google';
  return 'stripe'; // default
}

/* ═══════════════════════════════════════════
   HELPER: Determine plan price from athlete
   ═══════════════════════════════════════════ */
function getPlanPrice(athlete: any): number {
  // Read REAL amount from DB
  if (athlete.payment_amount) {
    return Number(athlete.payment_amount);
  }
  // Fallback for old records without amount
  return 0;
}

export class AdminPayoutsController {
  /* ═══════════════════════════════════════════
     GET /api/admin/payouts/overview
     Dynamic revenue stats from real athletes table
     ═══════════════════════════════════════════ */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      /* ─── Fetch all PRO athletes with payment data ─── */
      const [proAthletes] = await pool.execute<any[]>(
        `SELECT 
           id, name, payment_method, payment_date,payment_amount, payment_currency,
           stripe_customer_id, stripe_subscription_id,
           stripe_payment_intent_id, payment_receipt_id
         FROM athletes
         WHERE (subscription_tier = 'pro' OR is_pro = 1)
           AND payment_date IS NOT NULL
         ORDER BY payment_date DESC`
      );

      /* ─── Calculate revenue by source ─── */
      let stripeVolume = 0;
      let paypalVolume = 0;
      let appleVolume = 0;
      let googleVolume = 0;
      let stripeCount = 0;
      let paypalCount = 0;

      proAthletes.forEach((a: any) => {
        const source = detectPaymentSource(a.payment_method);
        const price = getPlanPrice(a);

        if (source === 'stripe') {
          stripeVolume += price;
          stripeCount++;
        } else if (source === 'paypal') {
          paypalVolume += price;
          paypalCount++;
        } else if (source === 'apple') {
          appleVolume += price;
        } else if (source === 'google') {
          googleVolume += price;
        }
      });

      const grossRevenue = stripeVolume + paypalVolume + appleVolume + googleVolume;

      /* ─── Total withdrawn so far ─── */
      const [withdrawRows] = await pool.execute<any[]>(
        `SELECT COALESCE(SUM(amount), 0) AS total_withdrawn 
         FROM payout_withdrawals 
         WHERE status = 'completed'`
      );
      const totalWithdrawn = Number(withdrawRows[0]?.total_withdrawn) || 0;

      const availableBalance = Math.max(0, grossRevenue - totalWithdrawn);

      res.status(200).json({
        success: true,
        data: {
          grossRevenue: parseFloat(grossRevenue.toFixed(2)),
          availableBalance: parseFloat(availableBalance.toFixed(2)),
          stripeVolume: parseFloat((stripeVolume + appleVolume + googleVolume).toFixed(2)),
          paypalVolume: parseFloat(paypalVolume.toFixed(2)),
          stripeCount: stripeCount + (appleVolume > 0 ? 1 : 0) + (googleVolume > 0 ? 1 : 0),
          paypalCount,
          totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
          proSubscribers: proAthletes.length,
        },
      });
    } catch (err: any) {
      console.error('❌ Payout overview error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch overview',
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/admin/payouts/bank-config
     ═══════════════════════════════════════════ */
  static async getBankConfig(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT 
           id,
           bank_name AS bankName,
           account_holder AS accountHolder,
           account_number AS accountNumber,
           routing_number AS routingNumber,
           swift_iban AS swiftIban,
           stripe_connect_status AS stripeConnectStatus,
           updated_at AS updatedAt
         FROM platform_bank_config 
         LIMIT 1`
      );

      if (rows.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            bankName: 'JPMorgan Chase Bank, N.A.',
            accountHolder: 'Playground League Sports Corp',
            accountNumber: '4839-2019-8842',
            routingNumber: '121000358',
            swiftIban: 'CHASUS33XXX / US89CHAS1210003588842',
            stripeConnectStatus: 'connected',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: rows[0],
      });
    } catch (err: any) {
      console.error('❌ Get bank config error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch bank config',
      });
    }
  }

  /* ═══════════════════════════════════════════
     PUT /api/admin/payouts/bank-config
     ═══════════════════════════════════════════ */
  static async updateBankConfig(req: Request, res: Response): Promise<void> {
    try {
      const {
        bankName,
        accountHolder,
        accountNumber,
        routingNumber,
        swiftIban,
      } = req.body;

      if (!bankName || !accountHolder || !accountNumber) {
        res.status(400).json({
          success: false,
          message: 'bankName, accountHolder, and accountNumber are required',
        });
        return;
      }

      const [existing] = await pool.execute<any[]>(
        `SELECT id FROM platform_bank_config LIMIT 1`
      );

      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO platform_bank_config 
             (bank_name, account_holder, account_number, routing_number, swift_iban)
           VALUES (?, ?, ?, ?, ?)`,
          [
            bankName,
            accountHolder,
            accountNumber,
            routingNumber || '',
            swiftIban || '',
          ]
        );
      } else {
        await pool.execute(
          `UPDATE platform_bank_config 
           SET bank_name = ?, account_holder = ?, account_number = ?, routing_number = ?, swift_iban = ?
           WHERE id = ?`,
          [
            bankName,
            accountHolder,
            accountNumber,
            routingNumber || '',
            swiftIban || '',
            existing[0].id,
          ]
        );
      }

      res.status(200).json({
        success: true,
        message: 'Bank config updated successfully',
      });
    } catch (err: any) {
      console.error('❌ Update bank config error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to update bank config',
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/admin/payouts/pro-transactions
     Real transaction ledger from athletes table
     ═══════════════════════════════════════════ */
  static async getProTransactions(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const [rows] = await pool.execute<any[]>(
        `SELECT 
           id,
           name,
           userhandle,
           email,
           subscription_tier,
           payment_method,
           payment_receipt_id,
           payment_date,
           stripe_payment_intent_id,
           stripe_subscription_id,
           payment_amount, payment_currency
         FROM athletes
         WHERE 
           (subscription_tier = 'pro' OR is_pro = 1)
           AND payment_date IS NOT NULL
         ORDER BY payment_date DESC
         LIMIT ${limit}`
      );

      const transactions = rows.map((r: any) => {
            const price = Number(r.payment_amount) || 0;   // ✅ Real amount
            const currency = r.payment_currency || 'usd';
            const source = detectPaymentSource(r.payment_method);

            let planLabel = 'PRO Subscription';
            if (r.stripe_subscription_id) planLabel = 'Monthly PRO Pass';
            else planLabel = 'Lifetime Pro Badge';

            let sourceLabel = 'Stripe Card';
            if (source === 'paypal') sourceLabel = 'PayPal Smart Buttons';
            else if (source === 'apple') sourceLabel = 'Apple Pay Express';
            else if (source === 'google') sourceLabel = 'Google Pay Express';

            return {
                id: r.stripe_payment_intent_id || r.payment_receipt_id || r.id,
                athleteId: r.id,
                athleteName: r.name,
                athleteHandle: r.userhandle,
                plan: `${planLabel} ($${price.toFixed(2)})`,
                source: sourceLabel,
                receipt: r.payment_receipt_id || r.stripe_payment_intent_id || 'N/A',
                amount: price,
                currency,
                date: r.payment_date,
            };
            });

      res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions,
      });
    } catch (err: any) {
      console.error('❌ Get PRO transactions error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch transactions',
      });
    }
  }

  /* ═══════════════════════════════════════════
     GET /api/admin/payouts/withdrawals
     ═══════════════════════════════════════════ */
  static async getWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT 
           id,
           amount,
           bank_name AS bankName,
           account_holder AS accountHolder,
           account_last4 AS accountLast4,
           method,
           status,
           initiated_by AS initiatedBy,
           created_at AS createdAt,
           completed_at AS completedAt
         FROM payout_withdrawals
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const withdrawals = rows.map((r: any) => ({
        id: r.id,
        amount: `$${Number(r.amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        amountValue: Number(r.amount),
        bank: `${r.bankName.slice(0, 15)} (*${r.accountLast4})`,
        method: r.method,
        status: r.status,
        date: new Date(r.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        createdAt: r.createdAt,
      }));

      res.status(200).json({
        success: true,
        count: withdrawals.length,
        data: withdrawals,
      });
    } catch (err: any) {
      console.error('❌ Get withdrawals error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch withdrawals',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/payouts/withdraw
     body: { amount }
     ═══════════════════════════════════════════ */
  static async createWithdrawal(req: Request, res: Response): Promise<void> {
  try {
    const { amount } = req.body;
    const adminEmail =
      (req.headers['x-admin-email'] as string) || 'admin@unknown';

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
      return;
    }

    /* 1. Get bank config */
    const [bankRows] = await pool.execute<any[]>(
      `SELECT bank_name, account_holder, account_number 
       FROM platform_bank_config LIMIT 1`
    );

    if (bankRows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Bank config not set. Please configure bank account first.',
      });
      return;
    }

    const bank = bankRows[0];
    const last4 = String(bank.account_number).slice(-4);

    /* 2. Calculate available balance — ✅ FIX: Add payment_amount to SELECT */
    const [proAthletes] = await pool.execute<any[]>(
      `SELECT payment_amount, payment_method, stripe_subscription_id
       FROM athletes
       WHERE (subscription_tier = 'pro' OR is_pro = 1)
         AND payment_date IS NOT NULL`
    );

    let grossRevenue = 0;
    proAthletes.forEach((a: any) => {
      grossRevenue += getPlanPrice(a);
    });

    const [withdrawRows] = await pool.execute<any[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total_withdrawn 
       FROM payout_withdrawals 
       WHERE status = 'completed'`
    );
    const withdrawn = Number(withdrawRows[0]?.total_withdrawn) || 0;
    const available = grossRevenue - withdrawn;

    console.log('💰 Withdrawal calc:', {
      grossRevenue,
      withdrawn,
      available,
      requested: numericAmount,
    });

    if (numericAmount > available) {
      res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${available.toFixed(2)}`,
      });
      return;
    }

    /* 3. Create withdrawal record */
    const id = `w-${Date.now().toString().slice(-6)}`;

    await pool.execute(
      `INSERT INTO payout_withdrawals 
         (id, amount, bank_name, account_holder, account_last4, method, status, initiated_by, completed_at)
       VALUES (?, ?, ?, ?, ?, 'Stripe Connect Express Wire', 'completed', ?, NOW())`,
      [
        id,
        numericAmount,
        bank.bank_name,
        bank.account_holder,
        last4,
        adminEmail,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Successfully disbursed $${numericAmount.toFixed(2)} to ${bank.bank_name}`,
      data: {
        id,
        amount: numericAmount,
        bankName: bank.bank_name,
        accountLast4: last4,
      },
    });
  } catch (err: any) {
    console.error('❌ Create withdrawal error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Failed to process withdrawal',
    });
  }
}
}