// src/services/drills.service.ts
import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getLevelInfo } from '../utils/leveling';

export interface DrillHistoryDTO {
  id: string;
  drillId: string;
  drillName: string;
  sport: string;
  tier: string;
  score: number;
  target: number;
  xpEarned: number;
  unit: string;
  completedAt: string;
}

export class DrillsService {
  /* ═══════════════════════════════════════════
     Save drill completion + award XP (SINGLE source of truth)
     ═══════════════════════════════════════════ */
  static async saveDrillCompletion(
    athleteId: string,
    data: {
      drillId: string;
      drillName: string;
      sport: string;
      tier: string;
      score: number;
      target: number;
      xpEarned: number;
      unit: string;
    }
  ): Promise<{
    historyId: string;
    newXp: number;
    newLevel: number;
    leveledUp: boolean;
    levelInfo: any;
  }> {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert drill history
      const historyId = randomUUID();
      await conn.execute(
        `INSERT INTO athlete_drill_history
           (id, athlete_id, drill_id, drill_name, sport, tier, score, target, xp_earned, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          athleteId,
          data.drillId,
          data.drillName,
          data.sport,
          data.tier,
          data.score,
          data.target,
          data.xpEarned,
          data.unit,
        ]
      );

      // 2. Get current XP (locked)
      const [rows] = await conn.execute<any[]>(
        `SELECT valuexp, level FROM athletes WHERE id = ? FOR UPDATE`,
        [athleteId]
      );
      if (!rows[0]) throw new Error('Athlete not found');

      const oldXp = Number(rows[0].valuexp) || 0;
      const newXp = oldXp + Number(data.xpEarned);

      // ✅ FIX: 50-level curve use karo
      const oldLevelInfo = getLevelInfo(oldXp);
      const newLevelInfo = getLevelInfo(newXp);
      const newLevel = newLevelInfo.level;
      const leveledUp = newLevel > oldLevelInfo.level;

      // 3. Update athlete XP + level
      await conn.execute(
        `UPDATE athletes SET valuexp = ?, level = ? WHERE id = ?`,
        [newXp, newLevel, athleteId]
      );

      // 4. XP history
      const referenceId = `drill_${data.drillId}_${data.tier}_${Date.now()}`;
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, ?, ?)`,
        [athleteId, data.xpEarned, 'sport_drill', referenceId]
      );

      // 5. Notification
      await conn.execute(
        `INSERT INTO notifications
           (id, user_id, type, title, message, status, is_read)
         VALUES (?, ?, 'achievement', ?, ?, 'info', 0)`,
        [
          randomUUID(),
          athleteId,
          `🏋️ ${data.drillName} Complete!`,
          `+${data.xpEarned} XP earned (${data.tier} tier).${
            leveledUp ? ` Level up! Now Level ${newLevel}.` : ''
          }`,
        ]
      );

      await conn.commit();

      return {
        historyId,
        newXp,
        newLevel,
        leveledUp,
        levelInfo: newLevelInfo,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /* ═══════════════════════════════════════════
     Get drill history
     ═══════════════════════════════════════════ */
  static async getHistory(
    athleteId: string,
    options: { sport?: string; limit?: number } = {}
  ): Promise<DrillHistoryDTO[]> {
    const { sport, limit = 20 } = options;
    let query = `SELECT 
                   id, drill_id, drill_name, sport, tier, score, target, xp_earned, unit, completed_at
                 FROM athlete_drill_history
                 WHERE athlete_id = ?`;
    const params: any[] = [athleteId];

    if (sport && sport !== 'all') {
      query += ` AND sport = ?`;
      params.push(sport);
    }

    query += ` ORDER BY completed_at DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.execute<any[]>(query, params);

    return rows.map((r) => ({
      id: r.id,
      drillId: r.drill_id,
      drillName: r.drill_name,
      sport: r.sport,
      tier: r.tier,
      score: Number(r.score),
      target: Number(r.target),
      xpEarned: Number(r.xp_earned),
      unit: r.unit,
      completedAt: r.completed_at,
    }));
  }

  /* ═══════════════════════════════════════════
     Aggregated stats (for chart)
     ═══════════════════════════════════════════ */
  static async getStats(athleteId: string): Promise<{
    totalDrills: number;
    totalXp: number;
    bySport: Record<string, number>;
    byTier: Record<string, number>;
  }> {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
         COUNT(*) AS totalDrills,
         COALESCE(SUM(xp_earned), 0) AS totalXp
       FROM athlete_drill_history
       WHERE athlete_id = ?`,
      [athleteId]
    );

    const [sportRows] = await pool.execute<any[]>(
      `SELECT sport, COUNT(*) AS cnt FROM athlete_drill_history
       WHERE athlete_id = ? GROUP BY sport`,
      [athleteId]
    );

    const [tierRows] = await pool.execute<any[]>(
      `SELECT tier, COUNT(*) AS cnt FROM athlete_drill_history
       WHERE athlete_id = ? GROUP BY tier`,
      [athleteId]
    );

    const bySport: Record<string, number> = {};
    sportRows.forEach((r) => (bySport[r.sport] = Number(r.cnt)));

    const byTier: Record<string, number> = {};
    tierRows.forEach((r) => (byTier[r.tier] = Number(r.cnt)));

    return {
      totalDrills: Number(rows[0]?.totalDrills) || 0,
      totalXp: Number(rows[0]?.totalXp) || 0,
      bySport,
      byTier,
    };
  }
}