import pool from '../config/database';

export interface Referral {
  id: number;
  referrer_id: string;
  referred_athlete_id: string;
  status: 'pending' | 'completed' | 'expired';
  xp_awarded: number;
  created_at: Date;
}

export interface ReferralStats {
  sent: number;
  joined: number;
  earned: number;
}

export class ReferralModel {
  /**
   * Fetch an athlete's referral code (or null if not generated yet)
   */
  static async getReferralCode(athleteId: string): Promise<string | null> {
    const [rows]: any = await pool.query(
      'SELECT referral_code FROM athletes WHERE id = ?',
      [athleteId]
    );
    return rows[0]?.referral_code ?? null;
  }

  /**
   * Save a generated referral code
   */
  static async saveReferralCode(athleteId: string, code: string): Promise<void> {
    await pool.query(
      'UPDATE athletes SET referral_code = ? WHERE id = ?',
      [code, athleteId]
    );
  }

  /**
   * Check if a referral code already exists
   */
  static async codeExists(code: string): Promise<boolean> {
    const [rows]: any = await pool.query(
      'SELECT id FROM athletes WHERE referral_code = ? LIMIT 1',
      [code]
    );
    return rows.length > 0;
  }

  /**
   * Find the athlete who owns a referral code
   */
  static async findByCode(code: string): Promise<{ id: string; name: string; subscription_tier: string | null } | null> {
    const [rows]: any = await pool.query(
      'SELECT id, name, subscription_tier FROM athletes WHERE referral_code = ? LIMIT 1',
      [code]
    );
    return rows[0] ?? null;
  }

  /**
   * Fetch stats for the referral modal
   */
  static async getStats(athleteId: string): Promise<ReferralStats> {
    const [rows]: any = await pool.query(
      `SELECT
         COUNT(*) AS sent,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS joined,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN xp_awarded ELSE 0 END), 0) AS earned
       FROM referrals
       WHERE referrer_id = ?`,
      [athleteId]
    );

    const r = rows[0] ?? {};
    return {
      sent: Number(r.sent ?? 0),
      joined: Number(r.joined ?? 0),
      earned: Number(r.earned ?? 0),
    };
  }

  /**
   * Fetch referral history (joined with referred athlete info)
   */
  static async getHistory(athleteId: string, limit = 50) {
    const [rows]: any = await pool.query(
      `SELECT
         r.id,
         a.name,
         a.handle,
         a.primary_sport AS sport,
         r.xp_awarded AS xp,
         DATE_FORMAT(r.created_at, '%b %d') AS date,
         r.status
       FROM referrals r
       INNER JOIN athletes a ON a.id = r.referred_athlete_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [athleteId, limit]
    );
    return rows;
  }

  /**
   * Create a pending referral (called during signup)
   */
  static async createPending(referrerId: string, referredId: string, xpReward: number): Promise<number> {
    const [result]: any = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_athlete_id, status, xp_awarded, created_at)
       VALUES (?, ?, 'pending', ?, NOW())`,
      [referrerId, referredId, xpReward]
    );
    return result.insertId;
  }

  /**
   * Mark referral as completed & award XP to referrer
   */
  static async completeReferral(referredAthleteId: string): Promise<{ referrerId: string; xp: number } | null> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT id, referrer_id, xp_awarded
         FROM referrals
         WHERE referred_athlete_id = ? AND status = 'pending'
         LIMIT 1`,
        [referredAthleteId]
      );

      if (!rows.length) {
        await conn.rollback();
        return null;
      }

      const referral = rows[0];

      await conn.query(
        `UPDATE referrals SET status = 'completed' WHERE id = ?`,
        [referral.id]
      );

      await conn.query(
        `UPDATE athletes
         SET referral_xp = referral_xp + ?,
             valuexp = valuexp + ?
         WHERE id = ?`,
        [referral.xp_awarded, referral.xp_awarded, referral.referrer_id]
      );

      await conn.commit();
      return { referrerId: referral.referrer_id, xp: referral.xp_awarded };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Link new athlete to referrer + increment counter
   */
  static async linkReferredAthlete(referrerId: string, newAthleteId: string): Promise<void> {
    await pool.query(
      'UPDATE athletes SET referred_by_id = ? WHERE id = ?',
      [referrerId, newAthleteId]
    );
    await pool.query(
      'UPDATE athletes SET total_referrals = total_referrals + 1 WHERE id = ?',
      [referrerId]
    );
  }
}