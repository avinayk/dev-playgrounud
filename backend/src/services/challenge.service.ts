// src/services/challenge.service.ts
import pool from '../config/database';

/* ═══════════════════════════════════════════
   DB ROW TYPES
   ═══════════════════════════════════════════ */
interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  sport: string;
  xp_reward: number;
  target_count: number;
  icon: string;
  is_active: 0 | 1;
}

interface UserChallengeRow {
  id: number;
  athlete_id: string;
  challenge_id: string;
  progress: number;
  target: number;
  is_completed: 0 | 1;
  completed_at: string | null;
  xp_earned: number;
  period_start: string; // forced string via DATE_FORMAT
  period_end: string;
}

/* ═══════════════════════════════════════════
   DTO (returned to frontend)
   ═══════════════════════════════════════════ */
export interface ChallengeDTO {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  sport: string;
  xpReward: number;
  targetCount: number;
  icon: string;
  progress: number;
  target: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpEarned: number;
  isLocked: boolean;
  periodStart: string;
  periodEnd: string;
  isAvailable: boolean;
}

export interface CompleteChallengeResult {
  success: boolean;
  progress: number;
  target: number;
  isCompleted: boolean;
  xpEarned: number;
  message: string;
}

export class ChallengeService {
  /* ─── Format a Date to 'YYYY-MM-DD' ─── */
  private static formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /* ─── Get current period for a challenge type ─── */
  private static getPeriod(type: 'daily' | 'weekly'): {
    start: string;
    end: string;
  } {
    const now = new Date();

    if (type === 'daily') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      return {
        start: this.formatDate(start),
        end: this.formatDate(end),
      };
    }

    // Weekly — Monday 00:00 to next Monday 00:00
    const start = new Date(now);
    const day = start.getDay(); // 0 = Sun, 1 = Mon, ...
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return {
      start: this.formatDate(start),
      end: this.formatDate(end),
    };
  }

  /* ═══════════════════════════════════════════
     GET USER CHALLENGES
     ═══════════════════════════════════════════ */
  static async getUserChallenges(
    athleteId: string,
    sport?: string
  ): Promise<ChallengeDTO[]> {
    const daily = this.getPeriod('daily');
    const weekly = this.getPeriod('weekly');

    console.log('📅 Periods:', { daily, weekly });

    // Build sport filter (optional)
    const sportFilter = sport && sport !== 'all' ? `AND c.sport = ?` : '';
    const challengeParams: any[] = [];
    if (sportFilter) challengeParams.push(sport);

    const [challenges] = await pool.execute<ChallengeRow[]>(
      `SELECT c.* FROM challenges c
       WHERE c.is_active = 1 ${sportFilter}
       ORDER BY c.type ASC, c.xp_reward DESC`,
      challengeParams
    );

    // Fetch user_challenges for both daily and weekly period
    // DATE_FORMAT ensures period_start/period_end come back as strings (not Date objects)
    const [userChallenges] = await pool.execute<any[]>(
      `SELECT 
          id, athlete_id, challenge_id, progress, target,
          is_completed, completed_at, xp_earned,
          DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
          DATE_FORMAT(period_end,   '%Y-%m-%d') AS period_end
       FROM user_challenges 
       WHERE athlete_id = ? 
         AND (
           (period_start = ? AND period_end = ?) OR
           (period_start = ? AND period_end = ?)
         )`,
      [athleteId, daily.start, daily.end, weekly.start, weekly.end]
    );

    console.log('🔍 User progress records:', userChallenges.length);

    return challenges.map((challenge) => {
      const period = challenge.type === 'daily' ? daily : weekly;

      const uc = userChallenges.find(
        (u) =>
          u.challenge_id === challenge.id &&
          u.period_start === period.start
      );

      const progress = uc ? Number(uc.progress) || 0 : 0;
      const target = uc
        ? Number(uc.target) || challenge.target_count
        : challenge.target_count;
      const isCompleted = uc ? Number(uc.is_completed) === 1 : false;

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        sport: challenge.sport,
        xpReward: challenge.xp_reward,
        targetCount: challenge.target_count,
        icon: challenge.icon,
        progress,
        target,
        isCompleted,
        completedAt: uc?.completed_at ?? null,
        xpEarned: Number(uc?.xp_earned) || 0,
        isLocked: isCompleted,
        periodStart: period.start,
        periodEnd: period.end,
        isAvailable: !isCompleted,
      };
    });
  }

  /* ═══════════════════════════════════════════
     COMPLETE CHALLENGE (with concurrency safety)
     ═══════════════════════════════════════════ */
  static async completeChallenge(
    athleteId: string,
    challengeId: string,
    progressAmount: number = 1
  ): Promise<CompleteChallengeResult> {
    console.log('🎯 completeChallenge:', { athleteId, challengeId, progressAmount });

    // 1️⃣ Load challenge
    const [challenges] = await pool.execute<ChallengeRow[]>(
      `SELECT * FROM challenges WHERE id = ? AND is_active = 1`,
      [challengeId]
    );

    if (!challenges[0]) {
      throw new Error('Challenge not found or inactive');
    }

    const challenge = challenges[0];
    const period = this.getPeriod(challenge.type);
    const targetCount = Number(challenge.target_count) || 1;

    // 2️⃣ Load existing user_challenge row (if any)
    const [existing] = await pool.execute<UserChallengeRow[]>(
      `SELECT * FROM user_challenges
       WHERE athlete_id = ? AND challenge_id = ? AND period_start = ?`,
      [athleteId, challengeId, period.start]
    );

    // 3️⃣ Already completed? Block it
    if (existing[0]?.is_completed === 1) {
      throw new Error(
        `This ${challenge.type} challenge is already completed. Wait for next period.`
      );
    }

    const currentProgress = Number(existing[0]?.progress) || 0;
    const newProgress = Math.min(currentProgress + progressAmount, targetCount);
    const willComplete = newProgress >= targetCount;
    const xpToAward = willComplete ? Number(challenge.xp_reward) || 0 : 0;

    // 4️⃣ Insert or update user_challenges
    if (existing[0]) {
      await pool.execute(
        `UPDATE user_challenges
         SET progress = ?, target = ?, is_completed = ?, completed_at = ?, xp_earned = ?
         WHERE id = ?`,
        [
          newProgress,
          targetCount,
          willComplete ? 1 : 0,
          willComplete ? new Date() : null,
          xpToAward,
          existing[0].id,
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO user_challenges
           (athlete_id, challenge_id, progress, target, is_completed, completed_at, xp_earned, period_start, period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          athleteId,
          challengeId,
          newProgress,
          targetCount,
          willComplete ? 1 : 0,
          willComplete ? new Date() : null,
          xpToAward,
          period.start,
          period.end,
        ]
      );
    }

    // 5️⃣ Award XP only when challenge JUST completed (was not completed before, now is)
    //    Use the "before" state to avoid double-award
    const wasCompletedBefore = existing[0]?.is_completed === 1;
    const isNowCompleted = willComplete;

    if (!wasCompletedBefore && isNowCompleted && xpToAward > 0) {
      // Add XP to athlete
      await pool.execute(
        `UPDATE athletes SET valuexp = COALESCE(valuexp, 0) + ? WHERE id = ?`,
        [xpToAward, athleteId]
      );

      // Log XP history
      await pool.execute(
        `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
         VALUES (?, ?, 'challenge', ?)`,
        [athleteId, xpToAward, challengeId]
      );

      // Level-up check
      const [athleteRows] = await pool.execute<any[]>(
        `SELECT valuexp, level FROM athletes WHERE id = ?`,
        [athleteId]
      );

      const valuexp = Number(athleteRows[0]?.valuexp) || 0;
      const currentLevel = Number(athleteRows[0]?.level) || 1;
      const calculatedLevel = Math.floor(valuexp / 500) + 1;

      if (calculatedLevel > currentLevel) {
        await pool.execute(
          `UPDATE athletes SET level = ? WHERE id = ?`,
          [calculatedLevel, athleteId]
        );
        console.log(`⬆️ Level up: ${currentLevel} → ${calculatedLevel}`);
      }
    }

    // 6️⃣ Verify final state from DB
    const [verify] = await pool.execute<UserChallengeRow[]>(
      `SELECT progress, target, is_completed, xp_earned
       FROM user_challenges 
       WHERE athlete_id = ? AND challenge_id = ? AND period_start = ?`,
      [athleteId, challengeId, period.start]
    );

    const finalRow = verify[0];

    return {
      success: true,
      progress: Number(finalRow?.progress) || newProgress,
      target: Number(finalRow?.target) || targetCount,
      isCompleted: Number(finalRow?.is_completed) === 1,
      xpEarned: xpToAward,
      message:
        willComplete && !wasCompletedBefore
          ? `🎉 Challenge complete! +${xpToAward} XP`
          : `Progress: ${newProgress}/${targetCount}`,
    };
  }

  /* ═══════════════════════════════════════════
     GET USER XP SUMMARY
     ═══════════════════════════════════════════ */
  static async getUserXpSummary(athleteId: string): Promise<{
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    xpInCurrentLevel: number;
    levelProgress: number;
  }> {
    const [rows] = await pool.execute<any[]>(
      `SELECT valuexp, level FROM athletes WHERE id = ?`,
      [athleteId]
    );

    const totalXp = Number(rows[0]?.valuexp) || 0;
    const level = Number(rows[0]?.level) || 1;

    const xpForNextLevel = level * 500;
    const xpForCurrentLevel = (level - 1) * 500;
    const xpInCurrentLevel = totalXp - xpForCurrentLevel;
    const xpToNextLevel = xpForNextLevel - totalXp;
    const levelProgress = Math.min(
      100,
      Math.round((xpInCurrentLevel / 500) * 100)
    );

    return {
      totalXp,
      level,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      xpInCurrentLevel: Math.max(0, xpInCurrentLevel),
      levelProgress,
    };
  }

  static async getCompletedChallengeIds(athleteId: string): Promise<string[]> {
    const [rows] = await pool.execute<any[]>(
      `SELECT DISTINCT reference_id
       FROM xp_history
       WHERE athlete_id = ?
         AND source = 'video_challenge'
         AND reference_id IS NOT NULL`,
      [athleteId]
    );
    return rows.map((r) => r.reference_id);
  }

  
}