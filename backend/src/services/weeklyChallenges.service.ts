// backend/src/services/weeklyChallenges.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/* ═══════════════════════════════════════════
   HELPER: Current week (Mon-Sun)
   ═══════════════════════════════════════════ */
async function getCurrentWeek(): Promise<{ start: string; end: string }> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), '%Y-%m-%d') AS week_start,
       DATE_FORMAT(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), '%Y-%m-%d') AS week_end`
  );
  return {
    start: String(rows[0].week_start).split('T')[0],
    end: String(rows[0].week_end).split('T')[0],
  };
}

export interface WeeklyChallengeDTO {
  id: string;
  userChallengeId: number;
  title: string;
  description: string;
  type: 'weekly';
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

export class WeeklyChallengesService {
  /* GET or CREATE user's weekly challenges */
  static async getUserWeeklyChallenges(
    athleteId: string
  ): Promise<WeeklyChallengeDTO[]> {
    const week = await getCurrentWeek();

    const [templates] = await pool.execute<RowDataPacket[]>(
      `SELECT id, title, description, sport, xp_reward, target_count, icon
       FROM challenges
       WHERE type = 'weekly' AND is_active = 1
       ORDER BY xp_reward ASC`
    );

    if (templates.length === 0) return [];

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_challenges
       WHERE athlete_id = ?
         AND period_start = ?
         AND period_end = ?`,
      [athleteId, week.start, week.end]
    );

    const existingMap = new Map<string, any>();
    existing.forEach((uc: any) => existingMap.set(uc.challenge_id, uc));

    const results: WeeklyChallengeDTO[] = [];

    for (const tpl of templates) {
      let uc = existingMap.get(tpl.id);

      if (!uc) {
        const [insertResult] = await pool.execute<ResultSetHeader>(
          `INSERT INTO user_challenges
             (athlete_id, challenge_id, progress, target, is_completed, period_start, period_end)
           VALUES (?, ?, 0, ?, 0, ?, ?)`,
          [athleteId, tpl.id, tpl.target_count, week.start, week.end]
        );
        uc = {
          id: insertResult.insertId,
          challenge_id: tpl.id,
          progress: 0,
          target: tpl.target_count,
          is_completed: 0,
          completed_at: null,
          xp_earned: 0,
          period_start: week.start,
          period_end: week.end,
        };
      }

      results.push({
        id: tpl.id,
        userChallengeId: uc.id,
        title: tpl.title,
        description: tpl.description || '',
        type: 'weekly',
        sport: tpl.sport,
        xpReward: Number(tpl.xp_reward),
        targetCount: Number(tpl.target_count),
        icon: tpl.icon || 'trophy',
        progress: Number(uc.progress) || 0,
        isCompleted: uc.is_completed === 1,
        claimedAt: uc.completed_at ? String(uc.completed_at) : null,
        xpEarned: Number(uc.xp_earned) || 0,
        periodStart: String(uc.period_start).split('T')[0],
        periodEnd: String(uc.period_end).split('T')[0],
      });
    }

    console.log(
      `📊 [WeeklyChallenges] ${athleteId}: ${results.length} challenges for week ${week.start}–${week.end}`
    );

    return results;
  }

  /* UPDATE PROGRESS */
  static async updateProgress(
    athleteId: string,
    challengeId: string,
    increment: number = 1
  ): Promise<WeeklyChallengeDTO | null> {
    const week = await getCurrentWeek();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_challenges
       WHERE athlete_id = ?
         AND challenge_id = ?
         AND period_start = ?
         AND period_end = ?`,
      [athleteId, challengeId, week.start, week.end]
    );

    if (rows.length === 0) return null;

    const uc = rows[0];
    if (uc.is_completed === 1) {
      const list = await this.getUserWeeklyChallenges(athleteId);
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
      [
        newProgress,
        isCompleted ? 1 : 0,
        isCompleted ? new Date() : null,
        uc.id,
      ]
    );

    const list = await this.getUserWeeklyChallenges(athleteId);
    return list.find((c) => c.id === challengeId) || null;
  }

  static async claimReward(
  athleteId: string,
  challengeId: string
): Promise<{
  success: boolean;
  xpEarned: number;
  newXp: number;
  alreadyClaimed: boolean;
}> {
  const week = await getCurrentWeek();

  // ═══════════════════════════════════════════
  // 1. Fetch user_challenge + challenge details
  // ═══════════════════════════════════════════
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT uc.*, c.xp_reward, c.title, c.description, c.icon
     FROM user_challenges uc
     JOIN challenges c 
       ON c.id COLLATE utf8mb4_unicode_ci = uc.challenge_id COLLATE utf8mb4_unicode_ci
     WHERE uc.athlete_id = ?
       AND uc.challenge_id = ?
       AND uc.period_start = ?
       AND uc.period_end = ?`,
    [athleteId, challengeId, week.start, week.end]
  );

  if (rows.length === 0) throw new Error('Challenge not found');

  const uc = rows[0];

  // Already claimed?
  if (uc.xp_earned > 0) {
    return { success: true, xpEarned: 0, newXp: 0, alreadyClaimed: true };
  }

  // Not completed yet?
  if (uc.is_completed !== 1) {
    throw new Error('Challenge not completed yet');
  }

  const xpAmount = Number(uc.xp_reward);
  const challengeTitle = uc.title || 'Weekly Challenge';

  // ═══════════════════════════════════════════
  // 2. Award XP to athlete
  // ═══════════════════════════════════════════
  await pool.execute(
    `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
    [xpAmount, athleteId]
  );

  // ═══════════════════════════════════════════
  // 3. Log XP in xp_history
  // ═══════════════════════════════════════════
  await pool.execute(
    `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
     VALUES (?, ?, 'weekly_challenge', ?)`,
    [athleteId, xpAmount, challengeId]
  );

  // ═══════════════════════════════════════════
  // 4. Mark user_challenge as claimed
  // ═══════════════════════════════════════════
  await pool.execute(
    `UPDATE user_challenges SET xp_earned = ? WHERE id = ?`,
    [xpAmount, uc.id]
  );

  // ═══════════════════════════════════════════
  // 5. ✅ INSERT NOTIFICATION
  // ═══════════════════════════════════════════
  let notificationId: string | null = null;
  try {
    notificationId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    await pool.execute(
      `INSERT INTO notifications 
        (id, user_id, type, title, message, sender_id, reference_id, action_url, status, is_read)
       VALUES (?, ?, 'achievement', ?, ?, NULL, ?, ?, 'info', 0)`,
      [
        notificationId,
        athleteId,
        `🎉 Challenge Claimed: ${challengeTitle}`,
        `You earned +${xpAmount} XP for completing "${challengeTitle}"! Keep up the great work 💪`,
        challengeId,
        `/achievements?challenge=${challengeId}`,
      ]
    );

    console.log(
      `🔔 [WeeklyChallenges] Notification created: ${notificationId}`
    );
  } catch (notifErr) {
    // ⚠️ Don't fail the claim if notification insert fails
    console.error(
      '❌ Notification insert failed (non-critical):',
      notifErr
    );
  }

  // ═══════════════════════════════════════════
  // 6. Fetch fresh athlete XP AFTER update
  // ═══════════════════════════════════════════
  const [athleteRows] = await pool.execute<RowDataPacket[]>(
    `SELECT valuexp FROM athletes WHERE id = ?`,
    [athleteId]
  );

  const newXp = Number(athleteRows[0]?.valuexp) || 0;

  console.log(
    `🎉 [WeeklyChallenges] ${challengeId} claimed → +${xpAmount} XP (total: ${newXp})`
  );

  return {
    success: true,
    xpEarned: xpAmount,
    newXp,
    alreadyClaimed: false,
  };
}

  /* AUTO-SYNC from game_performance_logs */
  static async syncProgressFromStats(athleteId: string): Promise<void> {
    const week = await getCurrentWeek();

    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_games,
         COALESCE(SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END), 0) AS total_wins,
         COALESCE(SUM(points), 0) AS total_points,
         COALESCE(SUM(assists), 0) AS total_assists,
         COALESCE(SUM(rebounds), 0) AS total_rebounds,
         COALESCE(SUM(three_pt_made), 0) AS total_3pt,
         COALESCE(SUM(spike_kills), 0) AS total_kills
       FROM game_performance_logs
       WHERE created_by_id = ?
         AND DATE(created_at) BETWEEN ? AND ?`,
      [athleteId, week.start, week.end]
    );

    const s = stats[0] || {};
    const statMap = {
      games: Number(s.total_games) || 0,
      wins: Number(s.total_wins) || 0,
      pts: Number(s.total_points) || 0,
      ast: Number(s.total_assists) || 0,
      reb: Number(s.total_rebounds) || 0,
      '3pt': Number(s.total_3pt) || 0,
      kills: Number(s.total_kills) || 0,
    };

    const [userChallenges] = await pool.execute<RowDataPacket[]>(
      `SELECT uc.id, uc.challenge_id, uc.target, uc.progress
       FROM user_challenges uc
       JOIN challenges c ON c.id = uc.challenge_id
       WHERE uc.athlete_id = ?
         AND uc.period_start = ?
         AND uc.period_end = ?
         AND c.type = 'weekly'
         AND uc.is_completed = 0`,
      [athleteId, week.start, week.end]
    );

    for (const uc of userChallenges) {
      const cid = String(uc.challenge_id).toLowerCase();
      let calculated = 0;

      if (cid.includes('100_shots')) calculated = statMap.pts;
      else if (cid.includes('3_wins')) calculated = statMap.wins;
      else if (cid.includes('5_games')) calculated = statMap.games;
      else if (cid.includes('500xp') || cid.includes('smartwarmup')) continue;
      else calculated = statMap.games;

      const newProgress = Math.min(Number(uc.target), calculated);
      const isCompleted = newProgress >= Number(uc.target);

      if (newProgress > Number(uc.progress)) {
        await pool.execute(
          `UPDATE user_challenges
           SET progress = ?, is_completed = ?, completed_at = ?
           WHERE id = ?`,
          [
            newProgress,
            isCompleted ? 1 : 0,
            isCompleted ? new Date() : null,
            uc.id,
          ]
        );
      }
    }
  }
}