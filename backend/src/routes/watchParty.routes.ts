// routes/watchParty.routes.ts
import { Router } from 'express';
import { WatchPartyController } from '../controllers/watchParty.controller';

const router = Router();

/* ═══════════════════════════════════════════
   SESSION ROUTES
   ═══════════════════════════════════════════ */
router.get('/watchparty/session/:roomId', WatchPartyController.getSession);
router.get('/watchparty/session/:sessionId/messages', WatchPartyController.getMessages);
router.get('/watchparty/session/:sessionId/summary', WatchPartyController.getSummary);

/* ═══════════════════════════════════════════
   ✅ NEW: Find active session by clip ID
   ═══════════════════════════════════════════ */
router.get(
  '/watchparty/active-by-clip/:clipId',
  WatchPartyController.getActiveSessionByClip
);

/* ═══════════════════════════════════════════
   END SESSION
   ═══════════════════════════════════════════ */
router.post('/watchparty/end/:sessionId', WatchPartyController.endSession);

export default router;