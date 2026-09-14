import express from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { requirePermission } from '../utils/permissions.js';
import enforceScope from '../middleware/scope.js';
import * as controller from '../controllers/project.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('ADMIN', 'MINISTRY', 'STATE_NODAL', 'DISTRICT_AUTHORITY', 'MP', 'IMPLEMENTING_AGENCY'), requirePermission('view_national_data'), enforceScope(), controller.listProjects);
export default router;