import express from 'express';
import * as commissionsController from '../controllers/commissionsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/calculate-by-date', authMiddleware, roleMiddleware('admin', 'hrd'), commissionsController.calculateByDate);
router.post('/calculate-by-branch', authMiddleware, roleMiddleware('admin', 'hrd'), commissionsController.calculateByBranch);

export default router;
