// backend/src/routes/courts.routes.ts
import { Router } from 'express';
import { CourtsController } from '../controllers/courts.controller';

const router = Router();

router.get('/', CourtsController.list);
router.post('/', CourtsController.create);
router.get('/:id', CourtsController.getOne);
router.put('/:id', CourtsController.update);
router.delete('/:id', CourtsController.remove);
router.post('/:id/radar-ping', CourtsController.radarPing);
export default router;