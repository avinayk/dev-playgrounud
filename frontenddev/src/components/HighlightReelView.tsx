// frontend/src/components/HighlightReelView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AthleteProfile, HighlightClip, SportType } from '../types';
import {
  Film, Video, Sparkles, Trophy, PlusCircle, Check, Play, Pause,
  Heart, Eye, Share2, Award, ChevronRight, Zap,
  CheckCircle2, Filter, ArrowUpDown, AlertTriangle, Flag, HardDrive,
  CloudDownload, Wifi, X, ShieldAlert, Repeat, Users, MessageSquare,
  Send, Copy, Radio, Download, Camera, RefreshCw, LogOut,
} from 'lucide-react';

// ✅ MySQL-backed service
import {
  fetchAthleteHighlights,
  fetchCommunityHighlights,
  incrementHighlightViewsAPI,
  toggleHighlightLikeAPI,
  type HighlightAPIItem,
} from '../services/highlight.service';

// ✅ Challenge service — DB backed
import {
  fetchCompletedChallengeIds,
} from '../services/challenge.service';

// ✅ Socket for real-time watch party
import { getSocket } from '../services/socket';

// ✅ Utilities
import { triggerHaptic } from '../utils/haptics';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface Challenge {
  id: string;
  title: string;
  sport: SportType;
  level: number;
  description: string;
  xpReward: number;
  sampleVideoUrl?: string;
  thumbnailUrl?: string;
}

interface WatchPartyMember {
  id: string;
  name: string;
  avatar: string;
  role: 'host' | 'viewer';
  joinedAt: string;
  isOnline?: boolean;
}

interface WatchPartyMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface HighlightReelViewProps {
  user: AthleteProfile;
  allAthletes: AthleteProfile[];
  onOpenUploadModal: (presetTitle?: string, presetSport?: SportType) => void;
  onEarnXp: (amount: number, source: string, referenceId?: string) => void | Promise<void>;
  onUpdateProfile?: (updated: Partial<AthleteProfile>) => void;
}

export type HighlightSortOption = 'recent' | 'viewed' | 'liked';

interface ShareConfirmationData {
  type: 'highlight' | 'achievement' | 'profile';
  title: string;
  subtitle: string;
  sport?: string;
  xpAwarded?: number;
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function formatWatchPartyTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return 'Just now';
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

/* ═══════════════════════════════════════════
   WATCH PARTY PERSISTENCE HELPERS
   ═══════════════════════════════════════════ */
const WP_STORAGE_KEY = 'playground_active_watch_party';

interface StoredWatchParty {
  roomId: string;
  sessionId: string;
  clipId: string;
  clipTitle: string;
  clipUrl: string;
  clipThumbnail: string;
  clipSport: string;
  clipDuration: number;
  hostId: string;
  startedAt: string;
}

function saveWatchPartyToStorage(data: StoredWatchParty) {
  try {
    localStorage.setItem(WP_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadWatchPartyFromStorage(): StoredWatchParty | null {
  try {
    const raw = localStorage.getItem(WP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearWatchPartyStorage() {
  try {
    localStorage.removeItem(WP_STORAGE_KEY);
  } catch {}
}

/* ═══════════════════════════════════════════
   VIDEO TYPE DETECTION HELPERS
   ═══════════════════════════════════════════ */
type VideoSourceType = 'youtube' | 'vimeo' | 'direct';

function getVideoSourceType(url: string | null | undefined): VideoSourceType {
  if (!url) return 'direct';
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('vimeo.com')) return 'vimeo';
  return 'direct';
}

function getYouTubeEmbedUrl(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1`;
  }
  return url;
}

function getVimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1`;
  return url;
}

/* ═══════════════════════════════════════════
   LOCAL STORAGE HELPERS
   ═══════════════════════════════════════════ */
const LIKED_KEY = 'playground_liked_highlights';
const VIEWED_KEY = 'playground_viewed_highlights';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function writeSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}
function hasLikedLocal(id: string) { return readSet(LIKED_KEY).has(id); }
function markLikedLocal(id: string) { const s = readSet(LIKED_KEY); s.add(id); writeSet(LIKED_KEY, s); }
function unmarkLikedLocal(id: string) { const s = readSet(LIKED_KEY); s.delete(id); writeSet(LIKED_KEY, s); }
function hasViewedLocal(id: string) { return readSet(VIEWED_KEY).has(id); }
function markViewedLocal(id: string) { const s = readSet(VIEWED_KEY); s.add(id); writeSet(VIEWED_KEY, s); }
function getAllLikedIds(): string[] { return [...readSet(LIKED_KEY)]; }

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export const HighlightReelView: React.FC<HighlightReelViewProps> = ({
  user,
  allAthletes,
  onOpenUploadModal,
  onEarnXp,
  onUpdateProfile,
}) => {
  const athleteId = (user as any)?.id;
  const userSport =
    (user as any).primarySport || (user as any).primary_sport || 'basketball';

  const [activeSportFilter, setActiveSportFilter] = useState<SportType | 'all'>(
    userSport as SportType
  );
  const [selectedChallengeLevel, setSelectedChallengeLevel] = useState<number>(1);

  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>([]);

  const [sortOption, setSortOption] = useState<HighlightSortOption>('recent');
  const [streamSportFilter, setStreamSportFilter] = useState<SportType | 'all'>('all');

  /* ─── Highlights ─── */
  const [allCommunityHighlights, setAllCommunityHighlights] = useState<HighlightClip[]>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(true);
  const [activeClip, setActiveClip] = useState<HighlightClip | null>(null);

  const [clipLikes, setClipLikes] = useState<Record<string, number>>({});
  const [clipViews, setClipViews] = useState<Record<string, number>>({});
  const [likedClipIds, setLikedClipIds] = useState<string[]>(() => getAllLikedIds());
  const [videoLoadStatuses, setVideoLoadStatuses] = useState<Record<string, string>>({});

  const [isAutoLoopEnabled, setIsAutoLoopEnabled] = useState<boolean>(true);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [isAutoPlayOnHoverEnabled, setIsAutoPlayOnHoverEnabled] = useState<boolean>(true);

  const [reportingClip, setReportingClip] = useState<HighlightClip | null>(null);
  const [reportReason, setReportReason] = useState<string>(
    'Video playback failed / black screen'
  );
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportedClipIds, setReportedClipIds] = useState<string[]>([]);
  const [reportToastMessage, setReportToastMessage] = useState<string | null>(null);

  const [repostingClip, setRepostingClip] = useState<HighlightClip | null>(null);
  const [repostShoutoutMessage, setRepostShoutoutMessage] = useState<string>('');

  /* ─── Watch Party ─── */
  const [isWatchPartyOpen, setIsWatchPartyOpen] = useState<boolean>(false);
  const [watchPartyClip, setWatchPartyClip] = useState<HighlightClip | null>(null);
  const [watchPartyRoomId, setWatchPartyRoomId] = useState<string>('WP-7729');
  const [watchPartyIsPlaying, setWatchPartyIsPlaying] = useState<boolean>(true);
  const [watchPartyChatInput, setWatchPartyChatInput] = useState<string>('');
  const [watchPartyCopied, setWatchPartyCopied] = useState<boolean>(false);
  const [watchPartyActiveTab, setWatchPartyActiveTab] = useState<'chat' | 'members'>('chat');
  const [watchPartyFloatingReactions, setWatchPartyFloatingReactions] = useState<
    Array<{ id: string; emoji: string; left: number }>
  >([]);

  const [watchPartyMembers, setWatchPartyMembers] = useState<WatchPartyMember[]>([]);
  const [watchPartyMessages, setWatchPartyMessages] = useState<WatchPartyMessage[]>([]);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  const watchPartyVideoRef = useRef<HTMLVideoElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ✅ FIX: Ref to track room ID — prevents stale closure */
  const watchPartyRoomIdRef = useRef<string>(watchPartyRoomId);

  useEffect(() => {
    watchPartyRoomIdRef.current = watchPartyRoomId;
    console.log('🔄 Room ID ref synced:', watchPartyRoomId);
  }, [watchPartyRoomId]);

  /* ─── Quick Share ─── */
  const [shareConfirmation, setShareConfirmation] =
    useState<ShareConfirmationData | null>(null);
  const [isQuickShareModalOpen, setIsQuickShareModalOpen] = useState<boolean>(false);
  const [quickShareClip, setQuickShareClip] = useState<HighlightClip | null>(null);
  const [quickShareImageUrl, setQuickShareImageUrl] = useState<string | null>(null);
  const [quickShareCopied, setQuickShareCopied] = useState<boolean>(false);
  const quickShareCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ═══════════════════════════════════════════
     RESTORE WATCH PARTY ON MOUNT
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;

    const stored = loadWatchPartyFromStorage();
    console.log('🔍 Restore check:', stored);

    if (!stored) {
      console.log('ℹ️ No stored session');
      return;
    }

    setIsRestoringSession(true);
    const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

    (async () => {
      try {
        console.log('🔍 Checking session:', `${API}/watchparty/session/${stored.roomId}`);
        const res = await fetch(`${API}/watchparty/session/${stored.roomId}`);
        const json = await res.json();

        console.log('📦 Session response:', json);

        if (!json.success || !json.data) {
          console.log('❌ Session not found — clearing');
          clearWatchPartyStorage();
          setIsRestoringSession(false);
          return;
        }

        console.log('✅ Session exists, active:', json.data.is_active);

        setWatchPartyRoomId(stored.roomId);
        setWatchPartyClip({
          id: stored.clipId,
          title: stored.clipTitle,
          sport: stored.clipSport as SportType,
          videoUrl: stored.clipUrl,
          thumbnailUrl: stored.clipThumbnail,
          durationSeconds: stored.clipDuration,
          createdAt: stored.startedAt,
          views: 0,
          likes: 0,
          description: '',
        });
        setIsWatchPartyOpen(true);
        setWatchPartyIsPlaying(true);

        const socket = getSocket();
        if (!socket.connected) {
          await new Promise<void>((resolve) => {
            socket.once('connect', () => resolve());
            socket.connect();
          });
        }

        console.log('📤 Emitting join...');
        socket.emit(
          'watchparty:join',
          {
            roomId: stored.roomId,
            athleteId,
            name: (user as any)?.name || 'Athlete',
            avatar: (user as any)?.avatar || (user as any)?.profilepicture || '',
          },
          (res: any) => {
            console.log('📥 Join response:', res);
            setIsRestoringSession(false);

            if (res?.error) {
              console.log('❌ Join error:', res.error);
              clearWatchPartyStorage();
              setIsWatchPartyOpen(false);
              return;
            }

            if (Array.isArray(res?.members)) {
              setWatchPartyMembers(res.members);
            }

            if (Array.isArray(res?.messages)) {
              console.log('📝 Loading', res.messages.length, 'messages');
              setWatchPartyMessages(
                res.messages.map((m: any) => ({
                  id: m.id,
                  senderName: m.senderName || 'System',
                  senderAvatar: m.senderAvatar || '',
                  text: m.text,
                  timestamp: formatWatchPartyTime(m.timestamp),
                  isSystem: m.isSystem,
                }))
              );
            }

            if (typeof res.isPlaying === 'boolean') {
              setWatchPartyIsPlaying(res.isPlaying);
            }

            console.log('✅ Restore complete');
          }
        );
      } catch (err) {
        console.error('❌ Restore failed:', err);
        clearWatchPartyStorage();
        setIsRestoringSession(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  /* ═══════════════════════════════════════════
     Watch Party Socket Listeners (using REF)
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;
    const socket = getSocket();

    const handleMembersUpdate = (payload: {
      roomId: string;
      members: WatchPartyMember[];
    }) => {
      if (payload.roomId !== watchPartyRoomIdRef.current) return;
      setWatchPartyMembers(payload.members);
    };

    const handleMemberJoined = (payload: {
      roomId: string;
      member: WatchPartyMember;
    }) => {
      if (payload.roomId !== watchPartyRoomIdRef.current) return;
      setWatchPartyMembers((prev) => {
        if (prev.some((m) => m.id === payload.member.id)) return prev;
        return [...prev, payload.member];
      });
    };

    const handleMemberLeft = (payload: {
      roomId: string;
      athleteId: string;
    }) => {
      if (payload.roomId !== watchPartyRoomIdRef.current) return;
      setWatchPartyMembers((prev) =>
        prev.filter((m) => m.id !== payload.athleteId)
      );
    };

    const handlePlaybackSync = (payload: {
      roomId: string;
      isPlaying: boolean;
    }) => {
      if (payload.roomId !== watchPartyRoomIdRef.current) return;
      setWatchPartyIsPlaying(payload.isPlaying);
      if (watchPartyVideoRef.current) {
        if (payload.isPlaying) watchPartyVideoRef.current.play().catch(() => {});
        else watchPartyVideoRef.current.pause();
      }
    };

    const handleRemoteMessage = (payload: {
      id: string;
      roomId: string;
      senderName: string;
      senderAvatar: string;
      text: string;
      timestamp: string;
      isSystem?: boolean;
    }) => {
      console.log('📨 Remote message received:', payload.roomId, payload.text);
      console.log('   Current room (ref):', watchPartyRoomIdRef.current);

      if (payload.roomId !== watchPartyRoomIdRef.current) {
        console.log('   ⏭️  Skipping — room mismatch');
        return;
      }

      setWatchPartyMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        console.log('   ✅ Adding message to state');
        return [
          ...prev,
          {
            id: payload.id,
            senderName: payload.senderName,
            senderAvatar: payload.senderAvatar || '',
            text: payload.text,
            timestamp: formatWatchPartyTime(payload.timestamp),
            isSystem: payload.isSystem,
          },
        ];
      });
    };

    const handleRemoteReaction = (payload: {
      roomId: string;
      emoji: string;
    }) => {
      if (payload.roomId !== watchPartyRoomIdRef.current) return;
      const newReaction = {
        id: `rx_${Date.now()}_${Math.random()}`,
        emoji: payload.emoji,
        left: Math.floor(15 + Math.random() * 70),
      };
      setWatchPartyFloatingReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setWatchPartyFloatingReactions((prev) =>
          prev.filter((r) => r.id !== newReaction.id)
        );
      }, 2200);
    };

    socket.on('watchparty:members', handleMembersUpdate);
    socket.on('watchparty:member_joined', handleMemberJoined);
    socket.on('watchparty:member_left', handleMemberLeft);
    socket.on('watchparty:playback', handlePlaybackSync);
    socket.on('watchparty:message', handleRemoteMessage);
    socket.on('watchparty:reaction', handleRemoteReaction);

    return () => {
      socket.off('watchparty:members', handleMembersUpdate);
      socket.off('watchparty:member_joined', handleMemberJoined);
      socket.off('watchparty:member_left', handleMemberLeft);
      socket.off('watchparty:playback', handlePlaybackSync);
      socket.off('watchparty:message', handleRemoteMessage);
      socket.off('watchparty:reaction', handleRemoteReaction);
    };
  }, [athleteId]);

  /* ═══════════════════════════════════════════
     Auto-scroll chat to bottom
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (watchPartyActiveTab === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [watchPartyMessages, watchPartyActiveTab]);

  /* ═══════════════════════════════════════════
     Load completed challenge IDs from DB
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    (async () => {
      try {
        const ids = await fetchCompletedChallengeIds(athleteId);
        if (!cancelled && Array.isArray(ids)) {
          setCompletedChallengeIds(ids);
        }
      } catch (err) {
        console.warn('⚠️ Could not load completed challenges:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [athleteId]);

  /* ═══════════════════════════════════════════
     FETCH highlights (MySQL)
     ═══════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingClips(true);
      try {
        const community = await fetchCommunityHighlights({ limit: 50 });

        let mine: HighlightAPIItem[] = [];
        if (athleteId) {
          try {
            mine = await fetchAthleteHighlights(athleteId, { limit: 50 });
          } catch { /* silent */ }
        }

        const seen = new Set<string>();
        const merged: HighlightClip[] = [];
        for (const c of [...mine, ...community]) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          merged.push({
            id: c.id,
            title: c.title,
            sport: c.sport as SportType,
            videoUrl: c.videoUrl,
            thumbnailUrl: c.thumbnailUrl || '',
            durationSeconds: c.durationSeconds,
            createdAt: c.createdAt,
            views: c.views,
            likes: c.likes,
            description: c.description,
          });
        }

        if (cancelled) return;
        setAllCommunityHighlights(merged);
        if (merged.length > 0) {
          setActiveClip((prev) =>
            prev && merged.some((m) => m.id === prev.id) ? prev : merged[0]
          );
        }
      } catch (err) {
        console.error('Failed to load highlights:', err);
      } finally {
        if (!cancelled) setIsLoadingClips(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [athleteId]);

  /* ═══════════════════════════════════════════
     CANVAS snapshot
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!isQuickShareModalOpen || !quickShareClip || !quickShareCanvasRef.current) return;
    const canvas = quickShareCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 630;

    const bgGradient = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(0.5, '#1e1b4b');
    bgGradient.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.strokeStyle = 'rgba(163, 230, 53, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1000, 315, 200, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.beginPath();
    ctx.arc(200, 500, 150, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#a3e635';
    ctx.fillRect(60, 50, 120, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px sans-serif';
    ctx.fillText('PLAYGROUND LEAGUE • HIGHLIGHT REEL SPOTLIGHT', 200, 60);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(60, 90, 1080, 480, 24);
      ctx.fill();
    } else {
      ctx.fillRect(60, 90, 1080, 480);
    }

    ctx.strokeStyle = 'rgba(163, 230, 53, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#a3e635';
    ctx.fillRect(100, 130, 180, 36);
    ctx.fillStyle = '#000000';
    ctx.font = '900 18px sans-serif';
    ctx.fillText(quickShareClip.sport.toUpperCase() + ' REEL ⚡', 120, 154);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 32px sans-serif';
    const titleText =
      quickShareClip.title.length > 42
        ? quickShareClip.title.substring(0, 42) + '...'
        : quickShareClip.title;
    ctx.fillText(titleText, 100, 220);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px sans-serif';
    const descText =
      (quickShareClip.description || '').length > 68
        ? (quickShareClip.description || '').substring(0, 68) + '...'
        : quickShareClip.description || '';
    ctx.fillText(descText, 100, 260);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(100, 300, 580, 70);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    const currentViews = clipViews[quickShareClip.id] ?? quickShareClip.views;
    const currentLikes = clipLikes[quickShareClip.id] ?? quickShareClip.likes;
    ctx.fillText(
      `👁️ ${currentViews} Views   ❤️ ${currentLikes} Likes   ⏱️ 00:${quickShareClip.durationSeconds}s`,
      120,
      342
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`ATHLETE: ${(user as any)?.name || 'Playground League Athlete'}`, 100, 420);

    ctx.fillStyle = '#a3e635';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(
      `LEVEL ${(user as any)?.level || 1} • ${
        (user as any)?.levelTitle || 'Rookie'
      } • ${
        (user as any)?.schoolOrLeague || (user as any)?.school || 'Playground League'
      }`,
      100,
      450
    );

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(720, 300, 380, 230);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(720, 300, 380, 230);

    ctx.fillStyle = '#a3e635';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PLAYGROUND LEAGUE', 750, 350);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText('Scan or visit to watch full clip:', 750, 380);
    ctx.fillText('playgroundleague.app', 750, 410);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🔥 Rank #1 Local Playground Feed', 750, 460);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Generated ${new Date().toLocaleDateString()}`, 750, 500);

    try {
      setQuickShareImageUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.warn('Canvas toDataURL error:', e);
    }
  }, [isQuickShareModalOpen, quickShareClip, clipViews, clipLikes, user]);

  /* ═══════════════════════════════════════════
     Handlers
     ═══════════════════════════════════════════ */
  const handleOpenQuickShare = (clip: HighlightClip) => {
    triggerHaptic('medium');
    setQuickShareClip(clip);
    setIsQuickShareModalOpen(true);
    setQuickShareCopied(false);
  };

  /* ═══════════════════════════════════════════
     ✅ FIX 1: Close Modal — Sirf UI band karo, data preserve
     ═══════════════════════════════════════════ */
  const handleCloseWatchPartyModal = () => {
    console.log('📴 Closing modal (data preserved)');
    setIsWatchPartyOpen(false);
    // ✅ Messages, members, localStorage — sab preserved
    // ✅ Backend se disconnect nahi hoga
  };

  /* ═══════════════════════════════════════════
     ✅ FIX 2: Reopen existing session
     ═══════════════════════════════════════════ */
  const handleReopenWatchParty = async (clip: HighlightClip, session: any) => {
    console.log('🔄 Reopening existing session:', session.room_id);

    setWatchPartyRoomId(session.room_id);
    setWatchPartyClip(clip);
    setIsWatchPartyOpen(true);
    setWatchPartyIsPlaying(true);

    saveWatchPartyToStorage({
      roomId: session.room_id,
      sessionId: session.id,
      clipId: clip.id,
      clipTitle: clip.title,
      clipUrl: clip.videoUrl,
      clipThumbnail: clip.thumbnailUrl,
      clipSport: clip.sport,
      clipDuration: clip.durationSeconds,
      hostId: session.host_id,
      startedAt: session.created_at,
    });

    const socket = getSocket();
    if (!socket.connected) {
      await new Promise<void>((resolve) => {
        socket.once('connect', () => resolve());
        socket.connect();
      });
    }

    socket.emit(
      'watchparty:join',
      {
        roomId: session.room_id,
        athleteId,
        name: (user as any)?.name || 'Athlete',
        avatar: (user as any)?.avatar || (user as any)?.profilepicture || '',
      },
      (res: any) => {
        console.log('📥 Rejoin response:', res);

        if (res?.error) {
          console.error('❌ Rejoin failed:', res.error);
          clearWatchPartyStorage();
          setIsWatchPartyOpen(false);
          return;
        }

        if (Array.isArray(res?.messages)) {
          setWatchPartyMessages(
            res.messages.map((m: any) => ({
              id: m.id,
              senderName: m.senderName || 'System',
              senderAvatar: m.senderAvatar || '',
              text: m.text,
              timestamp: formatWatchPartyTime(m.timestamp),
              isSystem: m.isSystem,
            }))
          );
        }

        if (Array.isArray(res?.members)) {
          setWatchPartyMembers(res.members);
        }

        if (typeof res.isPlaying === 'boolean') {
          setWatchPartyIsPlaying(res.isPlaying);
        }

        console.log('✅ Reopened with', res.messages?.length || 0, 'messages');
      }
    );

    onEarnXp(5, 'Joined Existing Watch Party');
  };

  /* ═══════════════════════════════════════════
     ✅ FIX 3: Start Watch Party (with clip lookup)
     ═══════════════════════════════════════════ */
  const handleStartWatchParty = async (clip: HighlightClip) => {
    const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

    try {
      /* ─── STEP 1: Check localStorage for same clip ─── */
      const stored = loadWatchPartyFromStorage();
      if (stored && stored.clipId === clip.id) {
        console.log('📦 Found stored session for same clip:', stored.roomId);

        const res = await fetch(`${API}/watchparty/session/${stored.roomId}`);
        const json = await res.json();

        if (json.success && json.data && json.data.is_active === 1) {
          console.log('✅ Stored session still active — reopening');
          await handleReopenWatchParty(clip, json.data);
          return;
        } else {
          console.log('🛑 Stored session no longer active — clearing');
          clearWatchPartyStorage();
        }
      }

      /* ─── STEP 2: Check backend for ANY active session on this clip ─── */
      console.log('🔍 Looking for active session on clip:', clip.id);
      const activeRes = await fetch(`${API}/watchparty/active-by-clip/${clip.id}`);
      const activeJson = await activeRes.json();

      if (activeJson.success && activeJson.data) {
        console.log('✅ Found active session — joining instead of creating');
        await handleReopenWatchParty(clip, activeJson.data);
        return;
      }

      /* ─── STEP 3: No active session — create new ─── */
      console.log('ℹ️ No active session — creating new watch party');
      const roomId = `WP-${Math.floor(1000 + Math.random() * 9000)}`;

      setWatchPartyRoomId(roomId);
      setWatchPartyClip(clip);
      setWatchPartyIsPlaying(true);
      setIsWatchPartyOpen(true);

      setWatchPartyMembers([
        {
          id: athleteId || 'host',
          name: (user as any)?.name || 'Athlete',
          avatar: (user as any)?.avatar || (user as any)?.profilepicture || '',
          role: 'host',
          joinedAt: new Date().toISOString(),
          isOnline: true,
        },
      ]);

      setWatchPartyMessages([]);

      const socket = getSocket();
      socket.emit(
        'watchparty:create',
        {
          roomId,
          hostId: athleteId,
          hostName: (user as any)?.name || 'Athlete',
          hostAvatar: (user as any)?.avatar || (user as any)?.profilepicture || '',
          clipId: clip.id,
          clipTitle: clip.title,
          clipUrl: clip.videoUrl,
          clipThumbnail: clip.thumbnailUrl,
        },
        (res: any) => {
          if (res?.success) {
            console.log('✅ New watch party created:', res.roomId, 'session:', res.sessionId);

            saveWatchPartyToStorage({
              roomId: res.roomId,
              sessionId: res.sessionId,
              clipId: clip.id,
              clipTitle: clip.title,
              clipUrl: clip.videoUrl,
              clipThumbnail: clip.thumbnailUrl,
              clipSport: clip.sport,
              clipDuration: clip.durationSeconds,
              hostId: athleteId || '',
              startedAt: new Date().toISOString(),
            });

            fetch(`${API}/watchparty/session/${res.sessionId}/messages?limit=100`)
              .then((r) => r.json())
              .then((json) => {
                if (json.success && Array.isArray(json.data)) {
                  setWatchPartyMessages(
                    json.data.map((m: any) => ({
                      id: m.id,
                      senderName: m.sender_name || 'System',
                      senderAvatar: m.sender_avatar || '',
                      text: m.text,
                      timestamp: formatWatchPartyTime(m.created_at),
                      isSystem: m.message_type === 'system',
                    }))
                  );
                }
              })
              .catch((err) => console.warn('Failed to load initial messages:', err));

            onEarnXp(15, 'Created Highlight Watch Party Room');
          } else if (res?.error) {
            console.warn('⚠️ Watch party create failed:', res.error);
          }
        }
      );
    } catch (err) {
      console.error('❌ handleStartWatchParty error:', err);
      alert('Failed to start watch party. Please try again.');
    }
  };

  const handleToggleWatchPartyPlayback = () => {
    const next = !watchPartyIsPlaying;
    setWatchPartyIsPlaying(next);

    const socket = getSocket();
    socket.emit('watchparty:playback', {
      roomId: watchPartyRoomId,
      isPlaying: next,
    });

    if (watchPartyVideoRef.current) {
      if (next) watchPartyVideoRef.current.play().catch(() => {});
      else watchPartyVideoRef.current.pause();
    }
  };

  const handleTriggerWatchPartyReaction = (emoji: string) => {
    const socket = getSocket();
    socket.emit('watchparty:reaction', {
      roomId: watchPartyRoomId,
      emoji,
      senderId: athleteId,
    });

    const newReaction = {
      id: `rx_${Date.now()}_${Math.random()}`,
      emoji,
      left: Math.floor(15 + Math.random() * 70),
    };
    setWatchPartyFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setWatchPartyFloatingReactions((prev) =>
        prev.filter((r) => r.id !== newReaction.id)
      );
    }, 2200);
  };

  const handleSendWatchPartyMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!watchPartyChatInput.trim()) return;

    const text = watchPartyChatInput.trim();

    const socket = getSocket();
    socket.emit('watchparty:message', {
      roomId: watchPartyRoomId,
      senderId: athleteId,
      senderName: (user as any)?.name || 'Athlete',
      senderAvatar: (user as any)?.avatar || (user as any)?.profilepicture || '',
      text,
    });

    setWatchPartyChatInput('');
  };

  /* ✅ Leave Party — actually leave */
  const handleLeaveWatchParty = () => {
    console.log('👋 Leaving party (data cleared)');
    const socket = getSocket();
    socket.emit('watchparty:leave', {
      roomId: watchPartyRoomId,
      athleteId,
    });

    clearWatchPartyStorage();
    setIsWatchPartyOpen(false);
    setWatchPartyMembers([]);
    setWatchPartyMessages([]);
  };

  const handleSubmitRepost = () => {
    if (!repostingClip) return;
    const repostedClip: HighlightClip = {
      id: `repost_${Date.now()}`,
      title: `Re-posted: ${repostingClip.title}`,
      sport: repostingClip.sport,
      videoUrl: repostingClip.videoUrl,
      thumbnailUrl: repostingClip.thumbnailUrl,
      durationSeconds: repostingClip.durationSeconds,
      createdAt: 'Just now',
      views: 1,
      likes: 0,
      description:
        repostShoutoutMessage.trim() || `Shoutout to ${repostingClip.title}! 🔥`,
      shoutout: repostShoutoutMessage.trim(),
      repostedFrom: repostingClip.title,
      repostedBy: (user as any)?.name || 'Athlete',
    };

    const currentHighlights = (user as any).highlights || [];
    if (onUpdateProfile) {
      onUpdateProfile({
        highlights: [repostedClip, ...currentHighlights],
      } as any);
    }
    onEarnXp(25, 'Re-posted Highlight Reel to Profile Feed');
    setReportToastMessage(`🎉 +${c.xpReward} XP for "${c.title}"!`);
      setTimeout(() => setReportToastMessage(null), 3500);
    setRepostingClip(null);
    setRepostShoutoutMessage('');
  };

  /* ─── Increment view ─── */
  useEffect(() => {
    if (!activeClip?.id) return;
    const clipId = activeClip.id;

    setClipViews((prev) => ({
      ...prev,
      [clipId]: (prev[clipId] ?? activeClip.views) + 1,
    }));

    if (!hasViewedLocal(clipId)) {
      markViewedLocal(clipId);
      incrementHighlightViewsAPI(clipId).catch(() => {});
    }

    const newViews = (clipViews[clipId] ?? activeClip.views) + 1;
    if (newViews > 0 && newViews % 5 === 0) {
      onEarnXp(20, `Highlight Reel Engagement (${newViews} Views)`);
      setReportToastMessage(`👁️ +20 XP awarded for reaching ${newViews} views!`);
      setTimeout(() => setReportToastMessage(null), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id]);

  /* ═══════════════════════════════════════════
     LIKE
     ═══════════════════════════════════════════ */
  const handleLikeClip = async (clipId: string) => {
    const isAlreadyLiked = likedClipIds.includes(clipId);
    const targetClip = allCommunityHighlights.find((c) => c.id === clipId);
    const baseLikes = targetClip?.likes ?? 0;
    const currentLikes = clipLikes[clipId] ?? baseLikes;
    const newLikes = isAlreadyLiked
      ? Math.max(0, currentLikes - 1)
      : currentLikes + 1;

    setLikedClipIds((prev) =>
      isAlreadyLiked ? prev.filter((id) => id !== clipId) : [...prev, clipId]
    );
    setClipLikes((prev) => ({ ...prev, [clipId]: newLikes }));

    if (isAlreadyLiked) unmarkLikedLocal(clipId);
    else markLikedLocal(clipId);

    if (!isAlreadyLiked) {
      const isUserClip = (user as any).highlights?.some(
        (h: any) => h.id === clipId
      );
      const earnedAmount = isUserClip ? 75 : 25;
      onEarnXp(
        earnedAmount,
        isUserClip
          ? 'Creator Like Reward'
          : 'Community Highlight Like Bonus'
      );
      setReportToastMessage(`❤️ +${earnedAmount} XP for highlight interaction!`);
      setTimeout(() => setReportToastMessage(null), 3500);
    }

    try {
      const serverLikes = await toggleHighlightLikeAPI(
        clipId,
        isAlreadyLiked ? -1 : 1
      );
      setClipLikes((prev) => ({ ...prev, [clipId]: serverLikes }));
    } catch (err) {
      console.error('Like sync failed:', err);
      setLikedClipIds((prev) =>
        isAlreadyLiked ? [...prev, clipId] : prev.filter((id) => id !== clipId)
      );
      setClipLikes((prev) => ({ ...prev, [clipId]: currentLikes }));
      if (isAlreadyLiked) markLikedLocal(clipId);
      else unmarkLikedLocal(clipId);
    }
  };

  const handleSubmitIssueReport = () => {
    if (!reportingClip) return;
    setReportedClipIds((prev) => [...prev, reportingClip.id]);
    setReportToastMessage(
      `⚠️ Issue reported for "${reportingClip.title}". Admin notified.`
    );
    setTimeout(() => setReportToastMessage(null), 5000);
    setReportingClip(null);
    setReportNotes('');
  };

  const sortedAndFilteredHighlights = useMemo(() => {
    return [...allCommunityHighlights]
      .filter((clip) => streamSportFilter === 'all' || clip.sport === streamSportFilter)
      .sort((a, b) => {
        if (sortOption === 'viewed') {
          return (clipViews[b.id] ?? b.views) - (clipViews[a.id] ?? a.views);
        }
        if (sortOption === 'liked') {
          const likesA = clipLikes[a.id] ?? a.likes;
          const likesB = clipLikes[b.id] ?? b.likes;
          return likesB - likesA;
        }
        return 0;
      });
  }, [allCommunityHighlights, streamSportFilter, sortOption, clipViews, clipLikes]);

  useEffect(() => {
    if (sortedAndFilteredHighlights.length > 0 && activeClip) {
      const stillAvailable = sortedAndFilteredHighlights.some(
        (c) => c.id === activeClip.id
      );
      if (!stillAvailable) setActiveClip(sortedAndFilteredHighlights[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption, streamSportFilter]);

  /* ═══════════════════════════════════════════
     CHALLENGES
     ═══════════════════════════════════════════ */
  const challenges: Challenge[] = [
    { id: 'bball_layup_1', title: 'Upload a Video of a Layup 🏀', sport: 'basketball', level: 1, description: 'Record or upload a clean layup finish at the rim.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=400' },
    { id: 'bball_freethrow_1', title: 'Upload a Video of a Free Throw 🏀', sport: 'basketball', level: 1, description: 'Sink a swish free throw from the foul line.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&q=80&w=400' },
    { id: 'bball_knockout_1', title: 'Knockout / Lightning Elimination ⚡', sport: 'basketball', level: 1, description: 'Record a fast-paced Knockout game.', xpReward: 120 },
    { id: 'bball_3pointer_1', title: 'Upload a Video of a 3-Pointer 🏀', sport: 'basketball', level: 1, description: 'Hit a 3-point jumper beyond the arc.', xpReward: 150, thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400' },
    { id: 'bball_horse_2', title: 'HORSE / PIG Trick Shot Challenge 🐴', sport: 'basketball', level: 2, description: 'Hit a creative trick shot in HORSE.', xpReward: 200 },
    { id: 'bball_aroundworld_2', title: 'Around the World (5 Spots Swish) 🌍', sport: 'basketball', level: 2, description: 'Sink shots from 5 key spots.', xpReward: 180 },
    { id: 'bball_21game_2', title: '21 / Cutthroat Playground Score 🏀', sport: 'basketball', level: 2, description: 'Upload a 1v1v1 game of 21 clip.', xpReward: 160 },
    { id: 'bball_kingcourt_3', title: 'King of the Court (1v1 Iso Bucket) 👑', sport: 'basketball', level: 3, description: 'Record an iso bucket or defensive stop.', xpReward: 220 },
    { id: 'bball_halfcourt_3', title: 'Half-Court Swish Buzzer Beater 🎯', sport: 'basketball', level: 3, description: 'Half-court shot draining in.', xpReward: 300 },
    { id: 'soccer_pk_1', title: 'Upload a Penalty Kick Video ⚽', sport: 'soccer', level: 1, description: 'Clean penalty kick corner placement.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=400' },
    { id: 'soccer_juggle_1', title: 'Upload a 10-Juggle Skill Video ⚽', sport: 'soccer', level: 1, description: 'Juggle the ball 10 times.', xpReward: 100 },
    { id: 'soccer_crossbar_2', title: 'Crossbar Challenge (20 Yards) ⚽', sport: 'soccer', level: 2, description: 'Strike the crossbar from 20 yards.', xpReward: 200 },
    { id: 'soccer_worldcup_2', title: 'World Cup Knockout Volley 🏆', sport: 'soccer', level: 2, description: 'Airborne volley or header finish.', xpReward: 175 },
    { id: 'base_swing_1', title: 'Upload a Batting Cage Swing ⚾', sport: 'baseball', level: 1, description: 'Clean line-drive swing.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&q=80&w=400' },
    { id: 'base_500game_1', title: '500 / Fly-Ball Catching Challenge 🥎', sport: 'baseball', level: 1, description: 'Catch pop-flys in a game of 500.', xpReward: 130 },
    { id: 'base_hrderby_2', title: 'Home Run Derby Blast ⚾', sport: 'baseball', level: 2, description: 'Deep HR Derby blast.', xpReward: 200 },
    { id: 'fb_catch_1', title: 'Upload a 15-Yard Catch Video 🏈', sport: 'football', level: 1, description: 'Secure a 15-yard pass catch.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=400' },
    { id: 'fb_target_2', title: 'Target Passing Precision 🎯', sport: 'football', level: 2, description: 'Throw a spiral through a target.', xpReward: 180 },
    { id: 'pb_dink_1', title: 'Upload a Kitchen Dink Rally 🏓', sport: 'pickleball', level: 1, description: '5-dink patient exchange.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=400' },
    { id: 'pb_kingkitchen_2', title: 'King of the Kitchen Drop 👑', sport: 'pickleball', level: 2, description: 'Third-shot drop winner.', xpReward: 175 },
    { id: 'vb_serve_1', title: 'Upload an Overhand Serve Video 🏐', sport: 'volleyball', level: 1, description: 'Overhand serve into deep zone.', xpReward: 100, thumbnailUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=400' },
    { id: 'vb_spike_1', title: 'Upload a Volleyball Spike / Kill 💥', sport: 'volleyball', level: 1, description: 'High-flying spike attack.', xpReward: 120, thumbnailUrl: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&q=80&w=400' },
    { id: 'vb_block_2', title: 'Stuff Block at the Net 🛡️', sport: 'volleyball', level: 2, description: 'Two-handed rejection block.', xpReward: 180 },
    { id: 'vb_pancake_3', title: 'Diving Pancake Save / Dig 🥞', sport: 'volleyball', level: 3, description: 'Diving pancake floor save.', xpReward: 250 },
  ];

  const filteredChallenges = challenges.filter((c) => {
    const matchesSport = activeSportFilter === 'all' || c.sport === activeSportFilter;
    const matchesLevel = c.level === selectedChallengeLevel;
    return matchesSport && matchesLevel;
  });

  const currentXp = (user as any)?.valuexp ?? (user as any)?.xp ?? 0;
  const xpToNext = (user as any)?.xpToNextLevel ?? 4500;
  const progressPercent = Math.min(100, Math.round((currentXp / xpToNext) * 100));

  const handleCompleteChallengeManual = async (c: Challenge) => {
    if (completedChallengeIds.includes(c.id)) return;

    if (!athleteId) {
      setReportToastMessage('⚠️ Please log in to claim XP');
      setTimeout(() => setReportToastMessage(null), 3500);
      return;
    }

    setCompletedChallengeIds((prev) => [...prev, c.id]);

    try {
      await onEarnXp(c.xpReward, 'video_challenge', c.id);

      setReportToastMessage(`🎉 +${c.xpReward} XP for "${c.title}"!`);
      setTimeout(() => setReportToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to save challenge completion:', err);
      setCompletedChallengeIds((prev) => prev.filter((id) => id !== c.id));
      setReportToastMessage(`⚠️ ${err?.message || 'Failed to save. Try again.'}`);
      setTimeout(() => setReportToastMessage(null), 3500);
    }
  };

  /* ═══════════════════════════════════════════
     DYNAMIC VIDEO RENDERER
     ═══════════════════════════════════════════ */
  const renderVideo = (
    clip: HighlightClip,
    options: {
      autoPlay?: boolean;
      loop?: boolean;
      controls?: boolean;
      className?: string;
    } = {}
  ) => {
    const {
      autoPlay = true,
      loop = isAutoLoopEnabled,
      controls = true,
      className = 'w-full h-full object-cover',
    } = options;

    const sourceType = getVideoSourceType(clip.videoUrl);

    if (sourceType === 'youtube') {
      return (
        <iframe
          src={getYouTubeEmbedUrl(clip.videoUrl)}
          className={className}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={clip.title}
        />
      );
    }

    if (sourceType === 'vimeo') {
      return (
        <iframe
          src={getVimeoEmbedUrl(clip.videoUrl)}
          className={className}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={clip.title}
        />
      );
    }

    return (
      <video
        key={clip.id}
        ref={isWatchPartyOpen && watchPartyClip?.id === clip.id ? watchPartyVideoRef : undefined}
        src={clip.videoUrl}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted
        playsInline
        className={className}
        onWaiting={() =>
          setVideoLoadStatuses((prev) => ({
            ...prev,
            [clip.id]: 'Buffering...',
          }))
        }
        onCanPlay={() =>
          setVideoLoadStatuses((prev) => ({
            ...prev,
            [clip.id]: 'Playing',
          }))
        }
        onError={() =>
          setVideoLoadStatuses((prev) => ({
            ...prev,
            [clip.id]: 'Load failed',
          }))
        }
      />
    );
  };

  /* ═══════════════════════════════════════════
   FETCH highlights — WITH user.highlights.length dependency
   ═══════════════════════════════════════════ */
useEffect(() => {
  let cancelled = false;

  const load = async () => {
    console.log('🔄 [HighlightReelView] Fetching highlights... (user.highlights:', 
      (user as any)?.highlights?.length ?? 0, ')');
    
    setIsLoadingClips(true);
    try {
      const community = await fetchCommunityHighlights({ limit: 50 });

      let mine: HighlightAPIItem[] = [];
      if (athleteId) {
        try {
          mine = await fetchAthleteHighlights(athleteId, { limit: 50 });
        } catch { /* silent */ }
      }

      const seen = new Set<string>();
      const merged: HighlightClip[] = [];
      for (const c of [...mine, ...community]) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        merged.push({
          id: c.id,
          title: c.title,
          sport: c.sport as SportType,
          videoUrl: c.videoUrl,
          thumbnailUrl: c.thumbnailUrl || '',
          durationSeconds: c.durationSeconds,
          createdAt: c.createdAt,
          views: c.views,
          likes: c.likes,
          description: c.description,
        });
      }

      if (cancelled) return;
      console.log('✅ [HighlightReelView] Loaded', merged.length, 'clips');
      setAllCommunityHighlights(merged);
      if (merged.length > 0) {
        setActiveClip((prev) =>
          prev && merged.some((m) => m.id === prev.id) ? prev : merged[0]
        );
      }
    } catch (err) {
      console.error('❌ [HighlightReelView] Load failed:', err);
    } finally {
      if (!cancelled) setIsLoadingClips(false);
    }
  };

  load();
  return () => { cancelled = true; };
}, [
  athleteId,
  (user as any)?.highlights?.length,   // ✅ CRITICAL: refetch on new clip
]);


/* ═══════════════════════════════════════════
   ✅ LIVE SYNC: Inject new clips from user.highlights immediately
   (This runs when parent updates user.highlights after upload)
   ═══════════════════════════════════════════ */
useEffect(() => {
  const userHighlights = (user as any)?.highlights as HighlightClip[] | undefined;
  if (!userHighlights || userHighlights.length === 0) return;

  console.log(
    '🔄 [HighlightReelView] user.highlights updated:',
    userHighlights.length,
    'clips'
  );

  setAllCommunityHighlights((prev) => {
    const existingIds = new Set(prev.map((c) => c.id));
    const newClips = userHighlights.filter((c) => !existingIds.has(c.id));

    if (newClips.length === 0) {
      console.log('   ⏭️ No new clips to inject');
      return prev;
    }

    console.log(
      '   ✅ Injecting',
      newClips.length,
      'new clip(s):',
      newClips.map((c) => c.id)
    );

    // ✅ Auto-select newest in theater
    setTimeout(() => {
      setActiveClip(newClips[0]);
      console.log('   🎬 Auto-selected in theater:', newClips[0].title);
    }, 0);

    return [...newClips, ...prev];
  });
}, [(user as any)?.highlights]);
  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-20 lg:pb-8 animate-fadeIn text-white">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Film className="w-6 h-6 text-lime-400 stroke-[2.5]" />
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
              30s Game Highlight Reel & Level Challenges
            </h1>
          </div>
          <p className="text-xs text-indigo-200/70 font-semibold max-w-2xl">
            Upload 30-second clips, complete sport-specific level challenges to earn XP, fill your progress bar, and level up your athlete profile.
          </p>
        </div>

        <button
          onClick={() => onOpenUploadModal()}
          className="px-5 py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-lg shadow-lime-400/20 transition flex items-center justify-center space-x-2 self-start lg:self-auto"
        >
          <PlusCircle className="w-5 h-5 stroke-[2.5]" />
          <span>Record / Upload 30s Reel (+50 XP)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-4 sm:p-5 rounded-3xl border border-lime-400/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-lime-400/20 text-lime-400 rounded-2xl border border-lime-400/30">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black italic uppercase text-white tracking-wide flex items-center gap-2">
              <span>Filter & Sort Highlights</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-lime-400 text-black font-extrabold rounded-full">
                {sortedAndFilteredHighlights.length}{' '}
                {sortedAndFilteredHighlights.length === 1 ? 'Clip' : 'Clips'}
              </span>
            </h2>
            <p className="text-[11px] text-indigo-200/70 font-semibold">
              Discover top athlete plays sorted by popularity or sport
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-indigo-950/90 px-3.5 py-2 rounded-2xl border border-white/10 hover:border-lime-400/50 transition">
            <ArrowUpDown className="w-4 h-4 text-lime-400 shrink-0" />
            <label className="text-[10px] font-black uppercase italic text-indigo-300/80 shrink-0">
              Sort By:
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as HighlightSortOption)}
              className="bg-transparent text-xs font-black italic uppercase text-lime-300 outline-none cursor-pointer pr-1"
            >
              <option value="recent" className="bg-indigo-950 text-white">🕒 Most Recent</option>
              <option value="viewed" className="bg-indigo-950 text-white">👁️ Most Viewed</option>
              <option value="liked" className="bg-indigo-950 text-white">❤️ Most Liked</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-indigo-950/90 px-3.5 py-2 rounded-2xl border border-white/10 hover:border-lime-400/50 transition">
            <Trophy className="w-4 h-4 text-lime-400 shrink-0" />
            <label className="text-[10px] font-black uppercase italic text-indigo-300/80 shrink-0">
              Sport:
            </label>
            <select
              value={streamSportFilter}
              onChange={(e) => setStreamSportFilter(e.target.value as SportType | 'all')}
              className="bg-transparent text-xs font-black italic uppercase text-lime-300 outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-indigo-950 text-white">🏆 All Sports</option>
              <option value="basketball" className="bg-indigo-950 text-white">🏀 Basketball</option>
              <option value="baseball" className="bg-indigo-950 text-white">⚾ Baseball</option>
              <option value="soccer" className="bg-indigo-950 text-white">⚽ Soccer</option>
              <option value="football" className="bg-indigo-950 text-white">🏈 Football</option>
              <option value="pickleball" className="bg-indigo-950 text-white">🏓 Pickleball</option>
              <option value="tennis" className="bg-indigo-950 text-white">🎾 Tennis</option>
              <option value="volleyball" className="bg-indigo-950 text-white">🏐 Volleyball</option>
            </select>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-6 rounded-[2.5rem] border border-lime-400/30 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={(user as any)?.profilepicture || ''}
                alt={(user as any)?.name || 'Athlete'}
                className="w-14 h-14 rounded-2xl object-cover ring-4 ring-lime-400/50 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-lime-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black uppercase">
                Lvl {(user as any)?.level || 1}
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black italic text-white tracking-tight">
                  {(user as any)?.name || 'Athlete'}
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] bg-lime-400/20 text-lime-300 font-extrabold rounded-full border border-lime-400/30 uppercase">
                  {(user as any)?.levelTitle || 'Rookie'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/70 font-bold">
                Primary Sport:{' '}
                <span className="text-lime-300 uppercase italic font-black">
                  {userSport}
                </span>{' '}
                •{' '}
                {(user as any)?.schoolOrLeague ||
                  (user as any)?.school ||
                  'Playground League'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-indigo-950/80 px-4 py-2.5 rounded-2xl border border-white/10">
            <Zap className="w-5 h-5 text-lime-400 fill-lime-400" />
            <div>
              <span className="text-xs font-black text-white block">
                {currentXp.toLocaleString()} / {xpToNext.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-indigo-300 font-semibold">
                {xpToNext - currentXp > 0
                  ? `${(xpToNext - currentXp).toLocaleString()} XP to next level`
                  : 'Max Level Reached'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 relative z-10">
          <div className="flex justify-between text-xs font-extrabold">
            <span className="text-indigo-200 flex items-center">
              <Trophy className="w-3.5 h-3.5 text-lime-400 mr-1" />
              Level Progress
            </span>
            <span className="text-lime-400 font-mono italic">{progressPercent}%</span>
          </div>

          <div className="w-full h-4 bg-indigo-950 rounded-full border border-white/10 overflow-hidden p-0.5 relative">
            <div
              className="h-full bg-gradient-to-r from-lime-500 via-lime-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-lg shadow-lime-400/30"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Challenges */}
      <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-lime-400 font-black italic uppercase tracking-wider block">
              ⚡ Earn XP & Fill Progress Bar
            </span>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center">
              <Award className="w-5 h-5 text-lime-400 mr-2" />
              Sport-Specific Video Challenges
            </h2>
          </div>

          <div className="flex bg-indigo-950 p-1 rounded-2xl border border-white/10 text-xs font-black italic uppercase">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedChallengeLevel(lvl)}
                className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                  selectedChallengeLevel === lvl
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                <span>Level {lvl}</span>
                <span className="text-[9px] opacity-80">
                  ({lvl === 1 ? 'Rookie' : lvl === 2 ? 'Varsity' : 'All-Star'})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs font-bold">
          <span className="text-[10px] uppercase font-black text-indigo-300/60 shrink-0">
            Filter Sport:
          </span>
          {[
            { id: 'all', label: 'All Sports 🏆' },
            { id: 'volleyball', label: 'Volleyball 🏐' },
            { id: 'basketball', label: 'Basketball 🏀' },
            { id: 'soccer', label: 'Soccer ⚽' },
            { id: 'baseball', label: 'Baseball ⚾' },
            { id: 'football', label: 'Football 🏈' },
            { id: 'pickleball', label: 'Pickleball 🏓' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSportFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                activeSportFilter === s.id
                  ? 'bg-lime-400 text-black font-black italic'
                  : 'bg-indigo-950 text-indigo-200 border border-white/10 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-indigo-950/40 rounded-3xl border border-white/5 space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-sm font-extrabold text-white">
                No Level {selectedChallengeLevel} challenges for this sport.
              </p>
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
              const isCompleted = completedChallengeIds.includes(challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 relative overflow-hidden ${
                    isCompleted
                      ? 'bg-indigo-950/80 border-lime-400/50'
                      : 'bg-indigo-950/60 border-white/10 hover:border-lime-400/30'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-900 text-lime-300 border border-lime-400/30">
                        {challenge.sport} • Level {challenge.level}
                      </span>
                      <span className="text-xs font-black text-lime-400 flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-0.5 fill-lime-400" />
                        +{challenge.xpReward} XP
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-white leading-tight">
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-indigo-200/70 font-medium leading-relaxed">
                      {challenge.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    {isCompleted ? (
                      <div className="w-full py-2.5 bg-lime-400/20 text-lime-300 font-extrabold text-xs rounded-xl border border-lime-400/40 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-lime-400" />
                        <span>Completed (+{challenge.xpReward} XP Claimed)</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenUploadModal(challenge.title, challenge.sport);
                          }}
                          className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                        >
                          <Video className="w-4 h-4" />
                          <span>Upload Video & Earn XP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompleteChallengeManual(challenge)}
                          className="w-full py-1 text-[10px] text-indigo-300 hover:text-lime-300 font-bold transition text-center"
                        >
                          Already have a clip? Claim +{challenge.xpReward} XP
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast */}
      {reportToastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-950 text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-400/60 flex items-center space-x-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{reportToastMessage}</span>
          <button
            onClick={() => setReportToastMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition ml-2"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
      )}

      {/* Theater + Reel Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
          {!activeClip ? (
            <div className="p-12 text-center text-indigo-300">
              {isLoadingClips ? (
                <>
                  <Sparkles className="w-10 h-10 text-lime-400 mx-auto animate-pulse" />
                  <p className="text-sm mt-2">Loading theater...</p>
                </>
              ) : (
                <p className="text-sm">No clip selected</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black italic uppercase text-lime-400 flex items-center">
                  <Play className="w-4 h-4 mr-1.5 fill-lime-400" />
                  Featured 30s Reel Theater
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAutoLoopEnabled(!isAutoLoopEnabled)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition flex items-center space-x-1 border ${
                      isAutoLoopEnabled
                        ? 'bg-lime-400/20 text-lime-300 border-lime-400/40'
                        : 'bg-indigo-950 text-indigo-400 border-white/10'
                    }`}
                  >
                    <Repeat
                      className={`w-3 h-3 ${isAutoLoopEnabled ? 'text-lime-400' : ''}`}
                    />
                    <span>Auto-Loop: {isAutoLoopEnabled ? 'ON 🔁' : 'OFF'}</span>
                  </button>

                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-950/90 text-emerald-300 border-emerald-500/50">
                    <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>
                      {videoLoadStatuses[activeClip.id] || 'Ready'}
                    </span>
                  </span>

                  <span className="text-[10px] bg-lime-400/20 text-lime-300 font-bold px-2 py-0.5 rounded-full border border-lime-400/30 uppercase">
                    {activeClip.sport}
                  </span>
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-white/10 flex items-center justify-center group shadow-2xl">
                {renderVideo(activeClip, {
                  autoPlay: true,
                  loop: isAutoLoopEnabled,
                  controls: true,
                  className: 'w-full h-full object-cover',
                })}

                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white border border-white/20 pointer-events-none">
                  00:
                  {activeClip.durationSeconds < 10
                    ? `0${activeClip.durationSeconds}`
                    : activeClip.durationSeconds}{' '}
                  / 00:30
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenQuickShare(activeClip)}
                  className="absolute bottom-3 right-3 bg-gradient-to-r from-lime-400 to-emerald-400 text-black hover:scale-105 font-black italic text-xs px-3.5 py-2 rounded-2xl shadow-xl shadow-lime-400/30 border border-black/30 flex items-center space-x-1.5 transition z-10"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Quick Share Card</span>
                </button>

                {reportedClipIds.includes(activeClip.id) && (
                  <div className="absolute top-3 right-3 bg-rose-950/90 text-rose-300 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase border border-rose-500/50 flex items-center space-x-1 pointer-events-none">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Flagged for Review</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black italic text-white flex items-center gap-2">
                      <span>{activeClip.title}</span>
                      {reportedClipIds.includes(activeClip.id) && (
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                          Reported ⚠️
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-indigo-200/70 font-semibold mt-0.5">
                      {activeClip.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                    <button
                      type="button"
                      onClick={() => handleLikeClip(activeClip.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition border ${
                        likedClipIds.includes(activeClip.id)
                          ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          likedClipIds.includes(activeClip.id)
                            ? 'fill-white text-white'
                            : 'fill-rose-400 text-rose-400'
                        }`}
                      />
                      <span>{clipLikes[activeClip.id] ?? activeClip.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenQuickShare(activeClip)}
                      className="px-3 py-1.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-black border border-lime-400 rounded-xl text-xs font-black italic flex items-center space-x-1 transition shadow-md hover:scale-105"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Quick Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRepostingClip(activeClip)}
                      className="px-3 py-1.5 bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 border border-lime-400/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
                    >
                      <Repeat className="w-3.5 h-3.5 text-lime-400" />
                      <span>Re-post</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartWatchParty(activeClip)}
                      className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
                    >
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Watch Party</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator
                            .share({
                              title: `Highlight: ${activeClip.title}`,
                              text: `Check out this ${activeClip.sport} highlight on Playground League!`,
                              url: window.location.href,
                            })
                            .then(() => {
                              setShareConfirmation({
                                type: 'highlight',
                                title: `Shared "${activeClip.title}"`,
                                subtitle: '+25 XP credited for sharing!',
                                sport: activeClip.sport,
                                xpAwarded: 25,
                              });
                              onEarnXp(25, 'Shared Highlight Clip');
                            })
                            .catch(() => {});
                        } else {
                          navigator.clipboard?.writeText(window.location.href);
                          setShareConfirmation({
                            type: 'highlight',
                            title: `Link Copied for "${activeClip.title}"`,
                            subtitle: 'Highlight link copied to clipboard!',
                            sport: activeClip.sport,
                            xpAwarded: 10,
                          });
                          onEarnXp(10, 'Shared Highlight Link');
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1 border border-white/10 transition"
                    >
                      <Share2 className="w-3.5 h-3.5 text-lime-400" />
                      <span>Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportingClip(activeClip)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition border ${
                        reportedClipIds.includes(activeClip.id)
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border-rose-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {reportedClipIds.includes(activeClip.id) ? 'Reported' : 'Report'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-indigo-300/70 font-semibold pt-2 border-t border-white/10">
                  <span className="flex items-center text-lime-300 font-bold">
                    <Eye className="w-3.5 h-3.5 mr-1 text-lime-400" />
                    {clipViews[activeClip.id] ?? activeClip.views} Views
                  </span>
                  <span>Uploaded {activeClip.createdAt}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Reel Stream */}
        <div className="lg:col-span-5 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase text-sm text-white flex items-center">
              <Film className="w-4 h-4 text-lime-400 mr-2" />
              Community Reel Stream
            </h3>

            <button
              type="button"
              onClick={() => setIsAutoPlayOnHoverEnabled(!isAutoPlayOnHoverEnabled)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase transition flex items-center space-x-1 border ${
                isAutoPlayOnHoverEnabled
                  ? 'bg-lime-400/20 text-lime-300 border-lime-400/40'
                  : 'bg-indigo-950 text-indigo-400 border-white/10'
              }`}
            >
              <Zap
                className={`w-3 h-3 ${
                  isAutoPlayOnHoverEnabled ? 'text-lime-400 fill-lime-400' : ''
                }`}
              />
              <span>Hover Preview: {isAutoPlayOnHoverEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {isLoadingClips ? (
              <div className="p-8 text-center">
                <Sparkles className="w-8 h-8 text-lime-400 mx-auto animate-pulse" />
                <p className="text-xs text-indigo-300 mt-2">Loading clips...</p>
              </div>
            ) : sortedAndFilteredHighlights.length === 0 ? (
              <div className="p-8 text-center bg-indigo-950/60 rounded-3xl border-2 border-dashed border-lime-400/30 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-lime-400/20 text-lime-400 flex items-center justify-center border border-lime-400/40 shadow-xl relative">
                  <Film className="w-8 h-8 stroke-[2.2]" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-lime-400 animate-ping" />
                </div>

                <div className="max-w-xs mx-auto space-y-1.5">
                  <h3 className="text-base font-black italic uppercase text-white tracking-tight">
                    {streamSportFilter === 'all'
                      ? 'No Highlight Clips Yet'
                      : `No ${streamSportFilter} Clips Found`}
                  </h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed font-semibold">
                    {streamSportFilter === 'all'
                      ? 'Be the first to upload a 30-second game highlight reel and inspire the community!'
                      : `No ${streamSportFilter} highlights in the stream yet. Try a different sport or be the first!`}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  {streamSportFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setStreamSportFilter('all')}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-lime-400 border border-lime-400/40 text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Show All Sports</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenUploadModal()}
                    className="w-full sm:w-auto px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Upload Highlight</span>
                  </button>
                </div>
              </div>
            ) : (
              sortedAndFilteredHighlights.map((clip) => {
                const isActive = activeClip?.id === clip.id;
                const isHovered =
                  isAutoPlayOnHoverEnabled && hoveredClipId === clip.id;
                const sourceType = getVideoSourceType(clip.videoUrl);

                return (
                  <div
                    key={clip.id}
                    onMouseEnter={() => setHoveredClipId(clip.id)}
                    onMouseLeave={() => setHoveredClipId(null)}
                    className={`group w-full p-3 rounded-2xl border text-left transition flex items-center space-x-3 relative ${
                      isActive
                        ? 'bg-lime-400 text-black font-black italic shadow-md border-lime-400'
                        : 'bg-indigo-950/80 text-white border-white/10 hover:bg-indigo-950'
                    }`}
                  >
                    <div
                      onClick={() => setActiveClip(clip)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          setActiveClip(clip);
                      }}
                      className="flex items-center space-x-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
                        {isHovered && sourceType === 'direct' ? (
                          <video
                            src={clip.videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover scale-105 transition duration-300"
                          />
                        ) : isHovered && (sourceType === 'youtube' || sourceType === 'vimeo') ? (
                          <div className="relative w-full h-full">
                            <img
                              src={clip.thumbnailUrl || ''}
                              alt={clip.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-lime-400/20 flex items-center justify-center">
                              <span className="px-1.5 py-0.5 bg-lime-400 text-black font-black text-[8px] uppercase rounded shadow animate-pulse">
                                Hover ⚡
                              </span>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={clip.thumbnailUrl || ''}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}

                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                          {isHovered ? (
                            <span className="px-1.5 py-0.5 bg-lime-400 text-black font-black text-[8px] uppercase rounded shadow animate-pulse">
                              Previewing ⚡
                            </span>
                          ) : (
                            <Play
                              className={`w-5 h-5 ${
                                isActive
                                  ? 'text-black fill-black'
                                  : 'text-white fill-white'
                              }`}
                            />
                          )}
                        </div>

                        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-[8px] font-mono text-white rounded">
                          {clip.durationSeconds}s
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs font-bold line-clamp-1">
                          {clip.title}
                        </p>
                        <div className="flex items-center justify-between text-[10px] gap-2 pt-0.5">
                          <span
                            className={`flex items-center space-x-1 ${
                              isActive
                                ? 'text-black/80 font-extrabold'
                                : 'text-indigo-200/70'
                            }`}
                          >
                            <Eye className="w-3 h-3 shrink-0" />
                            <span>
                              {clipViews[clip.id] ?? clip.views} views
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeClip(clip.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition border ${
                              likedClipIds.includes(clip.id)
                                ? isActive
                                  ? 'bg-rose-600 text-white border-rose-700'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : isActive
                                ? 'bg-black/10 hover:bg-black/20 text-black border-black/20'
                                : 'bg-indigo-900/60 hover:bg-rose-950/60 text-indigo-200 hover:text-rose-300 border-white/10'
                            }`}
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                likedClipIds.includes(clip.id)
                                  ? 'fill-rose-500 text-rose-500'
                                  : 'text-rose-400'
                              }`}
                            />
                            <span>{clipLikes[clip.id] ?? clip.likes}</span>
                          </button>
                        </div>
                        {reportedClipIds.includes(clip.id) && (
                          <span className="text-[9px] text-amber-500 font-extrabold block">
                            ⚠️ Flagged for Admin
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportingClip(clip)}
                      className={`p-2 rounded-xl transition ${
                        isActive
                          ? 'hover:bg-black/10 text-black'
                          : 'hover:bg-white/10 text-indigo-300 hover:text-amber-400'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-indigo-950 border border-rose-500/40 rounded-[2.5rem] p-6 space-y-5 shadow-2xl">
            <button
              onClick={() => setReportingClip(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-950 rounded-2xl border border-rose-500/40 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase text-white">
                  Report Video Issue
                </h3>
                <p className="text-xs text-indigo-200/70 font-semibold">
                  Flag for Admin review.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-900/60 rounded-2xl border border-white/10 text-xs text-white space-y-1">
              <p className="font-extrabold text-lime-300">{reportingClip.title}</p>
              <p className="text-indigo-200/70 text-[11px]">
                Sport: {reportingClip.sport} • ID: {reportingClip.id}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-300 block">
                Issue:
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-3 bg-indigo-900 border border-white/20 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-rose-400"
              >
                <option>Video playback failed / black screen</option>
                <option>Audio missing or out of sync</option>
                <option>Buffering freeze or broken stream</option>
                <option>Incorrect video content or sport tag</option>
              </select>

              <label className="text-xs font-black uppercase tracking-wider text-indigo-300 block pt-1">
                Notes (Optional):
              </label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
                className="w-full p-3 bg-indigo-900 border border-white/20 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setReportingClip(null)}
                className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-extrabold uppercase rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitIssueReport}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center space-x-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Submit to Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-post Modal */}
      {repostingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-indigo-950 border border-lime-400/50 rounded-[2.5rem] p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setRepostingClip(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-lime-400/20 rounded-2xl border border-lime-400/40 shrink-0">
                <Repeat className="w-6 h-6 text-lime-400" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase text-white">
                  Re-post to Profile Feed
                </h3>
                <p className="text-xs text-indigo-200/70 font-semibold">
                  Share & earn +25 XP!
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-indigo-900/80 rounded-2xl border border-white/10">
              <img
                src={repostingClip.thumbnailUrl || ''}
                alt={repostingClip.title}
                className="w-16 h-12 object-cover rounded-xl border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white line-clamp-1">
                  {repostingClip.title}
                </p>
                <p className="text-[10px] text-lime-300/80 font-mono font-bold uppercase">
                  {repostingClip.sport} • {repostingClip.views} views
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-300 block">
                Shoutout Message:
              </label>
              <textarea
                value={repostShoutoutMessage}
                onChange={(e) => setRepostShoutoutMessage(e.target.value)}
                placeholder="Insane play! 🔥"
                rows={3}
                className="w-full p-3 bg-indigo-900 border border-white/20 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-lime-400"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  '🔥 Unreal Skill!',
                  '🚀 MVP Move!',
                  '👏 Massive Respect!',
                  '💯 Game Changer!',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setRepostShoutoutMessage((prev) =>
                        prev ? `${prev} ${preset}` : preset
                      )
                    }
                    className="px-2.5 py-1 bg-indigo-900 hover:bg-lime-950/60 text-indigo-200 hover:text-lime-300 text-[10px] font-bold rounded-lg border border-white/10 transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRepostingClip(null)}
                className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-extrabold uppercase rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRepost}
                className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black text-xs font-black italic uppercase rounded-xl shadow-lg transition flex items-center space-x-1.5"
              >
                <Repeat className="w-4 h-4" />
                <span>Re-post (+25 XP)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watch Party Modal */}
      {isWatchPartyOpen && watchPartyClip && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-indigo-950 border border-sky-400/50 rounded-[2.5rem] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 via-indigo-950 to-purple-950 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-400/40 text-sky-400 shrink-0">
                  <Users className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      LIVE WATCH PARTY
                    </span>
                    <span className="text-[10px] text-sky-300 font-mono font-bold">
                      {watchPartyRoomId}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono font-bold">
                      👥 {watchPartyMembers.length}
                    </span>
                  </div>
                  <h3 className="text-base font-black italic text-white line-clamp-1">
                    {watchPartyClip.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setWatchPartyCopied(true);
                    setTimeout(() => setWatchPartyCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-sky-300 text-xs font-bold rounded-xl border border-sky-400/30 transition flex items-center space-x-1"
                >
                  {watchPartyCopied ? (
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{watchPartyCopied ? 'Copied!' : 'Invite'}</span>
                </button>

                {/* ✅ LEAVE button — actually leave party */}
                <button
                  type="button"
                  onClick={handleLeaveWatchParty}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-400/40 transition flex items-center space-x-1"
                  title="Leave party permanently"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>

                {/* ✅ X button — sirf close (data preserve) */}
                <button
                  type="button"
                  onClick={handleCloseWatchPartyModal}
                  className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  title="Close (session preserved)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
              <div className="lg:col-span-8 p-4 bg-black/60 flex flex-col justify-between relative overflow-hidden space-y-3">
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                  {watchPartyFloatingReactions.map((rx) => (
                    <div
                      key={rx.id}
                      style={{ left: `${rx.left}%` }}
                      className="absolute bottom-16 text-3xl animate-bounce transition-all opacity-90 scale-125"
                    >
                      {rx.emoji}
                    </div>
                  ))}
                </div>

                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                  {renderVideo(watchPartyClip, {
                    autoPlay: true,
                    loop: true,
                    controls: false,
                    className: 'w-full h-full object-cover',
                  })}

                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-sky-300 border border-sky-400/30 flex items-center space-x-1.5 z-10 pointer-events-none">
                    <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                    <span>Real-Time Synced</span>
                  </div>

                  {isRestoringSession && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                      <div className="text-center space-y-2">
                        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                        <p className="text-xs font-mono text-sky-300">
                          Restoring session...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-indigo-950/90 rounded-2xl border border-white/10 flex flex-col space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleToggleWatchPartyPlayback}
                        className="p-2 bg-sky-500 hover:bg-sky-400 text-black rounded-xl font-black transition"
                      >
                        {watchPartyIsPlaying ? (
                          <Pause className="w-4 h-4 fill-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black" />
                        )}
                      </button>
                      <span className="text-xs font-mono font-bold text-sky-300">
                        {watchPartyIsPlaying ? 'LIVE PLAYING' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-bold uppercase text-indigo-300/80 mr-1">
                        Reactions:
                      </span>
                      {['🔥', '😱', '👏', '🎯', '💥', '💯'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleTriggerWatchPartyReaction(emoji)}
                          className="px-2 py-1 bg-indigo-900 hover:bg-sky-900/60 rounded-lg text-sm transition hover:scale-125 transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-indigo-950/95 border-l border-white/10 flex flex-col h-full overflow-hidden">
                <div className="flex border-b border-white/10 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setWatchPartyActiveTab('chat')}
                    className={`flex-1 py-3 text-center transition flex items-center justify-center space-x-1.5 border-b-2 ${
                      watchPartyActiveTab === 'chat'
                        ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                        : 'border-transparent text-indigo-300/70 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWatchPartyActiveTab('members')}
                    className={`flex-1 py-3 text-center transition flex items-center justify-center space-x-1.5 border-b-2 ${
                      watchPartyActiveTab === 'members'
                        ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                        : 'border-transparent text-indigo-300/70 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Members</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {watchPartyMembers.length}
                    </span>
                  </button>
                </div>

                {watchPartyActiveTab === 'chat' ? (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden p-3 space-y-3">
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[320px] lg:max-h-full">
                      {watchPartyMessages.length === 0 ? (
                        <div className="text-center py-8 text-indigo-300/60 text-xs">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>No messages yet</p>
                          <p className="text-[10px] mt-1">Start the conversation!</p>
                        </div>
                      ) : (
                        <>
                          {watchPartyMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`text-xs p-2.5 rounded-xl border ${
                                msg.isSystem
                                  ? 'bg-sky-950/40 border-sky-500/30 text-sky-200 italic'
                                  : 'bg-indigo-900/60 border-white/10 text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1.5">
                                  {msg.senderAvatar ? (
                                    <img
                                      src={msg.senderAvatar}
                                      alt={msg.senderName}
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-lime-400 text-black flex items-center justify-center font-black text-[8px]">
                                      {msg.senderName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-bold text-[11px] text-sky-300">
                                    {msg.senderName}
                                  </span>
                                </div>
                                <span className="text-[9px] text-indigo-300/60 font-mono">
                                  {msg.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed">{msg.text}</p>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    <form
                      onSubmit={handleSendWatchPartyMessage}
                      className="flex items-center space-x-2 pt-1 border-t border-white/10 shrink-0"
                    >
                      <input
                        type="text"
                        value={watchPartyChatInput}
                        onChange={(e) => setWatchPartyChatInput(e.target.value)}
                        placeholder="Discuss in real-time..."
                        className="flex-1 px-3 py-2 bg-indigo-900 border border-white/20 rounded-xl text-xs text-white placeholder-indigo-300/50 focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        className="p-2 bg-sky-500 hover:bg-sky-400 text-black rounded-xl font-bold transition shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                        Active Watchers
                      </p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        {watchPartyMembers.length}{' '}
                        {watchPartyMembers.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    {watchPartyMembers.length === 0 ? (
                      <div className="text-center py-8 text-indigo-300/60 text-xs">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>No one has joined yet...</p>
                        <p className="text-[10px] mt-1">
                          Share the room link to invite friends!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {watchPartyMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2.5 bg-indigo-900/50 rounded-xl border border-white/10 hover:border-sky-400/40 transition"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="relative shrink-0">
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-lime-400 text-black flex items-center justify-center font-black text-[10px]">
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {member.isOnline !== false && (
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-white truncate block">
                                  {member.name}
                                  {member.id === athleteId && (
                                    <span className="text-[9px] text-lime-400 ml-1">
                                      (You)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                member.role === 'host'
                                  ? 'bg-sky-500 text-black'
                                  : 'bg-indigo-900 text-indigo-300 border border-white/10'
                              }`}
                            >
                              {member.role === 'host' ? 'Host' : 'Viewer'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Share Modal */}
      {isQuickShareModalOpen && quickShareClip && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-[2.5rem] border-2 border-lime-400 p-6 md:p-8 max-w-3xl w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsQuickShareModalOpen(false)}
              className="absolute top-5 right-5 p-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-full transition border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-tr from-lime-400 to-emerald-400 text-black rounded-2xl shadow-lg">
                <Camera className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase text-white tracking-wide">
                  Social Media Preview Card
                </h2>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Generate an official graphic for Instagram, X & TikTok.
                </p>
              </div>
            </div>

            <canvas ref={quickShareCanvasRef} className="hidden" />

            <div className="relative rounded-2xl overflow-hidden border-2 border-lime-400/40 shadow-2xl bg-black aspect-[1200/630] flex items-center justify-center">
              {quickShareImageUrl ? (
                <img
                  src={quickShareImageUrl}
                  alt="Social Media Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-lime-400 animate-spin mx-auto" />
                  <p className="text-xs font-mono font-bold text-indigo-200">
                    Generating graphic...
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="text-xs text-indigo-200/80 font-mono">
                Includes stats, badge & league watermark.
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {quickShareImageUrl && (
                  <a
                    href={quickShareImageUrl}
                    download={`highlight_${quickShareClip.sport}_${quickShareClip.id}.png`}
                    onClick={() => {
                      triggerHaptic('success');
                      onEarnXp(20, 'Downloaded Social Media Highlight Card');
                      setReportToastMessage('🖼️ Image downloaded! (+20 XP)');
                      setTimeout(() => setReportToastMessage(null), 3500);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-black font-black italic uppercase text-xs rounded-xl shadow-lg hover:scale-105 transition flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download PNG</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigator.clipboard?.writeText(window.location.href);
                    setQuickShareCopied(true);
                    setShareConfirmation({
                      type: 'highlight',
                      title: `Share Card Ready for "${quickShareClip.title}"`,
                      subtitle: 'Copied link & preview generated. +20 XP!',
                      sport: quickShareClip.sport,
                      xpAwarded: 20,
                    });
                    onEarnXp(20, 'Shared Highlight Social Card');
                    setTimeout(() => setQuickShareCopied(false), 2500);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl border border-white/15 transition flex items-center justify-center space-x-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>{quickShareCopied ? 'Copied! ✓' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Share Confirmation */}
      {shareConfirmation && (
        <ShareConfirmationToast
          data={shareConfirmation}
          onClose={() => setShareConfirmation(null)}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   INLINE Share Confirmation Toast
   ═══════════════════════════════════════════ */
const ShareConfirmationToast: React.FC<{
  data: ShareConfirmationData;
  onClose: () => void;
}> = ({ data, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-fadeIn">
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border-2 border-lime-400 rounded-3xl p-4 pr-12 shadow-[0_15px_40px_rgba(0,0,0,0.85)] max-w-sm w-[92vw] relative">
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

export default HighlightReelView;