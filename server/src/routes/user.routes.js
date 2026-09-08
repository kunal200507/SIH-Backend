import express from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as controller from '../controllers/user.controller.js';

const router = express.Router();
router.use(authenticate, authorize('ADMIN', 'MINISTRY'));
router.get('/:id', controller.getUser);
export default router;