// components/ReferralModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Gift, Copy, Share2, Users, Check, Sparkles, Loader2 } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  user: {
    id: string;
    name: string;
    level: number;
    subscriptionTier?: string;
    referralCode?: string;
    total_referrals: string;
    referral_xp: string;
    sent_invites_count: string;
  };
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [referralMethod, setReferralMethod] = useState<'link' | 'email'>('link');

  // Loading + feedback state for email invite
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Build the referral link from the user's persisted referralCode
  useEffect(() => {
    if (user?.referralCode) {
      setReferralLink(
        `${import.meta.env.VITE_PUBLIC_URL || 'https://playgroundleague.pro/'}/ref/${user.referralCode}`,
      );
    } else if (user?.name) {
      console.warn('[ReferralModal] Missing user.referralCode — using fallback. Backend should issue this.');
      const fallback = `${user.name.substring(0, 3).toUpperCase()}${user.id.slice(0, 4).toUpperCase()}`;
      setReferralLink(
        `${import.meta.env.VITE_PUBLIC_URL || 'https://playgroundleague.pro/'}/ref/${fallback}`,
      );
    } else {
      setReferralLink('');
      console.warn('[ReferralModal] No referralCode available yet from backend.');
    }
  }, [user]);

  // Handle ESC key to close + lock body scroll
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset transient state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setEmail('');
      setReferralMethod('link');
      setIsSending(false);
      setSendStatus(null);
    }
  }, [isOpen]);

  // Auto-dismiss success message after 3s
  useEffect(() => {
    if (sendStatus?.type === 'success') {
      const timer = setTimeout(() => setSendStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [sendStatus]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      onSave({ method: 'copy', link: referralLink });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Playground!',
          text: `Hey! Join me on Playground and earn rewards. Use my referral link: ${referralLink}`,
          url: referralLink,
        });
        onSave({ method: 'share', link: referralLink });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !referralLink || !user?.id || isSending) return;

    setIsSending(true);
    setSendStatus(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/referrals/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('playground_auth_token') || ''}`,
          },
          body: JSON.stringify({
            athleteId: user.id,
            email: email.trim().toLowerCase(),
            link: referralLink,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSendStatus({
          type: 'error',
          message: data.message || 'Failed to send invitation. Please try again.',
        });
        return;
      }

      // Success
      onSave({ method: 'email', email, link: referralLink });
      setEmail('');
      setSendStatus({
        type: 'success',
        message: 'Invitation sent successfully! 🎉',
      });
    } catch (err) {
      console.error('[ReferralModal] Network error:', err);
      setSendStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Calculate potential rewards based on subscription tier
  const getRewardMessage = () => {
    if (user?.subscriptionTier === 'pro') {
      return {
        title: '🌟 Premium Rewards',
        bonus: '250 XP per referral + Special Badge',
        xp: 250,
        color: 'from-amber-400 to-yellow-400',
      };
    }
    return {
      title: 'Referral Rewards',
      bonus: '150 XP per referral',
      xp: 150,
      color: 'from-lime-400 to-emerald-400',
    };
  };

  const rewards = getRewardMessage();

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-indigo-950/95 p-6 rounded-3xl w-11/12 max-w-lg border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-indigo-900/80 text-indigo-300 hover:text-white hover:bg-indigo-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className={`p-2 bg-gradient-to-r ${rewards.color} rounded-xl shadow-lg shadow-lime-400/20`}>
            <Gift className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase text-white">
              Refer & Earn
            </h2>
            <p className="text-sm text-indigo-300">
              {user?.name ? `Share with ${user.name}'s network` : 'Invite friends to join'}
            </p>
          </div>
        </div>

        {/* Rewards Card */}
        <div className="bg-gradient-to-r from-indigo-900/80 to-indigo-800/80 p-4 rounded-2xl border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-lime-400" />
              <span className="text-sm font-black text-white uppercase">
                {rewards.title}
              </span>
            </div>
            <span className={`text-xs font-black px-3 py-1 bg-gradient-to-r ${rewards.color} text-black rounded-full`}>
              +{rewards.xp} XP
            </span>
          </div>
          <p className="text-xs text-indigo-300 mt-1">
            {rewards.bonus} • Unlimited referrals • Track your progress
          </p>
        </div>

        {/* Referral Method Tabs */}
        <div className="flex space-x-2 mb-4 bg-indigo-900/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => {
              setReferralMethod('link');
              setSendStatus(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition ${
              referralMethod === 'link'
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4 inline mr-1" />
            Share Link
          </button>
          <button
            onClick={() => {
              setReferralMethod('email');
              setSendStatus(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition ${
              referralMethod === 'email'
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Invite Email
          </button>
        </div>

        {/* Link Sharing Method */}
        {referralMethod === 'link' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 bg-indigo-900/60 rounded-xl border border-white/10 p-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-transparent text-white text-sm font-mono px-3 py-1.5 outline-none"
                placeholder="Your referral link"
              />
              <button
                onClick={handleCopyLink}
                className={`p-2 rounded-lg transition ${
                  copied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-lime-400/20 text-lime-400 hover:bg-lime-400/40'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleShare}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black italic rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via Social</span>
            </button>

            <p className="text-[10px] text-indigo-400 text-center">
              {copied ? '✅ Link copied!' : 'Copy link or share directly to earn XP'}
            </p>
          </div>
        )}

        {/* Email Invitation Method */}
        {referralMethod === 'email' && (
          <form
            onSubmit={(e) => {
              void handleEmailReferral(e);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm text-indigo-300 font-medium">Friend's Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (sendStatus) setSendStatus(null);
                }}
                disabled={isSending}
                className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 placeholder-indigo-400/50 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="friend@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !email}
              className="w-full py-3 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-black font-black italic rounded-xl transition shadow-lg shadow-lime-400/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-lime-400 disabled:hover:to-emerald-400"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>

            {/* Success / Error feedback */}
            {sendStatus && (
              <div
                className={`flex items-center space-x-2 text-xs font-bold px-3 py-2 rounded-lg border ${
                  sendStatus.type === 'success'
                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                }`}
              >
                {sendStatus.type === 'success' ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{sendStatus.message}</span>
              </div>
            )}

            <p className="text-[10px] text-indigo-400 text-center">
              We'll send them a personalized invitation to join
            </p>
          </form>
        )}

        {/* Referral Stats */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs font-black text-indigo-400 uppercase">Sent</p>
            <p className="text-lg font-black text-white">{user?.sent_invites_count ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-indigo-400 uppercase">Joined</p>
            <p className="text-lg font-black text-white">{user?.total_referrals ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-indigo-400 uppercase">Earned</p>
            <p className="text-lg font-black text-lime-400">{user?.referral_xp ?? 0} XP</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-indigo-800/50 hover:bg-indigo-800 text-white font-bold rounded-xl transition"
          >
            Close
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black italic rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
          >
            <Gift className="w-4 h-4" />
            <span>Copy & Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};