import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { requirePermission } from '../utils/permissions.js';

const router = express.Router();
router.post('/register/citizen', controller.register);
router.post('/register/staff', controller.registerStaff);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.get('/notifications', authenticate, controller.notifications);
router.patch('/me/credentials', authenticate, authorize('MINISTRY', 'STATE_NODAL', 'DISTRICT_AUTHORITY', 'MP', 'IMPLEMENTING_AGENCY'), controller.updateOwnCredentials);
router.get('/staff', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.listStaffAccounts);
router.post('/staff', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.createStaff);
router.patch('/staff/:id/username', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.updateStaffCredentials);
router.post('/staff/:id/password-reset', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.resetStaffPassword);
router.patch('/staff/:id/status', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.setStaffStatus);
router.patch('/staff/:id/role', authenticate, authorize('ADMIN'), requirePermission('manage_users'), controller.setStaffRole);

export default router;