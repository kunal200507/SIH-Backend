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

/** Handles admin requests to provision staff accounts. */
async function createStaff(req, res, next) {
  try { res.status(201).json({ user: await auth.createStaff(req.body) }); } catch (error) { next(error); }
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

export { register, createStaff, login, refresh, logout, me };