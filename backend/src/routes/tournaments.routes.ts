// backend/src/routes/tournaments.routes.ts
import { Router } from 'express';
import { TournamentsController } from '../controllers/tournaments.controller';

const router = Router();

router.get('/', TournamentsController.list);
router.post('/', TournamentsController.create);
router.get('/:id', TournamentsController.getOne);
router.delete('/:id', TournamentsController.remove);

router.post('/:id/register-team', TournamentsController.registerTeam);
router.post('/:id/matches/:matchId/score', TournamentsController.updateMatchScore);
router.post('/:id/matches/:matchId/mvp-vote', TournamentsController.castMvpVote);
router.post('/:id/prize-pool', TournamentsController.updatePrizePool);
router.post('/:id/prize-distribution', TournamentsController.updatePrizeDistribution);
router.post('/:id/teams/:teamId/pay', TournamentsController.markTeamPaid);

export default router;