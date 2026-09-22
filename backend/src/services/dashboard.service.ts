// backend/src/services/dashboard.service.ts
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { NotificationService } from './notification.service';
import { getIO } from '../socket/socketManager';
/* ═══════════════════════════════════════════
   HELPER: Get today's date from MySQL server
   (avoids UTC vs local timezone mismatch)
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

export class DashboardService {
  /* ═══════════════════════════════════════════
     DAILY CHECK-IN
     ═══════════════════════════════════════════ */
  static async dailyCheckIn(athleteId: string): Promise<{
    xpEarned: number;
    newStreak: number;
    alreadyCheckedIn: boolean;
    longestStreak: number;
    lastCheckinDate: string;
  }> {
    // ✅ Use MySQL server date — consistent across app
    const today = await getTodayDate();

    console.log('📅 Daily check-in for:', athleteId, '| today:', today);

    /* ─── 0. Verify athlete exists ─── */
    const [athleteExists] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM athletes WHERE id = ?`,
      [athleteId]
    );
    if (athleteExists.length === 0) {
      throw new Error('Athlete not found');
    }

    /* ─── 1. Check if already checked in today ─── */
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM athlete_checkins 
       WHERE athlete_id = ? AND checkin_date = ?`,
      [athleteId, today]
    );

    if (existing.length > 0) {
      console.log('   ⏭️ Already checked in today');

      const [athleteRows] = await pool.execute<RowDataPacket[]>(
        `SELECT daily_streak, longest_streak, last_checkin_date 
         FROM athletes WHERE id = ?`,
        [athleteId]
      );

      return {
        xpEarned: 0,
        newStreak: athleteRows[0]?.daily_streak || 0,
        alreadyCheckedIn: true,
        longestStreak: athleteRows[0]?.longest_streak || 0,
        lastCheckinDate: athleteRows[0]?.last_checkin_date
          ? String(athleteRows[0].last_checkin_date).split('T')[0]
          : today,
      };
    }

    /* ─── 2. Get last check-in for streak calculation ─── */
    const [lastCheckin] = await pool.execute<RowDataPacket[]>(
      `SELECT checkin_date, streak_after FROM athlete_checkins 
       WHERE athlete_id = ? 
       ORDER BY checkin_date DESC LIMIT 1`,
      [athleteId]
    );

    let newStreak = 1;

    if (lastCheckin.length > 0) {
      const lastDate = new Date(lastCheckin[0].checkin_date);
      const todayDate = new Date(today);
      const diffDays = Math.round(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log('   📊 Days since last check-in:', diffDays);

      if (diffDays === 1) {
        newStreak = (lastCheckin[0].streak_after || 1) + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      } else if (diffDays === 0) {
        // Same day — shouldn't happen (already handled above), but safe fallback
        newStreak = lastCheckin[0].streak_after || 1;
      }
    }

    const xpEarned = 100;

    /* ─── 3. Insert check-in record ─── */
    await pool.execute(
      `INSERT INTO athlete_checkins 
        (athlete_id, checkin_date, xp_awarded, streak_after)
       VALUES (?, ?, ?, ?)`,
      [athleteId, today, xpEarned, newStreak]
    );

    /* ─── 4. Update athlete record ─── */
    await pool.execute(
      `UPDATE athletes 
       SET valuexp = COALESCE(valuexp, 0) + ?,
           daily_streak = ?,
           longest_streak = GREATEST(COALESCE(longest_streak, 0), ?),
           last_checkin_date = ?
       WHERE id = ?`,
      [xpEarned, newStreak, newStreak, today, athleteId]
    );

    /* ─── 5. Log XP history ─── */
    await pool.execute(
      `INSERT INTO xp_history (athlete_id, amount, source, reference_id)
       VALUES (?, ?, 'daily_checkin', ?)`,
      [athleteId, xpEarned, today]
    );

    /* ─── 6. Get updated longest streak ─── */
    const [updated] = await pool.execute<RowDataPacket[]>(
      `SELECT longest_streak FROM athletes WHERE id = ?`,
      [athleteId]
    );

    const longestStreak = updated[0]?.longest_streak || newStreak;
    try {
      const notification = await NotificationService.create({
        userId: athleteId,
        type: 'achievement',
        title: '🔥 Daily Check-in Complete!',
        message: `You earned +${xpEarned} XP! Streak: ${newStreak} day${
          newStreak > 1 ? 's' : ''
        }.`,
        referenceId: `checkin_${today}`,
        actionUrl: '/dashboard',
        status: 'info',
      });

      // ⭐ Also emit via socket for instant badge update
      try {
        const io = getIO();
        io.to(`user:${athleteId}`).emit('notification:new', notification);
        console.log('📡 [checkin] Socket emitted notification to:', athleteId);
      } catch (socketErr) {
        console.warn('⚠️ Socket emit failed:', socketErr);
      }
    } catch (notifErr) {
      console.error('⚠️ Notification create failed (non-critical):', notifErr);
      // Don't fail the check-in if notification fails
    }
    console.log('   ✅ Check-in complete: +', xpEarned, 'XP, streak:', newStreak);

    return {
      xpEarned,
      newStreak,
      alreadyCheckedIn: false,
      longestStreak,
      lastCheckinDate: today,
    };
  }

  /* ═══════════════════════════════════════════
     GET CHECK-IN STATUS (for initial load)
     ═══════════════════════════════════════════ */
  static async getCheckInStatus(athleteId: string): Promise<{
    isCheckedInToday: boolean;
    dailyStreak: number;
    longestStreak: number;
    lastCheckinDate: string | null;
    recentCheckins: string[];
  }> {
    const today = await getTodayDate();

    const [athleteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT daily_streak, longest_streak, last_checkin_date 
       FROM athletes WHERE id = ?`,
      [athleteId]
    );

    if (athleteRows.length === 0) {
      throw new Error('Athlete not found');
    }

    const athlete = athleteRows[0];

    /* Recent check-ins (last 30 days) */
    const [checkins] = await pool.execute<RowDataPacket[]>(
      `SELECT checkin_date FROM athlete_checkins 
       WHERE athlete_id = ? 
       ORDER BY checkin_date DESC LIMIT 30`,
      [athleteId]
    );

    const checkinDates = checkins.map((c: any) => {
      const d = c.checkin_date;
      if (d instanceof Date) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return String(d).split('T')[0];
    });

    const isCheckedInToday = checkinDates.includes(today);

    console.log(
      '📊 Check-in status:',
      athleteId,
      '| today:', today,
      '| isCheckedIn:', isCheckedInToday,
      '| streak:', athlete.daily_streak
    );

    return {
      isCheckedInToday,
      dailyStreak: athlete.daily_streak || 0,
      longestStreak: athlete.longest_streak || 0,
      lastCheckinDate: athlete.last_checkin_date
        ? String(athlete.last_checkin_date).split('T')[0]
        : null,
      recentCheckins: checkinDates,
    };
  }
}