import prisma from '../config/db.js';

/** Loads a non-sensitive user summary by ID for privileged callers. */
async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, username: true, role: true, fullName: true, state: true, district: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (error) { return next(error); }
}

export { getUser };