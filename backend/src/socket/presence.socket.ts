// socket/presence.socket.ts
import { Server, Socket } from 'socket.io';
import { LeaderboardService, PresenceStatus } from '../services/leaderboard.service';

export function initPresenceSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🟢 Presence socket: ${socket.id}`);

    socket.on('presence:identify', async (athleteId: string) => {
      if (!athleteId) return;
      socket.data.athleteId = athleteId;
      socket.join(`user:${athleteId}`);

      try {
        const result = await LeaderboardService.updateStatus(athleteId, 'Online');

        // ✅ BOTH events — Leaderboard + Chat
        io.emit('presence:update', {
          athleteId,
          status: 'Online',
          updatedAt: result.updatedAt,
        });
        io.emit('user:online', { athleteId, online: true });
      } catch (err) {
        console.error('presence:identify error:', err);
      }
    });

    socket.on('presence:set', async (payload: { athleteId: string; status: PresenceStatus }) => {
      try {
        const result = await LeaderboardService.updateStatus(payload.athleteId, payload.status);

        io.emit('presence:update', {
          athleteId: payload.athleteId,
          status: payload.status,
          updatedAt: result.updatedAt,
        });

        const isOnline = payload.status === 'Online' || payload.status === 'In-Game';
        io.emit('user:online', { athleteId: payload.athleteId, online: isOnline });
      } catch (err) {
        console.error('presence:set error:', err);
      }
    });

    socket.on('disconnect', async () => {
      const athleteId = socket.data.athleteId;
      if (!athleteId) return;
      try {
        const result = await LeaderboardService.updateStatus(athleteId, 'Offline');

        io.emit('presence:update', {
          athleteId,
          status: 'Offline',
          updatedAt: result.updatedAt,
        });
        io.emit('user:online', { athleteId, online: false });
      } catch (err) {
        console.error('presence:disconnect error:', err);
      }
    });
  });
}