import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Swords,
  Trophy,
  Crown,
  Edit3,
  X,
  User,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Tournament, TournamentMatch, TournamentTeam, PlayerBoxScore } from '../../types';

interface VisualTournamentBracketProps {
  tournament: Tournament;
  onUpdateMatchScore?: (
    tournamentId: string,
    matchId: string,
    score1: number,
    score2: number,
    winnerId?: string,
    boxScores?: PlayerBoxScore[]
  ) => void;
  onSetEditingMatch?: (editing: { tournamentId: string; match: TournamentMatch } | null) => void;
  hoveredMatchId?: string | null;
  setHoveredMatchId?: (id: string | null) => void;
  toggleMatchExpanded?: (id: string, e: React.MouseEvent) => void;
  expandedMatchIds?: Record<string, boolean>;
}

export const VisualTournamentBracket: React.FC<VisualTournamentBracketProps> = ({
  tournament,
  onSetEditingMatch,
}) => {
  const [bracketMode, setBracketMode] = useState<'visual_tree' | 'compact_list'>('visual_tree');
  const [selectedTeamModal, setSelectedTeamModal] = useState<TournamentTeam | null>(null);
  const [mvpModalMatch, setMvpModalMatch] = useState<TournamentMatch | null>(null);
  const [selectedMvpPlayer, setSelectedMvpPlayer] = useState<string>('');
  const [mvpVotes, setMvpVotes] = useState<Record<string, { playerName: string; votes: number }>>({});
  const [mvpToast, setMvpToast] = useState<string | null>(null);

  const displayMatches = useMemo(() => {
    if (tournament.matches && tournament.matches.length > 0) {
      return tournament.matches;
    }

    // Auto-generate bracket if no matches
    const teams = tournament.registeredTeams || [];
    const generated: TournamentMatch[] = [];

    generated.push({
      id: `gen_m1`,
      tournamentId: tournament.id,
      round: 1,
      roundName: 'Semifinal #1',
      matchNumber: 1,
      status: 'scheduled',
      scheduledTime: '10:00 AM',
      team1: teams[0] || { id: 't1', name: 'Seed 1 (Pending)', seed: 1, captainName: 'TBD', members: [] },
      team2: teams[3] || teams[1] || { id: 't4', name: 'Seed 4 (Pending)', seed: 4, captainName: 'TBD', members: [] },
      score1: 0,
      score2: 0,
    });

    generated.push({
      id: `gen_m2`,
      tournamentId: tournament.id,
      round: 1,
      roundName: 'Semifinal #2',
      matchNumber: 2,
      status: 'scheduled',
      scheduledTime: '11:30 AM',
      team1: teams[1] || { id: 't2', name: 'Seed 2 (Pending)', seed: 2, captainName: 'TBD', members: [] },
      team2: teams[2] || { id: 't3', name: 'Seed 3 (Pending)', seed: 3, captainName: 'TBD', members: [] },
      score1: 0,
      score2: 0,
    });

    generated.push({
      id: `gen_m3`,
      tournamentId: tournament.id,
      round: 2,
      roundName: 'Championship Final 🏆',
      matchNumber: 3,
      status: 'scheduled',
      scheduledTime: '2:00 PM',
      score1: 0,
      score2: 0,
    });

    return generated;
  }, [tournament]);

  const roundNumbers = useMemo(() => {
    const rounds = Array.from(new Set(displayMatches.map((m) => m.round))).sort((a, b) => a - b);
    return rounds.length > 0 ? rounds : [1, 2];
  }, [displayMatches]);

  const championMatch = displayMatches.find(
    (m) => m.round === Math.max(...roundNumbers) && m.status === 'completed'
  );
  const championTeam = championMatch?.winnerId
    ? championMatch.team1?.id === championMatch.winnerId
      ? championMatch.team1
      : championMatch.team2
    : null;

  const triggerCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#a3e635', '#38bdf8', '#f59e0b', '#ec4899'],
    });
  };

  const handleCastMvpVote = (match: TournamentMatch, playerName: string) => {
    if (!playerName) return;
    const current = mvpVotes[match.id] || { playerName, votes: 0 };
    const updated = { playerName, votes: current.votes + 1 };
    setMvpVotes((prev) => ({ ...prev, [match.id]: updated }));
    setMvpToast(`🌟 Voted for ${playerName} as Standout MVP for Match #${match.matchNumber}!`);
    triggerCelebration();
    setMvpModalMatch(null);
    setTimeout(() => setMvpToast(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* Bracket Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/80 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-lime-400 text-black rounded-xl">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase italic text-white">
              Visual Tournament Bracket Tree
            </h4>
            <p className="text-[10px] text-indigo-300">
              {(tournament.registeredTeams || []).length} Registered Teams • {displayMatches.length} Matches
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-indigo-900/80 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setBracketMode('visual_tree')}
              className={`px-3 py-1 rounded-lg uppercase transition ${
                bracketMode === 'visual_tree'
                  ? 'bg-lime-400 text-black font-black shadow'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              Visual Tree 🌳
            </button>
            <button
              type="button"
              onClick={() => setBracketMode('compact_list')}
              className={`px-3 py-1 rounded-lg uppercase transition ${
                bracketMode === 'compact_list'
                  ? 'bg-lime-400 text-black font-black shadow'
                  : 'text-indigo-300 hover:text-white'
              }`}
            >
              List 📋
            </button>
          </div>

          {championTeam && (
            <button
              type="button"
              onClick={triggerCelebration}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-lime-400 text-black font-black uppercase text-[10px] rounded-xl shadow-lg transition flex items-center space-x-1"
            >
              <Crown className="w-3.5 h-3.5 fill-black" />
              <span>Celebrate 🎉</span>
            </button>
          )}
        </div>
      </div>

      {/* Bracket Canvas */}
      {bracketMode === 'visual_tree' ? (
        <div className="bg-indigo-950/60 p-6 rounded-2xl border border-white/10 overflow-x-auto">
          <div className="flex items-center space-x-8 min-w-max">
            {roundNumbers.map((roundNum) => {
              const roundMatches = displayMatches.filter((m) => m.round === roundNum);
              const roundLabel =
                roundMatches[0]?.roundName ||
                (roundNum === Math.max(...roundNumbers) ? 'Championship Final 🏆' : `Round ${roundNum}`);

              return (
                <div key={roundNum} className="flex flex-col items-center space-y-4">
                  <div className="px-3 py-1 bg-lime-400/20 text-lime-300 text-[10px] font-black uppercase rounded-full border border-lime-400/40">
                    {roundLabel}
                  </div>

                  <div
                    className="flex flex-col justify-around space-y-4"
                    style={{ minHeight: `${roundMatches.length * 120}px` }}
                  >
                    {roundMatches.map((m) => {
                      const isCompleted = m.status === 'completed';
                      const team1Won = m.winnerId === m.team1?.id;
                      const team2Won = m.winnerId === m.team2?.id;

                      return (
                        <div
                          key={m.id}
                          className="w-64 bg-indigo-950 rounded-2xl border-2 border-indigo-800 hover:border-lime-400/60 transition shadow-xl p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[9px] text-indigo-300 font-bold">
                            <span>Match #{m.matchNumber}</span>
                            <span className="text-indigo-400 font-mono">{m.scheduledTime || 'TBD'}</span>
                          </div>

                          {/* Team 1 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                              team1Won
                                ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                                : 'bg-indigo-900/60 text-white'
                            }`}
                          >
                            <span className="truncate">
                              {m.team1?.name || 'TBD'}
                            </span>
                            <span className="font-mono font-black text-sm ml-2">
                              {m.score1 ?? 0}
                            </span>
                          </div>

                          {/* Team 2 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                              team2Won
                                ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                                : 'bg-indigo-900/60 text-white'
                            }`}
                          >
                            <span className="truncate">
                              {m.team2?.name || 'TBD'}
                            </span>
                            <span className="font-mono font-black text-sm ml-2">
                              {m.score2 ?? 0}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() =>
                                onSetEditingMatch?.({
                                  tournamentId: tournament.id,
                                  match: m,
                                })
                              }
                              className="text-[10px] text-lime-400 hover:underline font-black uppercase flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Score</span>
                            </button>

                            {isCompleted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMvpModalMatch(m);
                                  const t1 = m.team1?.members?.map((mem: any) =>
                                    typeof mem === 'string' ? mem : mem.name
                                  ) || [];
                                  const t2 = m.team2?.members?.map((mem: any) =>
                                    typeof mem === 'string' ? mem : mem.name
                                  ) || [];
                                  setSelectedMvpPlayer(t1[0] || t2[0] || '');
                                }}
                                className="text-[10px] text-amber-300 hover:underline font-black uppercase flex items-center space-x-1"
                              >
                                <Crown className="w-3 h-3" />
                                <span>Vote MVP</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Compact List */
        <div className="space-y-3 bg-indigo-900/30 p-4 rounded-2xl border border-white/5">
          {displayMatches.map((m) => (
            <div
              key={m.id}
              className="p-3 bg-indigo-950 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-900 text-lime-400 font-black flex items-center justify-center text-xs shrink-0">
                  #{m.matchNumber}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-white">
                      {m.roundName || `Round ${m.round}`}
                    </span>
                    <span className="text-[10px] text-indigo-300 font-mono">
                      • {m.scheduledTime || 'TBD'}
                    </span>
                  </div>
                  <div className="text-xs text-indigo-200 mt-0.5 font-bold">
                    <span className={m.winnerId === m.team1?.id ? 'text-lime-400' : ''}>
                      {m.team1?.name || 'TBD'} ({m.score1 ?? 0})
                    </span>{' '}
                    vs{' '}
                    <span className={m.winnerId === m.team2?.id ? 'text-lime-400' : ''}>
                      {m.team2?.name || 'TBD'} ({m.score2 ?? 0})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSetEditingMatch?.({ tournamentId: tournament.id, match: m })}
                className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-lime-400" />
                <span>Update Score</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MVP Toast */}
      {mvpToast && (
        <div className="p-3 bg-amber-400 text-black text-xs font-black uppercase rounded-2xl shadow-xl border border-amber-300 flex items-center justify-between">
          <span>{mvpToast}</span>
          <button onClick={() => setMvpToast(null)} className="text-black font-bold">
            ✕
          </button>
        </div>
      )}

      {/* MVP Voting Modal */}
      <AnimatePresence>
        {mvpModalMatch && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-indigo-950 border-2 border-amber-400/50 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-400 text-black rounded-xl">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase">Vote Match MVP 🌟</h3>
                    <p className="text-[10px] text-indigo-300">
                      {mvpModalMatch.roundName} • {mvpModalMatch.score1} - {mvpModalMatch.score2}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMvpModalMatch(null)}
                  className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[mvpModalMatch.team1, mvpModalMatch.team2].map((team, ti) => {
                  if (!team) return null;
                  const members =
                    team.members?.map((mem: any) =>
                      typeof mem === 'string' ? mem : mem.name
                    ) || [];
                  const list = members.length
                    ? members
                    : [team.captainName || `${team.name} Star`];

                  return (
                    <div key={ti}>
                      <div className="text-[10px] font-black uppercase text-lime-400 py-1">
                        {team.name}
                      </div>
                      {list.map((pName, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => setSelectedMvpPlayer(pName)}
                          className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between border transition mb-1 ${
                            selectedMvpPlayer === pName
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-indigo-900/60 text-white border-white/10'
                          }`}
                        >
                          <span>{pName}</span>
                          {selectedMvpPlayer === pName && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMvpModalMatch(null)}
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCastMvpVote(mvpModalMatch, selectedMvpPlayer)}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-1"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Submit Vote</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};