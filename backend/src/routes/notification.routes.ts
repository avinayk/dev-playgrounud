// src/routes/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.get('/notifications', NotificationController.list);
router.get('/notifications/unread-count', NotificationController.unreadCount);
router.post('/notifications/read', NotificationController.markRead);
router.post('/notifications/read-all', NotificationController.markAllRead);
router.post('/notifications/status', NotificationController.updateStatus);
router.delete('/notifications/:id', NotificationController.deleteOne);
router.delete('/notifications', NotificationController.clearAll);

export default router;