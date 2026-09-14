import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

/** Reads an access token from the Authorization header or cookie. */
function getToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.accessToken;
}

/** Verifies the access token and attaches its user claims to the request. */
async function authenticate(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const claims = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, username: true, role: true, isActive: true, state: true, district: true, constituency: true, agencyId: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account is inactive or unavailable' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export default authenticate;