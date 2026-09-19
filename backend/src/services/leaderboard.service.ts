// services/leaderboard.service.ts
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/* ═══════════════════════════════════════════
   PRESENCE TYPES
   ═══════════════════════════════════════════ */
export type PresenceStatus = 'Online' | 'In-Game' | 'Away' | 'Offline';
const VALID_STATUSES: PresenceStatus[] = ['Online', 'In-Game', 'Away', 'Offline'];
const OFFLINE_AFTER_MINUTES = 5;

export class LeaderboardService {
  /* ═══════════════════════════════════════════
     Get all athletes with full stats for leaderboard
     ═══════════════════════════════════════════ */
  static async getLeaderboard(
    excludeId?: string,
    limit: number = 500
  ): Promise<any[]> {
    /* ─── 1. Base athletes (WITH live status) ─── */
    const baseSelect = `
      SELECT 
        id, name, profilepicture, userhandle, school, email,
        level, valuexp, position, jersey, state, city, lat, lng,
        primary_sport, is_pro, is_verified_pro, subscription_tier,
        role, created_at,
        user_status,
        last_seen_at,
        status_updated_at,
        CASE 
          WHEN last_seen_at IS NULL 
            OR TIMESTAMPDIFF(MINUTE, last_seen_at, NOW()) > ?
          THEN 'Offline'
          ELSE COALESCE(user_status, 'Offline')
        END AS live_status
      FROM athletes`;

    const sql = excludeId
      ? `${baseSelect} WHERE id != ? ORDER BY valuexp DESC LIMIT ?`
      : `${baseSelect} ORDER BY valuexp DESC LIMIT ?`;

    const [athleteRows] = await pool.execute<RowDataPacket[]>(
      sql,
      excludeId
        ? [OFFLINE_AFTER_MINUTES, excludeId, limit]
        : [OFFLINE_AFTER_MINUTES, limit]
    );

    if (athleteRows.length === 0) return [];

    const athleteIds = athleteRows.map((a: any) => a.id);
    const placeholders = athleteIds.map(() => '?').join(',');

    /* ─── 2. Sport stats from game_performance_logs ─── */
    let statsRows: any[] = [];
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
           created_by_id AS athleteId,
           sport,
           COALESCE(SUM(points), 0) AS pts,
           COALESCE(SUM(assists), 0) AS ast,
           COALESCE(SUM(rebounds), 0) AS reb,
           COALESCE(SUM(steals), 0) AS stl,
           COALESCE(SUM(blocks), 0) AS blk,
           COALESCE(SUM(three_pt_made), 0) AS threePtMade,
           COALESCE(SUM(base_hits), 0) AS baseHits,
           COALESCE(SUM(at_bats), 0) AS atBats,
           COALESCE(SUM(softball_hits), 0) AS softballHits,
           COALESCE(SUM(softball_at_bats), 0) AS softballAtBats,
           COALESCE(SUM(goals_scored), 0) AS goals,
           COALESCE(SUM(soccer_assists), 0) AS soccerAssists,
           COALESCE(SUM(spike_kills), 0) AS kills,
           COALESCE(SUM(service_aces), 0) AS aces,
           COALESCE(SUM(net_blocks), 0) AS netBlocks,
           COALESCE(SUM(ground_digs), 0) AS digs,
           COALESCE(SUM(setting_assists), 0) AS setAssists,
           COUNT(*) AS gamesPlayed,
           SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) AS losses
         FROM game_performance_logs
         WHERE created_by_id IN (${placeholders})
         GROUP BY created_by_id, sport`,
        athleteIds
      );
      statsRows = rows as any[];
    } catch (err) {
      console.warn('⚠️ game_performance_logs query failed:', err);
    }

    const statsByAthlete: Record<string, Record<string, any>> = {};
    for (const r of statsRows) {
      if (!statsByAthlete[r.athleteId]) statsByAthlete[r.athleteId] = {};
      statsByAthlete[r.athleteId][r.sport] = {
        gamesPlayed: Number(r.gamesPlayed) || 0,
        wins: Number(r.wins) || 0,
        losses: Number(r.losses) || 0,
        pts: Number(r.pts) || 0,
        ast: Number(r.ast) || 0,
        reb: Number(r.reb) || 0,
        stl: Number(r.stl) || 0,
        blk: Number(r.blk) || 0,
        threePtMade: Number(r.threePtMade) || 0,
        baseHits: Number(r.baseHits) || 0,
        atBats: Number(r.atBats) || 0,
        softballHits: Number(r.softballHits) || 0,
        softballAtBats: Number(r.softballAtBats) || 0,
        goals: Number(r.goals) || 0,
        soccerAssists: Number(r.soccerAssists) || 0,
        kills: Number(r.kills) || 0,
        aces: Number(r.aces) || 0,
        netBlocks: Number(r.netBlocks) || 0,
        digs: Number(r.digs) || 0,
        setAssists: Number(r.setAssists) || 0,
      };
    }

    /* ─── 3. Friends (accepted) ─── */
    let friendRows: any[] = [];
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT user_id AS athleteId, friend_id AS friendId
         FROM friendships
         WHERE status = 'accepted'
           AND (user_id IN (${placeholders}) OR friend_id IN (${placeholders}))`,
        [...athleteIds, ...athleteIds]
      );
      friendRows = rows as any[];
    } catch (err) {
      console.warn('⚠️ friendships query failed:', err);
    }

    const friendsByAthlete: Record<string, string[]> = {};
    for (const r of friendRows) {
      if (!friendsByAthlete[r.athleteId]) friendsByAthlete[r.athleteId] = [];
      friendsByAthlete[r.athleteId].push(r.friendId);

      if (!friendsByAthlete[r.friendId]) friendsByAthlete[r.friendId] = [];
      friendsByAthlete[r.friendId].push(r.athleteId);
    }

    /* ─── 4. Drill counts ─── */
    let drillRows: any[] = [];
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT athlete_id, COUNT(*) AS cnt
         FROM athlete_drill_history
         WHERE athlete_id IN (${placeholders})
         GROUP BY athlete_id`,
        athleteIds
      );
      drillRows = rows as any[];
    } catch (err) {
      console.warn('⚠️ athlete_drill_history query failed:', err);
    }

    const drillCountByAthlete: Record<string, number> = {};
    drillRows.forEach((r: any) => {
      drillCountByAthlete[r.athlete_id] = Number(r.cnt);
    });

    /* ─── 5. Recent games (last 3 per athlete) ─── */
    let recentRows: any[] = [];
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
           created_by_id AS athleteId,
           sport,
           outcome,
           points,
           rebounds,
           assists,
           created_at
         FROM game_performance_logs
         WHERE created_by_id IN (${placeholders})
         ORDER BY created_at DESC`,
        athleteIds
      );
      recentRows = rows as any[];
    } catch (err) {
      console.warn('⚠️ recent games query failed:', err);
    }

    const recentGamesByAthlete: Record<string, any[]> = {};
    for (const r of recentRows) {
      if (!recentGamesByAthlete[r.athleteId])
        recentGamesByAthlete[r.athleteId] = [];
      if (recentGamesByAthlete[r.athleteId].length < 3) {
        recentGamesByAthlete[r.athleteId].push({
          id: `rg_${r.athleteId}_${recentGamesByAthlete[r.athleteId].length}`,
          date: r.created_at,
          pts: Number(r.points) || 0,
          reb: Number(r.rebounds) || 0,
          ast: Number(r.assists) || 0,
          isWin: r.outcome === 'win',
        });
      }
    }

    /* ─── 6. Merge everything ─── */
    return athleteRows.map((a: any) => {
      const stats = statsByAthlete[a.id] || {};
      const basketball = stats.basketball || {};
      const volleyball = stats.volleyball || {};
      const softball = stats.softball || {};
      const baseball = stats.baseball || {};
      const pickleball = stats.pickleball || {};
      const soccer = stats.soccer || {};

      const bbGames = basketball.gamesPlayed || 0;
      const sbHits = softball.softballHits || 0;
      const sbAtBats = softball.softballAtBats || 0;
      const baseHits = baseball.baseHits || 0;
      const baseAtBats = baseball.atBats || 0;
      const pickleWins = pickleball.wins || 0;
      const pickleGames = pickleball.gamesPlayed || 0;

      const totalWins = Object.values(stats).reduce(
        (sum: number, s: any) => sum + (s.wins || 0),
        0
      );
      const totalLosses = Object.values(stats).reduce(
        (sum: number, s: any) => sum + (s.losses || 0),
        0
      );

      return {
        id: a.id,
        name: a.name,
        avatar:
          a.profilepicture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        handle: a.userhandle || `@athlete_${String(a.id).slice(0, 4)}`,
        email: a.email,
        level: Number(a.level) || 1,
        xp: Number(a.valuexp) || 0,
        valuexp: Number(a.valuexp) || 0,
        role: a.role || 'high_school',
        primarySport: a.primary_sport || 'basketball',
        primary_sport: a.primary_sport || 'basketball',
        position: a.position || 'Athlete',
        jerseyNumber: Number(a.jersey) || 7,
        schoolOrLeague: a.school || 'Playground League',
        registeredCity: a.city || '',
        registeredState: a.state || '',
        location: {
          city: a.city || '',
          state: a.state || '',
          lat: a.lat !== null ? Number(a.lat) : undefined,
          lng: a.lng !== null ? Number(a.lng) : undefined,
        },
        isPro: !!a.is_pro,
        isVerifiedPro: !!a.is_verified_pro,
        isVerified: !!a.is_pro || !!a.is_verified_pro,
        subscriptionTier: a.subscription_tier || 'free',
        emailVerified: true,
        bio: '',
        hasCompletedLocationOnboarding: !!(a.city && a.state),
        createdAt: a.created_at,
        updatedAt: a.created_at,

        winCount: totalWins,
        lossCount: totalLosses,

        /* ✅ LIVE PRESENCE */
        userStatus: (a.live_status as PresenceStatus) || 'Offline',
        lastSeenAt: a.last_seen_at,
        statusUpdatedAt: a.status_updated_at,

        volleyballDrillCount: drillCountByAthlete[a.id] || 0,
        friendsList: friendsByAthlete[a.id] || [],
        recentGames: recentGamesByAthlete[a.id] || [],

        stats: {
          basketball: {
            gamesPlayed: bbGames,
            pts: basketball.pts || 0,
            ast: basketball.ast || 0,
            reb: basketball.reb || 0,
            stl: basketball.stl || 0,
            blk: basketball.blk || 0,
            fgMade: 0,
            fgAttempted: 0,
            threePtMade: basketball.threePtMade || 0,
          },
          volleyball: {
            gamesPlayed: volleyball.gamesPlayed || 0,
            kills: volleyball.kills || 0,
            aces: volleyball.aces || 0,
            blocks: volleyball.netBlocks || 0,
            digs: volleyball.digs || 0,
            assists: volleyball.setAssists || 0,
          },
          baseball: {
            gamesPlayed: baseball.gamesPlayed || 0,
            battingAvg: baseAtBats > 0 ? baseHits / baseAtBats : 0,
          },
          softball: {
            gamesPlayed: softball.gamesPlayed || 0,
            battingAvg: sbAtBats > 0 ? sbHits / sbAtBats : 0,
          },
          pickleball: {
            gamesPlayed: pickleGames,
            winRate: pickleGames > 0 ? pickleWins / pickleGames : 0,
          },
          soccer: {
            gamesPlayed: soccer.gamesPlayed || 0,
            goals: soccer.goals || 0,
            assists: soccer.soccerAssists || 0,
          },
        },
      };
    });
  }

  /* ═══════════════════════════════════════════
     UPDATE STATUS (manual: Online / In-Game / Away / Offline)
     ═══════════════════════════════════════════ */
  static async updateStatus(
    athleteId: string,
    status: PresenceStatus
  ): Promise<{ athleteId: string; status: PresenceStatus; updatedAt: Date }> {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(
        `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`
      );
    }

    const [result]: any = await pool.execute(
      `UPDATE athletes 
       SET user_status = ?, 
           status_updated_at = NOW(), 
           last_seen_at = NOW() 
       WHERE id = ?`,
      [status, athleteId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Athlete not found');
    }

    return { athleteId, status, updatedAt: new Date() };
  }

  /* ═══════════════════════════════════════════
     HEARTBEAT (frontend har 60s ping kare)
     Auto-flip Offline → Online
     ═══════════════════════════════════════════ */
  static async heartbeat(
    athleteId: string
  ): Promise<{ athleteId: string; lastSeen: Date }> {
    const [result]: any = await pool.execute(
      `UPDATE athletes 
       SET last_seen_at = NOW(),
           user_status = CASE 
             WHEN user_status = 'Offline' THEN 'Online'
             ELSE user_status
           END,
           status_updated_at = NOW()
       WHERE id = ?`,
      [athleteId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Athlete not found');
    }

    return { athleteId, lastSeen: new Date() };
  }

  /* ═══════════════════════════════════════════
     GET SINGLE ATHLETE LIVE STATUS
     ═══════════════════════════════════════════ */
  static async getAthleteStatus(athleteId: string): Promise<{
    athleteId: string;
    status: PresenceStatus;
    lastSeenAt: Date | null;
    statusUpdatedAt: Date | null;
  }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         id,
         CASE 
           WHEN last_seen_at IS NULL 
             OR TIMESTAMPDIFF(MINUTE, last_seen_at, NOW()) > ?
           THEN 'Offline'
           ELSE COALESCE(user_status, 'Offline')
         END AS live_status,
         last_seen_at,
         status_updated_at
       FROM athletes WHERE id = ?`,
      [OFFLINE_AFTER_MINUTES, athleteId]
    );

    if (rows.length === 0) throw new Error('Athlete not found');

    const r: any = rows[0];
    return {
      athleteId: r.id,
      status: r.live_status as PresenceStatus,
      lastSeenAt: r.last_seen_at,
      statusUpdatedAt: r.status_updated_at,
    };
  }

  /* ═══════════════════════════════════════════
     MARK STALE OFFLINE (cron / admin)
     ═══════════════════════════════════════════ */
  static async markStaleOffline(): Promise<{ markedOffline: number }> {
    const [result]: any = await pool.execute(
      `UPDATE athletes 
       SET user_status = 'Offline', status_updated_at = NOW()
       WHERE user_status != 'Offline'
         AND (last_seen_at IS NULL 
              OR TIMESTAMPDIFF(MINUTE, last_seen_at, NOW()) > ?)`,
      [OFFLINE_AFTER_MINUTES]
    );

    return { markedOffline: result.affectedRows };
  }
}