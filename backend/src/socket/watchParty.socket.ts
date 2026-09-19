// socket/watchParty.socket.ts
import { Server, Socket } from 'socket.io';
import { WatchPartyService } from '../services/watchParty.service';
import pool from '../config/database';
interface RoomState {
  sessionId: string;
  roomId: string;
  hostId: string;
  clipId: string;
  isPlaying: boolean;
  createdAt: Date;
}

const activeRooms = new Map<string, RoomState>();

export function initWatchPartySocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🎬 Watch party socket: ${socket.id}`);

    /* CREATE ROOM */
    socket.on(
      'watchparty:create',
      async (payload: any, callback?: (res: any) => void) => {
        console.log('\n📥 watchparty:create:', payload.roomId);
        try {
          const { sessionId } = await WatchPartyService.createSession(payload);

          activeRooms.set(payload.roomId, {
            sessionId,
            roomId: payload.roomId,
            hostId: payload.hostId,
            clipId: payload.clipId,
            isPlaying: true,
            createdAt: new Date(),
          });

          socket.data.watchPartyRoom = payload.roomId;
          socket.data.watchPartySessionId = sessionId;
          socket.data.athleteId = payload.hostId;
          socket.join(`watchparty:${payload.roomId}`);

          const members = await WatchPartyService.getActiveMembers(sessionId);

          io.to(`watchparty:${payload.roomId}`).emit('watchparty:members', {
            roomId: payload.roomId,
            members,
          });

          callback?.({ success: true, roomId: payload.roomId, sessionId });
          console.log(`✅ Room created: ${payload.roomId} | session: ${sessionId}`);
        } catch (err) {
          console.error('❌ watchparty:create error:', err);
          callback?.({ error: 'Failed to create room' });
        }
      }
    );

    /* JOIN ROOM */
    socket.on(
      'watchparty:join',
      async (
        payload: { roomId: string; athleteId: string; name: string; avatar: string },
        callback?: (res: any) => void
      ) => {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📥 watchparty:join CALLED                 ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log('   Payload:', JSON.stringify(payload, null, 2));
        console.log('   Callback?', typeof callback === 'function');

        try {
          /* 1. Find session */
          const session = await WatchPartyService.getSessionByRoomId(payload.roomId);

          if (!session) {
            console.log('   ❌ NO SESSION for roomId:', payload.roomId);
            callback?.({ error: 'Room not found' });
            return;
          }

          console.log('   ✅ Session:', session.id, '| active:', session.is_active);

          /* 2. Revive if needed */
          if (session.is_active !== 1) {
            const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : 0;
            const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
            const canRevive = endedAt > thirtyMinAgo;

            console.log('   ♻️  Inactive. canRevive:', canRevive);

            if (canRevive) {
              await WatchPartyService.reviveSession(session.id);
              session.is_active = 1;
              console.log('   ✅ Revived');
            } else {
              console.log('   ❌ Too old — rejecting');
              callback?.({ error: 'Room has ended (too old)' });
              return;
            }
          }

          /* 3. Join session */
          await WatchPartyService.joinSession({
            sessionId: session.id,
            athleteId: payload.athleteId,
          });

          socket.data.watchPartyRoom = payload.roomId;
          socket.data.watchPartySessionId = session.id;
          socket.data.athleteId = payload.athleteId;
          socket.join(`watchparty:${payload.roomId}`);

          /* 4. Fetch messages + members */
          console.log('   🔍 Fetching messages...');
          const messages = await WatchPartyService.getRecentMessages(session.id, 200);
          console.log('   ✅ Messages:', messages.length);

          console.log('   🔍 Fetching members...');
          const members = await WatchPartyService.getActiveMembers(session.id);
          console.log('   ✅ Members:', members.length);

          const roomState = activeRooms.get(payload.roomId);

          /* 5. Send callback */
          const responsePayload = {
            success: true,
            roomId: payload.roomId,
            sessionId: session.id,
            isPlaying: roomState?.isPlaying ?? true,
            members,
            messages: messages.map((m) => ({
              id: m.id,
              senderName: m.sender_name || 'System',
              senderAvatar: m.sender_avatar || '',
              text: m.text,
              timestamp: m.created_at,
              isSystem: m.message_type === 'system',
            })),
          };

          console.log('   📤 Callback — messages:', responsePayload.messages.length, '| members:', responsePayload.members.length);
          callback?.(responsePayload);
          console.log('   ✅ Callback sent\n');

          /* 6. Broadcast */
          socket.to(`watchparty:${payload.roomId}`).emit('watchparty:member_joined', {
            roomId: payload.roomId,
            member: {
              id: payload.athleteId,
              name: payload.name,
              avatar: payload.avatar,
              role: 'viewer',
              joinedAt: new Date().toISOString(),
              isOnline: true,
            },
          });

          io.to(`watchparty:${payload.roomId}`).emit('watchparty:members', {
            roomId: payload.roomId,
            members,
          });
        } catch (err) {
          console.error('❌ watchparty:join ERROR:', err);
          callback?.({ error: 'Failed to join room' });
        }
      }
    );

    /* LEAVE ROOM */
    socket.on(
      'watchparty:leave',
      async (payload: { roomId: string; athleteId: string }) => {
        try {
          const sessionId = socket.data.watchPartySessionId;
          if (!sessionId) return;

          console.log('👋 watchparty:leave:', payload.athleteId);

          await WatchPartyService.leaveSession({
            sessionId,
            athleteId: payload.athleteId,
          });

          socket.leave(`watchparty:${payload.roomId}`);

          const members = await WatchPartyService.getActiveMembers(sessionId);

          io.to(`watchparty:${payload.roomId}`).emit('watchparty:member_left', {
            roomId: payload.roomId,
            athleteId: payload.athleteId,
          });

          io.to(`watchparty:${payload.roomId}`).emit('watchparty:members', {
            roomId: payload.roomId,
            members,
          });

          if (members.length === 0) {
            await WatchPartyService.endSession(sessionId);
            activeRooms.delete(payload.roomId);
            console.log('🗑️  Room ended (manual leave):', payload.roomId);
          }
        } catch (err) {
          console.error('❌ watchparty:leave error:', err);
        }
      }
    );

    /* MESSAGE */
    socket.on(
      'watchparty:message',
      async (payload: {
        roomId: string;
        senderId: string;
        senderName: string;
        senderAvatar: string;
        text: string;
      }) => {
        try {
          const sessionId = socket.data.watchPartySessionId;
          if (!sessionId) {
            console.warn('⚠️  No session for socket');
            return;
          }

          console.log('💬 Message received:', payload.text);

          const msg = await WatchPartyService.saveMessage({
            sessionId,
            senderId: payload.senderId,
            text: payload.text,
            messageType: 'text',
          });

          io.to(`watchparty:${payload.roomId}`).emit('watchparty:message', {
            id: msg.id,
            roomId: payload.roomId,
            senderId: msg.sender_id,
            senderName: msg.sender_name,
            senderAvatar: msg.sender_avatar,
            text: msg.text,
            timestamp: msg.created_at,
            isSystem: false,
          });

          console.log('   ✅ Message broadcast:', msg.id);
        } catch (err) {
          console.error('❌ watchparty:message error:', err);
        }
      }
    );

    /* PLAYBACK */
    socket.on(
      'watchparty:playback',
      (payload: { roomId: string; isPlaying: boolean }) => {
        const roomState = activeRooms.get(payload.roomId);
        if (roomState) roomState.isPlaying = payload.isPlaying;

        io.to(`watchparty:${payload.roomId}`).emit('watchparty:playback', payload);
      }
    );

    /* REACTION */
    socket.on(
      'watchparty:reaction',
      (payload: { roomId: string; emoji: string; senderId: string }) => {
        io.to(`watchparty:${payload.roomId}`).emit('watchparty:reaction', payload);
      }
    );

    /* ═══════════════════════════════════════════
       ✅ DISCONNECT — FIXED
       - 60 sec grace (30 se badha diya)
       - Session end NAHI karta (cron karega)
       ═══════════════════════════════════════════ */
    socket.on('disconnect', async () => {
      const roomId = socket.data.watchPartyRoom;
      const athleteId = socket.data.athleteId;
      const sessionId = socket.data.watchPartySessionId;

      if (!roomId || !athleteId || !sessionId) return;

      console.log(`🔌 Disconnected: ${athleteId} from ${roomId}`);

      setTimeout(async () => {
        try {
          const roomSockets = await io.in(`watchparty:${roomId}`).fetchSockets();
          const stillConnected = roomSockets.some(
            (s) => s.data.athleteId === athleteId
          );

          if (stillConnected) {
            console.log(`🔄 ${athleteId} reconnected — skip leave`);
            return;
          }

          console.log(`👋 ${athleteId} didn't reconnect — leaving`);

          await WatchPartyService.leaveSession({ sessionId, athleteId });

          const members = await WatchPartyService.getActiveMembers(sessionId);

          io.to(`watchparty:${roomId}`).emit('watchparty:member_left', {
            roomId,
            athleteId,
          });

          io.to(`watchparty:${roomId}`).emit('watchparty:members', {
            roomId,
            members,
          });

          console.log(`📊 ${members.length} members remain in ${roomId}`);
          
          // ✅ Session END NAHI karte — manual leave ke liye endSession hai
        } catch (err) {
          console.error('❌ disconnect cleanup error:', err);
        }
      }, 60_000);   // ✅ 60 sec grace
    });
    // socket/watchParty.socket.ts
    socket.on('watchparty:find-active', async (payload: { clipId: string }, callback) => {
    try {
        const [rows] = await pool.execute(
        `SELECT * FROM watch_party_sessions 
        WHERE clip_id = ? AND is_active = 1 
            AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        ORDER BY created_at DESC LIMIT 1`,
        [payload.clipId]
        );
        
        callback?.({ 
        success: true, 
        session: rows[0] || null 
        });
    } catch (err) {
        callback?.({ success: false, error: 'Lookup failed' });
    }
    });
  });
}