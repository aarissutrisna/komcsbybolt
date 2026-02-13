import express from 'express';
import * as omzetController from '../controllers/omzetController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware('admin', 'hrd', 'cs'), omzetController.create);
router.get('/by-date', authMiddleware, omzetController.getByDate);
router.get('/by-branch', authMiddleware, omzetController.getByBranch);
router.get('/by-user', authMiddleware, omzetController.getByUser);
router.get('/stats', authMiddleware, omzetController.getStats);

router.post('/webhook/n8n', omzetController.receiveN8NWebhook);
router.post('/sync/n8n', authMiddleware, roleMiddleware('admin', 'hrd'), omzetController.syncFromN8N);

export default router;
