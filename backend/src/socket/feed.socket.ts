// src/socket/feed.socket.ts
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { FeedService } from '../services/feed.service';
import { NotificationService } from '../services/notification.service';
import pool from '../config/database';

interface FeedSocket extends Socket {
  athleteId?: string;
}

export const initFeedSocket = (io: SocketIOServer): void => {
  io.on('connection', (socket: FeedSocket) => {
    /* ═══════════════════════════════════════════
       JOIN GLOBAL FEED ROOM
       ═══════════════════════════════════════════ */
    socket.on('feed:join', (athleteId: string) => {
      if (!athleteId) return;
      socket.athleteId = athleteId;
      socket.join('feed:global');
      const room = io.sockets.adapter.rooms.get('feed:global');
      console.log(
        `📡 ${athleteId} joined feed:global (total: ${room?.size ?? 0})`
      );
    });

    socket.on('feed:leave', () => {
      socket.leave('feed:global');
    });

    /* ═══════════════════════════════════════════
       CREATE POST
       ═══════════════════════════════════════════ */
    socket.on(
      'feed:create_post',
      async (
        payload: {
          authorId: string;
          type:
            | 'game_played'
            | 'achievement_unlocked'
            | 'highlight_posted'
            | 'level_up'
            | 'court_checkin'
            | 'status_update';
          title: string;
          description?: string;
          xpEarned?: number;
          courtName?: string;
          gameStatsSummary?: string;
          highlightThumbnailUrl?: string;
          videoDuration?: string;
          badgeName?: string;
          badgeTier?: string;
        },
        callback?: (res: any) => void
      ) => {
        try {
          const { authorId, ...postData } = payload;
          if (!authorId || !postData.title || !postData.type) {
            if (typeof callback === 'function')
              callback({ error: 'Missing required fields' });
            return;
          }

          const post = await FeedService.createPost(authorId, postData);

          if (typeof callback === 'function') {
            callback({ success: true, post });
          }

          // Broadcast to all feed viewers
          io.to('feed:global').emit('feed:new_post', { post, authorId });
          console.log(`📢 Broadcast feed:new_post from ${authorId}`);

          // Notify all users
          try {
            const [users] = await pool.execute<any[]>(
              `SELECT id FROM athletes WHERE id != ?`,
              [authorId]
            );
            const authorName = post.authorName;

            for (const u of users) {
              const notif = await NotificationService.create({
                userId: u.id,
                type: 'system',
                title: 'New Post in Feed',
                message: `${authorName} shared: "${postData.title}"`,
                senderId: authorId,
                referenceId: post.id,
                actionUrl: `/social-feed?post=${post.id}`,
                status: 'info',
              });
              io.to(`user:${u.id}`).emit('notification:new', notif);
            }
            console.log(`🔔 Sent ${users.length} notifications for new post`);
          } catch (notifErr) {
            console.error('⚠️ Notification batch failed:', notifErr);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Post creation failed';
          console.error('❌ feed:create_post error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       LIKE / HYPE POST
       ═══════════════════════════════════════════ */
    socket.on(
      'feed:like',
      async (
        payload: { postId: string; athleteId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { postId, athleteId } = payload;
          if (!postId || !athleteId) return;

          const result = await FeedService.toggleLike(postId, athleteId);

          if (typeof callback === 'function') callback(result);

          io.to('feed:global').emit('feed:like_updated', {
            postId,
            liked: result.liked,
            likesCount: result.likesCount,
            athleteId,
          });
          console.log(
            `❤️ feed:like_updated → ${postId} = ${result.likesCount}`
          );

          // Notify post author
          if (result.liked) {
            try {
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

                const notif = await NotificationService.create({
                  userId: post.author_id,
                  type: 'chat_mention',
                  title: 'New Hype on Your Post',
                  message: `${likerName} hyped your post: "${post.title}"`,
                  senderId: athleteId,
                  referenceId: postId,
                  actionUrl: `/social-feed?post=${postId}`,
                  status: 'info',
                });
                io.to(`user:${post.author_id}`).emit('notification:new', notif);
              }
            } catch (e) {
              console.warn('⚠️ Like notification failed:', e);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Like failed';
          console.error('❌ feed:like error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       ADD COMMENT
       ═══════════════════════════════════════════ */
    socket.on(
      'feed:comment',
      async (
        payload: { postId: string; athleteId: string; text: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { postId, athleteId, text } = payload;
          console.log('💬 feed:comment received:', payload);

          if (!postId || !athleteId || !text?.trim()) {
            if (typeof callback === 'function')
              callback({ error: 'Missing fields' });
            return;
          }

          const comment = await FeedService.addComment(
            postId,
            athleteId,
            text
          );

          if (typeof callback === 'function') callback(comment);

          // ✅ Broadcast to ALL feed viewers
          console.log('📢 Emitting feed:comment_added to feed:global');
          io.to('feed:global').emit('feed:comment_added', {
            postId,
            comment,
          });

          // Notify post author
          try {
            const [postRows] = await pool.execute<any[]>(
              `SELECT author_id, title FROM feed_posts WHERE id = ?`,
              [postId]
            );
            const post = postRows[0];

            if (post && post.author_id !== athleteId) {
              const [commenterRows] = await pool.execute<any[]>(
                `SELECT name FROM athletes WHERE id = ?`,
                [athleteId]
              );
              const commenterName = commenterRows[0]?.name ?? 'Someone';

              const notif = await NotificationService.create({
                userId: post.author_id,
                type: 'chat_mention',
                title: 'New Comment on Your Post',
                message: `${commenterName} commented: "${text.slice(0, 80)}"`,
                senderId: athleteId,
                referenceId: postId,
                actionUrl: `/social-feed?post=${postId}`,
                status: 'info',
              });
              io.to(`user:${post.author_id}`).emit('notification:new', notif);
            }
          } catch (e) {
            console.warn('⚠️ Comment notification failed:', e);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Comment failed';
          console.error('❌ feed:comment error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       DELETE POST
       ═══════════════════════════════════════════ */
    socket.on(
      'feed:delete',
      async (
        payload: { postId: string; athleteId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { postId, athleteId } = payload;
          if (!postId || !athleteId) return;

          await FeedService.deletePost(postId, athleteId);

          if (typeof callback === 'function') callback({ success: true });

          io.to('feed:global').emit('feed:post_deleted', { postId });
          console.log(`🗑️ Post deleted: ${postId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Delete failed';
          console.error('❌ feed:delete error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );
  });
};