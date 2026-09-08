import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { requirePermission } from '../utils/permissions.js';
import * as controller from '../controllers/grievance.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', requirePermission('track_grievance'), controller.listGrievances);
export default router;