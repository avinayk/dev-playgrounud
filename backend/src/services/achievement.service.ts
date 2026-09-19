// src/services/achievement.service.ts
import pool from '../config/database';
import { getLevelInfo } from '../utils/leveling';
import { randomUUID } from 'crypto';

export interface MilestoneDTO {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier:
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'platinum'
    | 'diamond'
    | 'pro_elite'
    | 'legendary';
  targetValue: number;
  currentValue: number;
  xpReward: number;
  unlockedAt?: string;
  tips?: string;
  isProVerified?: boolean;
}

export class AchievementService {
  /* ═══════════════════════════════════════════
     Get all milestones with live progress
     ═══════════════════════════════════════════ */
  static async getMilestones(athleteId: string): Promise<MilestoneDTO[]> {
    const stats = await this.gatherAthleteStats(athleteId);
    return this.buildMilestoneCatalog(stats);
  }

  /* ═══════════════════════════════════════════
     Get claimed milestone IDs
     ═══════════════════════════════════════════ */
  static async getClaimedIds(athleteId: string): Promise<string[]> {
    const [rows] = await pool.execute<any[]>(
      `SELECT milestone_id FROM athlete_achievements
       WHERE athlete_id = ? AND claimed_at IS NOT NULL`,
      [athleteId]
    );
    return rows.map((r) => r.milestone_id);
  }

  /* ═══════════════════════════════════════════
     Gather all athlete stats from DB
     ═══════════════════════════════════════════ */
  private static async gatherAthleteStats(athleteId: string) {
    // Athlete base row
    const [athRows] = await pool.execute<any[]>(
      `SELECT 
        id, 
        level, 
        valuexp, 
        is_pro, 
        is_verified_pro,
        primary_sport
      FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const athlete = athRows[0] || {};

    // Wins
    const [winRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS wins FROM pickup_games g
       JOIN game_participants gp ON gp.game_id = g.id
       WHERE gp.athlete_id = ? AND g.status = 'completed' AND g.mvp_winner_id = ?`,
      [athleteId, athleteId]
    );

    // Games played
    const [gameRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS games FROM game_participants WHERE athlete_id = ?`,
      [athleteId]
    );

    // Highlights count
    const [hlRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS cnt FROM highlights WHERE athlete_id = ? AND is_deleted = 0`,
      [athleteId]
    );

    // Hosted games
    const [hostRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS cnt FROM pickup_games WHERE creator_id = ?`,
      [athleteId]
    );

    // Distinct sports
    const [sportRows] = await pool.execute<any[]>(
      `SELECT DISTINCT g.sport FROM pickup_games g
       JOIN game_participants gp ON gp.game_id = g.id
       WHERE gp.athlete_id = ?`,
      [athleteId]
    );

    // Distinct venues
    const [venueRows] = await pool.execute<any[]>(
      `SELECT COUNT(DISTINCT g.location) AS cnt FROM pickup_games g
       JOIN game_participants gp ON gp.game_id = g.id
       WHERE gp.athlete_id = ?`,
      [athleteId]
    );

    // Per-sport stats
    const [perfRows] = await pool.execute<any[]>(
      `SELECT sport,
              COALESCE(SUM(points),0) AS pts,
              COALESCE(SUM(assists),0) AS ast,
              COALESCE(SUM(rebounds),0) AS reb,
              COALESCE(SUM(steals),0) AS stl,
              COALESCE(SUM(blocks),0) AS blk,
              COALESCE(SUM(softball_hits),0) AS sb_hits,
              COALESCE(SUM(home_runs),0) AS hr,
              COALESCE(SUM(rbis),0) AS rbi,
              COALESCE(SUM(goals_scored),0) AS goals,
              COALESCE(SUM(soccer_assists),0) AS soccer_assists,
              COALESCE(SUM(spike_kills),0) AS kills,
              COALESCE(SUM(service_aces),0) AS aces,
              COALESCE(SUM(net_blocks),0) AS net_blocks,
              COALESCE(SUM(ground_digs),0) AS digs,
              COALESCE(SUM(setting_assists),0) AS set_ast,
              COUNT(*) AS games_logged
       FROM game_performance_logs
       WHERE created_by_id = ?
       GROUP BY sport`,
      [athleteId]
    );

    const bySport: Record<string, any> = {};
    for (const r of perfRows) {
      bySport[r.sport] = {
        pts: Number(r.pts) || 0,
        ast: Number(r.ast) || 0,
        reb: Number(r.reb) || 0,
        stl: Number(r.stl) || 0,
        blk: Number(r.blk) || 0,
        sbHits: Number(r.sb_hits) || 0,
        hr: Number(r.hr) || 0,
        rbi: Number(r.rbi) || 0,
        goals: Number(r.goals) || 0,
        soccerAssists: Number(r.soccer_assists) || 0,
        kills: Number(r.kills) || 0,
        aces: Number(r.aces) || 0,
        netBlocks: Number(r.net_blocks) || 0,
        digs: Number(r.digs) || 0,
        setAst: Number(r.set_ast) || 0,
        gamesPlayed: Number(r.games_logged) || 0,
      };
    }

    // ✅ Real unlock dates from athlete_achievements
    const [achievementRows] = await pool.execute<any[]>(
      `SELECT milestone_id, unlocked_at, claimed_at
       FROM athlete_achievements WHERE athlete_id = ?`,
      [athleteId]
    );
    const unlockDates: Record<string, string> = {};
    const claimedMap: Record<string, boolean> = {};
    for (const r of achievementRows) {
      if (r.unlocked_at) {
        unlockDates[r.milestone_id] = new Date(r.unlocked_at)
          .toISOString()
          .split('T')[0];
      }
      if (r.claimed_at) {
        claimedMap[r.milestone_id] = true;
      }
    }

    // Totals
    const basketballPts = bySport.basketball?.pts || 0;
    const soccerPts = (bySport.soccer?.goals || 0) * 2;
    const footballPts = bySport.football?.pts || 0;
    const totalPoints = basketballPts + soccerPts + footballPts;

    const totalAssists =
      (bySport.basketball?.ast || 0) + (bySport.soccer?.soccerAssists || 0);

    const totalRebounds =
      (bySport.basketball?.reb || 0) + (bySport.volleyball?.kills || 0);

    return {
      athlete,
      athleteId,
      wins: Number(athlete.win_count || winRows[0]?.wins || 0),
      totalGames: Number(gameRows[0]?.games) || 0,
      highlightsCount: Number(hlRows[0]?.cnt) || 0,
      hostedGames: Number(hostRows[0]?.cnt) || 0,
      distinctSports: sportRows.length,
      distinctVenues: Number(venueRows[0]?.cnt) || 0,
      totalPoints,
      totalAssists,
      totalRebounds,
      bySport,
      vb: bySport.volleyball || {},
      unlockDates,
      claimedMap,
      level: Number(athlete.level) || 1,
      valuexp: Number(athlete.valuexp) || 0,
      dailyStreak: Number(athlete.daily_streak) || 1,
      mfaEnabled: !!athlete.mfa_enabled,
      streakFreezeCount: Number(athlete.streak_freeze_count) || 0,
      isPro: !!athlete.is_pro,
      isVerifiedPro: !!athlete.is_verified_pro,
      primarySport: athlete.primary_sport || 'basketball',
    };
  }

  /* ═══════════════════════════════════════════
     Build the milestone catalog
     ═══════════════════════════════════════════ */
  private static buildMilestoneCatalog(s: any): MilestoneDTO[] {
    /**
     * ✅ Auto-insert athlete_achievements row when a milestone is met
     * Called lazily during build.
     */
    const ensureRow = async (milestoneId: string, met: boolean) => {
      if (!met) return;
      try {
        await pool.execute(
          `INSERT IGNORE INTO athlete_achievements
             (athlete_id, milestone_id, unlocked_at)
           VALUES (?, ?, NOW())`,
          [s.athleteId, milestoneId]
        );
      } catch { /* silent */ }
    };

    /**
     * Resolve unlockedAt:
     *   1. athlete_achievements.unlocked_at (real date)
     *   2. fallback if met
     */
    const unlock = (id: string, met: boolean, fallback?: string) => {
      if (!met) return undefined;
      ensureRow(id, met);
      return s.unlockDates[id] || fallback || 'Just now';
    };

    const list: MilestoneDTO[] = [
      // ══════ GENERAL ══════
      {
        id: 'm_first_win',
        name: 'First Win',
        description: 'Record your first official victory on the playground courts.',
        icon: 'Trophy',
        category: 'general',
        tier: 'bronze',
        targetValue: 1,
        currentValue: s.wins,
        xpReward: 100,
        unlockedAt: unlock('m_first_win', s.wins >= 1),
        tips: 'Join or host a pickup match and win with your team.',
      },
      {
        id: 'm_10_games',
        name: '10 Games Played',
        description: 'Log 10 total pickup games across any sport.',
        icon: 'Activity',
        category: 'general',
        tier: 'silver',
        targetValue: 10,
        currentValue: s.totalGames,
        xpReward: 250,
        unlockedAt: unlock('m_10_games', s.totalGames >= 10),
      },
      {
        id: 'm_25_games',
        name: '25 Games Veteran',
        description: 'Log 25 total pickup games on the platform.',
        icon: 'Crown',
        category: 'general',
        tier: 'gold',
        targetValue: 25,
        currentValue: s.totalGames,
        xpReward: 500,
        unlockedAt: unlock('m_25_games', s.totalGames >= 25),
      },
      {
        id: 'm_highlight_debut',
        name: 'Highlight Reel Debut',
        description: 'Upload your first game highlight reel.',
        icon: 'Film',
        category: 'general',
        tier: 'bronze',
        targetValue: 1,
        currentValue: s.highlightsCount,
        xpReward: 150,
        unlockedAt: unlock('m_highlight_debut', s.highlightsCount >= 1),
      },
      {
        id: 'm_century_scorer',
        name: 'Century Scorer',
        description: 'Reach 50+ total accumulated points across sports.',
        icon: 'Flame',
        category: 'basketball',
        tier: 'gold',
        targetValue: 50,
        currentValue: Math.floor(s.totalPoints),
        xpReward: 350,
        unlockedAt: unlock('m_century_scorer', s.totalPoints >= 50),
      },
      {
        id: 'm_dime_dropper',
        name: 'Dime Dropper',
        description: 'Dish out 10 total assists across matches.',
        icon: 'Zap',
        category: 'basketball',
        tier: 'silver',
        targetValue: 10,
        currentValue: s.totalAssists,
        xpReward: 200,
        unlockedAt: unlock('m_dime_dropper', s.totalAssists >= 10),
      },
      {
        id: 'm_iron_shield',
        name: 'Iron Shield Security',
        description: 'Enable MFA to protect your athlete account.',
        icon: 'ShieldCheck',
        category: 'general',
        tier: 'bronze',
        targetValue: 1,
        currentValue: s.mfaEnabled ? 1 : 0,
        xpReward: 150,
        unlockedAt: unlock('m_iron_shield', s.mfaEnabled),
      },
      {
        id: 'm_multi_sport',
        name: 'Multi-Sport Dynamo',
        description: 'Log games in at least 2 different sports.',
        icon: 'Dumbbell',
        category: 'general',
        tier: 'silver',
        targetValue: 2,
        currentValue: s.distinctSports,
        xpReward: 300,
        unlockedAt: unlock('m_multi_sport', s.distinctSports >= 2),
      },
      {
        id: 'm_court_explorer',
        name: 'Court Explorer',
        description: 'Play at 5 different venues.',
        icon: 'MapPin',
        category: 'general',
        tier: 'silver',
        targetValue: 5,
        currentValue: s.distinctVenues,
        xpReward: 200,
        unlockedAt: unlock('m_court_explorer', s.distinctVenues >= 5),
      },
      {
        id: 'm_captain_marvel',
        name: 'Captain Host',
        description: 'Host a pickup game and invite players.',
        icon: 'Users',
        category: 'general',
        tier: 'gold',
        targetValue: 1,
        currentValue: s.hostedGames,
        xpReward: 300,
        unlockedAt: unlock('m_captain_marvel', s.hostedGames >= 1),
      },
      {
        id: 'm_rising_star',
        name: 'Rising Star Level',
        description: 'Reach Athlete Level 2 or higher.',
        icon: 'Star',
        category: 'general',
        tier: 'platinum',
        targetValue: 2,
        currentValue: s.level,
        xpReward: 400,
        unlockedAt: unlock('m_rising_star', s.level >= 2),
      },
      {
        id: 'm_hall_of_famer',
        name: 'Hall of Fame Status',
        description: 'Reach Athlete Level 5.',
        icon: 'Medal',
        category: 'general',
        tier: 'diamond',
        targetValue: 5,
        currentValue: s.level,
        xpReward: 1000,
        unlockedAt: unlock('m_hall_of_famer', s.level >= 5),
      },
      {
        id: 'm_streak_master',
        name: '7-Day Streak Master',
        description: 'Check in for 7 consecutive days.',
        icon: 'Flame',
        category: 'general',
        tier: 'gold',
        targetValue: 7,
        currentValue: s.dailyStreak,
        xpReward: 350,
        unlockedAt: unlock('m_streak_master', s.dailyStreak >= 7),
      },
      {
        id: 'm_streak_shield_owner',
        name: 'Streak Shield Guardian',
        description: 'Hold at least 1 Streak Freeze token.',
        icon: 'ShieldCheck',
        category: 'general',
        tier: 'silver',
        targetValue: 1,
        currentValue: s.streakFreezeCount,
        xpReward: 200,
        unlockedAt: unlock('m_streak_shield_owner', s.streakFreezeCount >= 1),
      },
      {
        id: 'm_100_pts',
        name: '100 Career Points',
        description: 'Reach 100 total career points.',
        icon: 'Trophy',
        category: 'basketball',
        tier: 'gold',
        targetValue: 100,
        currentValue: Math.floor(s.totalPoints),
        xpReward: 500,
        unlockedAt: unlock('m_100_pts', s.totalPoints >= 100),
      },
      {
        id: 'm_50_reb',
        name: '50 Career Rebounds',
        description: 'Collect 50 total career rebounds.',
        icon: 'ShieldCheck',
        category: 'basketball',
        tier: 'silver',
        targetValue: 50,
        currentValue: s.totalRebounds,
        xpReward: 400,
        unlockedAt: unlock('m_50_reb', s.totalRebounds >= 50),
      },
      {
        id: 'm_25_ast',
        name: '25 Assists Playmaker',
        description: 'Record 25 total career assists.',
        icon: 'Zap',
        category: 'basketball',
        tier: 'silver',
        targetValue: 25,
        currentValue: s.totalAssists,
        xpReward: 350,
        unlockedAt: unlock('m_25_ast', s.totalAssists >= 25),
      },
      {
        id: 'm_level_10',
        name: 'Level 10 Playground Starter',
        description: 'Reach Athlete Level 10.',
        icon: 'Crown',
        category: 'general',
        tier: 'gold',
        targetValue: 10,
        currentValue: s.level,
        xpReward: 600,
        unlockedAt: unlock('m_level_10', s.level >= 10),
      },
      {
        id: 'm_level_20',
        name: 'Level 20 League All-Star',
        description: 'Reach Athlete Level 20.',
        icon: 'Star',
        category: 'general',
        tier: 'platinum',
        targetValue: 20,
        currentValue: s.level,
        xpReward: 1200,
        unlockedAt: unlock('m_level_20', s.level >= 20),
      },
      {
        id: 'm_level_30',
        name: 'Level 30 League MVP',
        description: 'Reach Athlete Level 30.',
        icon: 'Award',
        category: 'general',
        tier: 'diamond',
        targetValue: 30,
        currentValue: s.level,
        xpReward: 2500,
        unlockedAt: unlock('m_level_30', s.level >= 30),
      },
      {
        id: 'm_level_50',
        name: 'Level 50 Immortal GOAT',
        description: 'Reach the pinnacle: Athlete Level 50!',
        icon: 'Crown',
        category: 'general',
        tier: 'diamond',
        targetValue: 50,
        currentValue: s.level,
        xpReward: 5000,
        unlockedAt: unlock('m_level_50', s.level >= 50),
      },
      {
        id: 'm_triple_double',
        name: 'Triple Double Machine',
        description: 'Basketball: 10+ PTS, 10+ REB, 10+ AST in a season.',
        icon: 'Zap',
        category: 'general',
        tier: 'diamond',
        targetValue: 1,
        currentValue:
          (s.bySport.basketball?.pts || 0) >= 10 &&
          (s.bySport.basketball?.reb || 0) >= 10 &&
          (s.bySport.basketball?.ast || 0) >= 10
            ? 1
            : 0,
        xpReward: 750,
      },
      {
        id: 'm_century_mark',
        name: 'Century Mark',
        description: '100+ combined points or volleyball spike kills.',
        icon: 'Flame',
        category: 'general',
        tier: 'gold',
        targetValue: 100,
        currentValue: Math.floor(s.totalPoints + (s.vb.kills || 0)),
        xpReward: 500,
        unlockedAt: unlock(
          'm_century_mark',
          s.totalPoints + (s.vb.kills || 0) >= 100
        ),
      },
      // ══════ VOLLEYBALL ══════
      {
        id: 'm_vb_spike_cannon',
        name: 'Spike Cannon Specialist',
        description: 'Execute 30 total career spike kills.',
        icon: 'Trophy',
        category: 'volleyball',
        tier: 'gold',
        targetValue: 30,
        currentValue: s.vb.kills || 0,
        xpReward: 400,
        unlockedAt: unlock('m_vb_spike_cannon', (s.vb.kills || 0) >= 30),
      },
      {
        id: 'm_vb_ace_master',
        name: 'Ace Master',
        description: 'Serve 15 unreturnable aces.',
        icon: 'Zap',
        category: 'volleyball',
        tier: 'platinum',
        targetValue: 15,
        currentValue: s.vb.aces || 0,
        xpReward: 350,
        unlockedAt: unlock('m_vb_ace_master', (s.vb.aces || 0) >= 15),
      },
      {
        id: 'm_vb_net_guardian',
        name: 'Net Wall Guardian',
        description: 'Stuff 15 total career net blocks.',
        icon: 'ShieldCheck',
        category: 'volleyball',
        tier: 'silver',
        targetValue: 15,
        currentValue: s.vb.netBlocks || 0,
        xpReward: 300,
        unlockedAt: unlock('m_vb_net_guardian', (s.vb.netBlocks || 0) >= 15),
      },
      {
        id: 'm_vb_floor_defense',
        name: 'Floor Defense God',
        description: 'Log 25 total ground digs.',
        icon: 'ShieldCheck',
        category: 'volleyball',
        tier: 'gold',
        targetValue: 25,
        currentValue: s.vb.digs || 0,
        xpReward: 350,
        unlockedAt: unlock('m_vb_floor_defense', (s.vb.digs || 0) >= 25),
      },
      {
        id: 'm_vb_setting_maestro',
        name: 'Setting Maestro',
        description: 'Dish out 30 setting assists.',
        icon: 'Star',
        category: 'volleyball',
        tier: 'gold',
        targetValue: 30,
        currentValue: s.vb.setAst || 0,
        xpReward: 400,
        unlockedAt: unlock('m_vb_setting_maestro', (s.vb.setAst || 0) >= 30),
      },
      // ══════ ELITE SERIES (PRO only) ══════
      {
        id: 'm_pro_vanguard_scorer',
        name: 'Pro Vanguard Scorer 👑',
        description: 'PRO: Reach 120+ verified career points.',
        icon: 'Sparkles',
        category: 'elite_series',
        tier: 'pro_elite',
        targetValue: 120,
        currentValue: Math.floor(s.totalPoints),
        xpReward: 1000,
        unlockedAt: unlock(
          'm_pro_vanguard_scorer',
          s.isPro && s.totalPoints >= 120
        ),
        isProVerified: true,
      },
      {
        id: 'm_pro_playmaker',
        name: 'Scout Certified Playmaker 👁️',
        description: 'PRO: Reach 30+ verified assists.',
        icon: 'Eye',
        category: 'elite_series',
        tier: 'pro_elite',
        targetValue: 30,
        currentValue: s.totalAssists,
        xpReward: 850,
        unlockedAt: unlock(
          'm_pro_playmaker',
          s.isPro && s.totalAssists >= 30
        ),
        isProVerified: true,
      },
      {
        id: 'm_pro_legend_wins',
        name: 'Verified Court Legend 💎',
        description: 'PRO: Secure 8+ verified victories.',
        icon: 'Award',
        category: 'elite_series',
        tier: 'pro_elite',
        targetValue: 8,
        currentValue: s.wins,
        xpReward: 1200,
        unlockedAt: unlock('m_pro_legend_wins', s.isPro && s.wins >= 8),
        isProVerified: true,
      },
      {
        id: 'm_pro_euro_prospect',
        name: 'EuroLeague Prospect 🌍',
        description: 'PRO: Reach 150+ PTS with audit.',
        icon: 'Flame',
        category: 'elite_series',
        tier: 'pro_elite',
        targetValue: 150,
        currentValue: Math.floor(s.totalPoints),
        xpReward: 1500,
        unlockedAt: unlock(
          'm_pro_euro_prospect',
          s.isPro && s.totalPoints >= 150
        ),
        isProVerified: true,
      },
    ];

    return list;
  }

  /* ═══════════════════════════════════════════
     Claim milestone XP (transaction-safe)
     ═══════════════════════════════════════════ */
  static async claimMilestone(
    athleteId: string,
    milestoneId: string,
    xpReward: number,
    badgeName: string
  ): Promise<{
    newXp: number;
    newLevel: number;
    leveledUp: boolean;
    isMilestoneReached: boolean;
    levelInfo: any;
  }> {
    const conn = await (pool as any).getConnection();

    try {
      await conn.beginTransaction();

      // 1. Duplicate check
      const [dupe] = await conn.execute<any[]>(
        `SELECT id FROM athlete_achievements
         WHERE athlete_id = ? AND milestone_id = ? AND claimed_at IS NOT NULL`,
        [athleteId, milestoneId]
      );
      if (dupe.length > 0) {
        await conn.rollback();
        throw new Error('Achievement already claimed');
      }

      // 2. Get current XP & level
      const [rows] = await conn.execute<any[]>(
        `SELECT valuexp, level FROM athletes WHERE id = ? FOR UPDATE`,
        [athleteId]
      );
      if (!rows[0]) {
        await conn.rollback();
        throw new Error('Athlete not found');
      }

      const oldXp = Number(rows[0].valuexp) || 0;
      const newXp = oldXp + xpReward;

      const oldLevelInfo = getLevelInfo(oldXp);
      const newLevelInfo = getLevelInfo(newXp);
      const leveledUp = newLevelInfo.level > oldLevelInfo.level;
      const isMilestoneReached =
        leveledUp && [10, 25, 50].includes(newLevelInfo.level);

      // 3. Update athlete XP & level
      await conn.execute(
        `UPDATE athletes SET valuexp = ?, level = ? WHERE id = ?`,
        [newXp, newLevelInfo.level, athleteId]
      );

      // 4. Insert or update athlete_achievements
      await conn.execute(
        `INSERT INTO athlete_achievements
           (athlete_id, milestone_id, unlocked_at, claimed_at, xp_awarded)
         VALUES (?, ?, NOW(), NOW(), ?)
         ON DUPLICATE KEY UPDATE
           claimed_at = NOW(),
           xp_awarded = VALUES(xp_awarded)`,
        [athleteId, milestoneId, xpReward]
      );

      // 5. Insert xp_history
      await conn.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'achievement', ?)`,
        [athleteId, xpReward, milestoneId]
      );

      // 6. Insert notification
      const notifId = randomUUID();
      await conn.execute(
        `INSERT INTO notifications
           (id, user_id, type, title, message, reference_id, status, is_read)
         VALUES (?, ?, 'achievement', ?, ?, ?, 'info', 0)`,
        [
          notifId,
          athleteId,
          `🏆 Achievement Unlocked: ${badgeName}`,
          `You unlocked "${badgeName}" and earned +${xpReward} XP!`,
          milestoneId,
        ]
      );

      await conn.commit();

      return {
        newXp,
        newLevel: newLevelInfo.level,
        leveledUp,
        isMilestoneReached,
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
     Pinned badges
     ═══════════════════════════════════════════ */
  static async getPinnedBadges(athleteId: string): Promise<string[]> {
    const [rows] = await pool.execute<any[]>(
      `SELECT pinned_badge_ids FROM athletes WHERE id = ?`,
      [athleteId]
    );
    const raw = rows[0]?.pinned_badge_ids;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async savePinnedBadges(
    athleteId: string,
    pinnedBadgeIds: string[]
  ): Promise<string[]> {
    await pool.execute(
      `UPDATE athletes SET pinned_badge_ids = ? WHERE id = ?`,
      [JSON.stringify(pinnedBadgeIds), athleteId]
    );
    return pinnedBadgeIds;
  }
}