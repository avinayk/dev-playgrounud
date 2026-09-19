// backend/src/services/dailyChallenges.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const GOLD_CHEST_ID = 'ch_daily_gold_chest';
const DAILY_CHALLENGE_COUNT = 3; // pick 3 random per day
const GOLD_CHEST_XP = 300;

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getToday(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT CURDATE() AS today`
  );
  const raw = rows[0]?.today;
  if (raw instanceof Date) return toYMD(raw);
  return String(raw).split('T')[0];
}

async function getTomorrow(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE_ADD(CURDATE(), INTERVAL 1 DAY) AS tomorrow`
  );
  const raw = rows[0]?.tomorrow;
  if (raw instanceof Date) return toYMD(raw);
  return String(raw).split('T')[0];
}

export interface DailyChallengeDTO {
  id: string;
  userChallengeId: number;
  title: string;
  description: string;
  type: 'daily';
  sport: string;
  xpReward: number;
  targetCount: number;
  icon: string;
  progress: number;
  isCompleted: boolean;
  claimedAt: string | null;
  xpEarned: number;
  periodStart: string;
  periodEnd: string;
}

export class DailyChallengesService {
  /* ═══════════════════════════════════════════
     GET OR CREATE user's daily challenges
     - First call: picks 3 random from pool, inserts them
     - Subsequent calls: returns today's rows
     ═══════════════════════════════════════════ */
  static async getUserDailyChallenges(
    athleteId: string
  ): Promise<DailyChallengeDTO[]> {
    const today = await getToday();
    const tomorrow = await getTomorrow();

    // 1. Look for today's existing rows
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT uc.*, c.title, c.description, c.sport, c.xp_reward, c.target_count, c.icon
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.period_start = ?
         AND c.type = 'daily'
         AND uc.challenge_id <> ?
       ORDER BY uc.id ASC`,
      [athleteId, today, GOLD_CHEST_ID]
    );

    // 2. If we already have 3 (or more), map & return
    if (existing.length >= DAILY_CHALLENGE_COUNT) {
      return existing.map((uc) => this.mapRow(uc));
    }

    // 3. Otherwise, pick N random templates from pool
    const [templates] = await pool.execute<RowDataPacket[]>(
      `SELECT id, title, description, sport, xp_reward, target_count, icon
       FROM challenges
       WHERE type = 'daily' AND is_active = 1
         AND id <> ?
       ORDER BY RAND()
       LIMIT ?`,
      [GOLD_CHEST_ID, DAILY_CHALLENGE_COUNT]
    );

    if (templates.length === 0) {
      console.log('⚠️ No daily challenge templates found');
      return [];
    }

    // 4. Insert only the missing ones
    const existingIds = new Set(existing.map((e: any) => e.challenge_id));
    const toInsert = templates.filter((t: any) => !existingIds.has(t.id));

    for (const tpl of toInsert) {
      try {
        await pool.execute<ResultSetHeader>(
          `INSERT INTO user_challenges
             (athlete_id, challenge_id, progress, target, is_completed, period_start, period_end)
           VALUES (?, ?, 0, ?, 0, ?, ?)`,
          [athleteId, tpl.id, tpl.target_count, today, tomorrow]
        );
      } catch (err: any) {
        // Ignore duplicate key errors (from unique index)
        if (err?.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    // 5. Re-fetch final list
    const [finalRows] = await pool.execute<RowDataPacket[]>(
      `SELECT uc.*, c.title, c.description, c.sport, c.xp_reward, c.target_count, c.icon
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.period_start = ?
         AND c.type = 'daily'
         AND uc.challenge_id <> ?
       ORDER BY uc.id ASC`,
      [athleteId, today, GOLD_CHEST_ID]
    );

    console.log(
      `📊 [DailyChallenges] ${athleteId}: ${finalRows.length} challenges for ${today}`
    );

    return finalRows.map((uc) => this.mapRow(uc));
  }

  /* ═══════════════════════════════════════════
     REROLL — delete unclaimed today's daily rows, then regenerate
     ═══════════════════════════════════════════ */
  static async rerollDailyChallenges(
    athleteId: string
  ): Promise<DailyChallengeDTO[]> {
    const today = await getToday();

    // Only delete rows that haven't been claimed yet
    await pool.execute(
      `DELETE uc FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.period_start = ?
         AND c.type = 'daily'
         AND uc.challenge_id <> ?
         AND uc.xp_earned = 0
         AND uc.is_completed = 0`,
      [athleteId, today, GOLD_CHEST_ID]
    );

    console.log(`🔄 [DailyChallenges] Rerolled for ${athleteId}`);
    return this.getUserDailyChallenges(athleteId);
  }

  /* ═══════════════════════════════════════════
     UPDATE PROGRESS
     ═══════════════════════════════════════════ */
  static async updateProgress(
    athleteId: string,
    challengeId: string,
    increment: number = 1
  ): Promise<DailyChallengeDTO | null> {
    const today = await getToday();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_challenges
       WHERE athlete_id = ?
         AND challenge_id = ?
         AND period_start = ?`,
      [athleteId, challengeId, today]
    );

    if (rows.length === 0) return null;

    const uc = rows[0];

    if (uc.is_completed === 1 || uc.xp_earned > 0) {
      const list = await this.getUserDailyChallenges(athleteId);
      return list.find((c) => c.id === challengeId) || null;
    }

    const newProgress = Math.min(
      Number(uc.target),
      Number(uc.progress) + increment
    );
    const isCompleted = newProgress >= Number(uc.target);

    await pool.execute(
      `UPDATE user_challenges
       SET progress = ?, is_completed = ?, completed_at = ?
       WHERE id = ?`,
      [newProgress, isCompleted ? 1 : 0, isCompleted ? new Date() : null, uc.id]
    );

    const list = await this.getUserDailyChallenges(athleteId);
    return list.find((c) => c.id === challengeId) || null;
  }

  /* ═══════════════════════════════════════════
     CLAIM REWARD + NOTIFICATION
     ═══════════════════════════════════════════ */
  static async claimReward(
    athleteId: string,
    challengeId: string
  ): Promise<{
    success: boolean;
    xpEarned: number;
    newXp: number;
    alreadyClaimed: boolean;
    notificationId: string | null;
  }> {
    const today = await getToday();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT uc.*, c.xp_reward, c.title, c.description
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.challenge_id = ?
         AND uc.period_start = ?`,
      [athleteId, challengeId, today]
    );

    if (rows.length === 0) throw new Error('Challenge not found for today');

    const uc = rows[0];

    // Already claimed?
    if (Number(uc.xp_earned) > 0) {
      const [athleteRows] = await pool.execute<RowDataPacket[]>(
        `SELECT valuexp FROM athletes WHERE id = ?`,
        [athleteId]
      );
      return {
        success: true,
        xpEarned: 0,
        newXp: Number(athleteRows[0]?.valuexp) || 0,
        alreadyClaimed: true,
        notificationId: null,
      };
    }

    if (uc.is_completed !== 1) {
      throw new Error('Challenge not completed yet');
    }

    const xpAmount = Number(uc.xp_reward);
    const challengeTitle = uc.title || 'Daily Challenge';

    // 1. Award XP
    await pool.execute(
      `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
      [xpAmount, athleteId]
    );

    // 2. Log xp_history
    await pool.execute(
      `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
       VALUES (?, ?, 'daily_challenge', ?)`,
      [athleteId, xpAmount, challengeId]
    );

    // 3. Mark claimed
    await pool.execute(
      `UPDATE user_challenges SET xp_earned = ? WHERE id = ?`,
      [xpAmount, uc.id]
    );

    // 4. Notification
    const notificationId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    try {
      await pool.execute(
        `INSERT INTO notifications
           (id, user_id, type, title, message, sender_id, reference_id, action_url, status, is_read, created_at)
         VALUES (?, ?, 'achievement', ?, ?, NULL, ?, ?, 'info', 0, NOW())`,
        [
          notificationId,
          athleteId,
          `✅ Daily Quest Claimed: ${challengeTitle}`,
          `You earned +${xpAmount} XP for completing "${challengeTitle}"! Great work today 💪`,
          challengeId,
          `/dashboard?quest=${challengeId}`,
        ]
      );
      console.log(`🔔 Notification created: ${notificationId}`);
    } catch (notifErr) {
      console.error('❌ Notification insert failed:', notifErr);
    }

    // 5. Fresh XP
    const [athleteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT valuexp FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const newXp = Number(athleteRows[0]?.valuexp) || 0;

    console.log(`🎉 ${challengeId} claimed → +${xpAmount} XP (total: ${newXp})`);

    return {
      success: true,
      xpEarned: xpAmount,
      newXp,
      alreadyClaimed: false,
      notificationId,
    };
  }

  /* ═══════════════════════════════════════════
     CLAIM DAILY GOLD CHEST BONUS
     - Requires ALL daily challenges of today to be CLAIMED
     - Idempotent per day
     ═══════════════════════════════════════════ */
  static async claimDailyChest(
    athleteId: string
  ): Promise<{
    success: boolean;
    xpEarned: number;
    newXp: number;
    alreadyClaimed: boolean;
  }> {
    const today = await getToday();
    const chestSource = 'daily_gold_chest';

    // 1. Already claimed today?
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM xp_history
       WHERE athlete_id = ? AND source = ? AND reference_id = ?
       LIMIT 1`,
      [athleteId, chestSource, today]
    );

    if (existing.length > 0) {
      const [athleteRows] = await pool.execute<RowDataPacket[]>(
        `SELECT valuexp FROM athletes WHERE id = ?`,
        [athleteId]
      );
      return {
        success: true,
        xpEarned: 0,
        newXp: Number(athleteRows[0]?.valuexp) || 0,
        alreadyClaimed: true,
      };
    }

    // 2. Verify all 3 daily challenges are CLAIMED
    const [daily] = await pool.execute<RowDataPacket[]>(
      `SELECT uc.xp_earned
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.period_start = ?
         AND c.type = 'daily'
         AND uc.challenge_id <> ?`,
      [athleteId, today, GOLD_CHEST_ID]
    );

    if (daily.length === 0) {
      throw new Error('No daily challenges found for today');
    }

    const allClaimed = daily.every((r: any) => Number(r.xp_earned) > 0);
    if (!allClaimed) {
      throw new Error('Complete and claim all daily challenges first');
    }

    const xpAmount = GOLD_CHEST_XP;

    // 3. Award XP
    await pool.execute(
      `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
      [xpAmount, athleteId]
    );

    // 4. Log xp_history (idempotency marker)
    await pool.execute(
      `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
       VALUES (?, ?, ?, ?)`,
      [athleteId, xpAmount, chestSource, today]
    );

    // 5. Notification
    const notificationId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    try {
      await pool.execute(
        `INSERT INTO notifications
           (id, user_id, type, title, message, sender_id, reference_id, action_url, status, is_read, created_at)
         VALUES (?, ?, 'achievement', ?, ?, NULL, ?, ?, 'info', 0, NOW())`,
        [
          notificationId,
          athleteId,
          `🎁 Daily Gold Chest Unlocked!`,
          `You completed all 3 daily quests and earned +${xpAmount} XP bonus!`,
          today,
          `/dashboard`,
        ]
      );
      console.log(`🔔 Chest notification created: ${notificationId}`);
    } catch (e) {
      console.error('Notification insert failed:', e);
    }

    const [athleteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT valuexp FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const newXp = Number(athleteRows[0]?.valuexp) || 0;

    console.log(`🎁 Chest claimed → +${xpAmount} XP (total: ${newXp})`);

    return { success: true, xpEarned: xpAmount, newXp, alreadyClaimed: false };
  }

  /* ═══════════════════════════════════════════
     PRIVATE: map DB row → DTO
     ═══════════════════════════════════════════ */
  private static mapRow(uc: any): DailyChallengeDTO {
    return {
      id: uc.challenge_id,
      userChallengeId: uc.id,
      title: uc.title,
      description: uc.description || '',
      type: 'daily',
      sport: uc.sport || 'basketball',
      xpReward: Number(uc.xp_reward),
      targetCount: Number(uc.target_count),
      icon: uc.icon || 'target',
      progress: Number(uc.progress) || 0,
      isCompleted: uc.is_completed === 1,
      claimedAt: uc.completed_at ? String(uc.completed_at) : null,
      xpEarned: Number(uc.xp_earned) || 0,
      periodStart: String(uc.period_start).split('T')[0],
      periodEnd: String(uc.period_end).split('T')[0],
    };
  }
}