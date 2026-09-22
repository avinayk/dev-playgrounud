// backend/src/controllers/referral.controller.ts
import type { Request, Response } from 'express';
import pool from '../config/database';
// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
interface AthleteReferralRow {
  referral_code: string | null;
  total_referrals: number | null;
  referral_xp: number | null;
}

interface ReferralRow {
  id: number;
  referrer_id: string;
  referred_athlete_id: string;
  status: 'pending' | 'completed';
  xp_awarded: number;
  created_at: Date | string;
  referred_name: string | null;
  referred_email: string | null;
  referred_avatar: string | null;
  referred_handle: string | null;
  referred_sport: string | null;
}

interface ReferralInviteRow {
  id: number;
  invited_email: string;
  status: 'sent' | 'opened' | 'signed_up';
  created_at: Date | string;
}

interface GetReferralStatsParams {
  id: string;
}

interface SendReferralInviteParams {
  id: string;
}

interface SendReferralInviteBody {
  email: string;
}

// ═══════════════════════════════════════════════
// GET /api/athletes/:id/referrals/stats
// ═══════════════════════════════════════════════
export const getReferralStats = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Athlete ID required' });
      return;
    }

    // 1. Athlete basics
    const [athleteRows] = await pool.query<any[]>(
      `SELECT referral_code, total_referrals, referral_xp
       FROM athletes WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!athleteRows.length) {
      res.status(404).json({ success: false, message: 'Athlete not found' });
      return;
    }

    const athlete = athleteRows[0];

    // 2. Completed referrals with athlete details
    const [referralRows] = await pool.query<any[]>(
      `SELECT
         r.id,
         r.referred_athlete_id,
         r.status,
         r.xp_awarded,
         r.created_at,
         a.name            AS referred_name,
         a.email           AS referred_email,
         a.profilepicture  AS referred_avatar,
         a.userhandle      AS referred_handle
       FROM referrals r
       LEFT JOIN athletes a ON a.id = r.referred_athlete_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    // 3. Sent invites
    const [inviteRows] = await pool.query<any[]>(
      `SELECT id, invited_email, status, created_at
       FROM referral_invites
       WHERE referrer_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    // ✅ BACKEND RESPONSE — frontend ke expected shape se match
    res.json({
      success: true,
      data: {
        referralCode: athlete.referral_code ?? null,
        totalReferrals: Number(athlete.total_referrals) || 0,
        referralXp: Number(athlete.referral_xp) || 0,
        referrals: referralRows ?? [],
        invites: inviteRows ?? [],
      },
    });
  } catch (err) {
    console.error('❌ getReferralStats error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load referral stats',
    });
  }
};

// ═══════════════════════════════════════════════
// POST /api/athletes/:id/referrals/invite
// ═══════════════════════════════════════════════
export const sendReferralInvite = async (
  req: Request<SendReferralInviteParams, any, SendReferralInviteBody>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // ─── Validation ───────────────────────────────
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Athlete ID is required',
      });
      return;
    }

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // ─── 1. Verify referrer exists & get code ─────
    const [rows] = await pool.query<Array<{ referral_code: string | null }>>(
      `SELECT referral_code FROM athletes WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Athlete not found',
      });
      return;
    }

    const referralCode = rows[0].referral_code ?? '';

    // ─── 2. Build referral link ───────────────────
    const appUrl = process.env.APP_URL || 'https://playgroundleague.app';
    const referralLink = `${appUrl}/register?ref=${referralCode}`;

    // ─── 3. Insert invite record ──────────────────
    const [result] = await pool.query<any>(
      `INSERT INTO referral_invites
         (referrer_id, invited_email, referral_link, status)
       VALUES (?, ?, ?, 'sent')`,
      [id, cleanEmail, referralLink]
    );

    // ─── 4. Response ──────────────────────────────
    res.status(201).json({
      success: true,
      message: 'Invite logged successfully',
      data: {
        id: result?.insertId ?? null,
        invited_email: cleanEmail,
        referral_link: referralLink,
        status: 'sent',
      },
    });
  } catch (err) {
    console.error('❌ sendReferralInvite error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send invite',
      error:
        process.env.NODE_ENV === 'development'
          ? (err as Error).message
          : undefined,
    });
  }
};

// ═══════════════════════════════════════════════
// OPTIONAL: GET /api/athletes/:id/referrals/recent
// Shortcut endpoint — returns only latest 5 signups
// ═══════════════════════════════════════════════
export const getRecentReferrals = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Athlete ID required' });
      return;
    }

    const [rows] = await pool.query<ReferralRow[]>(
      `SELECT
         r.id,
         r.referred_athlete_id,
         r.status,
         r.xp_awarded,
         r.created_at,
         a.name            AS referred_name,
         a.profilepicture  AS referred_avatar,
         a.userhandle      AS referred_handle
       FROM referrals r
       LEFT JOIN athletes a ON a.id = r.referred_athlete_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [id]
    );

    res.json({ success: true, data: rows ?? [] });
  } catch (err) {
    console.error('❌ getRecentReferrals error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to load recent referrals' });
  }
};