// src/routes/feed.routes.ts
import { Router } from 'express';
import { FeedController } from '../controllers/feed.controller';

const router = Router();

router.get('/feed', FeedController.getFeed);
router.post('/feed', FeedController.createPost);
router.post('/feed/:id/like', FeedController.toggleLike);
router.post('/feed/:id/comments', FeedController.addComment);
router.delete('/feed/:id', FeedController.deletePost);

export default router;