// frontend/src/utils/sportUtils.ts
import { AthleteProfile, SportType, AthleteStats } from '../types';

export const ALL_SPORTS: { id: SportType; label: string; emoji: string }[] = [
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'baseball', label: 'Baseball', emoji: '⚾' },
  { id: 'softball', label: 'Softball', emoji: '🥎' },
  { id: 'pickleball', label: 'Pickleball', emoji: '🏓' },
  { id: 'soccer', label: 'Soccer', emoji: '⚽' },
  { id: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { id: 'football', label: 'Football', emoji: '🏈' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾' },
];

export function getSportLabel(sport: SportType): string {
  const item = ALL_SPORTS.find((s) => s.id === sport);
  return item ? `${item.label} ${item.emoji}` : sport;
}

export function getActiveSports(user: AthleteProfile | null | undefined): SportType[] {
  if (!user) return ['basketball'];
  const activeSet = new Set<SportType>();

  // Always include primary sport first
  if (user.primarySport) {
    activeSet.add(user.primarySport);
  }

  // Include any sport with gamesPlayed > 0
  if (user.stats) {
    ALL_SPORTS.forEach(({ id }) => {
      const sportStat = user.stats[id];
      if (sportStat && sportStat.gamesPlayed > 0) {
        activeSet.add(id);
      }
    });
  }

  return Array.from(activeSet);
}

export function getSportStatSummary(user: AthleteProfile | null | undefined, sport: SportType) {
  if (!user) return [];
  const st = user.stats ? user.stats[sport] : undefined;

  switch (sport) {
    case 'volleyball': {
      const b = (st as any) || { kills: 0, aces: 0, blocks: 0, digs: 0, gamesPlayed: 0 };
      const gp = b.gamesPlayed || 1;
      return [
        { label: 'Spike Kills 💥', value: b.kills || 0, sub: `${((b.kills || 0) / gp).toFixed(1)} Kills / Set`, highlight: true },
        { label: 'Service Aces ⚡', value: b.aces || 0, sub: 'Serve Winners' },
        { label: 'Net Blocks 🛡️', value: b.blocks || 0, sub: 'Net Rejections' },
        { label: 'Floor Digs 🥞', value: b.digs || 0, sub: `${b.gamesPlayed || 0} Sets Logged` },
      ];
    }
    case 'basketball': {
      if (!st) return [];
      const b = st as any;
      const ppg = b.gamesPlayed > 0 ? (b.pts / b.gamesPlayed).toFixed(1) : '0';
      const fgPct = b.fgAttempted > 0 ? ((b.fgMade / b.fgAttempted) * 100).toFixed(1) : '0';
      return [
        { label: 'Avg PPG', value: ppg, sub: `${b.pts} Total PTS`, highlight: true },
        { label: 'Assists', value: b.ast, sub: `${(b.ast / (b.gamesPlayed || 1)).toFixed(1)} APG` },
        { label: 'Rebounds', value: b.reb, sub: `${(b.reb / (b.gamesPlayed || 1)).toFixed(1)} RPG` },
        { label: 'FG %', value: `${fgPct}%`, sub: `${b.fgMade}/${b.fgAttempted} FG Made`, highlight: true },
      ];
    }
    case 'baseball': {
      const b = st as any;
      const avg = b.battingAvg ? b.battingAvg.toFixed(3).replace(/^0/, '') : '.000';
      return [
        { label: 'Batting Avg', value: avg, sub: `${b.hits} H / ${b.atBats} AB`, highlight: true },
        { label: 'Home Runs', value: b.homeRuns, sub: `${b.rbis} RBIs` },
        { label: 'Stolen Bases', value: b.stolenBases, sub: `${b.runs} Runs Scored` },
        { label: 'Games Played', value: b.gamesPlayed, sub: `Slugger Stats` },
      ];
    }
    case 'softball': {
      const b = st as any;
      const avg = b.battingAvg ? b.battingAvg.toFixed(3).replace(/^0/, '') : '.000';
      return [
        { label: 'Batting Avg', value: avg, sub: `${b.hits} H / ${b.atBats} AB`, highlight: true },
        { label: 'Home Runs', value: b.homeRuns, sub: `${b.rbis} RBIs` },
        { label: 'Stolen Bases', value: b.stolenBases, sub: `${b.runs} Runs Scored` },
        { label: 'Games Played', value: b.gamesPlayed, sub: `Fastpitch League` },
      ];
    }
    case 'pickleball': {
      const b = st as any;
      const winPct = b.winRate ? Math.round(b.winRate * 100) : (b.gamesPlayed > 0 ? Math.round((b.matchesWon / b.gamesPlayed) * 100) : 0);
      return [
        { label: 'Win Rate', value: `${winPct}%`, sub: `${b.matchesWon || 0}W - ${b.matchesLost || 0}L`, highlight: true },
        { label: 'Kitchen Dinks', value: b.dinksCount, sub: 'Short Game Accuracy' },
        { label: 'Aces Served', value: b.acesCount, sub: 'First Serve Impact' },
        { label: 'Games Played', value: b.gamesPlayed, sub: 'Doubles & Singles' },
      ];
    }
    case 'soccer': {
      const b = st as any;
      return [
        { label: 'Goals Scored', value: b.goals, sub: `${(b.goals / (b.gamesPlayed || 1)).toFixed(1)} per game`, highlight: true },
        { label: 'Assists', value: b.assists, sub: 'Key Playmaking' },
        { label: 'Clean Sheets', value: b.cleanSheets, sub: 'Defensive Record' },
        { label: 'Pass Acc %', value: `${b.passAccuracy || 85}%`, sub: `${b.gamesPlayed} Matches Played` },
      ];
    }
    case 'football': {
      const b = st as any;
      return [
        { label: 'Passing Yds', value: b.passingYards, sub: `${b.touchdowns} TDs Scored`, highlight: true },
        { label: 'Rushing Yds', value: b.rushingYards, sub: 'Ground Attack' },
        { label: 'Touchdowns', value: b.touchdowns, sub: `${b.interceptions} INTs` },
        { label: 'Games Played', value: b.gamesPlayed, sub: 'Gridiron League' },
      ];
    }
    case 'tennis': {
      const b = st as any;
      return [
        { label: 'Aces Served', value: b.aces, sub: `${b.firstServePercentage || 68}% First Serve`, highlight: true },
        { label: 'Break Points', value: b.breakPointsWon, sub: 'Capitalized Chances' },
        { label: '1st Serve %', value: `${b.firstServePercentage || 70}%`, sub: 'Accuracy' },
        { label: 'Matches Played', value: b.gamesPlayed, sub: 'Singles & Doubles' },
      ];
    }
  }

  return [];
}