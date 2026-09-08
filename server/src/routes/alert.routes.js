import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { requirePermission } from '../utils/permissions.js';
import * as controller from '../controllers/alert.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', requirePermission('view_ai_alerts'), controller.listAlerts);
export default router;