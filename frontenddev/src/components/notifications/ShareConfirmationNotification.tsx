// frontend/src/components/notifications/ShareConfirmationNotification.tsx
import React, { useEffect } from 'react';
import { Check, X, Share2 } from 'lucide-react';

export interface ShareConfirmationData {
  type: 'highlight' | 'achievement' | 'profile';
  title: string;
  subtitle: string;
  sport?: string;
  xpAwarded?: number;
}

interface ShareConfirmationNotificationProps {
  data: ShareConfirmationData | null;
  onClose: () => void;
  duration?: number;
}

export const ShareConfirmationNotification: React.FC<
  ShareConfirmationNotificationProps
> = ({ data, onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [data, duration, onClose]);

  if (!data) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-fadeIn">
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border-2 border-lime-400 rounded-3xl p-4 pr-12 shadow-[0_15px_40px_rgba(0,0,0,0.85)] max-w-sm w-[92vw] relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-indigo-900/80 hover:bg-indigo-800 text-indigo-300 hover:text-white transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-lime-400 to-emerald-400 text-black rounded-2xl shadow-lg shrink-0">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-lime-400 text-black">
                SHARED ✓
              </span>
              {data.sport && (
                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {data.sport}
                </span>
              )}
            </div>

            <h4 className="text-sm font-black italic uppercase text-white leading-tight">
              {data.title}
            </h4>

            <p className="text-xs text-indigo-200/80 font-semibold leading-relaxed">
              {data.subtitle}
            </p>

            {typeof data.xpAwarded === 'number' && data.xpAwarded > 0 && (
              <div className="flex items-center space-x-1 pt-1">
                <Share2 className="w-3 h-3 text-lime-400" />
                <span className="text-[11px] font-mono font-black text-lime-400">
                  +{data.xpAwarded} XP earned
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareConfirmationNotification;