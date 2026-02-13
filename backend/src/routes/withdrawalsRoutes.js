import express from 'express';
import * as withdrawalsController from '../controllers/withdrawalsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authMiddleware, withdrawalsController.create);
router.post('/approve', authMiddleware, roleMiddleware('admin', 'hrd'), withdrawalsController.approve);
router.get('/list', authMiddleware, roleMiddleware('admin', 'hrd'), withdrawalsController.getAll);
router.get('/balance', authMiddleware, withdrawalsController.getBalance);

export default router;
