// frontend/src/components/ShareGoalModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import { AthleteProfile } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   Local task shape (matches WeeklyChallenges)
   ═══════════════════════════════════════════ */
export interface ShareGoalTask {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  icon: string;
  category: 'Skill' | 'Social' | 'Conditioning';
  sportLabel?: string;
  completed: boolean;
  claimed: boolean;
}

interface ShareGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ShareGoalTask | null;
  user: AthleteProfile;
}

export const ShareGoalModal: React.FC<ShareGoalModalProps> = ({
  isOpen,
  onClose,
  task,
  user,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  /* ═══════════════════════════════════════════
     CANVAS — Social Card Generator
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!isOpen || !task || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 630;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative arcs
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(600, 315, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 315);
    ctx.lineTo(1200, 315);
    ctx.stroke();

    // Border
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 1160, 590);

    // Corner accents
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(20, 20, 40, 12);
    ctx.fillRect(20, 20, 12, 40);
    ctx.fillRect(1140, 20, 40, 12);
    ctx.fillRect(1168, 20, 12, 40);
    ctx.fillRect(20, 598, 40, 12);
    ctx.fillRect(20, 570, 12, 40);
    ctx.fillRect(1140, 598, 40, 12);
    ctx.fillRect(1168, 570, 12, 40);

    // Header
    ctx.fillStyle = '#a3e635';
    ctx.font = '900 28px sans-serif';
    ctx.fillText('PLAYGROUND LEAGUE ⚡ VERIFIED MILESTONE', 70, 90);

    // Category
    const catText = `${(task.category || 'SKILL').toUpperCase()} CHALLENGE`;
    ctx.fillStyle = 'rgba(163, 230, 53, 0.2)';
    ctx.fillRect(70, 115, 240, 36);
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 115, 240, 36);

    ctx.fillStyle = '#a3e635';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(catText, 90, 139);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 italic 48px sans-serif';
    const titleText =
      task.title.length > 32
        ? task.title.substring(0, 32) + '...'
        : task.title;
    ctx.fillText(titleText.toUpperCase(), 70, 220);

    // Description
    ctx.fillStyle = '#c7d2fe';
    ctx.font = '500 24px sans-serif';
    const descText =
      task.description.length > 60
        ? task.description.substring(0, 60) + '...'
        : task.description;
    ctx.fillText(descText, 70, 265);

    // Milestone box
    ctx.fillStyle = 'rgba(30, 27, 75, 0.8)';
    ctx.fillRect(70, 310, 1060, 180);
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(70, 310, 1060, 180);

    // Progress
    const percent = Math.min(
      100,
      Math.round((task.current / Math.max(1, task.target)) * 100)
    );
    ctx.fillStyle = '#312e81';
    ctx.fillRect(110, 410, 980, 24);

    const barGrad = ctx.createLinearGradient(110, 0, 1090, 0);
    barGrad.addColorStop(0, '#a3e635');
    barGrad.addColorStop(1, '#34d399');
    ctx.fillStyle = barGrad;
    ctx.fillRect(110, 410, (980 * percent) / 100, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px monospace';
    ctx.fillText(
      `MILESTONE: ${task.current} / ${task.target} ${task.unit || ''} (${percent}%)`,
      110,
      385
    );

    // XP
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 italic 32px sans-serif';
    ctx.fillText(`+${task.rewardXp} XP EARNED`, 780, 385);

    // Footer
    ctx.fillStyle = '#a3e635';
    ctx.font = 'bold 22px sans-serif';
    const athleteName = user?.name || 'Playground Athlete';
    ctx.fillText(
      `ATHLETE: ${athleteName.toUpperCase()} • LEVEL ${user?.level || 1} (${
        user?.xp || 0
      } XP)`,
      70,
      550
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText(
      `COMPLETED ON ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`,
      70,
      580
    );
  }, [isOpen, task, user]);

  if (!isOpen || !task) return null;

  /* ═══════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════ */
  const handleCopyLink = () => {
    triggerHaptic('success');
    const textToCopy = `⚡ I just completed the '${task.title}' ${task.category} challenge on Playground League and unlocked +${task.rewardXp} XP! Join my run: https://playgroundleague.app`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    triggerHaptic('success');
    setDownloading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Playground_Milestone_${task.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Canvas export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-[2.5rem] border-2 border-lime-400 p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-full transition border border-white/10 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-3 bg-gradient-to-tr from-lime-400 to-emerald-400 text-black rounded-2xl shadow-lg shadow-lime-400/20">
            <Share2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 bg-lime-400 text-black text-[10px] font-mono font-black rounded-full uppercase">
              Social Milestone Preview ⚡
            </span>
            <h2 className="text-xl font-black italic uppercase text-white tracking-wide mt-0.5">
              Share Completed Challenge
            </h2>
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="rounded-2xl overflow-hidden border border-lime-400/40 shadow-2xl bg-indigo-950/80 p-1">
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-xl object-contain shadow-inner"
            />
          </div>

          <p className="text-xs text-indigo-200/80 font-mono text-center">
            Formatted 1200x630 social graphic ready for Instagram, X (Twitter),
            Discord, or TikTok!
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10 pt-2">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex-1 py-3.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-lime-400/30 hover:scale-[1.02] active:scale-95 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {downloading ? 'Generating PNG...' : 'Download Image (PNG)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-3.5 px-5 bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs uppercase rounded-2xl border border-white/15 transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-lime-400" />
                <span className="text-lime-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-300" />
                <span>Copy Share Text</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareGoalModal;