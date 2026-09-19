// backend/src/services/customGoals.service.ts
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export interface CustomGoalDTO {
  id: string;
  athleteId: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  type: 'daily' | 'weekly' | 'season';
  sport: string;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  athleteId: string;
  title: string;
  description?: string;
  target: number;
  unit?: string;
  rewardXp: number;
  type?: 'daily' | 'weekly' | 'season';
  sport?: string;
  targetDate?: string; // YYYY-MM-DD
}

function mapRow(row: any): CustomGoalDTO {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    title: row.title,
    description: row.description,
    target: Number(row.target),
    current: Number(row.current),
    unit: row.unit,
    rewardXp: Number(row.reward_xp),
    type: row.type,
    sport: row.sport,
    isCompleted: row.is_completed === 1,
    isClaimed: row.is_claimed === 1,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    claimedAt: row.claimed_at ? String(row.claimed_at) : null,
    targetDate: row.target_date ? String(row.target_date).split('T')[0] : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class CustomGoalsService {
  /* ─── CREATE ─── */
  static async createGoal(input: CreateGoalInput): Promise<CustomGoalDTO> {
    const id = `goal_${crypto.randomUUID()}`;
    const targetDate =
      input.targetDate || new Date().toISOString().split('T')[0];

    await pool.execute<ResultSetHeader>(
      `INSERT INTO athlete_custom_goals
        (id, athlete_id, title, description, target, current, unit,
         reward_xp, type, sport, is_completed, is_claimed, target_date)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, 0, ?)`,
      [
        id,
        input.athleteId,
        input.title,
        input.description || null,
        input.target,
        input.unit || 'target',
        input.rewardXp,
        input.type || 'daily',
        input.sport || 'basketball',
        targetDate,
      ]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM athlete_custom_goals WHERE id = ?`,
      [id]
    );
    return mapRow(rows[0]);
  }

  /* ─── LIST (today's daily + all active) ─── */
  static async getGoals(
    athleteId: string,
    type?: 'daily' | 'weekly' | 'season'
  ): Promise<CustomGoalDTO[]> {
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT * FROM athlete_custom_goals
      WHERE athlete_id = ?
    `;
    const params: any[] = [athleteId];

    if (type === 'daily') {
      query += ` AND target_date = ?`;
      params.push(today);
    } else if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map(mapRow);
  }

  /* ─── PROGRESS (+N) ─── */
  static async updateProgress(
    athleteId: string,
    goalId: string,
    increment = 1
  ): Promise<CustomGoalDTO | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM athlete_custom_goals WHERE id = ? AND athlete_id = ?`,
      [goalId, athleteId]
    );
    if (rows.length === 0) return null;

    const goal = rows[0];
    if (goal.is_completed === 1) return mapRow(goal);

    const newCurrent = Math.min(Number(goal.target), Number(goal.current) + increment);
    const isCompleted = newCurrent >= Number(goal.target);

    await pool.execute(
      `UPDATE athlete_custom_goals
       SET current = ?, is_completed = ?, completed_at = ?
       WHERE id = ?`,
      [newCurrent, isCompleted ? 1 : 0, isCompleted ? new Date() : null, goalId]
    );

    const [updated] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM athlete_custom_goals WHERE id = ?`,
      [goalId]
    );
    return mapRow(updated[0]);
  }

  /* ─── CLAIM REWARD ─── */
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
        `SELECT * FROM athlete_custom_goals
         WHERE id = ? AND athlete_id = ? FOR UPDATE`,
        [goalId, athleteId]
      );
      if (rows.length === 0) throw new Error('Goal not found');

      const goal = rows[0];
      if (goal.is_claimed === 1) {
        throw new Error('Already claimed');
      }
      if (goal.is_completed !== 1) {
        throw new Error('Goal not completed yet');
      }

      const xp = Number(goal.reward_xp);

      // 1. Award XP
      await conn.execute(
        `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
        [xp, athleteId]
      );

      // 2. xp_history
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'custom_goal', ?)`,
        [athleteId, xp, goalId]
      );

      // 3. Mark claimed
      await conn.execute(
        `UPDATE athlete_custom_goals SET is_claimed = 1, claimed_at = NOW() WHERE id = ?`,
        [goalId]
      );

      // 4. Notification
      const notifId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await conn.execute(
        `INSERT INTO notifications
          (id, user_id, type, title, message, sender_id, reference_id, action_url, status, is_read)
         VALUES (?, ?, 'achievement', ?, ?, NULL, ?, ?, 'info', 0)`,
        [
          notifId,
          athleteId,
          `🎯 Custom Goal Completed: ${goal.title}`,
          `You earned +${xp} XP for completing "${goal.title}"!`,
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

  /* ─── DELETE ─── */
  static async deleteGoal(athleteId: string, goalId: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM athlete_custom_goals WHERE id = ? AND athlete_id = ?`,
      [goalId, athleteId]
    );
    return result.affectedRows > 0;
  }
}