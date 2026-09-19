// components/SocialFeedView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { AthleteProfile, SportType } from '../types';
import {
  Rss,
  Flame,
  MessageCircle,
  Share2,
  Trophy,
  Award,
  Film,
  MapPin,
  Zap,
  CheckCircle2,
  Send,
  UserPlus,
  UserCheck,
  Sparkles,
  CalendarCheck,
  Users,
  TrendingUp,
  Clock,
  Search,
  Filter,
  X,
  Crown,
  Swords,
  MessageSquare,
  SlidersHorizontal,
  Target,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PlayerCompareRadarChart } from './PlayerCompareRadarChart';
import toast from 'react-hot-toast';
import {
  fetchFeed,
  type ActivityFeedItem,
  type FeedComment,
} from '../services/feed.service';
import { getSocket } from '../services/socket';
import { getLevelInfo, MAX_LEVEL } from '../utils/leveling';

export type { FeedComment, ActivityFeedItem };

interface SocialFeedViewProps {
  user: AthleteProfile;
  allAthletes: AthleteProfile[];
  onNavigateTab: (tab: any) => void;
  onSendFriendRequest?: (player: {
    id: string;
    name: string;
    avatar?: string;
    detail?: string;
  }) => void;
  onDirectMessageAthlete?: (athlete: AthleteProfile) => void;
}

export const SocialFeedView: React.FC<SocialFeedViewProps> = ({
  user,
  allAthletes,
  onNavigateTab,
  onSendFriendRequest,
  onDirectMessageAthlete,
}) => {
  /* ═══════════════════════════════════════════
     FEED STATE
     ═══════════════════════════════════════════ */
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [submittingPost, setSubmittingPost] = useState<boolean>(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [friendOnlyFilter, setFriendOnlyFilter] = useState<boolean>(false);
  const [newStatusText, setNewStatusText] = useState<string>('');
  const [activeCommentFeedId, setActiveCommentFeedId] = useState<string | null>(
    null
  );
  const [commentInputText, setCommentInputText] = useState<
    Record<string, string>
  >({});
  const [sentFriendRequests, setSentFriendRequests] = useState<string[]>([]);

  /* ═══════════════════════════════════════════
     ATHLETE DIRECTORY FILTERS
     ═══════════════════════════════════════════ */
  const [athleteSearchQuery, setAthleteSearchQuery] = useState<string>('');
  const [athleteSportFilter, setAthleteSportFilter] = useState<string>('all');
  const [athleteSkillFilter, setAthleteSkillFilter] = useState<string>('all');
  const [proOnlyFilter, setProOnlyFilter] = useState<boolean>(false);
  const [nearbyOnlyFilter, setNearbyOnlyFilter] = useState<boolean>(false);
  const [similarSkillFilter, setSimilarSkillFilter] = useState<boolean>(false);
  const [sameSportFilter, setSameSportFilter] = useState<boolean>(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<string>('all');
  const [showAdvancedPanel, setShowAdvancedPanel] = useState<boolean>(false);

  /* ═══════════════════════════════════════════
     PLAYER COMPARE
     ═══════════════════════════════════════════ */
  const [showPlayerCompare, setShowPlayerCompare] = useState<boolean>(false);
  const [comparePlayer1, setComparePlayer1] = useState<AthleteProfile>(user);
  const [comparePlayer2, setComparePlayer2] = useState<AthleteProfile>(
    allAthletes.find((a) => a.id !== user.id) || user
  );

  /* ═══════════════════════════════════════════
     USER LEVEL INFO (derived)
     ═══════════════════════════════════════════ */
  const userLevelInfo = getLevelInfo((user as any).valuexp ?? 0);

  /* ═══════════════════════════════════════════
     DISTANCE HELPER
     ═══════════════════════════════════════════ */
  const getDistanceKm = (
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number
  ): number | null => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  /* ═══════════════════════════════════════════
     LOAD FEED
     ═══════════════════════════════════════════ */
  const loadFeed = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoadingFeed(true);
        setFeedError(null);
        const data = await fetchFeed(user.id, {
          type: filterType,
          friendsOnly: friendOnlyFilter,
          limit: 50,
        });
        setFeedItems(data);
      } catch (err) {
        console.error('❌ loadFeed:', err);
        setFeedError(
          err instanceof Error ? err.message : 'Failed to load feed'
        );
      } finally {
        setLoadingFeed(false);
      }
    },
    [user.id, filterType, friendOnlyFilter]
  );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  /* ═══════════════════════════════════════════
     POST STATUS UPDATE
     ═══════════════════════════════════════════ */
  const handlePostStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusText.trim() || submittingPost) return;

    setSubmittingPost(true);
    const socket = getSocket();

    socket.emit(
      'feed:create_post',
      {
        authorId: user.id,
        type: 'status_update',
        title: 'Shared an Athlete Update 📢',
        description: newStatusText.trim(),
      },
      (res: any) => {
        setSubmittingPost(false);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        setNewStatusText('');
        toast.success('Update posted! 🎉');
      }
    );
  };

  /* ═══════════════════════════════════════════
     TOGGLE LIKE
     ═══════════════════════════════════════════ */
  const handleToggleLike = (feedId: string) => {
    if (likingPostId === feedId) return;

    setLikingPostId(feedId);
    const socket = getSocket();

    socket.emit(
      'feed:like',
      { postId: feedId, athleteId: user.id },
      (res: any) => {
        setLikingPostId(null);
        if (res?.error) toast.error(res.error);
      }
    );
  };

  /* ═══════════════════════════════════════════
     ADD COMMENT
     ═══════════════════════════════════════════ */
  const handleAddComment = (feedId: string) => {
    const text = commentInputText[feedId]?.trim();
    if (!text) return;

    const socket = getSocket();

    socket.emit(
      'feed:comment',
      { postId: feedId, athleteId: user.id, text },
      (res: any) => {
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        setCommentInputText((prev) => ({ ...prev, [feedId]: '' }));
      }
    );
  };

  /* ═══════════════════════════════════════════
     FRIEND REQUEST
     ═══════════════════════════════════════════ */
  const handleSendFriendRequestTrigger = (player: AthleteProfile) => {
    if (sentFriendRequests.includes(player.id)) return;
    setSentFriendRequests((prev) => [...prev, player.id]);

    const playerLevel = getLevelInfo((player as any).valuexp ?? 0);

    onSendFriendRequest?.({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      detail: `${playerLevel.levelTitle} • Level ${playerLevel.level}`,
    });
  };

  /* ═══════════════════════════════════════════
     SOCKET LISTENERS
     ═══════════════════════════════════════════ */
  useEffect(() => {
    const socket = getSocket();

    const handleNewPost = (payload: {
      post: ActivityFeedItem;
      authorId: string;
    }) => {
      console.log('📡 feed:new_post:', payload.post.id);

      setFeedItems((prev) => {
        if (prev.some((p) => p.id === payload.post.id)) return prev;
        return [payload.post, ...prev];
      });

      if (payload.post.authorId !== user.id) {
        toast.success(
          `📢 ${payload.post.authorName}: "${payload.post.title}"`,
          {
            duration: 4000,
          }
        );
      }
    };

    const handleLikeUpdated = (payload: {
      postId: string;
      liked: boolean;
      likesCount: number;
      athleteId: string;
    }) => {
      console.log('❤️ feed:like_updated:', payload);

      setFeedItems((prev) =>
        prev.map((item) =>
          item.id === payload.postId
            ? {
                ...item,
                likesCount: payload.likesCount,
                hasLiked:
                  payload.athleteId === user.id ? payload.liked : item.hasLiked,
              }
            : item
        )
      );
    };

    const handleCommentAdded = (payload: {
      postId: string;
      comment: FeedComment;
    }) => {
      console.log('💬 feed:comment_added:', payload);

      setFeedItems((prev) =>
        prev.map((item) => {
          if (item.id !== payload.postId) return item;
          if (item.comments.some((c) => c.id === payload.comment.id))
            return item;
          return { ...item, comments: [...item.comments, payload.comment] };
        })
      );
    };

    const handlePostDeleted = (payload: { postId: string }) => {
      setFeedItems((prev) =>
        prev.filter((item) => item.id !== payload.postId)
      );
    };

    socket.on('feed:new_post', handleNewPost);
    socket.on('feed:like_updated', handleLikeUpdated);
    socket.on('feed:comment_added', handleCommentAdded);
    socket.on('feed:post_deleted', handlePostDeleted);

    return () => {
      socket.off('feed:new_post', handleNewPost);
      socket.off('feed:like_updated', handleLikeUpdated);
      socket.off('feed:comment_added', handleCommentAdded);
      socket.off('feed:post_deleted', handlePostDeleted);
    };
  }, [user.id]);

  /* ═══════════════════════════════════════════
     FILTER ATHLETES
     ═══════════════════════════════════════════ */
  const filteredAthletes = allAthletes.filter((ath) => {
  // Skip self
  if (ath.id === user.id) return false;

  // Skip hidden
  if (
    (ath as any).hideFromGlobalSearch ||
    (ath as any).isSearchable === false
  ) {
    return false;
  }

  const athLevelInfo = getLevelInfo((ath as any).valuexp ?? 0);
  const q = athleteSearchQuery.trim().toLowerCase();

  /* ═══════════════════════════════════════════
     ✅ SAFE STRINGS — support both camelCase + snake_case
     ═══════════════════════════════════════════ */
  const athName = (ath.name || '').toLowerCase();

  const athHandle = (
    (ath as any).handle ||
    (ath as any).userhandle ||
    ''
  ).toLowerCase();

  // ✅ ATHLETE SPORT — try snake_case FIRST, then camelCase
  const athPrimarySport = (
    (ath as any).primary_sport ||
    (ath as any).primarySport ||
    ''
  ).toString().trim();

  const athPrimarySportLower = athPrimarySport.toLowerCase();

  const athPosition = (ath.position || '').toLowerCase();

  const athSchool = (
    (ath as any).schoolOrLeague ||
    (ath as any).school ||
    ''
  ).toLowerCase();

  const athTitle = athLevelInfo.levelTitle.toLowerCase();
  const athLevelStr = `level ${athLevelInfo.level}`.toLowerCase();
  const athLvlStr = `lvl ${athLevelInfo.level}`.toLowerCase();

  /* ═══════════════════════════════════════════
     MATCHES — QUERY
     ═══════════════════════════════════════════ */
  const matchesQuery =
    !q ||
    athName.includes(q) ||
    athHandle.includes(q) ||
    athPrimarySportLower.includes(q) ||
    athTitle.includes(q) ||
    athLevelStr.includes(q) ||
    athLvlStr.includes(q) ||
    athPosition.includes(q) ||
    athSchool.includes(q);

  /* ═══════════════════════════════════════════
     MATCHES — SPORT (dropdown)
     ═══════════════════════════════════════════ */
  const matchesSport =
    athleteSportFilter === 'all' ||
    athPrimarySportLower === athleteSportFilter.toLowerCase();

  /* ═══════════════════════════════════════════
     MATCHES — SKILL
     ═══════════════════════════════════════════ */
  const matchesSkill =
    athleteSkillFilter === 'all' ||
    athTitle.startsWith(athleteSkillFilter.toLowerCase());

  /* ═══════════════════════════════════════════
     MATCHES — PRO
     ═══════════════════════════════════════════ */
  const isProMember = Boolean(ath.isPro || ath.subscriptionTier === 'pro');
  const matchesPro = !proOnlyFilter || isProMember;

  /* ═══════════════════════════════════════════
     ✅ MATCHES — MY SPORT (FIXED)
     ═══════════════════════════════════════════ */
  // Get user sport — support both cases
  const userPrimarySport = (
    (user as any).primary_sport ||
    (user as any).primarySport ||
    ''
  ).toString().trim();

  const matchesSameSport =
    !sameSportFilter ||
    (
      // ✅ Both must be non-empty AND equal (case-insensitive)
      athPrimarySport !== '' &&
      userPrimarySport !== '' &&
      athPrimarySportLower === userPrimarySport.toLowerCase()
    );

  /* ═══════════════════════════════════════════
     MATCHES — SIMILAR SKILL
     ═══════════════════════════════════════════ */
  const levelDiff = Math.abs(athLevelInfo.level - userLevelInfo.level);
  const matchesSimilarSkill = !similarSkillFilter || levelDiff <= 3;

  /* ═══════════════════════════════════════════
     MATCHES — NEARBY
     ═══════════════════════════════════════════ */
  const dist = getDistanceKm(
    user.location?.lat,
    user.location?.lng,
    ath.location?.lat,
    ath.location?.lng
  );
  const numMaxDist =
    maxDistanceKm === 'all' ? Infinity : parseFloat(maxDistanceKm);

  const matchesNearby =
    !nearbyOnlyFilter && maxDistanceKm === 'all'
      ? true
      : dist !== null && dist <= numMaxDist;

  /* ═══════════════════════════════════════════
     ✅ DEBUG LOG (remove later)
     ═══════════════════════════════════════════ */
  if (sameSportFilter) {
    console.log(`🎯 ${ath.name}:`, {
      athSport: athPrimarySport,
      userSport: userPrimarySport,
      match: matchesSameSport,
    });
  }

  /* ═══════════════════════════════════════════
     RETURN — AND of all filters
     ═══════════════════════════════════════════ */
  return (
    matchesQuery &&
    matchesSport &&
    matchesSkill &&
    matchesPro &&
    matchesSameSport &&
    matchesSimilarSkill &&
    matchesNearby
  );
});

  const activeAdvancedFilterCount =
    (proOnlyFilter ? 1 : 0) +
    (nearbyOnlyFilter || maxDistanceKm !== 'all' ? 1 : 0) +
    (similarSkillFilter ? 1 : 0) +
    (sameSportFilter ? 1 : 0) +
    (athleteSportFilter !== 'all' ? 1 : 0) +
    (athleteSkillFilter !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setAthleteSearchQuery('');
    setAthleteSportFilter('all');
    setAthleteSkillFilter('all');
    setProOnlyFilter(false);
    setNearbyOnlyFilter(false);
    setSimilarSkillFilter(false);
    setSameSportFilter(false);
    setMaxDistanceKm('all');
  };
  console.log(user);
  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-20 lg:pb-8 animate-fadeIn text-white">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Rss className="w-6 h-6 text-lime-400 stroke-[2.5]" />
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
              Athlete Social Feed & Activity Stream
            </h1>
          </div>
          <p className="text-xs text-indigo-200/70 font-semibold max-w-2xl">
            See real-time game results, verified stat logs, unlocked
            achievements, and 30s highlight clips from your athlete network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPlayerCompare(!showPlayerCompare)}
            className={`px-4 py-2.5 rounded-2xl font-black italic uppercase text-xs transition flex items-center space-x-1.5 shadow-lg border ${
              showPlayerCompare
                ? 'bg-lime-400 text-black border-lime-300 ring-2 ring-lime-400/50'
                : 'bg-indigo-950 hover:bg-indigo-800 text-lime-400 border-lime-400/40'
            }`}
          >
            <Swords className="w-4 h-4 stroke-[2.5]" />
            <span>
              {showPlayerCompare ? 'Hide Radar Compare' : 'Player Compare (D3)'}
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('games')}
            className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-white/10 font-black italic uppercase text-xs rounded-2xl transition flex items-center space-x-1.5"
          >
            <CalendarCheck className="w-4 h-4 text-lime-400" />
            <span>Pickup Games</span>
          </button>

          <button
            onClick={() => onNavigateTab('highlights')}
            className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-lg shadow-lime-400/20 transition flex items-center space-x-1.5"
          >
            <Film className="w-4 h-4 stroke-[2.5]" />
            <span>Highlights & Reels</span>
          </button>
        </div>
      </div>

      {/* ═══ PLAYER COMPARE ═══ */}
      {showPlayerCompare && (
        <PlayerCompareRadarChart
          player1={comparePlayer1}
          player2={comparePlayer2}
          allAthletes={allAthletes}
          onSelectPlayer1={setComparePlayer1}
          onSelectPlayer2={setComparePlayer2}
          onClose={() => setShowPlayerCompare(false)}
        />
      )}

      {/* ═══ CREATE POST BOX ═══ */}
      <div className="bg-indigo-900/60 p-5 rounded-[2.5rem] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <img
            src={user?.profilepicture || ''}
            alt={user?.name || 'Athlete'}
            className="w-10 h-10 rounded-2xl object-cover ring-2 ring-lime-400/50"
          />
          <div className="flex-1">
            <p className="text-xs font-black italic text-white">
              {user?.name || 'Athlete'}
            </p>
            <p className="text-[10px] text-lime-300 font-extrabold uppercase">
              {userLevelInfo.levelTitle} • Lvl {userLevelInfo.level}
            </p>
          </div>
        </div>

        <form onSubmit={handlePostStatus} className="space-y-3">
          <textarea
            value={newStatusText}
            onChange={(e) => setNewStatusText(e.target.value)}
            placeholder="Share a game update, workout milestone, or challenge completed with your athlete network..."
            rows={2}
            className="w-full bg-indigo-950/80 text-white placeholder-indigo-300/50 text-xs rounded-2xl p-3 border border-white/10 focus:border-lime-400 focus:outline-none transition resize-none font-medium"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[10px] text-indigo-300/70 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Visible to all connected athletes and playground courts</span>
            </div>

            <button
              type="submit"
              disabled={!newStatusText.trim() || submittingPost}
              className={`px-5 py-2.5 rounded-xl font-black italic uppercase text-xs flex items-center space-x-1.5 transition ${
                newStatusText.trim() && !submittingPost
                  ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/20'
                  : 'bg-indigo-950 text-indigo-400 border border-white/5 cursor-not-allowed'
              }`}
            >
              {submittingPost ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ───── FEED STREAM ───── */}
        <div className="lg:col-span-8 space-y-4">
          {/* FILTER BAR */}
          <div className="bg-indigo-900/60 p-4 rounded-3xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { key: 'all', label: 'All Updates 🌐' },
                { key: 'game', label: 'Games & Stats 🏀' },
                { key: 'achievement', label: 'Achievements 🏆' },
                { key: 'highlight', label: 'Highlights 📹' },
                { key: 'levelup', label: 'Level Ups ⚡' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                    filterType === tab.key
                      ? 'bg-lime-400 text-black font-black italic'
                      : 'bg-indigo-950 text-indigo-200 border border-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold hidden sm:inline">
                Feed Visibility:
              </span>
              <button
                type="button"
                onClick={() => setFriendOnlyFilter(!friendOnlyFilter)}
                className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-black italic uppercase transition flex items-center space-x-1.5 shadow-md ${
                  friendOnlyFilter
                    ? 'bg-lime-400 text-black border-lime-300 ring-2 ring-lime-400/40'
                    : 'bg-indigo-950 text-indigo-200 border-white/10 hover:text-white hover:border-lime-400/30'
                }`}
              >
                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {friendOnlyFilter ? 'Friends Only 👥' : 'All Athletes 🌐'}
                </span>
              </button>
            </div>
          </div>

          {/* Refresh + count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-indigo-300/70 font-bold">
              {feedItems.length} {feedItems.length === 1 ? 'post' : 'posts'}
            </p>
            <button
              onClick={() => loadFeed(true)}
              disabled={loadingFeed}
              className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin' : ''}`}
              />
              Refresh Feed
            </button>
          </div>

          {/* Friends-only banner */}
          {friendOnlyFilter && (
            <div className="p-3 bg-indigo-950/90 border border-lime-400/40 rounded-2xl flex items-center justify-between text-xs text-lime-300 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-lime-400 shrink-0" />
                <span>
                  <strong>Friends-Only View Active:</strong> Filtering to show
                  posts exclusively from your connected athlete friends.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFriendOnlyFilter(false)}
                className="text-[10px] font-mono font-bold uppercase text-indigo-300 hover:text-white underline shrink-0 ml-2"
              >
                Show All
              </button>
            </div>
          )}

          {/* Loading */}
          {loadingFeed && (
            <div className="flex items-center justify-center py-10 text-indigo-300 bg-indigo-900/50 rounded-[2.5rem] border border-white/10">
              <Loader2 className="w-6 h-6 animate-spin text-lime-400 mr-3" />
              <p className="font-bold text-sm">Loading feed...</p>
            </div>
          )}

          {/* Error */}
          {!loadingFeed && feedError && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-5 text-center">
              <p className="text-red-300 font-bold mb-2 text-sm">
                ❌ {feedError}
              </p>
              <button
                onClick={() => loadFeed()}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loadingFeed && !feedError && feedItems.length === 0 && (
            <div className="p-10 text-center bg-indigo-900/50 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-950/80 border-2 border-lime-400/40 flex items-center justify-center text-lime-400 shadow-[0_0_30px_rgba(163,230,53,0.15)]">
                <Rss className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-black italic uppercase text-white tracking-tight">
                  No Community Activity Updates
                </h3>
                <p className="text-xs text-indigo-200/70 leading-relaxed">
                  {friendOnlyFilter
                    ? 'None of your connected friends have posted recent game logs or status updates yet.'
                    : filterType !== 'all'
                    ? `No feed activities found matching the "${filterType}" filter tag.`
                    : 'The court feed is quiet right now. Be the first athlete to drop a status update, game result, or 30s highlight clip!'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(friendOnlyFilter || filterType !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFriendOnlyFilter(false);
                      setFilterType('all');
                    }}
                    className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-800 text-lime-300 border border-lime-400/40 text-xs font-black italic uppercase rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Clear Feed Filters</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                  className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Status Update</span>
                </button>
              </div>
            </div>
          )}

          {/* Feed list */}
          {!loadingFeed &&
            !feedError &&
            feedItems.length > 0 &&
            feedItems.map((item) => (
              <div
                key={item.id}
                className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4 relative overflow-hidden transition hover:border-white/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.authorAvatar || ''}
                      alt={item.authorName}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-lime-400/30"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black italic text-sm text-white flex items-center gap-1">
                          <span>{item.authorName}</span>
                          {(item.authorIsPro ||
                            (user?.name === item.authorName &&
                              (user as any)?.isPro)) && (
                            <span
                              className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5 shrink-0"
                              title="PRO Member"
                            >
                              <Crown className="w-2.5 h-2.5 fill-black" />
                              <span>PRO</span>
                            </span>
                          )}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-950 text-lime-300 text-[10px] font-black uppercase rounded-full border border-lime-400/20">
                          Lvl {item.authorLevel} • {item.authorLevelTitle}
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-300/70 font-semibold flex items-center mt-0.5">
                        <Clock className="w-3 h-3 mr-1 text-indigo-400" />
                        {item.timestamp} •{' '}
                        <span className="uppercase text-lime-400 font-bold ml-1">
                          {item.authorSport}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Type pill */}
                  <div className="shrink-0">
                    {item.type === 'game_played' && (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase rounded-full flex items-center">
                        <Trophy className="w-3 h-3 mr-1" /> Game Logged
                      </span>
                    )}
                    {item.type === 'achievement_unlocked' && (
                      <span className="px-3 py-1 bg-lime-400/20 text-lime-300 border border-lime-400/40 text-[10px] font-black uppercase rounded-full flex items-center">
                        <Award className="w-3 h-3 mr-1" /> Achievement
                      </span>
                    )}
                    {item.type === 'highlight_posted' && (
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase rounded-full flex items-center">
                        <Film className="w-3 h-3 mr-1" /> 30s Reel
                      </span>
                    )}
                    {item.type === 'level_up' && (
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase rounded-full flex items-center">
                        <Zap className="w-3 h-3 mr-1 fill-purple-300" /> Level
                        Up
                      </span>
                    )}
                    {item.type === 'court_checkin' && (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase rounded-full flex items-center">
                        <MapPin className="w-3 h-3 mr-1" /> Check-In
                      </span>
                    )}
                    {item.type === 'status_update' && (
                      <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-white/10 text-[10px] font-black uppercase rounded-full flex items-center">
                        <Sparkles className="w-3 h-3 mr-1 text-lime-400" />{' '}
                        Status
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-2 bg-indigo-950/60 p-4 rounded-2xl border border-white/5">
                  <h3 className="font-extrabold text-sm text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-indigo-200/80 font-medium leading-relaxed">
                    {item.description}
                  </p>

                  {item.type === 'highlight_posted' &&
                    item.highlightThumbnailUrl && (
                      <div className="mt-3 relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/10 group">
                        <img
                          src={item.highlightThumbnailUrl}
                          alt="Highlight reel"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <button
                            onClick={() => onNavigateTab('highlights')}
                            className="p-3 bg-lime-400 text-black rounded-full shadow-lg hover:scale-110 transition"
                          >
                            <Film className="w-6 h-6 stroke-[2.5]" />
                          </button>
                        </div>
                        {item.videoDuration && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-[10px] font-mono text-white rounded">
                            {item.videoDuration}
                          </span>
                        )}
                      </div>
                    )}

                  {item.type === 'game_played' && item.gameStatsSummary && (
                    <div className="mt-2 p-2.5 bg-indigo-900/60 rounded-xl border border-lime-400/30 flex items-center justify-between text-xs font-black">
                      <span className="text-lime-300 font-mono">
                        {item.gameStatsSummary}
                      </span>
                      <span className="text-[10px] text-indigo-200/70">
                        {item.courtName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Interactions */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300/80 border-t border-white/10 pt-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleLike(item.id)}
                        disabled={likingPostId === item.id}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition disabled:opacity-60 ${
                          item.hasLiked
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black'
                            : 'bg-indigo-950 text-indigo-200 border-white/10 hover:text-white'
                        }`}
                      >
                        <Flame
                          className={`w-4 h-4 ${
                            item.hasLiked ? 'text-rose-400 fill-rose-400' : ''
                          }`}
                        />
                        <span>{item.likesCount} Hypes</span>
                      </button>

                      <button
                        onClick={() =>
                          setActiveCommentFeedId(
                            activeCommentFeedId === item.id ? null : item.id
                          )
                        }
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-white/10 rounded-xl transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{item.comments.length} Comments</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard
                          ?.writeText(
                            `${window.location.origin}/feed/${item.id}`
                          )
                          .then(() => toast.success('Link copied!'))
                          .catch(() => toast.error('Failed to copy'));
                      }}
                      className="p-1.5 bg-indigo-950 hover:bg-indigo-800 text-indigo-300 rounded-xl border border-white/10 transition"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Comments */}
                  {activeCommentFeedId === item.id && (
                    <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 space-y-3 animate-fadeIn">
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {item.comments.length === 0 ? (
                          <p className="text-[11px] text-indigo-300/60 italic">
                            No comments yet. Be the first to cheer!
                          </p>
                        ) : (
                          item.comments.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-start space-x-2 text-xs"
                            >
                              {c.authorAvatar ? (
                                <img
                                  src={c.authorAvatar}
                                  alt={c.authorName}
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-lime-400/40 shrink-0"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target =
                                      e.currentTarget as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove(
                                      'hidden'
                                    );
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-6 h-6 rounded-full bg-lime-400 text-black font-black flex items-center justify-center shrink-0 text-[10px] ${
                                  c.authorAvatar ? 'hidden' : ''
                                }`}
                              >
                                {c.authorName?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div className="bg-indigo-900/60 p-2 rounded-xl flex-1 border border-white/5 space-y-0.5">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-extrabold text-lime-300">
                                    {c.authorName}
                                  </span>
                                  <span className="text-indigo-400">
                                    {c.timestamp}
                                  </span>
                                </div>
                                <p className="text-indigo-100 font-medium">
                                  {c.text}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="text"
                          value={commentInputText[item.id] || ''}
                          onChange={(e) =>
                            setCommentInputText({
                              ...commentInputText,
                              [item.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              handleAddComment(item.id);
                          }}
                          placeholder="Write a cheer or comment..."
                          className="flex-1 bg-indigo-900 text-white placeholder-indigo-300/50 text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-lime-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(item.id)}
                          className="px-3 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl transition"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* ───── SIDEBAR ───── */}
        <div className="lg:col-span-4 space-y-6">
          {/* ATHLETE DIRECTORY */}
          <div className="bg-indigo-900/60 p-5 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black italic uppercase text-sm text-white flex items-center">
                  <UserPlus className="w-4 h-4 text-lime-400 mr-2" />
                  Athlete Directory
                </h3>
                <p className="text-[10px] text-indigo-200/70 font-medium">
                  Find local PROs, match skill levels & connect
                </p>
              </div>
              <div className="flex items-center space-x-1.5">
                {activeAdvancedFilterCount > 0 && (
                  <span className="text-[10px] text-amber-300 font-mono font-black bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                    {activeAdvancedFilterCount} ACTIVE
                  </span>
                )}
                <span className="text-[10px] text-lime-300 font-mono font-bold bg-indigo-950 px-2.5 py-0.5 rounded-full border border-white/10">
                  {filteredAthletes.length} Found
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-indigo-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={athleteSearchQuery}
                  onChange={(e) => setAthleteSearchQuery(e.target.value)}
                  placeholder="Search athletes by name, school/league, or primary sport..."
                  className="w-full bg-indigo-950 text-white placeholder-indigo-300/40 text-xs pl-9 pr-8 py-2.5 rounded-xl border border-white/10 focus:border-lime-400 focus:outline-none transition font-medium shadow-inner"
                />
                {athleteSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAthleteSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-300/60 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick filters */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => setProOnlyFilter(!proOnlyFilter)}
                  className={`px-2.5 py-1 rounded-xl font-black italic uppercase transition flex items-center space-x-1 border ${
                    proOnlyFilter
                      ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20'
                      : 'bg-indigo-950/80 text-amber-300/90 border-amber-400/30 hover:border-amber-400'
                  }`}
                >
                  <Crown
                    className={`w-3 h-3 ${
                      proOnlyFilter ? 'fill-black' : 'fill-amber-400'
                    }`}
                  />
                  <span>PRO Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !nearbyOnlyFilter;
                    setNearbyOnlyFilter(next);
                    if (next && maxDistanceKm === 'all') setMaxDistanceKm('25');
                  }}
                  className={`px-2.5 py-1 rounded-xl font-black italic uppercase transition flex items-center space-x-1 border ${
                    nearbyOnlyFilter || maxDistanceKm !== 'all'
                      ? 'bg-sky-400 text-black border-sky-300 shadow-lg shadow-sky-400/20'
                      : 'bg-indigo-950/80 text-sky-300/90 border-sky-400/30 hover:border-sky-400'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-current" />
                  <span>Nearby (&lt;25km)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimilarSkillFilter(!similarSkillFilter)}
                  className={`px-2.5 py-1 rounded-xl font-black italic uppercase transition flex items-center space-x-1 border ${
                    similarSkillFilter
                      ? 'bg-lime-400 text-black border-lime-300 shadow-lg shadow-lime-400/20'
                      : 'bg-indigo-950/80 text-lime-300/90 border-lime-400/30 hover:border-lime-400'
                  }`}
                >
                  <Target className="w-3 h-3 text-current" />
                  <span>
                    Similar Skill (Lvl{' '}
                    {Math.max(1, userLevelInfo.level - 3)}-
                    {Math.min(MAX_LEVEL, userLevelInfo.level + 3)})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSameSportFilter(!sameSportFilter)}
                  className={`px-2.5 py-1 rounded-xl font-black italic uppercase transition flex items-center space-x-1 border ${
                    sameSportFilter
                      ? 'bg-emerald-400 text-black border-emerald-300 shadow-lg shadow-emerald-400/20'
                      : 'bg-indigo-950/80 text-emerald-300/90 border-emerald-400/30 hover:border-emerald-400'
                  }`}
                >
                  <span>
                    {user.primary_sport === 'basketball'
                      ? '🏀'
                      : user.primary_sport === 'pickleball'
                      ? '🏓'
                      : user.primary_sport === 'soccer'
                      ? '⚽'
                      : '⚾'}
                  </span>
                  <span>My Sport ({user.primary_sport})</span>
                </button>

                {/* ✅ FIXED: Advanced toggle button */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedPanel((v) => !v)}
                  className={`w-full justify-center px-2.5 py-1.5 rounded-xl font-black italic uppercase text-[10px] transition flex items-center space-x-1.5 border ${
                    showAdvancedPanel
                      ? 'bg-lime-400 text-black border-lime-300 shadow-lg shadow-lime-400/20'
                      : 'bg-indigo-950/80 text-indigo-300 border-white/10 hover:text-white hover:border-lime-400/40'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>
                    {showAdvancedPanel
                      ? 'Hide Advanced Filters'
                      : 'More Filters'}
                  </span>
                </button>
              </div>

              {/* Advanced panel */}
              {showAdvancedPanel && (
                <div className="bg-indigo-950/90 p-3 rounded-2xl border border-lime-400/40 space-y-2.5 animate-fadeIn text-xs max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="text-[9px] font-black uppercase text-indigo-300/70 block mb-0.5">
                        Max Distance
                      </label>
                      <select
                        value={maxDistanceKm}
                        onChange={(e) => {
                          setMaxDistanceKm(e.target.value);
                          if (e.target.value !== 'all')
                            setNearbyOnlyFilter(true);
                        }}
                        className="w-full bg-indigo-900 text-white text-[11px] font-bold p-2 rounded-lg border border-white/10 focus:border-lime-400 focus:outline-none"
                      >
                        <option value="all">Any Distance</option>
                        <option value="5">Within 5 km</option>
                        <option value="15">Within 15 km</option>
                        <option value="25">Within 25 km</option>
                        <option value="50">Within 50 km</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-indigo-300/70 block mb-0.5">
                        Sport
                      </label>
                      <select
                        value={athleteSportFilter}
                        onChange={(e) =>
                          setAthleteSportFilter(e.target.value)
                        }
                        className="w-full bg-indigo-900 text-white text-[11px] font-bold p-2 rounded-lg border border-white/10 focus:border-lime-400 focus:outline-none"
                      >
                        <option value="all">All Sports</option>
                        <option value="basketball">Basketball 🏀</option>
                        <option value="pickleball">Pickleball 🏓</option>
                        <option value="soccer">Soccer ⚽</option>
                        <option value="baseball">Baseball ⚾</option>
                        <option value="softball">Softball 🥎</option>
                        <option value="volleyball">Volleyball 🏐</option>
                        <option value="football">Football 🏈</option>
                        <option value="tennis">Tennis 🎾</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-indigo-300/70 block mb-0.5">
                        Skill Level
                      </label>
                      <select
                        value={athleteSkillFilter}
                        onChange={(e) =>
                          setAthleteSkillFilter(e.target.value)
                        }
                        className="w-full bg-indigo-900 text-white text-[11px] font-bold p-2 rounded-lg border border-white/10 focus:border-lime-400 focus:outline-none"
                      >
                        <option value="all">All Titles</option>
                        <option value="Rookie">Rookie</option>
                        <option value="Rising Star">Rising Star</option>
                        <option value="Playground">Playground</option>
                        <option value="League">League</option>
                        <option value="Hall of Famer">Hall of Famer</option>
                      </select>
                    </div>
                  </div>

                  {activeAdvancedFilterCount > 0 && (
                    <div className="flex justify-end pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[10px] text-rose-300 hover:text-rose-200 underline font-bold flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reset All Filters</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Athletes list */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredAthletes.length === 0 ? (
                <div className="p-6 bg-indigo-950/80 rounded-2xl border border-white/10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-900/60 border border-white/10 flex items-center justify-center text-indigo-300">
                    <UserPlus className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black italic uppercase text-white">
                      No Athletes Found
                    </p>
                    <p className="text-[11px] text-indigo-200/70 leading-normal">
                      No registered athletes match your current PRO, distance,
                      sport, or skill level search criteria.
                    </p>
                  </div>
                  {activeAdvancedFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-[10px] rounded-xl transition inline-flex items-center space-x-1 shadow"
                    >
                      <X className="w-3 h-3" />
                      <span>
                        Reset Filters & Show All ({allAthletes.length})
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                filteredAthletes.map((ath) => {
                  const isSent = sentFriendRequests.includes(ath.id);
                  const isPro = Boolean(
                    ath.isPro || ath.subscriptionTier === 'pro'
                  );

                  const athLevelInfo = getLevelInfo((ath as any).valuexp ?? 0);

                  const distanceKm = getDistanceKm(
                    user.location?.lat,
                    user.location?.lng,
                    ath.location?.lat,
                    ath.location?.lng
                  );

                  return (
                    <div
                      key={ath.id}
                      className={`p-3.5 rounded-2xl transition flex items-center justify-between space-x-2 relative ${
                        isPro
                          ? 'bg-indigo-950/95 border-2 border-amber-400/60 shadow-lg shadow-amber-500/10 hover:border-amber-400'
                          : 'bg-indigo-950/80 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={ath.profilepicture}
                            alt={ath.name}
                            className={`w-10 h-10 rounded-xl object-cover ${
                              isPro
                                ? 'ring-2 ring-amber-400'
                                : 'ring-1 ring-lime-400/40'
                            }`}
                          />
                          <span className="absolute -bottom-1 -right-1 text-[9px] bg-indigo-950 p-0.5 rounded-full border border-white/10">
                            {ath.primarySport === 'basketball'
                              ? '🏀'
                              : ath.primarySport === 'pickleball'
                              ? '🏓'
                              : ath.primarySport === 'soccer'
                              ? '⚽'
                              : ath.primarySport === 'baseball'
                              ? '⚾'
                              : '🎾'}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                              <span className="truncate">{ath.name}</span>
                              {isPro && (
                                <span
                                  className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5 shrink-0 shadow"
                                  title="Verified PRO Member"
                                >
                                  <Crown className="w-2.5 h-2.5 fill-black" />
                                  <span>PRO</span>
                                </span>
                              )}
                            </p>
                            <span className="px-1.5 py-0.2 bg-lime-400/20 text-lime-300 text-[9px] font-black rounded font-mono shrink-0">
                              Lvl {athLevelInfo.level}
                            </span>
                          </div>

                          <p className="text-[9px] text-indigo-300/70 font-medium truncate">
                            {athLevelInfo.levelTitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-indigo-300/80">
                            <span className="font-extrabold text-lime-400 capitalize">
                              {ath.primarySport}
                            </span>
                            {ath.schoolOrLeague && (
                              <>
                                <span>•</span>
                                <span className="text-white font-medium truncate max-w-[120px]">
                                  {ath.schoolOrLeague}
                                </span>
                              </>
                            )}
                            <span>•</span>

                            {distanceKm !== null ? (
                              <span className="text-sky-300 font-medium shrink-0 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-sky-400 inline" />
                                {distanceKm} km
                              </span>
                            ) : (
                              <span className="text-indigo-400/60 font-medium shrink-0 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 inline" />
                                N/A
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onDirectMessageAthlete) {
                              onDirectMessageAthlete(ath);
                            } else {
                              onNavigateTab('team-chat');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-black italic uppercase bg-indigo-900 hover:bg-lime-400 hover:text-black border border-lime-400/40 text-lime-300 transition flex items-center space-x-1 shadow"
                          title={`Direct Message ${ath.name}`}
                        >
                          <MessageSquare className="w-3 h-3 text-lime-400" />
                          <span className="hidden sm:inline">Message</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setComparePlayer2(ath);
                            setShowPlayerCompare(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-black italic uppercase bg-indigo-900 hover:bg-cyan-400 hover:text-black border border-cyan-400/40 text-cyan-300 transition flex items-center space-x-1 shadow"
                          title="Compare stats in Radar Chart"
                        >
                          <Swords className="w-3 h-3" />
                          <span className="hidden sm:inline">Compare</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendFriendRequestTrigger(ath)}
                          disabled={isSent}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic uppercase flex items-center space-x-1 transition ${
                            isSent
                              ? 'bg-indigo-900 text-lime-400 border border-lime-400/30'
                              : isPro
                              ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-md shadow-amber-400/20'
                              : 'bg-lime-400 hover:bg-lime-300 text-black shadow-md'
                          }`}
                        >
                          {isSent ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>{isSent ? 'Sent' : 'Connect'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COMMUNITY MILESTONES */}
          <div className="bg-indigo-900/60 p-5 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
            <h3 className="font-black italic uppercase text-sm text-white flex items-center">
              <TrendingUp className="w-4 h-4 text-lime-400 mr-2" />
              Community Milestones
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-white">
                    🔥 Most Hype Game
                  </p>
                  <p className="text-[10px] text-indigo-300/70">
                    Marcus Vance • 32 PTS at Rucker
                  </p>
                </div>
                <span className="text-xs font-black text-lime-400 font-mono">
                  +250 XP
                </span>
              </div>

              <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-white">
                    🏆 Latest Badge Unlocked
                  </p>
                  <p className="text-[10px] text-indigo-300/70">
                    Elena Rostova • Triple-Double King
                  </p>
                </div>
                <span className="text-xs font-black text-lime-400 font-mono">
                  Gold Tier
                </span>
              </div>

              <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-white">
                    ⚡ Highest Level Up
                  </p>
                  <p className="text-[10px] text-indigo-300/70">
                    Jordan Rivera • Level 10
                  </p>
                </div>
                <span className="text-xs font-black text-lime-400 font-mono">
                  Lvl 10
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialFeedView;