// components/ShareGameModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  QrCode,
  MessageCircle,
  Mail,
  Send,
  Hash,
  Briefcase,
  Users,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: {
    id: string;
    title: string;
    location?: string;
    date?: string;
    time?: string;
  } | null;
}

const BASE_URL =
  import.meta.env?.VITE_PUBLIC_URL ?? 'https://www.playgroundleague.pro';

export const ShareGameModal: React.FC<ShareGameModalProps> = ({
  isOpen,
  onClose,
  game,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // ✅ Detect native share support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanNativeShare(true);
    }
  }, []);

  if (!isOpen || !game) return null;

  const shareUrl = `${BASE_URL}/?gameId=${game.id}`;
  const shareText = `🏀 Join me for "${game.title}" on Playground League!`;

  /* ─── Native share (OS-level) ─── */
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: game.title,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        // User cancelled
        console.log('Share cancelled');
      }
    } else {
      handleCopy();
    }
  };

  /* ─── Copy link ─── */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied! 🔗');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy link');
    }
  };

  /* ─── Web share links (fallback) ─── */
  const shareTo = {
    whatsapp: () =>
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
        '_blank'
      ),
    facebook: () =>
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        '_blank'
      ),
    twitter: () =>
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        '_blank'
      ),
    linkedin: () =>
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        '_blank'
      ),
    telegram: () =>
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        '_blank'
      ),
    email: () =>
      window.open(
        `mailto:?subject=${encodeURIComponent(game.title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`
      ),
    sms: () =>
      window.open(`sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`),
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="bg-[#f3f3f3] text-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header (light theme) ─── */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <Share2 className="w-4 h-4 text-gray-700" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">Share link</h2>
          </div>

          <div className="flex items-center gap-1">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold mr-1">
              Y
            </div>
            <button className="p-1.5 rounded-full hover:bg-black/5 text-gray-500">
              <span className="text-lg leading-none">···</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Link preview (white card) ─── */}
        <div className="mx-5 p-3 bg-white rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              Pickup Run: {game.title}
            </p>
            <p className="text-xs text-gray-500 truncate">{shareUrl}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowQR((v) => !v)}
              className={`p-1.5 rounded-lg transition border ${
                showQR
                  ? 'bg-black text-white border-black'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title="Show QR code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={handleNativeShare}
              className="p-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition"
              title="Share"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── QR Code ─── */}
        {showQR && (
          <div className="mx-5 mt-3 p-4 bg-white rounded-xl shadow-sm flex flex-col items-center">
            <img
              src={qrCodeUrl}
              alt="QR code"
              className="w-48 h-48"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <p className="text-xs text-gray-600 mt-2 font-medium">
              Scan to join the game
            </p>
          </div>
        )}

        {/* ─── Contact Suggestions (device apps) ─── */}
        {canNativeShare && (
          <div className="mt-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Suggested</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Nearby Share */}
              <SuggestedApp
                label="Nearby Share"
                bg="bg-gradient-to-br from-blue-500 to-blue-700"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-6 h-6 text-white"
                  >
                    <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" />
                  </svg>
                }
                onClick={handleNativeShare}
              />

              <SuggestedApp
                label="Messages"
                bg="bg-gradient-to-br from-green-400 to-green-600"
                icon={<MessageCircle className="w-6 h-6 text-white" />}
                onClick={shareTo.sms}
              />

              <SuggestedApp
                label="Mail"
                bg="bg-gradient-to-br from-red-400 to-red-600"
                icon={<Mail className="w-6 h-6 text-white" />}
                onClick={shareTo.email}
              />

              <SuggestedApp
                label="WhatsApp"
                bg="bg-[#25D366]"
                icon={<MessageCircle className="w-6 h-6 text-white" />}
                onClick={shareTo.whatsapp}
              />
            </div>
          </div>
        )}

        {/* ─── Share using ─── */}
        <div className="p-5 pt-2">
          <p className="text-xs text-gray-500 mb-3 font-medium">Share using</p>

          <div className="grid grid-cols-4 gap-y-5 gap-x-3">
            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z" />
                </svg>
              }
              label="Nearby Sharing"
              bgColor="bg-white border border-gray-200"
              textColor="text-gray-700"
              onClick={handleNativeShare}
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              }
              label="Zoom Workplace"
              bgColor="bg-[#2D8CFF]"
              textColor="text-white"
              onClick={() =>
                window.open('https://zoom.us/share', '_blank')
              }
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M21.5 4.5l-19 8 4.5 1.5L9 18l2-2.5 5 3.5L21.5 4.5z" />
                </svg>
              }
              label="Outlook"
              bgColor="bg-[#0078D4]"
              textColor="text-white"
              onClick={shareTo.email}
            />

            <ShareButton
              icon={<MessageCircle className="w-6 h-6" />}
              label="WhatsApp"
              bgColor="bg-[#25D366]"
              textColor="text-white"
              onClick={shareTo.whatsapp}
            />

            <ShareButton
              icon={<Mail className="w-6 h-6" />}
              label="Gmail"
              bgColor="bg-white border border-gray-200"
              textColor="text-red-500"
              onClick={shareTo.email}
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                </svg>
              }
              label="LinkedIn"
              bgColor="bg-[#0A66C2]"
              textColor="text-white"
              onClick={shareTo.linkedin}
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
              label="Facebook"
              bgColor="bg-[#1877F2]"
              textColor="text-white"
              onClick={shareTo.facebook}
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              }
              label="Twitter"
              bgColor="bg-black"
              textColor="text-white"
              onClick={shareTo.twitter}
            />

            <ShareButton
              icon={<Send className="w-6 h-6" />}
              label="Telegram"
              bgColor="bg-[#0088cc]"
              textColor="text-white"
              onClick={shareTo.telegram}
            />

            <ShareButton
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              }
              label="Copilot"
              bgColor="bg-gradient-to-br from-purple-500 to-pink-500"
              textColor="text-white"
              onClick={() => {
                window.open('https://copilot.microsoft.com', '_blank');
              }}
            />

            <ShareButton
              icon={<Copy className="w-6 h-6" />}
              label={copied ? 'Copied!' : 'Copy Link'}
              bgColor={copied ? 'bg-green-500' : 'bg-gray-800'}
              textColor="text-white"
              onClick={handleCopy}
            />
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <p className="text-[11px] text-gray-600 leading-tight">
              Anyone with this link can view and join this game
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Reusable Share Button ─── */
const ShareButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor?: string;
  onClick: () => void;
}> = ({ icon, label, bgColor, textColor = 'text-white', onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
    title={label}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center transition group-hover:scale-110 shadow-sm ${bgColor} ${textColor}`}
    >
      {icon}
    </div>
    <span className="text-[10px] text-gray-700 font-medium text-center leading-tight">
      {label}
    </span>
  </button>
);

/* ─── Suggested App Icon ─── */
const SuggestedApp: React.FC<{
  icon: React.ReactNode;
  label: string;
  bg: string;
  onClick: () => void;
}> = ({ icon, label, bg, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group flex-shrink-0"
  >
    <div
      className={`w-14 h-14 rounded-full flex items-center justify-center transition group-hover:scale-105 ${bg}`}
    >
      {icon}
    </div>
    <span className="text-[10px] text-gray-700 font-medium text-center leading-tight max-w-[60px] truncate">
      {label}
    </span>
  </button>
);

export default ShareGameModal;