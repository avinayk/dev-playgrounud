// utils/leveling.ts
/**
 * Leveling & XP Progression System for Playground League
 * 50 Levels with 15% compound scaling XP requirement curve + level titles.
 */

export interface LevelInfo {
  level: number;
  levelTitle: string;
  totalXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPct: number;
  isMaxLevel: boolean;
  isMilestoneLevel: boolean;
  milestoneLevelTier?: 10 | 25 | 50;
  eliteChallengeAnnouncement?: EliteChallenge;
}

export interface EliteChallenge {
  id: string;
  unlockedAtLevel: number;
  title: string;
  description: string;
  sportRequirement?: string;
  xpReward: number;
  badgeReward?: string;
  isCompleted?: boolean;
}

export const MAX_LEVEL = 50;
const BASE_LEVEL_XP = 500;
const LEVEL_XP_INCREMENT = 5000;
const GROWTH_FACTOR = 1.15; // 15% more XP per level

/**
 * Cumulative XP required to REACH a specific level (1..50)
 * Gap(k) = 500 * 1.15^(k-1)
 * Cumulative(L) = sum(Gap(1..L-1))
 */
export function getCumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
 
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += BASE_LEVEL_XP + (l - 1) * LEVEL_XP_INCREMENT;
  }
  return total;
}

/**
 * Title for a given level (1..50)
 */
export function getLevelTitle(level: number): string {
  if (level >= 50) return 'Immortal GOAT 🐐';
  if (level >= 45) return 'Hall of Famer 🏆';
  if (level >= 40) return 'Grandmaster Athlete ⚡';
  if (level >= 35) return 'Playground Legend 👑';
  if (level >= 30) return 'League MVP 🥇';
  if (level >= 25) return 'Franchise Icon 🌟';
  if (level >= 20) return 'League All-Star 🔥';
  if (level >= 15) return 'Court General 🎯';
  if (level >= 10) return 'Playground Starter 🏀';
  if (level >= 5) return 'Rising Star ⭐';
  return 'Rookie Prospect 🧢';
}

export const ELITE_CHALLENGE_IDS = {
  LEVEL_10: 'challenge_lvl10',
  LEVEL_25: 'challenge_lvl25',
  LEVEL_50: 'challenge_lvl50',
} as const;

export const ELITE_CHALLENGES: EliteChallenge[] = [
  {
    id: 'challenge_lvl5',
    unlockedAtLevel: 5,
    title: 'Rookie Phenom Sprint',
    description: 'Win 3 consecutive pickup games in a single week.',
    sportRequirement: 'All Sports',
    xpReward: 350,
    badgeReward: 'Rising Star Flame',
  },
  {
    id: 'challenge_lvl10',
    unlockedAtLevel: 10,
    title: "Court Captain's Vision",
    description: 'Record 15 total career assists.',
    sportRequirement: 'Basketball / Soccer',
    xpReward: 650,
    badgeReward: 'Playmaker Vision',
  },
  {
    id: 'challenge_lvl15',
    unlockedAtLevel: 15,
    title: 'Multi-Sport Polymath',
    description: 'Log verified stats in 3 distinct sports.',
    sportRequirement: 'Multi-Sport',
    xpReward: 1000,
    badgeReward: 'Polymath Crown',
  },
  {
    id: 'challenge_lvl20',
    unlockedAtLevel: 20,
    title: 'Clutch Giant Slayer',
    description: 'Defeat a Top 5 ranked athlete.',
    sportRequirement: 'All Sports',
    xpReward: 1500,
    badgeReward: 'Giant Slayer Shield',
  },
  {
    id: 'challenge_lvl25',
    unlockedAtLevel: 25,
    title: 'Franchise Scoring Titan',
    description: 'Accumulate 150 total career points.',
    sportRequirement: 'All Sports',
    xpReward: 2500,
    badgeReward: 'Titan Trophy',
  },
  {
    id: 'challenge_lvl30',
    unlockedAtLevel: 30,
    title: 'MVP Ironclad Streak',
    description: 'Maintain a 10-day active streak.',
    sportRequirement: 'Daily Check-in',
    xpReward: 4000,
    badgeReward: 'Ironclad MVP',
  },
  {
    id: 'challenge_lvl40',
    unlockedAtLevel: 40,
    title: 'Grandmaster Court Supremacy',
    description: 'Earn 15,000 total XP.',
    sportRequirement: 'League Overall',
    xpReward: 7500,
    badgeReward: 'Grandmaster Seal',
  },
  {
    id: 'challenge_lvl50',
    unlockedAtLevel: 50,
    title: 'Immortal GOAT Legacy',
    description: 'Complete 50 logged matches and reach Level 50.',
    sportRequirement: 'All Sports',
    xpReward: 15000,
    badgeReward: 'Immortal GOAT Ring',
  },
];

export function getEliteChallengesForLevel(
  userLevel: number
): (EliteChallenge & { isUnlocked: boolean })[] {
  return ELITE_CHALLENGES.map((ch) => ({
    ...ch,
    isUnlocked: userLevel >= ch.unlockedAtLevel,
  }));
}

/**
 * MAIN FUNCTION — pass valuexp, get everything
 */
export function getLevelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, totalXp || 0);

  // Find highest level reachable
  let level = 1;
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (xp >= getCumulativeXpForLevel(l)) {
      level = l;
    } else {
      break;
    }
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const currentLevelXpFloor = getCumulativeXpForLevel(level);
  const nextLevelXpFloor = isMaxLevel
    ? currentLevelXpFloor
    : getCumulativeXpForLevel(level + 1);

  const xpInCurrentLevel = xp - currentLevelXpFloor;
  const xpRequiredForNextLevel = isMaxLevel
    ? 1
    : nextLevelXpFloor - currentLevelXpFloor;

  const progressPct = isMaxLevel
    ? 100
    : Math.min(
        100,
        Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100))
      );

  const isMilestoneLevel = level === 10 || level === 25 || level === 50;
  let milestoneLevelTier: 10 | 25 | 50 | undefined = undefined;
  if (level === 10) milestoneLevelTier = 10;
  else if (level === 25) milestoneLevelTier = 25;
  else if (level === 50) milestoneLevelTier = 50;

  const eliteChallengeAnnouncement = ELITE_CHALLENGES.find(
    (c) => c.unlockedAtLevel === level
  );

  return {
    level,
    levelTitle: getLevelTitle(level),
    totalXp: xp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPct,
    isMaxLevel,
    isMilestoneLevel,
    milestoneLevelTier,
    eliteChallengeAnnouncement,
  };
}

/**
 * Small helper — find XP needed for a specific level (for UI hints)
 */
export function getXpForNextLevel(currentLevel: number): number {
  return getCumulativeXpForLevel(currentLevel + 1) -
    getCumulativeXpForLevel(currentLevel);
}