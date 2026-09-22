import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';                       
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import athleteRoutes from './routes/athlete.routes';
import authRoutes from './routes/auth.routes';
import statRoutes from './routes/stat.routes'; 
import pickupGamesRoutes from './routes/pickupGames';
import { initChatSocket } from './socket/chat.socket';
import { initFeedSocket } from './socket/feed.socket';  
import { setIO } from './socket/socketManager';      
import chatRoutes from './routes/chat.routes'; 
import uploadRoutes from './routes/upload.routes';
import friendshipRoutes from './routes/friendship.routes';
import notificationRoutes from './routes/notification.routes';
import mvpRoutes from './routes/mvp';
import challengeRoutes from './routes/challenge.routes';
import feedRoutes from './routes/feed.routes';
import highlightRoutes from './routes/highlight.routes';
import achievementRoutes from './routes/achievement.routes'
import streakRoutes from './routes/streak.routes';
import xpRoutes from './routes/xp.routes';
import drillsRoutes from './routes/drills.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import cron from 'node-cron';
import { LeaderboardService } from './services/leaderboard.service';
import { initPresenceSocket } from './socket/presence.socket';
import watchPartyRoutes from './routes/watchParty.routes';
import { initWatchPartySocket } from './socket/watchParty.socket';
import dashboardRoutes from './routes/dashboard.routes';
import regionalRoutes from './routes/regional.routes';
import dailyPointsRoutes from './routes/dailyPoints.routes';
import weeklyChallengesRoutes from './routes/weeklyChallenges.routes';
import dailyChallengesRoutes from './routes/dailyChallenges.routes';
import customGoalsRoutes from './routes/customGoals.routes';
import seasonGoalsRoutes from './routes/seasonGoals.routes';
import tournamentsRoutes from './routes/tournaments.routes';
import courtsRoutes from './routes/courts.routes';
import stripeRoutes from './routes/stripe.routes';

import referralRoutes from './routes/referral.routes';


dotenv.config();
 

const app: Express = express();
const port = process.env.PORT || 3001;

// ✅ CORS - Allow all origins (for development)
app.use(cors()); 
 
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  
app.use('/api', authRoutes); 
app.use('/api', athleteRoutes);
app.use('/api', statRoutes);
app.use('/api', notificationRoutes);
app.use('/api', friendshipRoutes);
app.use('/api', uploadRoutes);
app.use('/api', pickupGamesRoutes);
app.use('/api', chatRoutes);
app.use('/api', mvpRoutes);
app.use('/api', challengeRoutes);
app.use('/api', feedRoutes);
app.use('/api', highlightRoutes);
app.use('/api', achievementRoutes);
app.use('/api', streakRoutes);
app.use('/api', xpRoutes);
app.use('/api', drillsRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', watchPartyRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/regional', regionalRoutes);
app.use('/api/daily-points', dailyPointsRoutes);
app.use('/api/weekly-challenges', weeklyChallengesRoutes);
app.use('/api/daily-challenges', dailyChallengesRoutes);
app.use('/api/custom-goals', customGoalsRoutes);
app.use('/api/season-goals', seasonGoalsRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api', referralRoutes);
/* ─── HTTP server ─── */
const server = http.createServer(app);

/* ─── Health check ─── */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

/* ─── 404 ─── */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ─── Error handler ─── */
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/* ═══════════════════════════════════════════
   SOCKET.IO
   ═══════════════════════════════════════════ */
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

/* ✅ Store globally so services can access it */
setIO(io);

/* ✅ Initialize chat + feed sockets */
initChatSocket(io);
initFeedSocket(io);
initPresenceSocket(io);   // ✅ Ye line MUST hai
initWatchPartySocket(io);   // Socket.IO ke saath

/* ─── Start server ─── */
const PORT = Number(process.env.PORT) || 3001;
// cron.schedule('*/2 * * * *', async () => {
//   try {
//     const result = await LeaderboardService.markStaleOffline();
//     if (result.markedOffline > 0) {
//       console.log(`[cron] Marked ${result.markedOffline} athletes Offline`);
//     }
//   } catch (err) {
//     console.error('[cron] stale-offline failed:', err);
//   }
// });
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.io on http://localhost:${PORT}`);
});

export default app;