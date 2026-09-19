// src/components/RecentTeammates.tsx
import React from 'react';
import { AthleteProfile } from '../types/auth.types';
import { Users, ExternalLink, UserPlus } from 'lucide-react';

interface RecentTeammatesProps {
  user: AthleteProfile;
  allAthletes: AthleteProfile[];
  onSelectAthlete?: (athlete: AthleteProfile) => void;
  onInviteTeammate?: (athlete: AthleteProfile) => void;
}

export const RecentTeammates: React.FC<RecentTeammatesProps> = ({
  user,
  allAthletes,
  onSelectAthlete,
  onInviteTeammate,
}) => {
  // ── Build recent teammates list from user's statsHistory ──
  const teammatesMap = new Map<string, { athlete: AthleteProfile; gamesTogether: number; winsTogether: number }>();

  const statsHistory = (user as any)?.statsHistory || [];
  const last5 = statsHistory.slice(0, 5);

  last5.forEach((match: any) => {
    const isWin = match.isWin ?? match.result === 'W';
    const participants = match.participants || match.teammates || match.players || [];

    participants.forEach((p: any) => {
      const pid = typeof p === 'string' ? p : p?.id;
      if (!pid || pid === user.id) return;

      const matched = (allAthletes || []).find((a) => a.id === pid);
      if (!matched) return;

      const existing = teammatesMap.get(pid) || { athlete: matched, gamesTogether: 0, winsTogether: 0 };
      existing.gamesTogether += 1;
      if (isWin) existing.winsTogether += 1;
      teammatesMap.set(pid, existing);
    });
  });

  const recentTeammatesList = Array.from(teammatesMap.values())
    .sort((a, b) => b.gamesTogether - a.gamesTogether)
    .slice(0, 4)
    .map(({ athlete, gamesTogether, winsTogether }) => {
      const winRateTogether = Math.round((winsTogether / (gamesTogether || 1)) * 100);
      let synergyTier = '🔥 Rising Duo';
      if (winRateTogether >= 80 && gamesTogether >= 3) synergyTier = '💎 Elite Synergy';
      else if (winRateTogether >= 60 && gamesTogether >= 2) synergyTier = '⚡ Solid Chemistry';
      else if (winRateTogether >= 40) synergyTier = '🤝 Growing Bond';
      return { athlete, gamesTogether, winRateTogether, synergyTier };
    });

  if (recentTeammatesList.length === 0) {
    return null;
  }

  return (
    <div className="bg-indigo-900/60 p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-lime-400/20 text-lime-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black italic uppercase text-white tracking-wide flex items-center gap-2">
              <span>Recent Teammates</span>
              <span className="text-[10px] bg-lime-400/20 text-lime-300 font-extrabold px-2 py-0.5 rounded-full font-mono">
                Last 5 Matches
              </span>
            </h3>
            <p className="text-xs text-indigo-200/70">
              Teammates & opponents mapped from {user?.name || 'Athlete'}'s last 5 match histories
            </p>
          </div>
        </div>
      </div>

      {/* Teammates Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {recentTeammatesList.map(({ athlete, gamesTogether, winRateTogether, synergyTier }) => {
          const bball = (athlete as any).stats?.basketball || {};
          const ppg = (Number(bball.pts || 0) / (Number(bball.gamesPlayed || 1) || 1)).toFixed(1);

          return (
            <div
              key={athlete.id}
              className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 hover:border-lime-400/50 transition-all duration-200 flex flex-col justify-between space-y-3 relative group"
            >
              <div className="flex items-start space-x-3 cursor-pointer" onClick={() => onSelectAthlete?.(athlete)}>
                <img
                  src={(athlete as any).avatar || (athlete as any).profilepicture || 'https://via.placeholder.com/60'}
                  alt={athlete.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-lime-400/50 shrink-0 hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white text-sm truncate flex items-center gap-1 group-hover:text-lime-300 transition-colors">
                    <span>{athlete.name}</span>
                    <span className="text-[10px] text-lime-400 font-mono">#{(athlete as any).jersey || (athlete as any).jerseyNumber || 0}</span>
                  </h4>
                  <p className="text-[11px] text-indigo-300/70 truncate">
                    {(athlete as any).school || (athlete as any).schoolOrLeague || '—'}
                  </p>
                  <span className="inline-block mt-1 text-[9px] bg-indigo-900 text-lime-300 font-bold px-1.5 py-0.5 rounded border border-lime-400/20">
                    {synergyTier}
                  </span>
                </div>
              </div>

              {/* Stats & Synergy Specs */}
              <div className="bg-indigo-900/60 p-2.5 rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-300/80 font-bold uppercase">Runs Together</span>
                  <span className="font-extrabold text-white font-mono">{gamesTogether} / 5 Games</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-300/80 font-bold uppercase">Co-Win Rate</span>
                  <span className="font-extrabold text-lime-400 font-mono">{winRateTogether}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-300/80 font-bold uppercase">Scoring Avg</span>
                  <span className="font-extrabold text-amber-300 underline font-mono cursor-help">{ppg} PPG</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {onSelectAthlete && (
                  <button
                    onClick={() => onSelectAthlete(athlete)}
                    className="flex-1 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <span>Compare</span>
                    <ExternalLink className="w-3 h-3 text-indigo-300" />
                  </button>
                )}
                {onInviteTeammate && (
                  <button
                    onClick={() => onInviteTeammate(athlete)}
                    className="flex-1 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-[11px] rounded-lg transition flex items-center justify-center gap-1 shadow-md shadow-lime-400/20"
                  >
                    <UserPlus className="w-3 h-3 stroke-[2.5]" />
                    <span>Invite</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentTeammates;