import { verifyAccessToken } from '../utils/jwt.js';

/** Reads an access token from the Authorization header or cookie. */
function getToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.accessToken;
}

/** Verifies the access token and attaches its user claims to the request. */
function authenticate(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export default authenticate;