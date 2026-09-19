 // routes/athlete.routes.ts
import { Router } from 'express';
import { AthleteController } from '../controllers/athlete.controller';

const router = Router();
const athleteController = new AthleteController();
 
// Helper to wrap controller methods
const wrap = (fn: Function) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};


// ═══════════════════════════════════════════════════════════════
// ✅ REFERRAL ROUTES (must come BEFORE /athletes/:id to avoid clashes)
// ═══════════════════════════════════════════════════════════════
router.get('/athletes/:id/referral-code',
  wrap(athleteController.getReferralCode));

router.get('/athletes/:id/referrals/stats',
  wrap(athleteController.getReferralStats));

router.get('/athletes/:id/referrals/history',
  wrap(athleteController.getReferralHistory));
router.post('/referrals/email', wrap(athleteController.logReferralInvite));
router.post('/register', wrap(athleteController.createAthlete));
router.post('/athletes', wrap(athleteController.createAthlete));
// GET routes
router.get('/athletes', wrap(athleteController.getAllAthletes));
router.get('/athletes/search', wrap(athleteController.searchAthletes));
router.get('/athletes/scouts', wrap(athleteController.getScouts));
router.get('/athletes/sport/:sport', wrap(athleteController.getAthletesBySport));
router.get('/athletes/email/:email', wrap(athleteController.getAthleteByEmail));
router.get('/athletes/:id/match-history', wrap(athleteController.getMatchHistory));

router.get('/athletes/:id', wrap(athleteController.getAthleteById));
router.patch('/athletes/:id/xp', wrap(athleteController.awardXp));

// POST routes
router.post('/athletes', wrap(athleteController.createAthlete));

// PUT routes
router.put('/athletes/:id', wrap(athleteController.updateAthlete));

router.patch('/athletes/:id', wrap(athleteController.updateAthlete));

// DELETE routes
router.delete('/athletes/:id', wrap(athleteController.deleteAthlete));
router.get('/athletes', wrap(athleteController.listAthletes));
 router.patch('/athletes/location', AthleteController.updateLocation);

export default router;