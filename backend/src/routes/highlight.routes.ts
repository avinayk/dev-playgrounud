// src/routes/highlight.routes.ts
import { Router } from 'express';
import { HighlightController } from '../controllers/highlight.controller';

const router = Router();

router.get('/highlights', HighlightController.listHighlights);
router.get('/highlights/community', HighlightController.listCommunityHighlights);
router.post('/highlights', HighlightController.createHighlight);
router.post('/highlights/:id/view', HighlightController.incrementViews);
router.post('/highlights/:id/like', HighlightController.toggleLike);
router.delete('/highlights/:id', HighlightController.deleteHighlight);

export default router;