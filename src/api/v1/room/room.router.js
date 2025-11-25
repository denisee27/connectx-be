import { Router } from 'express';
import roomController from './room.controller.js';
import { authMiddleware } from '../../../infra/security/auth.middleware.js';


const router = Router();

router.get('/highlights', roomController.getHighlights);
router.get('/popular', roomController.getPopular);
router.get('/:slug', roomController.getRoomBySlug);
router.get('/', roomController.getRooms);

export { router as roomRouter };
