// services/athlete.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getLevelTitle } from '../utils/leveling';
import { sendEmail } from './emailService';
// Define the Athlete interface matching your table structure
export interface Athlete {
  id: string;
  name: string;
  profilepicture: string | null;
  userhandle: string | null;
  leaguebracket: string | null;
  school: string | null;
  email: string;
  password: string | null;
  level: number | null;
  position: string | null;
  jersey: number | null;
  state: string | null;
  city: string | null;
  primary_sport: string | null;
  email_verified: number;
  is_verified: number;
  is_pro: number;
  is_verified_pro: number;
  subscription_tier: string | null;
  payment_receipt_id: string | null;
  payment_method: string | null;
  payment_date: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  role: string | null;
  referral_code: string | null;
  referred_by_id: string | null;
  total_referrals: number;
  referral_xp: number;
  valuexp: number | null;
  updated_at: Date;
  created_at: Date;
}
 

// DTO for creating a new athlete
export interface CreateAthleteDTO {
  name: string;
  handle: string;
  email: string;
  password: string; // ✅ Now required
  avatar?: string;
  role?: string;
  schoolOrLeague?: string;
  primarySport?: string;
  position?: string;
  jerseyNumber?: number;
  registeredState?: string;
  registeredCity?: string;
  emailVerified?: boolean;
  isVerified?: boolean;
  isPro?: boolean;
  isVerifiedPro?: boolean;
  subscriptionTier?: string;
  level?: number;
  isScout?: boolean;
  isVerifiedScout?: boolean;
  scoutPassActive?: boolean;
  scoutOrgName?: string | null;
  referredByCode?: string;   // ✅ Referral code from signup
}

// DTO for updating an athlete
export interface UpdateAthleteDTO {
  name?: string;
  handle?: string;
  email?: string;
  avatar?: string;
  role?: string;
  schoolOrLeague?: string;
  primarySport?: string;
  position?: string;
  jerseyNumber?: number;
  registeredState?: string;
  registeredCity?: string;
  emailVerified?: boolean;
  isVerified?: boolean;
  isPro?: boolean;
  isVerifiedPro?: boolean;
  subscriptionTier?: string;
  level?: number;
  isScout?: boolean;
  isVerifiedScout?: boolean;
  scoutPassActive?: boolean;
  scoutOrgName?: string | null;
  password?: string; 
  bio?: string;
}

export class AthleteService {
  
  // Get all athletes
  async getAllAthletes(): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes ORDER BY created_at DESC'
    );
    return rows as Athlete[];
  }

  // Get athlete by ID (using string ID as in your schema)
  async getAthleteById(id: string): Promise<any | null> {
  const query = `
    SELECT 
      a.*, 
      COUNT(r.id) AS sent_invites_count
    FROM athletes a
    LEFT JOIN referral_invites r 
      ON a.id COLLATE utf8mb4_general_ci = r.referrer_id COLLATE utf8mb4_general_ci
      AND r.status = 'sent'
    WHERE a.id = ?
    GROUP BY a.id
  `;

  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  return (rows[0] as any) || null;
}

  // Get athlete by email
  async getAthleteByEmail(email: string): Promise<Athlete | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE email = ?',
      [email.toLowerCase()]
    );
    return rows[0] as Athlete || null;
  }

  // Get athlete by handle
  async getAthleteByHandle(handle: string): Promise<Athlete | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE userhandle = ?',
      [handle]
    );
    return rows[0] as Athlete || null;
  }

  // Create athlete with secure password handling
   async createAthlete(athleteData: CreateAthleteDTO): Promise<Athlete> {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const {
        name,
        handle,
        email,
        password,
        avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        role = 'high_school',
        schoolOrLeague = '',
        primarySport = 'basketball',
        position = '',
        jerseyNumber = 7,
        registeredState = 'NY',
        registeredCity = 'New York',
        emailVerified = false,
        isVerified = false,
        isPro = false,
        isVerifiedPro = false,
        subscriptionTier = 'free',
        level = 1,
        referredByCode,
      } = athleteData;

      // ── Validation ─────────────────────────────────────────
      if (!password) throw new Error('Password is required for registration');
      if (password.length < 6) throw new Error('Password must be at least 6 characters long');

      // ── Ensure unique referral code (retry up to 5 times) ──
      let referralCode = '';
      for (let i = 0; i < 5; i++) {
        referralCode = this.generateReferralCode(name);
        const [dup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM athletes WHERE referral_code = ?',
          [referralCode]
        );
        if (dup.length === 0) break;
      }

      // ── Look up referrer ───────────────────────────────────
      let referrer: any = null;
      if (referredByCode && referredByCode.trim()) {
        const [refRows] = await conn.query<RowDataPacket[]>(
          `SELECT id, name, email, is_pro, subscription_tier,
                  valuexp, total_referrals, referral_xp
           FROM athletes
           WHERE referral_code = ?
           FOR UPDATE`,
          [referredByCode.trim().toUpperCase()]
        );
        if (refRows.length) referrer = refRows[0];
      }

      // Block self-referral by email
      if (referrer && referrer.email.toLowerCase() === email.toLowerCase()) {
        referrer = null;
      }

      // ── Insert new athlete ─────────────────────────────────
      const id = crypto.randomUUID();

      const insertSql = `INSERT INTO athletes (
        id, name, profilepicture, userhandle, leaguebracket, school,
        email, password, level, position, jersey, state, city,
        primary_sport, email_verified, is_verified, is_pro,
        is_verified_pro, subscription_tier, role,
        referral_code, referred_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await conn.query<ResultSetHeader>(insertSql, [
        id,
        name,
        avatar,
        handle,
        role,            // leaguebracket
        schoolOrLeague,  // school
        email.toLowerCase(),
        password,        // already hashed by controller
        level,
        position,
        jerseyNumber,
        registeredState,
        registeredCity,
        primarySport,
        emailVerified ? 1 : 0,
        isVerified ? 1 : 0,
        isPro ? 1 : 0,
        isVerifiedPro ? 1 : 0,
        subscriptionTier,
        role,
        referralCode,
        referrer ? referrer.id : null,
      ]);

      // ═══════════════════════════════════════════════════════
      // ✅ AWARD REFERRAL XP TO REFERRER
      // ═══════════════════════════════════════════════════════
      if (referrer) {
        const xpToAward = referrer.is_pro ? 250 : 150;

        // 1. Log referral row
        await conn.query(
          `INSERT INTO referrals
             (referrer_id, referred_athlete_id, status, xp_awarded, created_at)
           VALUES (?, ?, 'completed', ?, NOW())`,
          [referrer.id, id, xpToAward]
        );

        // 2. Recompute referrer's XP + level
        const oldXp = Number(referrer.valuexp) || 0;
        const newTotalXp = oldXp + xpToAward;
        const lvl = computeLevelInfo(newTotalXp);

        await conn.query(
          `UPDATE athletes SET
             total_referrals = total_referrals + 1,
             referral_xp = referral_xp + ?,
             valuexp = ?,
             level = ?,
             levelTitle = ?,
             xpInCurrentLevel = ?,
             xpRequiredForNextLevel = ?,
             isMaxLevel = ?
           WHERE id = ?`,
          [
            xpToAward,
            newTotalXp,
            lvl.level,
            lvl.levelTitle,
            String(lvl.xpInCurrentLevel),
            String(lvl.xpRequiredForNextLevel),
            lvl.isMaxLevel ? 1 : 0,
            referrer.id,
          ]
        );

        // 3. XP history log
        await conn.query(
          `INSERT INTO xp_history (athlete_id, amount, source, reference_id, created_at)
           VALUES (?, ?, 'referral', ?, NOW())`,
          [referrer.id, xpToAward, id]
        );

        // 4. Notification to referrer
        await conn.query(
          `INSERT INTO notifications
             (id, user_id, type, title, message, sender_id, reference_id, status, is_read, created_at)
           VALUES (UUID(), ?, 'achievement',
             '🎉 New Referral!',
             CONCAT(?, ' joined using your code. +', ?, ' XP earned!'),
             ?, ?, 'info', 0, NOW())`,
          [referrer.id, name, xpToAward, id, id]
        );

        console.log(`✅ Referral awarded: +${xpToAward} XP → ${referrer.name} (new total: ${newTotalXp})`);

        // ═══════════════════════════════════════════════════════
        // ✅ AWARD 150 XP TO CURRENT REGISTERED ATHLETE
        // ═══════════════════════════════════════════════════════

        const referredAthleteXp = 150;

        // Get current athlete XP
        const [currentAthleteRows] = await conn.query<RowDataPacket[]>(
          `SELECT valuexp FROM athletes WHERE id = ? FOR UPDATE`,
          [id]
        );

        const currentAthleteOldXp =
          Number(currentAthleteRows[0]?.valuexp) || 0;

        const currentAthleteNewXp =
          currentAthleteOldXp + referredAthleteXp;

        const currentAthleteLevel =
          computeLevelInfo(currentAthleteNewXp);

        // Update current athlete XP + level details
        await conn.query(
          `UPDATE athletes SET
             valuexp = ?,
             level = ?,
             levelTitle = ?,
             xpInCurrentLevel = ?,
             xpRequiredForNextLevel = ?,
             isMaxLevel = ?
           WHERE id = ?`,
          [
            currentAthleteNewXp,
            currentAthleteLevel.level,
            currentAthleteLevel.levelTitle,
            String(currentAthleteLevel.xpInCurrentLevel),
            String(currentAthleteLevel.xpRequiredForNextLevel),
            currentAthleteLevel.isMaxLevel ? 1 : 0,
            id,
          ]
        );

        // XP history for current registered athlete
        await conn.query(
          `INSERT INTO xp_history
             (athlete_id, amount, source, reference_id, created_at)
           VALUES (?, ?, 'referral', ?, NOW())`,
          [id, referredAthleteXp, referrer.id]
        );

        console.log(
          `✅ Referred athlete awarded: +${referredAthleteXp} XP → ${name} (new total: ${currentAthleteNewXp})`
        );
      }

      await conn.commit();

      // ── Return new athlete (no password) ───────────────────
      const newAthlete = await this.getAthleteById(id);
      if (!newAthlete) throw new Error('Failed to retrieve created athlete');

      const { password: _, ...athleteWithoutPassword } = newAthlete;
      return athleteWithoutPassword as Athlete;

    } catch (error) {
      await conn.rollback();
      console.error('❌ createAthlete error:', error);
      throw error;
    } finally {
      conn.release();
    }
  }
   async getReferralCode(athleteId: string): Promise<string | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT referral_code FROM athletes WHERE id  = ?',
      [athleteId]
    );
    return rows.length ? rows[0].referral_code : null;
  }


  async logReferralInvite(
  referrerId: string,
  invitedEmail: string,
  referralLink: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check karo ki user exist karta hai
    const referrer = await this.getAthleteById(referrerId);
    if (!referrer) {
      return { success: false, message: 'Referrer not found' };
    }

    // Check karo ki khud ko invite nahi kar raha
    if (referrer.email.toLowerCase() === invitedEmail.toLowerCase()) {
      return { success: false, message: 'Cannot invite yourself' };
    }

    // Duplicate check (same email, last 24 hours)
    const [dup] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM referral_invites 
       WHERE referrer_id = ? AND invited_email = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [referrerId, invitedEmail.toLowerCase()]
    );

    if (dup.length > 0) {
      return { success: false, message: 'Invite already sent in last 24 hours' };
    }

    await sendEmail({
  to: invitedEmail,
  subject: `${referrer.name} invited you to Playground League! 🏀`,
  template: 'referral-invite',
  data: {
    referrerName: referrer.name,
    referralLink: referralLink,
    year: new Date().getFullYear(),
  },
});

    // Log the invite
    await pool.query(
      `INSERT INTO referral_invites (referrer_id, invited_email, referral_link, status)
       VALUES (?, ?, ?, 'sent')`,
      [referrerId, invitedEmail.toLowerCase(), referralLink]
    );

    return { success: true, message: 'Invite logged successfully' };
  } catch (error) {
    console.error('❌ logReferralInvite error:', error);
    throw error;
  }
}

  private generateReferralCode(name: string): string {
  const prefix = (name || 'ATH').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `${prefix}${suffix}`;
}
  
   async getReferralStats(athleteId: string) {
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, referral_code, total_referrals, referral_xp, is_pro
       FROM athletes WHERE id = ?`,
      [athleteId]
    );
    if (!userRows.length) return null;
    const u = userRows[0];

    // Count 'completed' (joined) referrals from the referrals table
    const [joinedRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM referrals
       WHERE referrer_id = ? AND status = 'completed'`,
      [athleteId]
    );

    // NEW: Count total invites sent from the referral_invites table
    const [sentRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM referral_invites
       WHERE referrer_id = ?`,
      [athleteId]
    );

    return {
      referred_athlete_id: u.id,
      referralCode: u.referral_code,
      referralLink: `https://www.playgroundleague.pro/ref/${u.referral_code}`,
      sent: sentRows[0].cnt,
      joined: joinedRows[0].cnt,
      earned: u.referral_xp,
      isPro: !!u.is_pro,
      xpPerReferral: u.is_pro ? 250 : 150,
    };
}

  async getReferralHistory(athleteId: string) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         r.id,
         r.status,
         r.xp_awarded AS xp,
         r.created_at AS date,
         a.name,
         a.userhandle AS handle,
         a.primary_sport AS sport
       FROM referrals r
       JOIN athletes a ON a.id = r.referred_athlete_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [athleteId]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      handle: r.handle,
      sport: r.sport || 'basketball',
      xp: r.xp,
      date: new Date(r.date).toLocaleDateString(),
      status: r.status,
    }));
  }

  // Update athlete
  async updateAthlete(id: string, athleteData: UpdateAthleteDTO): Promise<Athlete | null> {
    const updates: string[] = [];
    const values: any[] = [];

    // Map DTO fields to database columns
    const fieldMap: { [key: string]: string } = {
      name: 'name',
      handle: 'userhandle',
      email: 'email',
      avatar: 'profilepicture',
      role: 'role',
      schoolOrLeague: 'school',
      primarySport: 'primary_sport',
      position: 'position',
      jerseyNumber: 'jersey',
      registeredState: 'state',
      registeredCity: 'city',
      emailVerified: 'email_verified',
      isVerified: 'is_verified',
      isPro: 'is_pro',
      isVerifiedPro: 'is_verified_pro',
      subscriptionTier: 'subscription_tier',
      level: 'level',
      password: 'password',
      bio: 'bio',
    };

    for (const [dtoKey, dbColumn] of Object.entries(fieldMap)) {
      if (athleteData[dtoKey as keyof UpdateAthleteDTO] !== undefined) {
        updates.push(`${dbColumn} = ?`);
        let value = athleteData[dtoKey as keyof UpdateAthleteDTO];
        
        // Handle boolean to tinyint conversion
        if (typeof value === 'boolean') {
          value = value ? 1 : 0;
        }
        // Handle email to lowercase
        if (dtoKey === 'email' && typeof value === 'string') {
          value = value.toLowerCase();
        }
        // ✅ Handle password hashing
        if (dtoKey === 'password' && typeof value === 'string') {
          value = await bcrypt.hash(value, 10);
        }
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    await pool.query(
      `UPDATE athletes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getAthleteById(id);
  }

  // Delete athlete
  async deleteAthlete(id: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM athletes WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

async listAthletes(req: Request, res: Response): Promise<void> {
        try {
            const excludeId = String(req.query.excludeId ?? '');
            const query = String(req.query.q ?? '').trim();
 
            if (!excludeId) {
            res.status(400).json({ success: false, message: 'excludeId required' });
            return;
            }
 
            const athletes = query
            ? await AthleteService.searchAthletes(excludeId, query)
            : await AthleteService.listAllExcept(excludeId);
 
            res.json({ success: true, data: athletes });
        } catch (err) {
            console.error('❌ listAthletes:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
 
// Search athletes by name, handle, or email
 async listAllExcept(excludeId: string): Promise<any[]> {
  const sql = `
    SELECT
      id,
      name,
      userhandle,
      profilepicture,
      email,
      position,
      primary_sport,
      school,
      level,
      state,
      city,
      is_pro,
      lat,
      lng
    FROM athletes
    ${excludeId ? 'WHERE id != ?' : ''}
    ORDER BY name ASC
    LIMIT 100
  `;
 
  const [rows] = await pool.execute<any[]>(
    sql,
    excludeId ? [excludeId] : []
  );
 
  // ✅ Shape into AthleteProfile matching frontend expectations
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.userhandle,
    avatar: r.profilepicture,
    email: r.email,
    position: r.position,
    primarySport: r.primary_sport || '',
    schoolOrLeague: r.school,
    level: Number(r.level) || 1,
    state: r.state,
    city: r.city,
    isPro: Boolean(r.is_pro),
    subscriptionTier: r.is_pro ? 'pro' : 'free',
    isVerifiedPro: Boolean(r.is_pro),
    location:
      r.lat !== null && r.lng !== null
        ? { lat: Number(r.lat), lng: Number(r.lng) }
        : undefined,
    // Optional defaults frontend may use
    levelTitle: getLevelTitle(Number(r.level) || 1),
    badges: [],
    winCount: 0,
    lossCount: 0,
    stats: {},
  }));
}

    async searchAthletes(
      excludeId: string,
      query: string
    ): Promise<any[]> {
      const like = `%${query}%`;
      const [rows] = await pool.execute(
        `SELECT
          id, name, userhandle, profilepicture, email,
          position, primary_sport, school, level, state, city
        FROM athletes
        WHERE id != ?
          AND (name LIKE ? OR userhandle LIKE ? OR primary_sport LIKE ? OR school LIKE ?)
        ORDER BY name ASC
        LIMIT 50`,
        [excludeId, like, like, like, like]
      );
      return rows;
    }
 

  // Get athletes by sport
  async getAthletesBySport(sport: string): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE primary_sport = ? ORDER BY name ASC',
      [sport]
    );
    return rows as Athlete[];
  }

  // Get athletes by role
  async getAthletesByRole(role: string): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE role = ? ORDER BY name ASC',
      [role]
    );
    return rows as Athlete[];
  }

  // Get athletes by state
  async getAthletesByState(state: string): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE state = ? ORDER BY name ASC',
      [state]
    );
    return rows as Athlete[];
  }

  // Get athletes by city
  async getAthletesByCity(city: string): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM athletes WHERE city = ? ORDER BY name ASC',
      [city]
    );
    return rows as Athlete[];
  }

  // Get verified athletes (scouts or pros)
  async getVerifiedAthletes(): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM athletes 
       WHERE is_verified = 1 
       ORDER BY name ASC`
    );
    return rows as Athlete[];
  }

  // Update athlete level based on XP (placeholder for future implementation)
  async updateAthleteLevel(id: string): Promise<Athlete | null> {
    // This would typically calculate level based on XP
    // For now, we'll just return the athlete
    return this.getAthleteById(id);
  }

  // Get athlete stats (total count, by sport, by role, etc.)
  async getAthleteStats(): Promise<any> {
    const [total] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM athletes'
    );
    
    const [bySport] = await pool.query<RowDataPacket[]>(
      'SELECT primary_sport, COUNT(*) as count FROM athletes GROUP BY primary_sport'
    );
    
    const [byRole] = await pool.query<RowDataPacket[]>(
      'SELECT role, COUNT(*) as count FROM athletes GROUP BY role'
    );

    const [verified] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as verified FROM athletes WHERE is_verified = 1'
    );

    return {
      total: total[0]?.total || 0,
      bySport,
      byRole,
      verified: verified[0]?.verified || 0
    };
  }


  async getScouts(): Promise<Athlete[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM athletes WHERE role = ? ORDER BY name ASC',
        ['scout_recruiter']
    );
    return rows as Athlete[];
}


  // ✅ Additional method for login validation
  async validateUserCredentials(email: string, password: string): Promise<Athlete | null> {
    try {
      const athlete = await this.getAthleteByEmail(email);
      
      if (!athlete || !athlete.password) {
        return null;
      }

      // Compare the provided password with the stored hash
      const isPasswordValid = await bcrypt.compare(password, athlete.password);
      
      if (!isPasswordValid) {
        return null;
      }

      // ✅ Return athlete without password
      const { password: _, ...athleteWithoutPassword } = athlete;
      return athleteWithoutPassword as Athlete;
    } catch (error) {
      console.error('❌ Error validating credentials:', error);
      return null;
    }
  }
  
// ── Get Match History with box scores + participants ──
async getMatchHistory(athleteId: string, sport?: string, days?: number): Promise<any[]> {
  try {
    // 1️⃣ Fetch all games this athlete participated in
    let sql = `
      SELECT
        gpl.id AS log_id,
        gpl.sport,
        gpl.outcome,
        gpl.created_at,
        gpl.points,
        gpl.assists,
        gpl.rebounds,
        gpl.steals,
        gpl.blocks,
        gpl.three_pt_made,
        gpl.base_hits,
        gpl.at_bats,
        gpl.home_runs,
        gpl.rbis,
        gpl.goals_scored,
        gpl.soccer_assists,
        gpl.spike_kills,
        gpl.ground_digs,
        gpl.service_aces,
        gpl.net_blocks,
        gpl.setting_assists,
        gpl.passing_yards,
        gpl.touchdowns,
        pg.id AS game_id,
        pg.title AS opponent,
        pg.location,
        pg.date AS game_date,
        pg.lat,
        pg.lng,
        pg.city,
        pg.state
      FROM game_performance_logs gpl
      LEFT JOIN pickup_games pg ON pg.id = gpl.game_id
      WHERE gpl.created_by_id = ?
    `;
    const params: any[] = [athleteId];

    if (sport && sport !== 'all') {
      sql += ` AND gpl.sport = ?`;
      params.push(sport);
    }

    if (days && days > 0) {
      sql += ` AND COALESCE(pg.date, DATE(gpl.created_at)) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;
      params.push(days);
    }

    sql += ` ORDER BY COALESCE(pg.date, DATE(gpl.created_at)) DESC LIMIT 100`;

    const [logs] = await pool.query<RowDataPacket[]>(sql, params);

    if (logs.length === 0) return [];

    // 2️⃣ Fetch participants for all those games in one query
    const gameIds = [...new Set(logs.map((l: any) => l.game_id).filter(Boolean))];
    let participantsByGame: Record<string, any[]> = {};

    if (gameIds.length > 0) {
      const [pRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           gp.game_id,
           gp.athlete_id,
           a.name,
           a.profilepicture AS avatar,
           a.position,
           a.jersey
         FROM game_participants gp
         JOIN athletes a ON a.id = gp.athlete_id
         WHERE gp.game_id IN (?)`,
        [gameIds]
      );

      pRows.forEach((p: any) => {
        if (!participantsByGame[p.game_id]) participantsByGame[p.game_id] = [];
        participantsByGame[p.game_id].push({
          id: p.athlete_id,
          name: p.name,
          avatar: p.avatar,
          position: p.position,
          jersey: p.jersey,
        });
      });
    }

    // 3️⃣ Shape into frontend-friendly format
    return logs.map((r: any) => {
      const isVolleyball = r.sport === 'volleyball';
      return {
        id: String(r.log_id),
        gameId: r.game_id,
        sport: r.sport,
        date: r.game_date
          ? new Date(r.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: r.game_date || r.created_at,
        opponent: r.opponent || 'Pickup Game',
        location: r.location || 'Local Court',
        isWin: r.outcome === 'win',
        result: r.outcome === 'win' ? 'W' : 'L',

        // Basketball
        pts: Number(r.points || 0),
        reb: Number(r.rebounds || 0),
        ast: Number(r.assists || 0),
        stl: Number(r.steals || 0),
        blk: Number(r.blocks || 0),
        threePM: Number(r.three_pt_made || 0),
        fgPct: '—',

        // Volleyball
        kills: Number(r.spike_kills || 0),
        digs: Number(r.ground_digs || 0),
        aces: Number(r.service_aces || 0),
        blocks: Number(r.net_blocks || 0),
        assists: Number(r.setting_assists || 0),
        hitPct: '—',

        // Baseball/Softball
        baseHits: Number(r.base_hits || 0),
        atBats: Number(r.at_bats || 0),
        homeRuns: Number(r.home_runs || 0),
        rbis: Number(r.rbis || 0),

        // Soccer
        goalsScored: Number(r.goals_scored || 0),
        soccerAssists: Number(r.soccer_assists || 0),

        // Football
        passingYards: Number(r.passing_yards || 0),
        touchdowns: Number(r.touchdowns || 0),

        // Location
        latitude: r.lat,
        longitude: r.lng,
        geolocation: r.lat ? {
          latitude: Number(r.lat),
          longitude: Number(r.lng),
          locationName: r.location,
          city: r.city,
          state: r.state,
        } : null,

        // Participants
        participants: participantsByGame[r.game_id] || [],
      };
    });
  } catch (err) {
    console.error('❌ getMatchHistory error:', err);
    return [];
  }
}
}
 
export function computeLevelInfo(totalXp: number) {
  const xp = Math.max(0, totalXp || 0);

  const MAX_LEVEL = 50;
  const BASE_LEVEL_XP = 500;
  const LEVEL_XP_INCREMENT = 5000;

  // Gap(k) = 500 + (k-1) * 5000  →  cumulative min per level
  const cumulative = (level: number): number => {
    if (level <= 1) return 0;
    const capped = Math.min(level, MAX_LEVEL);
    let total = 0;
    for (let l = 1; l < capped; l++) {
      total += BASE_LEVEL_XP + (l - 1) * LEVEL_XP_INCREMENT;
    }
    return total;
  };

  // Same ladder as getLevelTitle
  const getLevelTitle = (level: number): string => {
    if (level >= 50) return 'Immortal GOAT 🐐';
    if (level >= 45) return 'Hall of Famer 🏆';
    if (level >= 40) return 'Grandmaster Athlete ⚡';
    if (level >= 35) return 'Playground Legend 👑';
    if (level >= 30) return 'League MVP 🥇';
    if (level >= 25) return 'Franchise Icon 🌟';
    if (level >= 20) return 'League All-Star 🔥';
    if (level >= 15) return 'Court General 🎯';
    if (level >= 10) return 'Playground Starter 🏀';
    if (level >= 5) return 'Rising Star ⭐';
    return 'Rookie Prospect 🧢';
  };

  // Walk levels until we exceed xp
  let level = 1;
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (xp >= cumulative(l)) level = l;
    else break;
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const min = cumulative(level);
  const next = isMaxLevel ? Infinity : cumulative(level + 1);

  return {
    level,
    levelTitle: getLevelTitle(level),
    xpInCurrentLevel: xp - min,
    xpRequiredForNextLevel: isMaxLevel ? 0 : next - min,
    isMaxLevel,
  };
}

// Export singleton instance
export const athleteService = new AthleteService();