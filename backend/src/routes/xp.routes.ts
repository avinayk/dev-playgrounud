import { Router } from 'express';
import { XpService } from '../services/xp.service';

const router = Router();

router.post('/xp/award', async (req, res) => {
  try {
    const { athleteId, amount, source, referenceId } = req.body;
    if (!athleteId || !amount || !source) {
      res.status(400).json({ success: false, message: 'Missing fields' });
      return;
    }
    console.log('🔍 Received:', { athleteId, amount, source, referenceId }); 
    const result = await XpService.awardXp(
      athleteId,
      Number(amount),
      source,
      referenceId
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
});

export default router;