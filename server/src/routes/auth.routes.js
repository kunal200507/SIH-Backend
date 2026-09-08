import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';

const router = express.Router();
router.post('/register/citizen', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/staff', authenticate, authorize('ADMIN'), controller.createStaff);

export default router;