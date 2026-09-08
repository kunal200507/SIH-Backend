import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/env.js';

/** Signs a short-lived token containing the user's identity and role. */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, env.accessSecret, {
    expiresIn: env.accessTtl,
  });
}

/** Signs a long-lived token used to obtain a new access token. */
function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.refreshSecret, {
    expiresIn: `${env.refreshTtlDays}d`,
  });
}

/** Verifies an access token and returns its decoded payload. */
function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret);
}

/** Verifies a refresh token and returns its decoded payload. */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshSecret);
}

/** Hashes a token before storing or comparing it in the database. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken };