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
    // ✅ YE ADD KARO — user room join (notification ke liye)
    
    socket.on('user:join', (userId: string) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`📡 [user:join] ${userId} → user:${userId}`);
    });
    socket.on('feed:join', (athleteId: string) => {
      if (!athleteId) return;
      socket.athleteId = athleteId;
      
      // ✅ Check karo agar already joined hai
      if (socket.rooms.has('feed:global')) {
        console.log(`📡 [feed:join] ${athleteId} already in feed:global, skipping`);
        return;
      }
      
      socket.join('feed:global');
      const room = io.sockets.adapter.rooms.get('feed:global');
      console.log(`📡 [feed:join] ${athleteId} → feed:global (total: ${room?.size ?? 0})`);
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

      // ✅ Service khud broadcast + notifications karti hai
      const post = await FeedService.createPost(authorId, postData);

      if (typeof callback === 'function') {
        callback({ success: true, post });
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
    socket.on('feed:like', async (payload, callback) => {
  try {
    const { postId, athleteId } = payload;
    if (!postId || !athleteId) return callback?.({ error: 'Missing fields' });
    const result = await FeedService.toggleLike(postId, athleteId);
    callback?.(result);            // service ne broadcast + notify kar diya
  } catch (err) {
    callback?.({ error: err instanceof Error ? err.message : 'Like failed' });
  }
});

socket.on('feed:comment', async (payload, callback) => {
  try {
    const { postId, athleteId, text } = payload;
    if (!postId || !athleteId || !text?.trim())
      return callback?.({ error: 'Missing fields' });
    const comment = await FeedService.addComment(postId, athleteId, text);
    callback?.(comment);
  } catch (err) {
    callback?.({ error: err instanceof Error ? err.message : 'Comment failed' });
  }
});

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