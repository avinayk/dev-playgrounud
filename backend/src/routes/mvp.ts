// src/routes/pickupGames.ts
import { Router } from 'express';
import { MvpController } from '../controllers/mvp.controller';

const router = Router();
router.get('/pickup-games/:id/mvp', MvpController.getMvp);
router.post('/pickup-games/:id/mvp/vote', MvpController.vote);
router.post('/pickup-games/:id/mvp/announce', MvpController.announceWinner);
export default router;