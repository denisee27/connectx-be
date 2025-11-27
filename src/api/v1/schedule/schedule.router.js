import { Router } from 'express';
import scheduleController from './schedule.controller.js';

const router = Router();

router.get('/upcoming', scheduleController.getUpcoming);
router.get('/past', scheduleController.getPast);

export { router as scheduleRouter };
