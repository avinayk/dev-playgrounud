// src/controllers/achievement.controller.ts
import type { Request, Response } from 'express';
import { AchievementService } from '../services/achievement.service';
import { getLevelInfo } from '../utils/leveling';

export class AchievementController {
  /* GET /api/achievements/:athleteId */
  static async listAchievements(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { athleteId } = req.params;

      const [milestones, claimedIds] = await Promise.all([
        AchievementService.getMilestones(athleteId),
        AchievementService.getClaimedIds(athleteId),
      ]);

      res.json({
        success: true,
        data: { milestones, claimedIds },
      });
    } catch (err) {
      console.error('❌ listAchievements:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error',
      });
    }
  }

  /* POST /api/achievements/:athleteId/claim */
  static async claimAchievement(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { milestoneId, xpReward, badgeName } = req.body;

      if (!milestoneId || !xpReward || !badgeName) {
        res.status(400).json({
          success: false,
          message: 'milestoneId, xpReward, badgeName required',
        });
        return;
      }

      const result = await AchievementService.claimMilestone(
        athleteId,
        String(milestoneId),
        Number(xpReward),
        String(badgeName)
      );

      res.json({
        success: true,
        data: {
          newXp: result.newXp,
          newLevel: result.newLevel,
          leveledUp: result.leveledUp,
          isMilestoneReached: result.isMilestoneReached,
          levelInfo: result.levelInfo,
        },
      });
    } catch (err) {
      console.error('❌ claimAchievement:', err);
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  }

  /* GET /api/achievements/:athleteId/pinned */
  static async getPinnedBadges(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { athleteId } = req.params;
      const [rows] = await (
        await import('../config/database')
      ).default.execute<any[]>(
        `SELECT pinned_badge_ids FROM athletes WHERE id = ?`,
        [athleteId]
      );
      const raw = rows[0]?.pinned_badge_ids;
      let pinned: string[] = [];
      if (raw) {
        try {
          pinned = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          pinned = [];
        }
      }
      res.json({ success: true, data: pinned });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  /* POST /api/achievements/:athleteId/pin */
  static async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const { athleteId } = req.params;
      const { pinnedBadgeIds } = req.body;

      if (!Array.isArray(pinnedBadgeIds)) {
        res.status(400).json({
          success: false,
          message: 'pinnedBadgeIds must be an array',
        });
        return;
      }

      const db = (await import('../config/database')).default;
      await db.execute(
        `UPDATE athletes SET pinned_badge_ids = ? WHERE id = ?`,
        [JSON.stringify(pinnedBadgeIds), athleteId]
      );

      res.json({ success: true, data: pinnedBadgeIds });
    } catch (err) {
      console.error('❌ togglePin:', err);
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }

  /* GET /api/achievements/:athleteId/level-info */
  static async getLevelInfoEndpoint(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { athleteId } = req.params;
      const db = (await import('../config/database')).default;
      const [rows] = await db.execute<any[]>(
        `SELECT valuexp FROM athletes WHERE id = ?`,
        [athleteId]
      );
      const xp = Number(rows[0]?.valuexp) || 0;
      res.json({ success: true, data: getLevelInfo(xp) });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed' });
    }
  }
}