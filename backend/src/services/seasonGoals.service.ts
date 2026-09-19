// backend/src/services/seasonGoals.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

const CURRENT_SEASON = new Date().getFullYear();

export interface SeasonGoalDTO {
  id: string;
  athleteId: string;
  templateId: string | null;
  sport: string;
  title: string;
  description: string | null;
  unit: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  seasonYear: number;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): SeasonGoalDTO {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    templateId: row.template_id,
    sport: row.sport,
    title: row.title,
    description: row.description,
    unit: row.unit,
    targetCount: Number(row.target_count),
    currentCount: Number(row.current_count),
    rewardXp: Number(row.reward_xp),
    isCompleted: row.is_completed === 1,
    isClaimed: row.is_claimed === 1,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    claimedAt: row.claimed_at ? String(row.claimed_at) : null,
    seasonYear: Number(row.season_year),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SeasonGoalsService {
  /**
   * GET — Load user's season goals.
   * On first call, seed from templates for the user.
   */
  static async getUserSeasonGoals(athleteId: string, sport?: string): Promise<SeasonGoalDTO[]> {
    // 1. Check if user has any goals for this season
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_season_goals
       WHERE athlete_id = ? AND season_year = ?
       ORDER BY created_at DESC`,
      [athleteId, CURRENT_SEASON]
    );

    // 2. If none, seed from templates
    if (existing.length === 0) {
      await this.seedFromTemplates(athleteId, sport);
    } else if (sport) {
      // If user has goals but not for this sport, add them
      const hasSport = existing.some((r) => r.sport === sport);
      if (!hasSport) {
        await this.seedFromTemplates(athleteId, sport);
      }
    }

    // 3. Fetch final list
    let query = `SELECT * FROM user_season_goals
                 WHERE athlete_id = ? AND season_year = ?`;
    const params: any[] = [athleteId, CURRENT_SEASON];

    if (sport) {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    query += ` ORDER BY is_claimed ASC, is_completed DESC, created_at DESC`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map(mapRow);
  }

  /**
   * Seed user's season goals from active templates.
   */
  private static async seedFromTemplates(athleteId: string, sport?: string): Promise<void> {
    // Get athlete's level
    const [athleteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT level FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const level = Number(athleteRows[0]?.level) || 1;

    // Get matching templates
    let query = `SELECT * FROM season_goal_templates
                 WHERE is_active = 1
                   AND target_level_min <= ?
                   AND target_level_max >= ?`;
    const params: any[] = [level, level];

    if (sport) {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    const [templates] = await pool.execute<RowDataPacket[]>(query, params);

    // Insert user_season_goals rows
    for (const tpl of templates) {
      try {
        await pool.execute<ResultSetHeader>(
          `INSERT INTO user_season_goals
             (id, athlete_id, template_id, sport, title, description, unit,
              target_count, current_count, reward_xp, is_completed, is_claimed, season_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?)`,
          [
            `usg_${crypto.randomUUID()}`,
            athleteId,
            tpl.id,
            tpl.sport,
            tpl.title,
            tpl.description,
            tpl.unit,
            tpl.target_count,
            tpl.reward_xp,
            CURRENT_SEASON,
          ]
        );
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_ENTRY') {
          console.error('Seed template failed:', tpl.id, err);
        }
      }
    }
  }

  /**
   * CREATE — User's custom season goal.
   */
  static async createCustomSeasonGoal(input: {
    athleteId: string;
    sport: string;
    title: string;
    description?: string;
    unit: string;
    targetCount: number;
    rewardXp: number;
  }): Promise<SeasonGoalDTO> {
    const id = `usg_${crypto.randomUUID()}`;

    await pool.execute<ResultSetHeader>(
      `INSERT INTO user_season_goals
         (id, athlete_id, template_id, sport, title, description, unit,
          target_count, current_count, reward_xp, is_completed, is_claimed, season_year)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?)`,
      [
        id,
        input.athleteId,
        input.sport,
        input.title,
        input.description || null,
        input.unit,
        input.targetCount,
        input.rewardXp,
        CURRENT_SEASON,
      ]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_season_goals WHERE id = ?`,
      [id]
    );
    return mapRow(rows[0]);
  }

  /**
   * UPDATE PROGRESS.
   */
  static async updateProgress(
    athleteId: string,
    goalId: string,
    increment = 1
  ): Promise<SeasonGoalDTO | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_season_goals WHERE id = ? AND athlete_id = ?`,
      [goalId, athleteId]
    );
    if (rows.length === 0) return null;

    const goal = rows[0];
    if (goal.is_claimed === 1) return mapRow(goal);

    const newCurrent = Math.min(Number(goal.target_count), Number(goal.current_count) + increment);
    const isCompleted = newCurrent >= Number(goal.target_count);

    await pool.execute(
      `UPDATE user_season_goals
       SET current_count = ?, is_completed = ?, completed_at = ?
       WHERE id = ?`,
      [newCurrent, isCompleted ? 1 : 0, isCompleted ? new Date() : null, goalId]
    );

    const [updated] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM user_season_goals WHERE id = ?`,
      [goalId]
    );
    return mapRow(updated[0]);
  }

  /**
   * CLAIM REWARD.
   */
  static async claimReward(athleteId: string, goalId: string): Promise<{
    success: boolean;
    xpEarned: number;
    newXp: number;
    alreadyClaimed: boolean;
  }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM user_season_goals
         WHERE id = ? AND athlete_id = ? FOR UPDATE`,
        [goalId, athleteId]
      );
      if (rows.length === 0) throw new Error('Season goal not found');

      const goal = rows[0];
      if (goal.is_claimed === 1) throw new Error('Already claimed');
      if (goal.is_completed !== 1) throw new Error('Goal not completed yet');

      const xp = Number(goal.reward_xp);

      // Award XP
      await conn.execute(
        `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
        [xp, athleteId]
      );

      // Log xp_history
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'season_goal', ?)`,
        [athleteId, xp, goalId]
      );

      // Mark claimed
      await conn.execute(
        `UPDATE user_season_goals SET is_claimed = 1, claimed_at = NOW() WHERE id = ?`,
        [goalId]
      );

      // Notification
      const notifId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await conn.execute(
        `INSERT INTO notifications
          (id, user_id, type, title, message, sender_id, reference_id, action_url, status, is_read)
         VALUES (?, ?, 'achievement', ?, ?, NULL, ?, ?, 'info', 0)`,
        [
          notifId,
          athleteId,
          `🏆 Season Goal Completed: ${goal.title}`,
          `You earned +${xp} XP for "${goal.title}"!`,
          goalId,
          `/dashboard`,
        ]
      );

      const [athleteRows] = await conn.execute<RowDataPacket[]>(
        `SELECT valuexp FROM athletes WHERE id = ?`,
        [athleteId]
      );
      const newXp = Number(athleteRows[0]?.valuexp) || 0;

      await conn.commit();
      return { success: true, xpEarned: xp, newXp, alreadyClaimed: false };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * DELETE — only custom (template_id NULL).
   */
  static async deleteGoal(athleteId: string, goalId: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM user_season_goals
       WHERE id = ? AND athlete_id = ? AND template_id IS NULL`,
      [goalId, athleteId]
    );
    return result.affectedRows > 0;
  }
}