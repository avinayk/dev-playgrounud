// src/routes/friendship.routes.ts
import { Router } from 'express';
import { FriendshipController } from '../controllers/friendship.controller';

const router = Router();

router.post('/friends/request', FriendshipController.sendRequest);
router.post('/friends/accept', FriendshipController.acceptRequest);
router.post('/friends/reject', FriendshipController.rejectRequest);
router.delete('/friends/:friendId', FriendshipController.removeFriend);
router.get('/friends/status', FriendshipController.getStatus);
router.get('/friends', FriendshipController.getFriends);
router.get('/friends/pending', FriendshipController.getPendingRequests);
router.get('/friends/sent', FriendshipController.getSentRequests);

export default router;