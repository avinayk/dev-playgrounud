// src/services/streak.service.ts
import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getLevelInfo } from '../utils/leveling';

export interface StreakStatusDTO {
  dailyStreak: number;
  longestStreak: number;
  streakFreezeCount: number;
  lastCheckinDate: string | null;
  hasCheckedInToday: boolean;
  checkInHistory: string[];       // last 30 days YYYY-MM-DD
  freezeHistory: string[];        // dates where freeze was used
  todayXpReward: number;
}

export class StreakService {
  /* ═══════════════════════════════════════════
     Get full streak status for calendar UI
     ═══════════════════════════════════════════ */
  static async getStatus(athleteId: string): Promise<StreakStatusDTO> {
    const today = this.todayStr();
    const thirtyDaysAgo = this.daysAgoStr(29);

    // Athlete row
    const [athRows] = await pool.execute<any[]>(
      `SELECT daily_streak, longest_streak, last_checkin_date
       FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const athlete = athRows[0] || {};

    // Check-in history (last 30 days)
    const [checkinRows] = await pool.execute<any[]>(
      `SELECT checkin_date FROM athlete_checkins
       WHERE athlete_id = ? AND checkin_date >= ?
       ORDER BY checkin_date ASC`,
      [athleteId, thirtyDaysAgo]
    );
    const checkInHistory = checkinRows.map((r) =>
      this.formatDate(r.checkin_date)
    );

    // Freeze tokens
    const [freezeRows] = await pool.execute<any[]>(
      `SELECT id, used_on_date, status FROM athlete_streak_freezes
       WHERE athlete_id = ?`,
      [athleteId]
    );

    const streakFreezeCount = freezeRows.filter(
      (f) => f.status === 'available'
    ).length;

    const freezeHistory = freezeRows
      .filter((f) => f.status === 'used' && f.used_on_date)
      .map((f) => this.formatDate(f.used_on_date))
      .filter((d) => d >= thirtyDaysAgo);

    // Compute streak dynamically (source of truth)
    const dailyStreak = await this.computeCurrentStreak(athleteId);
    const longestStreak = Math.max(
      Number(athlete.longest_streak) || 0,
      dailyStreak
    );

    const hasCheckedInToday = checkInHistory.includes(today);

    return {
      dailyStreak,
      longestStreak,
      streakFreezeCount,
      lastCheckinDate: athlete.last_checkin_date
        ? this.formatDate(athlete.last_checkin_date)
        : null,
      hasCheckedInToday,
      checkInHistory,
      freezeHistory,
      todayXpReward: 100,
    };
  }

  /* ═══════════════════════════════════════════
     Perform today's check-in (+100 XP)
     ═══════════════════════════════════════════ */
  static async checkIn(athleteId: string): Promise<{
    success: boolean;
    message: string;
    xpAwarded: number;
    newXp: number;
    newLevel: number;
    newStreak: number;
    leveledUp: boolean;
    alreadyCheckedIn: boolean;
  }> {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      const today = this.todayStr();

      // 1. Duplicate check
      const [dupe] = await conn.execute<any[]>(
        `SELECT id FROM athlete_checkins
         WHERE athlete_id = ? AND checkin_date = ?`,
        [athleteId, today]
      );

      if (dupe.length > 0) {
        await conn.rollback();
        return {
          success: false,
          message: 'Already checked in today',
          xpAwarded: 0,
          newXp: 0,
          newLevel: 0,
          newStreak: 0,
          leveledUp: false,
          alreadyCheckedIn: true,
        };
      }

      // 2. Compute streak BEFORE insert (yesterday included?)
      const yesterday = this.daysAgoStr(1);
      const [yesterdayRows] = await conn.execute<any[]>(
        `SELECT id FROM athlete_checkins
         WHERE athlete_id = ? AND checkin_date = ?`,
        [athleteId, yesterday]
      );
      const hasYesterday = yesterdayRows.length > 0;

      // 3. Handle freeze if yesterday was missed
      let freezeConsumed = false;
      if (!hasYesterday) {
        // Check if there's an available freeze that can be applied to yesterday
        const [freezeRows] = await conn.execute<any[]>(
          `SELECT id FROM athlete_streak_freezes
           WHERE athlete_id = ? AND status = 'available'
           ORDER BY purchased_at ASC LIMIT 1`,
          [athleteId]
        );
        if (freezeRows.length > 0) {
          // Consume it for yesterday
          await conn.execute(
            `UPDATE athlete_streak_freezes
             SET status = 'used', used_on_date = ?
             WHERE id = ?`,
            [yesterday, freezeRows[0].id]
          );
          freezeConsumed = true;
        }
      }

      // 4. Compute streak (yesterday or freeze presence = continue)
      const prevStreak = await this.computeCurrentStreak(athleteId);
      const newStreak =
        hasYesterday || freezeConsumed ? prevStreak + 1 : 1;

      const XP_REWARD = 100;

      // 5. Get current XP & level
      const [rows] = await conn.execute<any[]>(
        `SELECT valuexp, level, longest_streak FROM athletes WHERE id = ? FOR UPDATE`,
        [athleteId]
      );
      if (!rows[0]) {
        await conn.rollback();
        throw new Error('Athlete not found');
      }

      const oldXp = Number(rows[0].valuexp) || 0;
      const oldLongest = Number(rows[0].longest_streak) || 0;
      const newXp = oldXp + XP_REWARD;

      const oldLevelInfo = getLevelInfo(oldXp);
      const newLevelInfo = getLevelInfo(newXp);
      const leveledUp = newLevelInfo.level > oldLevelInfo.level;

      // 6. Insert check-in
      await conn.execute(
        `INSERT INTO athlete_checkins
           (athlete_id, checkin_date, xp_awarded, streak_after)
         VALUES (?, ?, ?, ?)`,
        [athleteId, today, XP_REWARD, newStreak]
      );

      // 7. Update athlete (xp, level, streak, longest, last_checkin)
      await conn.execute(
        `UPDATE athletes SET
           valuexp = ?,
           level = ?,
           daily_streak = ?,
           longest_streak = ?,
           last_checkin_date = ?
         WHERE id = ?`,
        [
          newXp,
          newLevelInfo.level,
          newStreak,
          Math.max(oldLongest, newStreak),
          today,
          athleteId,
        ]
      );

      // 8. Insert xp_history
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'daily_checkin', ?)`,
        [athleteId, XP_REWARD, today]
      );

      // 9. Notification
      await conn.execute(
        `INSERT INTO notifications
           (id, user_id, type, title, message, status, is_read)
         VALUES (?, ?, 'achievement', ?, ?, 'info', 0)`,
        [
          randomUUID(),
          athleteId,
          '🔥 Daily Check-in Complete!',
          `You earned +${XP_REWARD} XP! Streak: ${newStreak} day${newStreak > 1 ? 's' : ''}.`,
        ]
      );

      await conn.commit();

      return {
        success: true,
        message: `Daily check-in complete! +${XP_REWARD} XP`,
        xpAwarded: XP_REWARD,
        newXp,
        newLevel: newLevelInfo.level,
        newStreak,
        leveledUp,
        alreadyCheckedIn: false,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /* ═══════════════════════════════════════════
     Purchase a Streak Freeze token (250 XP)
     ═══════════════════════════════════════════ */
  static async purchaseFreeze(
    athleteId: string,
    costXp: number = 250
  ): Promise<{
    success: boolean;
    message: string;
    newXp: number;
    freezeCount: number;
  }> {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute<any[]>(
        `SELECT valuexp FROM athletes WHERE id = ? FOR UPDATE`,
        [athleteId]
      );
      if (!rows[0]) {
        await conn.rollback();
        throw new Error('Athlete not found');
      }

      const oldXp = Number(rows[0].valuexp) || 0;
      if (oldXp < costXp) {
        await conn.rollback();
        throw new Error(`Not enough XP. Need ${costXp} XP, you have ${oldXp}.`);
      }

      const newXp = oldXp - costXp;

      await conn.execute(
        `UPDATE athletes SET valuexp = ? WHERE id = ?`,
        [newXp, athleteId]
      );

      await conn.execute(
        `INSERT INTO athlete_streak_freezes
           (athlete_id, cost_xp, status)
         VALUES (?, ?, 'available')`,
        [athleteId, costXp]
      );

      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'streak_freeze_purchase', NULL)`,
        [athleteId, -costXp]
      );

      const [countRows] = await conn.execute<any[]>(
        `SELECT COUNT(*) AS cnt FROM athlete_streak_freezes
         WHERE athlete_id = ? AND status = 'available'`,
        [athleteId]
      );

      await conn.commit();

      return {
        success: true,
        message: `Streak Freeze purchased for ${costXp} XP`,
        newXp,
        freezeCount: Number(countRows[0]?.cnt) || 0,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /* ═══════════════════════════════════════════
     Compute current streak dynamically
     ═══════════════════════════════════════════ */
  private static async computeCurrentStreak(
    athleteId: string
  ): Promise<number> {
    const [rows] = await pool.execute<any[]>(
      `SELECT checkin_date FROM athlete_checkins
       WHERE athlete_id = ?
       ORDER BY checkin_date DESC
       LIMIT 365`,
      [athleteId]
    );

    if (rows.length === 0) return 0;

    const dates = rows.map((r) => this.formatDate(r.checkin_date));
    const today = this.todayStr();

    // If last check-in isn't today or yesterday, streak is 0
    const lastDate = dates[0];
    const yest = this.daysAgoStr(1);
    if (lastDate !== today && lastDate !== yest) {
      // But check if a freeze was applied recently
      const [freezeRows] = await pool.execute<any[]>(
        `SELECT used_on_date FROM athlete_streak_freezes
         WHERE athlete_id = ? AND status = 'used'
         ORDER BY used_on_date DESC LIMIT 1`,
        [athleteId]
      );
      if (
        freezeRows.length === 0 ||
        this.formatDate(freezeRows[0].used_on_date) !== yest
      ) {
        return 0;
      }
    }

    // Walk backwards counting consecutive days (including freeze days)
    const [freezeAllRows] = await pool.execute<any[]>(
      `SELECT used_on_date FROM athlete_streak_freezes
       WHERE athlete_id = ? AND status = 'used'`,
      [athleteId]
    );
    const freezeDates = new Set(
      freezeAllRows.map((f) => this.formatDate(f.used_on_date))
    );

    const checkinSet = new Set(dates);
    let streak = 0;
    let cursor = lastDate === today ? today : yest;

    // Walk backwards from today
    for (let i = 0; i < 365; i++) {
      if (checkinSet.has(cursor) || freezeDates.has(cursor)) {
        streak++;
        cursor = this.subtractDays(cursor, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /* ═══════════════════════════════════════════
     Helpers
     ═══════════════════════════════════════════ */
  private static todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private static daysAgoStr(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private static subtractDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().split('T')[0];
  }

  private static formatDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    return new Date(value).toISOString().split('T')[0];
  }
}