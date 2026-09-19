// utils/achievementXPIntegration.ts
import { AthleteProfile } from '../types';
import { getLevelInfo, LevelInfo } from './leveling';

export interface ClaimXpResult {
  updatedUser: AthleteProfile;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  xpClaimed: number;
  unlockedMilestoneTitle?: string;
  isMilestoneReached: boolean;
  milestoneTier?: 10 | 25 | 50;
  levelInfo: LevelInfo;
}

/**
 * Achievement XP Integration Helper
 *
 * Client-side helper that computes the new XP / level after awarding
 * a badge or milestone reward. The caller is responsible for persisting
 * the new `valuexp` to the backend.
 */
export function claimAchievementXP(
  user: AthleteProfile,
  xpAmount: number,
  badgeName?: string
): ClaimXpResult {
  const currentXp = (user as any).valuexp ?? (user as any).xp ?? 0;
  const safeAmount = Math.max(0, Number(xpAmount) || 0);
  const newXp = currentXp + safeAmount;

  const oldLevelInfo = getLevelInfo(currentXp);
  const newLevelInfo = getLevelInfo(newXp);

  const previousLevel = oldLevelInfo.level;
  const newLevel = newLevelInfo.level;
  const leveledUp = newLevel > previousLevel;

  const isMilestoneReached =
    leveledUp && (newLevel === 10 || newLevel === 25 || newLevel === 50);

  let milestoneTier: 10 | 25 | 50 | undefined;
  if (isMilestoneReached) {
    milestoneTier = newLevel as 10 | 25 | 50;
  }

  const updatedUser: AthleteProfile = {
    ...user,
    valuexp: newXp,
    level: newLevel,
    levelTitle: newLevelInfo.levelTitle,
  } as any;

  return {
    updatedUser,
    previousLevel,
    newLevel,
    leveledUp,
    xpClaimed: safeAmount,
    unlockedMilestoneTitle: badgeName,
    isMilestoneReached,
    milestoneTier,
    levelInfo: newLevelInfo,
  };
}