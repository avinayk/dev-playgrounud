// src/routes/pickupGames.ts
import { Router } from 'express';
import { PickupGamesController } from '../controllers/pickupGames.controller';

const router = Router();
router.get('/pickup-games/stats', PickupGamesController.getStats);
router.post('/pickup-games', PickupGamesController.createGame);
router.get('/pickup-games', PickupGamesController.listGames);
router.get('/pickup-games/:id', PickupGamesController.getGame);

router.post('/pickup-games/:id/join', PickupGamesController.joinGame);
router.delete('/pickup-games/:id/leave', PickupGamesController.leaveGame);
router.get('/pickup-games/:id/participants', PickupGamesController.getParticipants);
router.post('/pickup-games/participants/bulk', PickupGamesController.getParticipantsBulk);
router.get('/pickup-games/user/:athleteId/joined', PickupGamesController.getUserJoinedGames);
router.post('/pickup-games/:id/invite', PickupGamesController.sendInvites);
export default router;