// backend/src/services/dailyPoints.service.ts
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/* ═══════════════════════════════════════════
   HELPER: Get today's date from MySQL
   ═══════════════════════════════════════════ */
async function getTodayDate(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT CURDATE() AS today`
  );
  const raw = rows[0]?.today;
  if (raw instanceof Date) {
    const yyyy = raw.getFullYear();
    const mm = String(raw.getMonth() + 1).padStart(2, '0');
    const dd = String(raw.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(raw).split('T')[0];
}

/* ═══════════════════════════════════════════
   HELPER: Get points column name by sport
   ═══════════════════════════════════════════ */
function getPointColumnForSport(sport: string): string {
  const map: Record<string, string> = {
    basketball: 'points',
    volleyball: 'spike_kills',
    soccer: 'goals_scored',
    baseball: 'base_hits',
    softball: 'softball_hits',
    football: 'touchdowns',
    pickleball: 'kitchen_dinks',
    tennis: 'tennis_aces_served',
  };
  return map[sport] || 'points';
}

export class DailyPointsService {
  /* ═══════════════════════════════════════════
     GET TODAY'S POINTS FOR ATHLETE
     Uses: game_performance_logs + athletes
     ═══════════════════════════════════════════ */
  static async getTodayPoints(athleteId: string, targetPoints: number = 25): Promise<{
    currentPoints: number;
    targetPoints: number;
    xpAwarded: boolean;
    remaining: number;
    percentComplete: number;
    totalGamesToday: number;
    lastLogAt: string | null;
    breakdown: Array<{ sport: string; points: number; games: number }>;
  }> {
    const today = await getTodayDate();

    // Get today's logs grouped by sport
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         sport,
         COUNT(*) AS games_count,
         COALESCE(SUM(points), 0) AS bball_pts,
         COALESCE(SUM(spike_kills), 0) AS vb_kills,
         COALESCE(SUM(goals_scored), 0) AS soc_goals,
         COALESCE(SUM(base_hits), 0) AS base_hits,
         COALESCE(SUM(softball_hits), 0) AS softball_hits,
         COALESCE(SUM(touchdowns), 0) AS tds,
         COALESCE(SUM(kitchen_dinks), 0) AS dinks,
         COALESCE(SUM(tennis_aces_served), 0) AS tennis_aces,
         MAX(created_at) AS last_log_at
       FROM game_performance_logs
       WHERE created_by_id = ?
         AND DATE(created_at) = ?
       GROUP BY sport`,
      [athleteId, today]
    );

    let currentPoints = 0;
    let totalGamesToday = 0;
    let lastLogAt: string | null = null;
    const breakdown: Array<{ sport: string; points: number; games: number }> = [];

    rows.forEach((row: any) => {
      const sport = row.sport;
      let sportPoints = 0;

      switch (sport) {
        case 'basketball':
          sportPoints = Number(row.bball_pts) || 0;
          break;
        case 'volleyball':
          sportPoints = Number(row.vb_kills) || 0;
          break;
        case 'soccer':
          sportPoints = Number(row.soc_goals) || 0;
          break;
        case 'baseball':
          sportPoints = Number(row.base_hits) || 0;
          break;
        case 'softball':
          sportPoints = Number(row.softball_hits) || 0;
          break;
        case 'football':
          sportPoints = Number(row.tds) || 0;
          break;
        case 'pickleball':
          sportPoints = Number(row.dinks) || 0;
          break;
        case 'tennis':
          sportPoints = Number(row.tennis_aces) || 0;
          break;
        default:
          sportPoints = Number(row.bball_pts) || 0;
      }

      currentPoints += sportPoints;
      totalGamesToday += Number(row.games_count) || 0;

      if (row.last_log_at) {
        const logTime = String(row.last_log_at);
        if (!lastLogAt || logTime > lastLogAt) {
          lastLogAt = logTime;
        }
      }

      breakdown.push({
        sport,
        points: sportPoints,
        games: Number(row.games_count) || 0,
      });
    });

    // Check if XP already awarded today
    const [xpRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM xp_history
       WHERE athlete_id = ?
         AND source = 'daily_point_goal'
         AND reference_id = ?
       LIMIT 1`,
      [athleteId, today]
    );

    const xpAwarded = xpRows.length > 0;
    const remaining = Math.max(0, targetPoints - currentPoints);
    const percentComplete = Math.min(
      100,
      Math.round((currentPoints / targetPoints) * 100)
    );

    console.log(
      `📊 [DailyPoints] ${athleteId}: ${currentPoints}/${targetPoints} pts (${totalGamesToday} games)`
    );

    return {
      currentPoints,
      targetPoints,
      xpAwarded,
      remaining,
      percentComplete,
      totalGamesToday,
      lastLogAt,
      breakdown,
    };
  }

  /* ═══════════════════════════════════════════
     CHECK & AWARD XP IF TARGET REACHED
     Uses: athletes + xp_history
     ═══════════════════════════════════════════ */
  static async checkAndAwardBonus(
    athleteId: string,
    targetPoints: number = 25
  ): Promise<{
    currentPoints: number;
    targetPoints: number;
    xpAwardedNow: boolean;
    xpAmount: number;
  }> {
    const today = await getTodayDate();

    // Get current points
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         COALESCE(SUM(
           CASE 
             WHEN sport = 'volleyball' THEN spike_kills
             WHEN sport = 'soccer' THEN goals_scored
             WHEN sport = 'baseball' THEN base_hits
             WHEN sport = 'softball' THEN softball_hits
             WHEN sport = 'football' THEN touchdowns
             WHEN sport = 'pickleball' THEN kitchen_dinks
             WHEN sport = 'tennis' THEN tennis_aces_served
             ELSE points
           END
         ), 0) AS total_pts
       FROM game_performance_logs
       WHERE created_by_id = ?
         AND DATE(created_at) = ?`,
      [athleteId, today]
    );

    const currentPoints = Number(rows[0]?.total_pts) || 0;

    // Check if XP already awarded today
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM xp_history
       WHERE athlete_id = ?
         AND source = 'daily_point_goal'
         AND reference_id = ?
       LIMIT 1`,
      [athleteId, today]
    );

    if (existing.length > 0) {
      // Already awarded
      return {
        currentPoints,
        targetPoints,
        xpAwardedNow: false,
        xpAmount: 0,
      };
    }

    if (currentPoints < targetPoints) {
      // Target not reached
      return {
        currentPoints,
        targetPoints,
        xpAwardedNow: false,
        xpAmount: 0,
      };
    }

    // ✅ TARGET REACHED — Award XP
    const xpAmount = 150;

    // Update athlete XP
    await pool.execute(
      `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
      [xpAmount, athleteId]
    );

    // Log in xp_history (this also acts as the "awarded" flag)
    await pool.execute(
      `INSERT INTO xp_history (athlete_id, amount, source, reference_id) 
       VALUES (?, ?, 'daily_point_goal', ?)`,
      [athleteId, xpAmount, today]
    );

    console.log(`🎉 [DailyPoints] BONUS! +${xpAmount} XP awarded to ${athleteId}`);

    return {
      currentPoints,
      targetPoints,
      xpAwardedNow: true,
      xpAmount,
    };
  }
}