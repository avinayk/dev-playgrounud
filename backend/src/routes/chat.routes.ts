// src/routes/chat.routes.ts
import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

/* Conversations */
router.get('/chat/conversations', ChatController.getConversations);
router.get('/chat/conversations/:id/messages', ChatController.getMessages);
router.post('/chat/conversations/direct', ChatController.getOrCreateDirect);
router.post('/chat/conversations/group', ChatController.createGroup);
router.post('/chat/conversations/:id/read', ChatController.markAsRead);
router.delete('/chat/conversations/:id', ChatController.deleteConversation);

/* Messages */
router.post('/chat/messages', ChatController.sendMessage);

/* Athletes (for New Chat modal) */
router.get('/chat/athletes', ChatController.listAthletes);

export default router;