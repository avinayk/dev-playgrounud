// src/services/xp.service.ts
import pool from '../config/database';
import { getLevelInfo } from '../utils/leveling';

export class XpService {
  static async awardXp(
    athleteId: string,
    amount: number,
    source: string,
    referenceId?: string         // ✅ ye param hona chahiye
  ) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute<any[]>(
        `SELECT valuexp FROM athletes WHERE id = ? FOR UPDATE`,
        [athleteId]
      );
      if (!rows[0]) throw new Error('Athlete not found');

      const oldXp = Number(rows[0].valuexp) || 0;
      const newXp = oldXp + Number(amount);

      await conn.execute(
        `UPDATE athletes SET valuexp = ? WHERE id = ?`,
        [newXp, athleteId]
      );

      // ✅ reference_id column INSERT me dalo
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
        VALUES (?, ?, ?, ?)`,
        [athleteId, Number(amount), source, referenceId ?? null]
      );

      await conn.commit();
      return { newXp, newLevel: 1 };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}