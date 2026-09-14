import * as auth from '../services/auth.service.js';
import env from '../config/env.js';

const cookieOptions = { httpOnly: true, secure: env.cookieSecure, sameSite: 'lax' };

/** Sends access and refresh tokens in secure cookies. */
function setTokens(res, tokens) {
  res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', tokens.refreshToken, { ...cookieOptions, maxAge: env.refreshTtlDays * 86400000, path: '/api/auth' });
}

/** Handles citizen registration requests. */
async function register(req, res, next) {
  try { const result = await auth.registerCitizen(req.body); setTokens(res, result); res.status(201).json(result); } catch (error) { next(error); }
}

/** Creates a staff account and returns its generated first-time credentials. */
async function registerStaff(req, res, next) {
  try { res.status(201).json(await auth.registerStaff(req.body)); } catch (error) { next(error); }
}

/** Handles admin requests to provision staff accounts. */
async function createStaff(req, res, next) {
  try { res.status(201).json(await auth.createStaff(req.body)); } catch (error) { next(error); }
}

/** Updates credentials for an existing staff account. */
async function updateStaffCredentials(req, res, next) {
  try { res.json({ user: await auth.adminUpdateUsername(req.params.id, req.body.username) }); } catch (error) { next(error); }
}

async function listStaffAccounts(req, res, next) {
  try { res.json({ users: await auth.listStaffAccounts() }); } catch (error) { next(error); }
}

async function resetStaffPassword(req, res, next) {
  try { res.json({ message: 'Password reset generated.', ...(await auth.adminResetPassword(req.params.id)) }); } catch (error) { next(error); }
}

async function setStaffStatus(req, res, next) {
  try { res.json({ user: await auth.setStaffStatus(req.params.id, req.body.isActive) }); } catch (error) { next(error); }
}

async function setStaffRole(req, res, next) {
  try { res.json({ user: await auth.setStaffRole(req.params.id, req.body.role) }); } catch (error) { next(error); }
}

async function updateOwnCredentials(req, res, next) {
  try { res.json({ user: await auth.updateOwnCredentials(req.user.sub, req.body), message: 'Credentials changed successfully.' }); } catch (error) { next(error); }
}

async function notifications(req, res, next) {
  try { res.json({ notifications: await auth.getNotifications(req.user.sub) }); } catch (error) { next(error); }
}

/** Authenticates a user and returns the user profile with tokens. */
async function login(req, res, next) {
  try { const result = await auth.login(req.body.username, req.body.password); setTokens(res, result); res.json(result); } catch (error) { next(error); }
}

/** Rotates the refresh token from the cookie or request body. */
async function refresh(req, res, next) {
  try { const result = await auth.refresh(req.cookies?.refreshToken || req.body.refreshToken); setTokens(res, result); res.json(result); } catch (error) { next(error); }
}

/** Revokes the current refresh token and clears authentication cookies. */
async function logout(req, res, next) {
  try { await auth.logout(req.cookies?.refreshToken || req.body.refreshToken); res.clearCookie('accessToken'); res.clearCookie('refreshToken', { path: '/api/auth' }); res.status(204).send(); } catch (error) { next(error); }
}

/** Returns the profile belonging to the authenticated access token. */
async function me(req, res, next) {
  try { res.json({ user: await auth.getProfile(req.user.sub) }); } catch (error) { next(error); }
}

export { register, registerStaff, createStaff, updateStaffCredentials, listStaffAccounts, resetStaffPassword, setStaffStatus, setStaffRole, updateOwnCredentials, notifications, login, refresh, logout, me };