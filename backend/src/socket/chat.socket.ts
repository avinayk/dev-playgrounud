// src/socket/chat.socket.ts
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { FriendshipService } from '../services/friendship.service';
import { NotificationService } from '../services/notification.service';
import { PickupGamesService } from '../services/pickupGames.service';
import { MvpService } from '../services/mvp.service';
import pool from '../config/database';
interface UserSocket extends Socket {
  athleteId?: string;
}

// ✅ Track online athletes (athleteId -> Set of socketIds)
const onlineUsers = new Map<string, Set<string>>();

export const initChatSocket = (io: SocketIOServer): void => {
  io.on('connection', (socket: UserSocket) => {
    console.log('🔌 Socket connected:', socket.id);

    /* ─── User joins ─── */
    socket.on('user:join', (athleteId: string) => {
      if (!athleteId) return;
      socket.athleteId = athleteId;

      if (!onlineUsers.has(athleteId)) {
        onlineUsers.set(athleteId, new Set());
      }
      onlineUsers.get(athleteId)!.add(socket.id);

      // Join personal room
      socket.join(`user:${athleteId}`);
      socket.join('feed:global');
      // Broadcast online status
      io.emit('user:online', { athleteId, online: true });

      console.log(`👤 User ${athleteId} online. Total: ${onlineUsers.size}`);
    });

    /* ─── Join a conversation room ─── */
    socket.on('conversation:join', (conversationId: string) => {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
      console.log(`💬 Socket ${socket.id} joined conv:${conversationId}`);
    });

    /* ─── Leave a conversation room ─── */
    socket.on('conversation:leave', (conversationId: string) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    /* ─── Send message ─── */
    socket.on(
      'message:send',
      async (
        payload: {
          conversationId: string;
          senderId: string;
          text: string;
          messageType?: 'text' | 'image' | 'voice';
          attachmentUrl?: string | null;
          attachmentName?: string | null;
        },
        callback?: (msg: any) => void
      ) => {
        try {
          const {
            conversationId,
            senderId,
            text,
            messageType = 'text',
            attachmentUrl = null,
            attachmentName = null,
          } = payload;

          if (!conversationId || !senderId) return;

          // ✅ Step 1: Save message
          const message = await ChatService.sendMessage(
            conversationId,
            senderId,
            text?.trim() ?? '',
            messageType,
            attachmentUrl,
            attachmentName
          );

          // ✅ Step 2: Ack to sender
          if (typeof callback === 'function') callback(message);

          // ✅ Step 3: Broadcast to conversation room
          socket.to(`conv:${conversationId}`).emit('message:new', message);

          // ✅ Step 4: Broadcast conversation update (sidebar)
          io.emit('conversation:updated', {
            conversationId,
            lastMessage: messageType === 'image' ? '📷 Image' : messageType === 'voice' ? '🎤 Voice' : message.text,
            lastMessageAt: message.createdAt,
          });

          // ═══════════════════════════════════════════════
          // ✅ Step 5: NOTIFY OTHER MEMBERS (NEW!)
          // ═══════════════════════════════════════════════
          try {
            // Get conversation members except sender
            const [members] = await pool.execute<any[]>(
              `SELECT cm.athlete_id 
              FROM conversation_members cm
              WHERE cm.conversation_id = ? AND cm.athlete_id != ?`,
              [conversationId, senderId]
            );

            // Get sender info
            const [senderRows] = await pool.execute<any[]>(
              `SELECT name, profilepicture FROM athletes WHERE id = ?`,
              [senderId]
            );
            const senderName = senderRows[0]?.name || 'Someone';

            // Get conversation name (for DM)
            const [convRows] = await pool.execute<any[]>(
              `SELECT type, name FROM conversations WHERE id = ?`,
              [conversationId]
            );
            const conversation = convRows[0];

            // Notify each recipient
            for (const member of members) {
              const recipientId = member.athlete_id;
              if (recipientId === senderId) continue;

              // Create notification in DB
              const notification = await NotificationService.create({
                userId: recipientId,
                type: 'chat_mention',
                title: `New message from ${senderName}`,
                message:
                  messageType === 'image'
                    ? '📷 Sent you an image'
                    : messageType === 'voice'
                    ? '🎤 Sent you a voice message'
                    : message.text.length > 60
                    ? message.text.substring(0, 60) + '...'
                    : message.text,
                senderId,
                referenceId: conversationId,
                actionUrl: `/team-chat?conversation=${conversationId}`,
                status: 'info',
              });

              // Emit notification to recipient's personal room
              io.to(`user:${recipientId}`).emit('notification:new', notification);

              // ✅ Also emit "message:received" for instant UI update
              io.to(`user:${recipientId}`).emit('message:received', {
                conversationId,
                message,
                senderName,
              });

              console.log(`🔔 Notified ${recipientId} about new message`);
            }
          } catch (notifErr) {
            console.error('⚠️ Notification failed:', notifErr);
            // Message still sent, don't fail
          }

        } catch (err) {
          console.error('❌ message:send error:', err);
        }
      }
    );

    /* ═══════════════════════════════════════════
       ✅ FRIEND REQUEST — With Notification
       ═══════════════════════════════════════════ */
    socket.on(
      'friend:request',
      async (
        payload: { userId: string; friendId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { userId, friendId } = payload;
          if (!userId || !friendId) return;

          const friendship = await FriendshipService.sendRequest(
            userId,
            friendId
          );

          // ✅ Ack to sender
          if (typeof callback === 'function') callback(friendship);

          // ✅ 1. Create notification in DB
          let notification: any = null;
          try {
            notification = await NotificationService.create({
              userId: friendId,
              type: 'friend_request',
              title: 'New Friend Request',
              message: 'would like to connect with you',
              senderId: userId,
              referenceId: String(friendship.id),
              status: 'pending',
            });
            
          } catch (notifErr) {
            console.error('⚠️ Notification create failed:', notifErr);
          }

          // ✅ 2. Notify recipient via socket (real-time)
          io.to(`user:${friendId}`).emit('friend:request_received', {
            friendship,
            fromUserId: userId,
          });

          // ✅ 3. Emit notification:new if created
          if (notification) {
            io.to(`user:${friendId}`).emit('notification:new', notification);
          }

          // ✅ 4. Notify sender for UI state update
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'pending_sent',
          });

          console.log(`🤝 Friend request: ${userId} → ${friendId}`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Request failed';
          console.error('❌ friend:request:', message);
          if (typeof callback === 'function')
            callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       ✅ ACCEPT FRIEND — With Notification
       ═══════════════════════════════════════════ */
    socket.on(
      'friend:accept',
      async (
        payload: { userId: string; friendId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { userId, friendId } = payload;
          if (!userId || !friendId) return;

          await FriendshipService.acceptRequest(userId, friendId);

          if (typeof callback === 'function') callback({ success: true });

          // ✅ Notify both users of status change
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'accepted',
          });
          io.to(`user:${friendId}`).emit('friend:status_updated', {
            otherUserId: userId,
            status: 'accepted',
          });

          // ✅ Create "accepted" notification for the original sender (friendId)
          let notification: any = null;
          try {
            notification = await NotificationService.create({
              userId: friendId,
              type: 'friend_request',
              title: 'Friend Request Accepted',
              message: 'accepted your friend request',
              senderId: userId,
              status: 'accepted',
            });
          } catch (notifErr) {
            console.error('⚠️ Notification create failed:', notifErr);
          }

          // ✅ Emit real-time notification
          if (notification) {
            io.to(`user:${friendId}`).emit('notification:new', notification);
          }

          // ✅ Extra: Notify friend that their request was accepted
          io.to(`user:${friendId}`).emit('friend:accepted_by', {
            userId,
          });

          console.log(`✅ Friend accepted: ${userId} ↔ ${friendId}`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Accept failed';
          console.error('❌ friend:accept:', message);
          if (typeof callback === 'function')
            callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       ✅ REJECT — With notification update
       ═══════════════════════════════════════════ */
    socket.on(
      'friend:reject',
      async (
        payload: { userId: string; friendId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { userId, friendId } = payload;
          if (!userId || !friendId) return;

          await FriendshipService.rejectRequest(userId, friendId);

          if (typeof callback === 'function') callback({ success: true });

          // ✅ Notify both
          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'none',
          });
          io.to(`user:${friendId}`).emit('friend:status_updated', {
            otherUserId: userId,
            status: 'none',
          });

          // ✅ Optionally update the sender's notification status
          // (If they had a pending notification, mark it declined)
          try {
            // You can add a method like `markAsDeclined` in NotificationService
            // For now, skip
          } catch (e) {}

          console.log(`❌ Friend rejected: ${userId} ✕ ${friendId}`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Reject failed';
          if (typeof callback === 'function')
            callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       ✅ REMOVE FRIEND
       ═══════════════════════════════════════════ */
    socket.on(
      'friend:remove',
      async (
        payload: { userId: string; friendId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { userId, friendId } = payload;
          if (!userId || !friendId) return;

          await FriendshipService.removeFriend(userId, friendId);

          if (typeof callback === 'function') callback({ success: true });

          io.to(`user:${userId}`).emit('friend:status_updated', {
            otherUserId: friendId,
            status: 'none',
          });
          io.to(`user:${friendId}`).emit('friend:status_updated', {
            otherUserId: userId,
            status: 'none',
          });

          console.log(`💔 Friend removed: ${userId} ✕ ${friendId}`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Remove failed';
          if (typeof callback === 'function')
            callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════
       ✅ DELETE CONVERSATION
       ═══════════════════════════════════════════ */
    socket.on(
      'conversation:delete',
      async (
        payload: { conversationId: string; athleteId: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { conversationId, athleteId } = payload;
          if (!conversationId || !athleteId) return;

          await ChatService.deleteConversation(conversationId, athleteId);

          if (typeof callback === 'function') callback({ success: true });

          io.to(`conv:${conversationId}`).emit('conversation:deleted', {
            conversationId,
            deletedBy: athleteId,
          });

          io.to(`user:${athleteId}`).emit('conversation:removed', {
            conversationId,
          });

          console.log(`🗑️ Conversation deleted: ${conversationId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Delete failed';
          console.error('❌ conversation:delete:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════════════════════
      GAME PARTICIPANT EVENTS
      ═══════════════════════════════════════════════════════════ */

    socket.on(
      'game:join',
      async (
        payload: { gameId: string; athleteId: string; athleteName?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { gameId, athleteId, athleteName } = payload;

          if (!gameId || !athleteId) {
            if (typeof callback === 'function') 
              callback({ error: 'Missing fields' });
            return;
          }

          // ✅ Join game in DB
          await PickupGamesService.joinGame(gameId, athleteId);

          // ✅ Ack to sender
          if (typeof callback === 'function') {
            callback({ success: true, message: 'Joined successfully' });
          }

          // ✅ Broadcast to ALL participants of this game
          io.to(`game:${gameId}`).emit('game:participant_joined', {
            gameId,
            athleteId,
            athleteName: athleteName || 'A player',
            joinedAt: new Date().toISOString(),
          });

          // ✅ Also broadcast to general list (sidebar count)
          io.emit('game:updated', {
            gameId,
            action: 'join',
            athleteId,
          });

          console.log(`👥 ${athleteName || athleteId} joined game ${gameId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Join failed';
          console.error('❌ game:join error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    socket.on(
      'game:leave',
      async (
        payload: { gameId: string; athleteId: string; athleteName?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { gameId, athleteId, athleteName } = payload;

          if (!gameId || !athleteId) return;

          await PickupGamesService.leaveGame(gameId, athleteId);

          if (typeof callback === 'function') callback({ success: true });

          io.to(`game:${gameId}`).emit('game:participant_left', {
            gameId,
            athleteId,
            athleteName: athleteName || 'A player',
          });

          io.emit('game:updated', {
            gameId,
            action: 'leave',
            athleteId,
          });

          console.log(`🚪 ${athleteName || athleteId} left game ${gameId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Leave failed';
          console.error('❌ game:leave error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );

    /* ═══════════════════════════════════════════════════════════
      MVP VOTE EVENTS
      ═══════════════════════════════════════════════════════════ */

    socket.on(
      'mvp:vote',
      async (
        payload: {
          gameId: string;
          voterId: string;
          votedForId: string;
          voterName?: string;
          votedForName?: string;
        },
        callback?: (res: any) => void
      ) => {
        try {
          const { gameId, voterId, votedForId, voterName, votedForName } = payload;

          if (!gameId || !voterId || !votedForId) {
            if (typeof callback === 'function')
              callback({ error: 'Missing fields' });
            return;
          }

          // ✅ Cast vote in DB
          await MvpService.castVote(gameId, voterId, votedForId);

          // ✅ Ack to sender
          if (typeof callback === 'function') callback({ success: true });

          // ✅ Broadcast vote to all participants of this game
          io.to(`game:${gameId}`).emit('mvp:vote_cast', {
            gameId,
            voterId,
            votedForId,
            voterName: voterName || 'A player',
            votedForName: votedForName || 'someone',
            votedAt: new Date().toISOString(),
          });

          // ✅ Fetch updated vote counts and broadcast
          try {
            const mvpData = await MvpService.getMvpData(gameId, voterId);
            io.to(`game:${gameId}`).emit('mvp:updated', {
              gameId,
              participants: mvpData.participants,
              totalVotes: mvpData.totalVotes,
            });
          } catch (e) {
            console.warn('⚠️ Could not fetch MVP data:', e);
          }

          console.log(`🗳️ ${voterName || voterId} voted for ${votedForName || votedForId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Vote failed';
          console.error('❌ mvp:vote error:', message);
          if (typeof callback === 'function') callback({ error: message });
        }
      }
    );
    /* ═══════════════════════════════════════════════════════════
      JOIN GAME ROOM (to receive updates)
      ═══════════════════════════════════════════════════════════ */

    socket.on('game:watch', (gameId: string) => {
      if (!gameId) return;
      socket.join(`game:${gameId}`);
      console.log(`👀 Socket ${socket.id} watching game:${gameId}`);
    });

    socket.on('game:unwatch', (gameId: string) => {
      if (!gameId) return;
      socket.leave(`game:${gameId}`);
    });
    /* ─── Typing indicator ─── */
    socket.on(
      'typing:start',
      (payload: { conversationId: string; athleteId: string; name: string }) => {
        socket.to(`conv:${payload.conversationId}`).emit('typing:start', payload);
      }
    );

    socket.on(
      'typing:stop',
      (payload: { conversationId: string; athleteId: string }) => {
        socket.to(`conv:${payload.conversationId}`).emit('typing:stop', payload);
      }
    );

    /* ─── Mark read ─── */
    socket.on(
      'message:read',
      async (payload: { conversationId: string; athleteId: string }) => {
        try {
          await ChatService.markAsRead(payload.conversationId, payload.athleteId);
          io.to(`conv:${payload.conversationId}`).emit('message:read', {
            conversationId: payload.conversationId,
            athleteId: payload.athleteId,
          });
        } catch (err) {
          console.error('❌ message:read error:', err);
        }
      }
    );

    /* ─── Mark notification read ─── */
    socket.on(
      'notification:mark_read',
      async (payload: { notificationId: string; userId: string }) => {
        try {
          await NotificationService.markRead(payload.notificationId, payload.userId);
          io.to(`user:${payload.userId}`).emit('notification:read', {
            notificationId: payload.notificationId,
          });
        } catch (err) {
          console.error('❌ notification:mark_read error:', err);
        }
      }
    );

    /* ─── Disconnect ─── */
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);

      if (socket.athleteId) {
        const set = onlineUsers.get(socket.athleteId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            onlineUsers.delete(socket.athleteId);
            io.emit('user:online', {
              athleteId: socket.athleteId,
              online: false,
            });
          }
        }
      }
    });
  });
};