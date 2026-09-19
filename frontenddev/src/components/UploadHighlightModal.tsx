// components/UploadHighlightModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { HighlightClip, SportType } from '../types';
import {
  X,
  Link as LinkIcon,
  Sparkles,
  Film,
  Loader2,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { createHighlightAPI } from '../services/highlight.service';
interface UploadHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHighlight: (clip: HighlightClip) => void;
  athleteId: string;             // ✅ ADD THIS
  presetTitle?: string;
  presetSport?: SportType;
}

type TabType = 'hosted' | 'presets';

/* ═══════════════════════════════════════════
   PRESET CLIPS
   ═══════════════════════════════════════════ */
const PRESET_CLIPS = [
  {
    id: 'preset_1',
    title: 'Clutch Game-Winner Crossover 🏀',
    sport: 'basketball' as SportType,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=600',
    durationSeconds: 18,
  },
  {
    id: 'preset_2',
    title: 'Walk-off 9th Inning Home Run Blast ⚾',
    sport: 'baseball' as SportType,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&q=80&w=600',
    durationSeconds: 24,
  },
  {
    id: 'preset_3',
    title: '40-Yard Touchdown Pass in the Clutch 🏈',
    sport: 'football' as SportType,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=600',
    durationSeconds: 29,
  },
  {
    id: 'preset_4',
    title: 'Unstoppable Pickleball Kitchen Dink Rally 🏓',
    sport: 'pickleball' as SportType,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=600',
    durationSeconds: 15,
  },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
const getHostedThumbnail = (url: string, sport: SportType): string => {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }

  // Fallback sport-specific
  const fallbackMap: Record<SportType, string> = {
    basketball:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=600',
    baseball:
      'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&q=80&w=600',
    softball:
      'https://images.unsplash.com/photo-1562077772-3bd90403f7f0?auto=format&fit=crop&q=80&w=600',
    soccer:
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600',
    football:
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=600',
    pickleball:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=600',
    tennis:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=600',
    volleyball:
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=600',
  };
  return fallbackMap[sport] || fallbackMap.basketball;
};

const isValidHostedUrl = (url: string): boolean => {
  if (!url || !url.trim()) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+/i.test(
    url.trim()
  );
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export const UploadHighlightModal: React.FC<UploadHighlightModalProps> = ({
  isOpen,
  onClose,
  onAddHighlight,
  athleteId,                     // ✅ ADD
  presetTitle,
  presetSport,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('hosted');
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType>('basketball');
  const [description, setDescription] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);
  /* ─── Reset on open + apply presets ─── */
  useEffect(() => {
    if (isOpen) {
      setActiveTab('hosted');
      setVideoUrl('');
      setTitle(presetTitle || '');
      setSport(presetSport || 'basketball');
      setDescription('');
      setSelectedPresetId(null);
      setIsPublishing(false);
      setErrorMsg(null);
      isSubmittingRef.current = false;  // ✅ CRITICAL: Reset guard on modal open
      console.log('🔄 [UploadHighlightModal] Guards reset on open');
    }
  }, [isOpen, presetTitle, presetSport]);

  /* ─── Esc to close ─── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ─── Submit ─── */
 const handleSubmit = async (e: React.FormEvent) => {
    // ✅ STEP 1: Prevent default form submission
    e.preventDefault();

    // ✅ STEP 2: Clear previous errors
    setErrorMsg(null);

    // ═══════════════════════════════════════════
    // ✅ STEP 3: DOUBLE SUBMIT GUARDS
    // ═══════════════════════════════════════════
    // GUARD A: Ref check (synchronous — catches rapid double clicks in same tick)
    if (isSubmittingRef.current) {
      console.log('🛑 [handleSubmit] BLOCKED — ref guard active (duplicate click)');
      return;
    }
    // GUARD B: State check (defensive — catches slow renders)
    if (isPublishing) {
      console.log('🛑 [handleSubmit] BLOCKED — state guard active (already publishing)');
      return;
    }

    console.log('🔵 [handleSubmit] Starting submission at', new Date().toISOString());

    // ═══════════════════════════════════════════
    // ✅ STEP 4: VALIDATION
    // ═══════════════════════════════════════════
    if (!title.trim()) {
      setErrorMsg('Please enter a clip title.');
      return;
    }

    let finalVideoUrl = '';
    let finalThumbnail = '';
    let durationSeconds = 30;

    if (activeTab === 'hosted') {
      // ─── Hosted URL validation ───
      if (!isValidHostedUrl(videoUrl)) {
        setErrorMsg('Please enter a valid YouTube or Vimeo URL.');
        return;
      }
      finalVideoUrl = videoUrl.trim();
      finalThumbnail = getHostedThumbnail(finalVideoUrl, sport);
    } else {
      // ─── Preset validation ───
      const preset = PRESET_CLIPS.find((p) => p.id === selectedPresetId);
      if (!preset) {
        setErrorMsg('Please select a preset clip.');
        return;
      }
      finalVideoUrl = preset.videoUrl;
      finalThumbnail = preset.thumbnailUrl;
      durationSeconds = preset.durationSeconds;
    }

    // ═══════════════════════════════════════════
    // ✅ STEP 5: SET GUARDS *BEFORE* ASYNC CALL
    // ═══════════════════════════════════════════
    // IMPORTANT: Ref set karo PEHLE (synchronous) — agar double click ho raha ho,
    // to dusra click yahin ruk jayega
    isSubmittingRef.current = true;
    setIsPublishing(true);

    try {
      console.log('📤 [handleSubmit] Calling createHighlightAPI...');
      console.log('   → athleteId:', athleteId);
      console.log('   → title:', title.trim());
      console.log('   → videoUrl:', finalVideoUrl);

      // ═══════════════════════════════════════════
      // ✅ STEP 6: API CALL — SINGLE REQUEST
      // ═══════════════════════════════════════════
      const savedClip = await createHighlightAPI(athleteId, {
        title: title.trim(),
        description:
          description.trim() || 'Game highlight clip uploaded on Playgrounds.',
        sport,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnail,
        durationSeconds,
      });

      console.log('✅ [handleSubmit] Saved to DB:', savedClip);

      // ═══════════════════════════════════════════
      // ✅ STEP 7: BUILD LOCAL CLIP OBJECT
      // ═══════════════════════════════════════════
      const newClip: HighlightClip = {
        id: savedClip.id,
        title: savedClip.title,
        sport: savedClip.sport as SportType,
        videoUrl: savedClip.videoUrl,
        thumbnailUrl: savedClip.thumbnailUrl || '',
        durationSeconds: savedClip.durationSeconds,
        createdAt: 'Just now',
        views: savedClip.views,
        likes: savedClip.likes,
        description: savedClip.description,
      };

      // ═══════════════════════════════════════════
      // ✅ STEP 8: NOTIFY PARENT (updates UI state)
      // ═══════════════════════════════════════════
      console.log('📢 [handleSubmit] Notifying parent with new clip');
      onAddHighlight(newClip);

      // ═══════════════════════════════════════════
      // ✅ STEP 9: CLOSE MODAL
      // ═══════════════════════════════════════════
      onClose();

      console.log('✅ [handleSubmit] Submission complete');
    } catch (err) {
      // ═══════════════════════════════════════════
      // ✅ STEP 10: ERROR HANDLING
      // ═══════════════════════════════════════════
      console.error('❌ [handleSubmit] Publish failed:', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to publish. Try again.'
      );

      // ✅ RESET GUARD on error so user can retry
      isSubmittingRef.current = false;
    } finally {
      // ✅ Always reset loading state
      setIsPublishing(false);
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-white/15 shadow-2xl w-full max-w-lg overflow-hidden p-6 my-8 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-indigo-950/80 border border-white/10 text-indigo-200 hover:text-white hover:bg-indigo-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-lime-400 text-black mx-auto flex items-center justify-center shadow-lg shadow-lime-400/30">
            <Film className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white pt-2">
            Add Hosted Highlight Clip
          </h2>
          <p className="text-xs text-indigo-200/70 font-semibold max-w-sm mx-auto">
            Share clutch plays, dunks, home runs, or rally clips directly on your
            athlete reel.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-indigo-950 p-1 rounded-2xl border border-white/10 my-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('hosted');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black italic uppercase transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'hosted'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>YouTube / Vimeo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('presets');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black italic uppercase transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'presets'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Presets</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hosted URL Tab */}
          {activeTab === 'hosted' && (
            <div className="bg-indigo-950/60 p-4 rounded-2xl border border-white/10 space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-200 block">
                Hosted video URL <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/15 rounded-xl text-xs font-medium text-white placeholder-indigo-400/50 outline-none focus:ring-2 focus:ring-lime-400 transition"
                />
              </div>
              <p className="text-[11px] text-indigo-300/70 italic leading-relaxed">
                Upload the clip to YouTube or Vimeo first. Playground stores only
                the hosted link, never the video file.
              </p>

              {videoUrl && isValidHostedUrl(videoUrl) && (
                <div className="mt-2 p-2 bg-lime-400/10 border border-lime-400/40 rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                  <span className="text-[11px] font-bold text-lime-300">
                    Valid hosted URL detected ✓
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="bg-indigo-950/60 p-4 rounded-2xl border border-white/10 space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-200 block">
                Select a preset clip
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {PRESET_CLIPS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setTitle(preset.title);
                        setSport(preset.sport);
                        setErrorMsg(null);
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center space-x-2.5 transition ${
                        isSelected
                          ? 'bg-lime-400/20 border-lime-400 shadow-md'
                          : 'bg-indigo-950 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black italic uppercase block line-clamp-2 text-white">
                          {preset.title}
                        </span>
                        <span className="text-[10px] text-lime-400 font-mono font-bold">
                          {preset.durationSeconds}s
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clip Title */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-indigo-200 block mb-1.5">
              Clip Title <span className="text-lime-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ankle Breaker Stepback 3-Pointer!"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full p-3 bg-indigo-950 border border-white/15 rounded-xl text-xs font-semibold text-white placeholder-indigo-400/50 outline-none focus:ring-2 focus:ring-lime-400 transition"
            />
          </div>

          {/* Sport + Caption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-indigo-200 block mb-1.5">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
                className="w-full p-3 bg-indigo-950 border border-white/15 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400 cursor-pointer"
              >
                <option value="basketball">Basketball 🏀</option>
                <option value="baseball">Baseball ⚾</option>
                <option value="softball">Softball 🥎</option>
                <option value="pickleball">Pickleball 🏓</option>
                <option value="soccer">Soccer ⚽</option>
                <option value="volleyball">Volleyball 🏐</option>
                <option value="football">Football 🏈</option>
                <option value="tennis">Tennis 🎾</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-indigo-200 block mb-1.5">
                Clip Caption
              </label>
              <input
                type="text"
                placeholder="e.g. 4th Quarter game runner"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-indigo-950 border border-white/15 rounded-xl text-xs font-semibold text-white placeholder-indigo-400/50 outline-none focus:ring-2 focus:ring-lime-400 transition"
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300 flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPublishing}
            className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-not-allowed text-black font-black italic uppercase text-sm rounded-2xl shadow-xl shadow-lime-400/25 flex items-center justify-center space-x-2 transition mt-2"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
                <span>Publish Highlight to Profile (+50 XP)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadHighlightModal;