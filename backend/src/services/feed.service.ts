// src/services/feed.service.ts
import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getIO } from '../socket/socketManager';
import { NotificationService } from './notification.service';

export interface FeedCommentDTO {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  timestamp: string;
}

export interface FeedPostDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorSport: string;
  authorLevel: number;
  authorLevelTitle: string;
  authorIsPro: boolean;
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
  comments: FeedCommentDTO[];
}

function getLevelTitle(level: number): string {
  if (level >= 30) return 'Hall of Famer';
  if (level >= 20) return 'League MVP';
  if (level >= 12) return 'Playground Hero';
  if (level >= 5) return 'Rising Star';
  return 'Rookie';
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export class FeedService {
  /* ═══════════════════════════════════════════
     GET FEED
     ═══════════════════════════════════════════ */
  static async getFeed(
    viewerId: string,
    options: {
      type?: string;
      friendsOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FeedPostDTO[]> {
    const { type = 'all', friendsOnly = false, limit = 30, offset = 0 } = options;

    let typeFilter = '';
    if (type === 'game') typeFilter = `AND p.type = 'game_played'`;
    else if (type === 'achievement')
      typeFilter = `AND p.type = 'achievement_unlocked'`;
    else if (type === 'highlight')
      typeFilter = `AND p.type = 'highlight_posted'`;
    else if (type === 'levelup') typeFilter = `AND p.type = 'level_up'`;

    const friendsFilter = friendsOnly
      ? `AND (
           p.author_id = ?
           OR p.author_id IN (
             SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
             UNION
             SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
           )
         )`
      : '';

    
    const params: any[] = [viewerId]; // for viewer_liked
if (friendsOnly) {
  params.push(viewerId, viewerId, viewerId); // p.author_id = ?, user_id = ?, friend_id = ?
}
params.push(limit, offset);

    const [posts] = await pool.execute<any[]>(
      `SELECT
         p.*,
         a.name        AS author_name,
         a.profilepicture AS author_avatar,
         a.primary_sport AS author_sport,
         a.level       AS author_level,
         a.is_pro      AS author_is_pro,
         (SELECT COUNT(*) FROM feed_likes l WHERE l.post_id = p.id) AS likes_count,
         (SELECT COUNT(*) FROM feed_likes l WHERE l.post_id = p.id AND l.athlete_id = ?) AS viewer_liked
       FROM feed_posts p
       INNER JOIN athletes a ON a.id = p.author_id
       WHERE p.is_deleted = 0 AND p.is_hidden = 0
         ${typeFilter}
         ${friendsFilter}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);
    const placeholders = postIds.map(() => '?').join(',');
    const [comments] = await pool.execute<any[]>(
      `SELECT
         c.*,
         a.name AS author_name,
         a.profilepicture AS author_avatar
       FROM feed_comments c
       INNER JOIN athletes a ON a.id = c.author_id
       WHERE c.post_id IN (${placeholders}) AND c.is_deleted = 0
       ORDER BY c.created_at ASC`,
      postIds
    );

    const [friendRows] = await pool.execute<any[]>(
      `SELECT friend_id AS id FROM friendships WHERE user_id = ? AND status = 'accepted'
       UNION
       SELECT user_id AS id FROM friendships WHERE friend_id = ? AND status = 'accepted'`,
      [viewerId, viewerId]
    );
    const friendIds = new Set(friendRows.map((r) => r.id));
    friendIds.add(viewerId);

    const commentsByPost: Record<string, FeedCommentDTO[]> = {};
    for (const c of comments) {
      if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
      commentsByPost[c.post_id].push({
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        text: c.text,
        timestamp: timeAgo(new Date(c.created_at)),
      });
    }

    return posts.map((p) => ({
      id: p.id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar,
      authorSport: p.author_sport,
      authorLevel: Number(p.author_level) || 1,
      authorLevelTitle: getLevelTitle(Number(p.author_level) || 1),
      authorIsPro: Boolean(p.author_is_pro),
      type: p.type,
      timestamp: timeAgo(new Date(p.created_at)),
      title: p.title,
      description: p.description ?? '',
      isFriend: friendIds.has(p.author_id),
      badgeName: p.badge_name,
      badgeTier: p.badge_tier,
      xpEarned: p.xp_earned,
      courtName: p.court_name,
      gameStatsSummary: p.game_stats_summary,
      highlightThumbnailUrl: p.highlight_thumbnail_url,
      videoDuration: p.video_duration,
      likesCount: Number(p.likes_count) || 0,
      hasLiked: Number(p.viewer_liked) === 1,
      comments: commentsByPost[p.id] ?? [],
    }));
  }

  /* ═══════════════════════════════════════════
     CREATE POST
     - Saves to DB
     - Broadcasts 'feed:new_post' to feed:global
     - Sends notification to ALL other users
     ═══════════════════════════════════════════ */
  static async createPost(
    authorId: string,
    data: {
      type: FeedPostDTO['type'];
      title: string;
      description?: string;
      badgeName?: string;
      badgeTier?: string;
      xpEarned?: number;
      courtName?: string;
      gameStatsSummary?: string;
      highlightThumbnailUrl?: string;
      videoDuration?: string;
      mediaUrl?: string;
    }
  ): Promise<FeedPostDTO> {
    const id = randomUUID();
    
    await pool.execute(
      `INSERT INTO feed_posts
        (id, author_id, type, title, description, badge_name, badge_tier,
         xp_earned, court_name, game_stats_summary, highlight_thumbnail_url,
         video_duration, media_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        authorId,
        data.type,
        data.title,
        data.description ?? null,
        data.badgeName ?? null,
        data.badgeTier ?? null,
        data.xpEarned ?? null,
        data.courtName ?? null,
        data.gameStatsSummary ?? null,
        data.highlightThumbnailUrl ?? null,
        data.videoDuration ?? null,
        data.mediaUrl ?? null,
      ]
    );

    const [rows] = await pool.execute<any[]>(
      `SELECT
         p.*,
         a.name AS author_name,
         a.profilepicture AS author_avatar,
         a.primary_sport AS author_sport,
         a.level AS author_level,
         a.is_pro AS author_is_pro
       FROM feed_posts p
       INNER JOIN athletes a ON a.id = p.author_id
       WHERE p.id = ?`,
      [id]
    );

    const p = rows[0];
    const postDTO: FeedPostDTO = {
      id: p.id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar,
      authorSport: p.author_sport,
      authorLevel: Number(p.author_level) || 1,
      authorLevelTitle: getLevelTitle(Number(p.author_level) || 1),
      authorIsPro: Boolean(p.author_is_pro),
      type: p.type,
      timestamp: 'Just now',
      title: p.title,
      description: p.description ?? '',
      isFriend: true,
      badgeName: p.badge_name,
      badgeTier: p.badge_tier,
      xpEarned: p.xp_earned,
      courtName: p.court_name,
      gameStatsSummary: p.game_stats_summary,
      highlightThumbnailUrl: p.highlight_thumbnail_url,
      videoDuration: p.video_duration,
      likesCount: 0,
      hasLiked: false,
      comments: [],
    };

    /* ─── 1️⃣ Broadcast to all feed viewers ─── */
    try {
      const io = getIO();
      // ✅ YE ADD KARO
  
      
      if (io) {
        io.to('feed:global').emit('feed:new_post', {
          post: postDTO,
          authorId,
        });
        console.log(`📢 Broadcast feed:new_post from ${authorId}`);
      }
    } catch (e) {
      console.warn('⚠️ Feed broadcast failed:', e);
    }

    /* ─── 2️⃣ Notify ALL other users ─── */
    try {
      const io = getIO();
      if (io) {
        const [users] = await pool.execute<any[]>(
          `SELECT id FROM athletes WHERE id != ?`,
          [authorId]
        );

        const authorName = postDTO.authorName;

        for (const u of users) {
          const notif = await NotificationService.create({
            userId: u.id,
            type: 'system',
            title: 'New Post in Feed',
            message: `${authorName} shared: "${data.title}"`,
            senderId: authorId,
            referenceId: postDTO.id,
            actionUrl: `/social-feed?post=${postDTO.id}`,
            status: 'info',
          });

          io.to(`user:${u.id}`).emit('notification:new', notif);
        }

        console.log(`🔔 Sent ${users.length} notifications for new post`);
      }
    } catch (e) {
      console.warn('⚠️ Post notification failed (non-critical):', e);
    }

    return postDTO;
  }

  /* ═══════════════════════════════════════════
     TOGGLE LIKE
     - Saves like to DB
     - Broadcasts 'feed:like_updated' to feed:global
     - Notifies post author (only on like, not unlike)
     ═══════════════════════════════════════════ */
  static async toggleLike(
    postId: string,
    athleteId: string
  ): Promise<{ liked: boolean; likesCount: number }> {
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM feed_likes WHERE post_id = ? AND athlete_id = ?`,
      [postId, athleteId]
    );

    let liked: boolean;
    if (existing.length > 0) {
      await pool.execute(
        `DELETE FROM feed_likes WHERE post_id = ? AND athlete_id = ?`,
        [postId, athleteId]
      );
      liked = false;
    } else {
      await pool.execute(
        `INSERT INTO feed_likes (post_id, athlete_id) VALUES (?, ?)`,
        [postId, athleteId]
      );
      liked = true;
    }

    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS c FROM feed_likes WHERE post_id = ?`,
      [postId]
    );
    const likesCount = Number(countRows[0]?.c) || 0;

    /* ─── Broadcast ─── */
    try {
      const io = getIO();
      if (io) {
        io.to('feed:global').emit('feed:like_updated', {
          postId,
          liked,
          likesCount,
          athleteId,
        });
        console.log(`❤️ Broadcast feed:like_updated → ${postId} = ${likesCount}`);
      }
    } catch (e) {
      console.warn('⚠️ Like broadcast failed:', e);
    }

    /* ─── Notify post author (only on like) ─── */
    if (liked) {
      try {
        const io = getIO();
        if (io) {
          const [postRows] = await pool.execute<any[]>(
            `SELECT author_id, title FROM feed_posts WHERE id = ?`,
            [postId]
          );
          const post = postRows[0];

          if (post && post.author_id !== athleteId) {
            const [likerRows] = await pool.execute<any[]>(
              `SELECT name FROM athletes WHERE id = ?`,
              [athleteId]
            );
            const likerName = likerRows[0]?.name ?? 'Someone';
            const preview = (post.description || post.title || '').trim();
            const shortPreview =
              preview.length > 60 ? `${preview.slice(0, 60)}…` : preview;
            const msg = shortPreview
      ? `${likerName} liked your post: "${shortPreview}"`
      : `${likerName} liked your post`;
            const notif = await NotificationService.create({
              userId: post.author_id,
              type: 'chat_mention',
              title: 'New Hype on Your Post',
              message: msg,
              senderId: athleteId,
              referenceId: postId,
              actionUrl: `/social-feed?post=${postId}`,
              status: 'info',
            });

            io.to(`user:${post.author_id}`).emit('notification:new', notif);
          }
        }
      } catch (e) {
        console.warn('⚠️ Like notification failed:', e);
      }
    }

    return { liked, likesCount };
  }

  /* ═══════════════════════════════════════════
     ADD COMMENT
     - Saves comment to DB
     - Broadcasts 'feed:comment_added' to feed:global
     - Notifies post author (if not self)
     ═══════════════════════════════════════════ */
  static async addComment(
    postId: string,
    authorId: string,
    text: string
  ): Promise<FeedCommentDTO> {
    const id = randomUUID();
    await pool.execute(
      `INSERT INTO feed_comments (id, post_id, author_id, text) VALUES (?, ?, ?, ?)`,
      [id, postId, authorId, text]
    );

    const [rows] = await pool.execute<any[]>(
      `SELECT c.*, a.name AS author_name, a.profilepicture AS author_avatar
       FROM feed_comments c
       INNER JOIN athletes a ON a.id = c.author_id
       WHERE c.id = ?`,
      [id]
    );

    const c = rows[0];
    const commentDTO: FeedCommentDTO = {
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: c.author_name,
      authorAvatar: c.author_avatar,
      text: c.text,
      timestamp: 'Just now',
    };

    /* ─── Broadcast ─── */
    try {
      const io = getIO();
      if (io) {
        io.to('feed:global').emit('feed:comment_added', {
          postId,
          comment: commentDTO,
        });
        console.log(`💬 Broadcast feed:comment_added → ${postId}`);
      }
    } catch (e) {
      console.warn('⚠️ Comment broadcast failed:', e);
    }

    /* ─── Notify post author ─── */
    try {
      const io = getIO();
      if (io) {
        const [postRows] = await pool.execute<any[]>(
          `SELECT author_id, title FROM feed_posts WHERE id = ?`,
          [postId]
        );
        const post = postRows[0];

        if (post && post.author_id !== authorId) {
          const [commenterRows] = await pool.execute<any[]>(
            `SELECT name FROM athletes WHERE id = ?`,
            [authorId]
          );
          const commenterName = commenterRows[0]?.name ?? 'Someone';

          const commentText = text.trim();
          const shortComment =
            commentText.length > 80 ? `${commentText.slice(0, 80)}…` : commentText;
          const msg = `${commenterName} commented on your post: "${shortComment}"`;
          const notif = await NotificationService.create({
            userId: post.author_id,
            type: 'chat_mention',
            title: 'New Comment on Your Post',
            message: msg,
            senderId: authorId,
            referenceId: postId,
            actionUrl: `/social-feed?post=${postId}`,
            status: 'info',
          });

          io.to(`user:${post.author_id}`).emit('notification:new', notif);
        }
      }
    } catch (e) {
      console.warn('⚠️ Comment notification failed:', e);
    }

    return commentDTO;
  }

  /* ═══════════════════════════════════════════
     DELETE POST
     - Marks deleted in DB
     - Broadcasts 'feed:post_deleted' to feed:global
     ═══════════════════════════════════════════ */
  static async deletePost(postId: string, requesterId: string): Promise<void> {
    const [rows] = await pool.execute<any[]>(
      `SELECT author_id FROM feed_posts WHERE id = ?`,
      [postId]
    );
    if (!rows[0]) throw new Error('Post not found');
    if (rows[0].author_id !== requesterId) throw new Error('Not authorized');

    await pool.execute(
      `UPDATE feed_posts SET is_deleted = 1 WHERE id = ?`,
      [postId]
    );

    try {
      const io = getIO();
      if (io) {
        io.to('feed:global').emit('feed:post_deleted', { postId });
        console.log(`🗑️ Broadcast feed:post_deleted → ${postId}`);
      }
    } catch (e) {
      console.warn('⚠️ Delete broadcast failed:', e);
    }
  }
}