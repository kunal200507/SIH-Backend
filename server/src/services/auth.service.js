import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import env from '../config/env.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken, hashToken,
} from '../utils/jwt.js';

const publicUser = {
  id: true, username: true, role: true, fullName: true, officerId: true,
  email: true, phone: true, designation: true, state: true, district: true,
  house: true, constituency: true, agencyId: true,
};

/** Removes sensitive fields and returns the public user profile. */
function userResponse(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    officerId: user.officerId,
    email: user.email,
    phone: user.phone,
    designation: user.designation,
    state: user.state,
    district: user.district,
    house: user.house,
    constituency: user.constituency,
    agencyId: user.agencyId,
  };
}

/** Creates access and refresh tokens and persists the hashed refresh token. */
async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + env.refreshTtlDays * 86400000),
    },
  });
  return { accessToken, refreshToken };
}

/** Registers a citizen, hashes the password, and signs the initial tokens. */
async function registerCitizen({ fullName, email, phone, password }) {
  if (!fullName || !password || (!email && !phone)) {
    const error = new Error('fullName, password, and email or phone are required');
    error.status = 400;
    throw error;
  }
  const username = `CIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, fullName, email: email || null, phone: phone || null, passwordHash, role: 'CITIZEN' },
    select: publicUser,
  });
  return { user: userResponse(user), ...(await issueTokens(user)) };
}

/** Creates a provisioned staff account for an allowed operational role. */
async function createStaff(data) {
  const { role, password, fullName, officerId, ...profile } = data;
  const staffRoles = ['MINISTRY', 'STATE_NODAL', 'DISTRICT_AUTHORITY', 'MP', 'IMPLEMENTING_AGENCY'];
  if (!staffRoles.includes(role) || !password || !fullName || !officerId) {
    const error = new Error('role, fullName, officerId, and password are required for staff');
    error.status = 400;
    throw error;
  }
  const user = await prisma.user.create({
    data: {
      username: officerId,
      officerId,
      fullName,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      ...profile,
    },
    select: publicUser,
  });
  return userResponse(user);
}

/** Validates credentials for any active user and issues fresh tokens. */
async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid username or password');
    error.status = 401;
    throw error;
  }
  return { user: userResponse(user), ...(await issueTokens(user)) };
}

/** Rotates a valid refresh token and revokes the token that was used. */
async function refresh(rawToken) {
  let payload;
  try { payload = verifyRefreshToken(rawToken); } catch {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hashToken(rawToken), userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!stored || !stored.user.isActive) {
    const error = new Error('Refresh token has been revoked or expired');
    error.status = 401;
    throw error;
  }
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return { user: userResponse(stored.user), ...(await issueTokens(stored.user)) };
}

/** Revokes the supplied refresh token so it cannot be reused. */
async function logout(rawToken) {
  if (rawToken) await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(rawToken) }, data: { revokedAt: new Date() } });
}

/** Loads the authenticated user's non-sensitive profile fields. */
async function getProfile(id) {
  return prisma.user.findUnique({ where: { id }, select: publicUser });
}

export { registerCitizen, createStaff, login, refresh, logout, getProfile };