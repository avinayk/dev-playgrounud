// components/MvpModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Trophy, Crown, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMvpData, castMvpVote } from '../services/mvp.service';

interface MvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: { id: string; title: string; location?: string } | null;
  currentUserId: string | null;
}

export const MvpModal: React.FC<MvpModalProps> = ({
  isOpen,
  onClose,
  game,
  currentUserId,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !game || !currentUserId) return;
    loadData();
  }, [isOpen, game, currentUserId]);

  const loadData = async () => {
    if (!game || !currentUserId) return;
    try {
      setLoading(true);
      const d = await fetchMvpData(game.id, currentUserId);
      setData(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (targetId: string) => {
    if (!game || !currentUserId) return;
    try {
      setVotingFor(targetId);
      await castMvpVote(game.id, currentUserId, targetId);
      toast.success('Vote cast! 🏆');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      setVotingFor(null);
    }
  };

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f23] rounded-3xl max-w-lg w-full shadow-2xl border border-amber-400/20 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-indigo-900/60 text-indigo-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-xl font-black italic uppercase text-white">
            Player of the Game MVP
          </h2>
          <p className="text-xs text-indigo-300 mt-2">
            Cast your vote for the most valuable player of "{game.title}"
          </p>

          {data && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-400/10 border border-amber-400/30 rounded-full">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-black uppercase text-amber-300">
                {data.totalVotes} Total MVP Votes Cast
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
          </div>
        ) : !data ? (
          <div className="p-6 text-center text-indigo-400 text-sm">
            Failed to load MVP data
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {data.participants.map((p: any, idx: number) => {
              const isLeader = idx === 0 && p.vote_count > 0;
              const isMyVote = data.myVoteId === p.id;
              const isMe = p.id === currentUserId;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-4 border transition ${
                    isLeader
                      ? 'bg-amber-400/10 border-amber-400/40'
                      : 'bg-indigo-900/40 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <img
                        src={p.profilepicture || 'https://via.placeholder.com/48'}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      {isLeader && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-indigo-950">
                          <Crown className="w-3 h-3 text-black" />
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">{p.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                            YOU
                          </span>
                        )}
                        {isLeader && (
                          <span className="text-[9px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-black uppercase">
                            MVP Leader
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-indigo-400">
                        RSVP: GOING
                      </span>
                    </div>

                    {/* Votes */}
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-400">
                        {p.vote_count} {p.vote_count === 1 ? 'vote' : 'votes'}
                      </p>
                      <p className="text-xs text-indigo-400">
                        {p.percentage}%
                      </p>
                    </div>

                    {/* Vote button */}
                    <div className="ml-2">
                      {isMyVote ? (
                        <span className="inline-flex items-center gap-1 px-3 py-2 bg-amber-400 text-black font-black italic uppercase text-xs rounded-xl">
                          <Check className="w-3.5 h-3.5" />
                          Your Vote
                        </span>
                      ) : isMe ? (
                        <span className="px-3 py-2 bg-indigo-800/50 text-indigo-500 text-xs rounded-xl font-black">
                          YOU
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVote(p.id)}
                          disabled={votingFor === p.id}
                          className="px-3 py-2 bg-indigo-800 hover:bg-lime-400 hover:text-black text-white font-black italic uppercase text-xs rounded-xl transition disabled:opacity-50"
                        >
                          {votingFor === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Vote'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-indigo-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLeader ? 'bg-amber-400' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-[11px] text-amber-300 font-black italic">
                🏆 MVP winner earns +100 Playground XP
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white font-black italic uppercase text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};