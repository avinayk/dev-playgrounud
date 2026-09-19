import React, { useState } from 'react';
import { ShieldCheck, Clock, Info, CheckCircle2, Camera, Trophy, Sparkles } from 'lucide-react';

interface CourtStatusBadgeTooltipProps {
  status?: 'verified' | 'pending' | string;
  className?: string;
  showText?: boolean;
}

export const CourtStatusBadgeTooltip: React.FC<CourtStatusBadgeTooltipProps> = ({
  status = 'verified',
  className = '',
  showText = true,
}) => {
  const isVerified = status === 'verified';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black italic uppercase cursor-help transition border shadow-sm ${
          isVerified
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        }`}
      >
        {isVerified ? (
          <>
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            {showText && <span>Verified</span>}
          </>
        ) : (
          <>
            <Clock className="w-3 h-3 text-amber-300 shrink-0" />
            {showText && <span>Pending</span>}
          </>
        )}
      </span>

      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 p-3.5 bg-slate-900/98 text-white rounded-2xl border border-lime-400/60 shadow-2xl z-50 pointer-events-none text-left backdrop-blur-xl">
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-900" />

          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
              {isVerified ? (
                <div className="p-1.5 bg-emerald-500 text-black rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 bg-amber-400 text-black rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="text-[9px] font-black uppercase text-lime-400 block">
                  COURT BADGE STATUS
                </span>
                <h5 className="text-xs font-black italic uppercase text-white">
                  {isVerified ? 'Official Verified 🛡️' : 'Pending Review ⏳'}
                </h5>
              </div>
            </div>

            <p className="text-[10px] text-slate-200 leading-relaxed bg-black/40 p-2 rounded-xl border border-white/5">
              {isVerified
                ? 'Inspected by Playground League scouts for official rim height, durable surface, and evening lighting.'
                : 'Submitted by community players. Awaiting official scout inspection.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};