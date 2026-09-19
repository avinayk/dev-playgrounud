import React, { useMemo } from 'react';
import { CourtPOI, AthleteProfile } from '../types';
import { Trophy, X } from 'lucide-react';

interface CourtSpecificLeaderboardProps {
  court: CourtPOI;
  athletes?: AthleteProfile[];
  onSelectAthlete?: (athlete: AthleteProfile) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CourtSpecificLeaderboard: React.FC<CourtSpecificLeaderboardProps> = ({
  court,
  athletes = [],
  onSelectAthlete,
  onClose,
  isModal = false,
}) => {
  const topAthletes = useMemo(() => {
    return athletes.slice(0, 5).map((a, i) => ({
      ...a,
      gamesPlayed: 12 - i,
      pointsScored: 145 - i * 12,
      winRate: 85 - i * 5,
      rank: i + 1,
    }));
  }, [athletes]);

  const content = (
    <div className="bg-indigo-950 rounded-3xl border border-lime-400/30 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-400 text-black rounded-xl">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black italic uppercase text-white">
              {court.name} Leaders
            </h4>
            <p className="text-[10px] text-indigo-300 font-mono">
              Top athletes at this venue
            </p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {topAthletes.length === 0 ? (
        <p className="text-xs text-indigo-300 text-center py-4">
          No athletes logged yet at this court.
        </p>
      ) : (
        <div className="space-y-1.5">
          {topAthletes.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectAthlete?.(a as any)}
              className="w-full p-2 bg-indigo-900/50 hover:bg-indigo-900/80 rounded-xl border border-white/5 hover:border-lime-400/40 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-lime-400 text-black font-black text-[10px] flex items-center justify-center font-mono">
                  #{a.rank}
                </span>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {a.name || 'Athlete'}
                  </span>
                  <span className="text-[10px] text-indigo-300">
                    {a.gamesPlayed} games • {a.winRate}% win rate
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-black text-lime-400 block">
                  {a.pointsScored}
                </span>
                <span className="text-[9px] text-indigo-400 uppercase">PTS</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="max-w-md w-full">{content}</div>
      </div>
    );
  }

  return content;
};