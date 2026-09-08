/** Creates middleware that restricts a request to the user's assigned scope. */
function enforceScope(field) {
  return (req, res, next) => {
    const requested = req.params[field] || req.query[field] || req.body[field];
    const role = req.user.role;
    if (['ADMIN', 'MINISTRY'].includes(role) || !requested) return next();
    if (req.user[field] && req.user[field] !== requested) return res.status(403).json({ error: 'Outside assigned scope' });
    next();
  };
}

export default enforceScope;