// services/feed.service.ts
const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  timestamp: string;
}

export interface ActivityFeedItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorSport: string;
  authorLevel: number;
  authorLevelTitle: string;
  authorIsPro?: boolean;
  type:
    | 'game_played'
    | 'achievement_unlocked'
    | 'highlight_posted'
    | 'level_up'
    | 'court_checkin'
    | 'status_update';
  timestamp: string;
  title: string;
  description: string;
  isFriend: boolean;
  badgeName?: string | null;
  badgeTier?: string | null;
  xpEarned?: number | null;
  courtName?: string | null;
  gameStatsSummary?: string | null;
  highlightThumbnailUrl?: string | null;
  videoDuration?: string | null;
  likesCount: number;
  hasLiked: boolean;
  comments: FeedComment[];
}

/* ─── FETCH FEED ─── */
export async function fetchFeed(
  athleteId: string,
  options: { type?: string; friendsOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<ActivityFeedItem[]> {
  const params = new URLSearchParams({
    athleteId,
    type: options.type ?? 'all',
    friendsOnly: String(options.friendsOnly ?? false),
    limit: String(options.limit ?? 30),
    offset: String(options.offset ?? 0),
  });

  const res = await fetch(`${API_BASE}/feed?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to fetch feed');
  }
  return json.data as ActivityFeedItem[];
}

/* ─── CREATE POST ─── */
export async function createPost(
  athleteId: string,
  data: {
    type: ActivityFeedItem['type'];
    title: string;
    description?: string;
    xpEarned?: number;
    courtName?: string;
    gameStatsSummary?: string;
    highlightThumbnailUrl?: string;
    videoDuration?: string;
    badgeName?: string;
    badgeTier?: string;
  }
): Promise<ActivityFeedItem> {
  const res = await fetch(`${API_BASE}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, ...data }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to create post');
  }
  return json.data as ActivityFeedItem;
}

/* ─── TOGGLE LIKE ─── */
export async function toggleLike(
  postId: string,
  athleteId: string
): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/feed/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to toggle like');
  }
  return json.data;
}

/* ─── ADD COMMENT ─── */
export async function addComment(
  postId: string,
  athleteId: string,
  text: string
): Promise<FeedComment> {
  const res = await fetch(`${API_BASE}/feed/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, text }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to add comment');
  }
  return json.data as FeedComment;
}

/* ─── DELETE POST ─── */
export async function deletePost(postId: string, athleteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/feed/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to delete post');
  }
}