// frontend/src/components/illustrations/HighlightEmptyIllustration.tsx
import React from 'react';
import { Film, Video, RefreshCw } from 'lucide-react';

interface HighlightEmptyIllustrationProps {
  selectedSport?: string;
  onResetSportFilter?: () => void;
  onUploadHighlight?: () => void;
}

export const HighlightEmptyIllustration: React.FC<HighlightEmptyIllustrationProps> = ({
  selectedSport = 'all',
  onResetSportFilter,
  onUploadHighlight,
}) => {
  const isFiltered = selectedSport !== 'all';

  return (
    <div className="p-8 text-center bg-indigo-950/60 rounded-3xl border-2 border-dashed border-lime-400/30 space-y-4">
      {/* Animated Icon */}
      <div className="w-16 h-16 mx-auto rounded-3xl bg-lime-400/20 text-lime-400 flex items-center justify-center border border-lime-400/40 shadow-xl relative">
        <Film className="w-8 h-8 stroke-[2.2]" />
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-lime-400 animate-ping" />
      </div>

      {/* Text */}
      <div className="max-w-xs mx-auto space-y-1.5">
        <h3 className="text-base font-black italic uppercase text-white tracking-tight">
          {isFiltered ? `No ${selectedSport} Clips Found` : 'No Highlight Clips Yet'}
        </h3>
        <p className="text-xs text-indigo-200/80 leading-relaxed font-semibold">
          {isFiltered
            ? `No ${selectedSport} highlights in the stream yet. Try a different sport or be the first to upload!`
            : 'Be the first to upload a 30-second game highlight reel and inspire the community!'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
        {isFiltered && onResetSportFilter && (
          <button
            type="button"
            onClick={onResetSportFilter}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-lime-400 border border-lime-400/40 text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Show All Sports</span>
          </button>
        )}

        {onUploadHighlight && (
          <button
            type="button"
            onClick={onUploadHighlight}
            className="w-full sm:w-auto px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Upload Highlight</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HighlightEmptyIllustration;