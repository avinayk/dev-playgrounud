// components/InvitePlayersModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Mail,
  Plus,
  Loader2,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAthletesForChat } from '../services/chat.service';
import { sendGameInvites } from '../services/pickupGames';  // ✅ ADD IMPORT

interface InvitePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: {
    id: string;
    title: string;
    location?: string;
    date?: string;
    time?: string;
    sport?: string;          // ✅ ADD — filter ke liye
  } | null;
  participants?: any[];
  currentUserId?: string | null;
}

const BASE_URL =
  import.meta.env?.VITE_PUBLIC_URL ?? 'https://www.playgroundleague.pro';

export const InvitePlayersModal: React.FC<InvitePlayersModalProps> = ({
  isOpen,
  onClose,
  game,
  participants = [],
  currentUserId,
}) => {
  const [emails, setEmails] = useState('');
  const [allAthletes, setAllAthletes] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const registrationLink = `${BASE_URL}/?gameId=${game?.id}`;

  /* ─── Load athletes ─── */
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingUsers(true);
        const data = await fetchAthletesForChat(currentUserId);
        if (!cancelled) setAllAthletes(data);
      } catch (err) {
        console.error('❌ Load users for invite:', err);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUserId]);

  /* ─── ✅ Filter: same sport + not joined + not me ─── */
  const quickAddUsers = useMemo(() => {
    // IDs to exclude — already joined + me
    const excludeIds = new Set<string>();
    excludeIds.add(currentUserId ?? '');

    participants.forEach((p) => {
      const id = p.athlete_id || p.id;
      if (id) excludeIds.add(id);
    });

    // Filter
    return allAthletes
      .filter((a) => {
        // Exclude joined/me
        if (excludeIds.has(a.id)) return false;

        // ✅ Same sport filter (agar game.sport available ho)
        if (game?.sport && a.primarySport) {
          const gameSport = game.sport.toLowerCase().trim();
          const athleteSport = a.primarySport.toLowerCase().trim();
          if (gameSport !== athleteSport) return false;
        }

        return true;
      })
      .slice(0, 12); // Max 12 suggestions
  }, [allAthletes, participants, currentUserId, game?.sport]);

  if (!isOpen || !game) return null;

  /* ─── Toggle user ─── */
  const toggleUser = (user: any) => {
    const email = user.email || null;
    const id = user.id;

    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (email) {
          setEmails((prev) =>
            prev
              .split(',')
              .map((e) => e.trim())
              .filter((e) => e.toLowerCase() !== email.toLowerCase())
              .join(', ')
          );
        }
      } else {
        next.add(id);
        if (email) {
          setEmails((prev) => {
            const list = prev
              .split(',')
              .map((e) => e.trim())
              .filter(Boolean);
            if (!list.some((e) => e.toLowerCase() === email.toLowerCase())) {
              list.push(email);
            }
            return list.join(', ');
          });
        }
      }
      return next;
    });
  };

  /* ─── Copy link ─── */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopiedLink(true);
      toast.success('Link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  /* ─── Send invites ─── */
    const handleSend = async () => {
        const emailList = emails
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        console.log(emailList);
        if (emailList.length === 0) {
            toast.error('Please add at least one email');
            return;
        }

        if (!currentUserId) {
            toast.error('You must be logged in');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalid = emailList.filter((e) => !emailRegex.test(e));
        if (invalid.length > 0) {
            toast.error(`Invalid email: ${invalid[0]}`);
            return;
        }

        setSending(true);
        try {
            console.log('📧 Sending invites to:', emailList);

            // ✅ REAL API CALL
            const result = await sendGameInvites(
            game.id,
            emailList,
            currentUserId
            );

            if (result.sent > 0) {
            toast.success(
                `✅ Sent ${result.sent} invite${result.sent > 1 ? 's' : ''}!${
                result.failed > 0 ? ` (${result.failed} failed)` : ''
                }`
            );
            } else {
            toast.error('Failed to send invites');
            }

            setEmails('');
            setSelectedUserIds(new Set());
            onClose();
        } catch (err) {
            console.error('❌ Send invites failed:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to send invites');
        } finally {
            setSending(false);
        }
    };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f23] rounded-3xl max-w-lg w-full shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <p className="text-lime-400 text-xs font-black italic uppercase tracking-wider mb-1">
              Send Direct Player Invites
            </p>
            <h2 className="text-lg font-black italic uppercase text-white leading-tight">
              {game.title}
            </h2>
            <p className="text-xs text-indigo-300 mt-2">
              Send email invites. Unregistered players will receive a direct
              link to sign up and auto-join this game.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 hover:text-white transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ─── Quick Add Teammates ─── */}
          <div>
            <p className="text-xs font-black italic uppercase text-amber-300 mb-2 flex items-center gap-1.5">
              <span className="text-base">⚡</span>
              Quick Add Teammates:
              {game.sport && (
                <span className="text-lime-400 font-mono text-[10px] bg-lime-400/10 px-2 py-0.5 rounded-full border border-lime-400/20">
                  {game.sport.toUpperCase()} players
                </span>
              )}
            </p>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs text-indigo-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading {game.sport || 'sport'} players...
              </div>
            ) : quickAddUsers.length === 0 ? (
              <p className="text-xs text-indigo-400 italic py-2">
                No other {game.sport || ''} players available to invite
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {quickAddUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                        isSelected
                          ? 'bg-lime-400 text-black border-lime-400 shadow-md shadow-lime-400/20'
                          : 'bg-indigo-900/60 text-indigo-200 border-white/10 hover:bg-indigo-800 hover:border-lime-400/30'
                      }`}
                      title={`${user.name} • ${user.primarySport || 'Athlete'}`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {user.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Email Addresses ─── */}
          <div>
            <label className="text-xs font-black italic uppercase text-lime-400 mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Addresses
              <span className="text-indigo-400 font-normal normal-case not-italic">
                (comma-separated for multiple)
              </span>
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="teammate1@gmail.com, recruit2@school.edu, player3@ball.org"
              rows={3}
              className="w-full bg-indigo-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-indigo-400/50 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition outline-none resize-none"
            />
            {emails.trim() && (
              <p className="text-[10px] text-indigo-400 mt-1">
                {emails.split(',').filter((e) => e.trim()).length} email(s)
                detected
              </p>
            )}
          </div>

          {/* ─── Game Registration Link ─── */}
          <div>
            <label className="text-xs font-black italic uppercase text-indigo-300 mb-2 block">
              Game Registration Link:
            </label>
            <div className="flex items-center gap-2 bg-indigo-900/60 border border-white/10 rounded-2xl px-4 py-3">
              <p className="flex-1 text-xs text-lime-400 font-mono truncate">
                {registrationLink}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition flex-shrink-0 ${
                  copiedLink
                    ? 'bg-lime-400 text-black'
                    : 'bg-indigo-800 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─── Send Button ─── */}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !emails.trim()}
            className="w-full py-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-2xl transition shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Automated Email Invites
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePlayersModal;