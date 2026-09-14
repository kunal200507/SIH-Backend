import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import prisma from '../config/db.js';
import env from '../config/env.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken, hashToken,
} from '../utils/jwt.js';

const publicUser = {
  id: true, username: true, role: true, fullName: true, officerId: true,
  email: true, phone: true, designation: true, state: true, district: true,
  house: true, constituency: true, agencyId: true, isActive: true,
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
    isActive: user.isActive,
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

function generatedCredential(prefix) {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

const STAFF_ROLES = ['MINISTRY', 'STATE_NODAL', 'DISTRICT_AUTHORITY', 'MP', 'IMPLEMENTING_AGENCY'];

async function notifyUsers(userIds, message) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, message })) });
}

async function adminIds() {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  return admins.map(({ id }) => id);
}

/** Creates a staff account with generated first-time credentials. */
async function registerStaff(data) {
  const { role, fullName, officerId, state, district, designation, house, constituency } = data;
  const required = {
    DISTRICT_AUTHORITY: ['fullName', 'officerId', 'state', 'district'],
    STATE_NODAL: ['fullName', 'officerId', 'state'],
    IMPLEMENTING_AGENCY: ['fullName', 'officerId', 'state', 'district'],
    MP: ['fullName', 'house', 'state', 'constituency'],
  };
  if (!required[role] || required[role].some((field) => !data[field])) {
    const error = new Error('Please complete all required registration fields');
    error.status = 400;
    throw error;
  }
  const rolePrefix = { DISTRICT_AUTHORITY: 'DA', STATE_NODAL: 'SNA', IMPLEMENTING_AGENCY: 'IA', MP: 'MP' }[role];
  const username = generatedCredential(rolePrefix);
  const password = generatedCredential('ENR');
  const user = await prisma.user.create({
    data: { username, fullName, officerId: officerId || null, passwordHash: await bcrypt.hash(password, 12), role, designation: designation || null, state: state || null, district: district || null, house: house || null, constituency: constituency || null },
    select: publicUser,
  });
  return { user: userResponse(user), credentials: { username, password } };
}

/** Creates a provisioned staff account for an allowed operational role. */
async function createStaff(data) {
  const { role, fullName, officerId, ...profile } = data;
  const staffRoles = STAFF_ROLES;
  if (!staffRoles.includes(role)) {
    const error = new Error('valid staff role is required');
    error.status = 400;
    throw error;
  }
  const account = { role, fullName, officerId, ...profile };
  const accountOfficerId = account.officerId || (account.role === 'MP' ? `MP-${Date.now()}` : null);
  if (!account.fullName || !accountOfficerId) {
    const error = new Error('fullName and officerId are required for staff');
    error.status = 400;
    throw error;
  }
  const password = generatedCredential('ENR');
  const user = await prisma.user.create({
      data: {
        username: accountOfficerId,
        officerId: accountOfficerId,
        fullName: account.fullName,
        passwordHash: await bcrypt.hash(password, 12),
        role: account.role,
        designation: account.designation || null,
        state: account.state || null,
        district: account.district || null,
        house: account.house || null,
        constituency: account.constituency || null,
        email: profile.email || null,
        phone: profile.phone || null,
      },
      select: publicUser,
    });
  return { user: userResponse(user), credentials: { username: user.username, password } };
}

/** Lists staff account details for the admin account-management screen. */
async function listStaffAccounts() {
  const users = await prisma.user.findMany({ where: { role: { in: STAFF_ROLES } }, select: publicUser, orderBy: { createdAt: 'desc' } });
  return users.map(userResponse);
}

/** Changes only a staff username; administrators cannot choose a password. */
async function adminUpdateUsername(id, username) {
  if (!username) {
    const error = new Error('username is required');
    error.status = 400;
    throw error;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, username: true } });
    if (!existing || !STAFF_ROLES.includes(existing.role)) {
      const error = new Error('Staff account not found');
      error.status = 404;
      throw error;
    }
    const user = await prisma.user.update({ where: { id }, data: { username }, select: publicUser });
    await notifyUsers([id, ...(await adminIds())], `Username changed from ${existing.username} to ${username}.`);
    return userResponse(user);
  } catch (error) {
    if (error.code === 'P2025') error.status = 404;
    if (error.code === 'P2002') { error.status = 409; error.message = 'Username is already in use'; }
    throw error;
  }
}

/** Generates and applies a password reset; the clear password is returned once. */
async function adminResetPassword(id) {
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing || !STAFF_ROLES.includes(existing.role)) {
    const error = new Error('Staff account not found');
    error.status = 404;
    throw error;
  }
  const password = generatedCredential('ENR');
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date() } });
  await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await notifyUsers([id, ...(await adminIds())], 'Your password was reset by an administrator. Use the generated password shown on your account screen.');
  return { password };
}

/** Enables or disables a staff account. */
async function setStaffStatus(id, isActive) {
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing || !STAFF_ROLES.includes(existing.role)) {
    const error = new Error('Staff account not found');
    error.status = 404;
    throw error;
  }
  const user = await prisma.user.update({ where: { id }, data: { isActive }, select: publicUser });
  if (!isActive) await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await notifyUsers([id, ...(await adminIds())], `Your account has been ${isActive ? 'enabled' : 'disabled'} by an administrator.`);
  return userResponse(user);
}

/** Changes a staff role when the caller has the account-management permission. */
async function setStaffRole(id, role) {
  if (!STAFF_ROLES.includes(role)) {
    const error = new Error('Invalid staff role');
    error.status = 400;
    throw error;
  }
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing || !STAFF_ROLES.includes(existing.role)) {
    const error = new Error('Staff account not found');
    error.status = 404;
    throw error;
  }
  const user = await prisma.user.update({ where: { id }, data: { role }, select: publicUser });
  await notifyUsers([id, ...(await adminIds())], `Your account role has been changed to ${role}.`);
  return userResponse(user);
}

/** Allows a signed-in staff member to change username and/or password. */
async function updateOwnCredentials(id, { currentPassword, username, password }) {
  if (!currentPassword || (!username && !password)) {
    const error = new Error('currentPassword and username or password are required');
    error.status = 400;
    throw error;
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || !STAFF_ROLES.includes(existing.role) || !(await bcrypt.compare(currentPassword, existing.passwordHash))) {
    const error = new Error('Current password is incorrect');
    error.status = 401;
    throw error;
  }
  const data = {};
  if (username) data.username = username;
  if (password) { data.passwordHash = await bcrypt.hash(password, 12); data.passwordChangedAt = new Date(); }
  const user = await prisma.user.update({ where: { id }, data, select: publicUser });
  await notifyUsers([id, ...(await adminIds())], 'Your account credentials were changed by the account holder.');
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

async function getNotifications(userId) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
}

export { registerCitizen, registerStaff, createStaff, listStaffAccounts, adminUpdateUsername, adminResetPassword, setStaffStatus, setStaffRole, updateOwnCredentials, login, refresh, logout, getProfile, getNotifications };