const STAFF_ROLES = ['MINISTRY', 'STATE_NODAL', 'DISTRICT_AUTHORITY', 'MP', 'IMPLEMENTING_AGENCY'];

/** Applies assigned staff scope to request filters; citizens remain unrestricted. */
function enforceScope(fields = ['state', 'district', 'constituency']) {
  const scopeFields = Array.isArray(fields) ? fields : [fields];
  return (req, res, next) => {
    if (!STAFF_ROLES.includes(req.user.role)) return next();
    req.scope = {};
    for (const field of scopeFields) {
      const assigned = req.user[field];
      const requested = req.params[field] || req.query[field] || req.body?.[field];
      if (assigned && requested && assigned !== requested) return res.status(403).json({ error: `Outside assigned ${field} scope` });
      if (assigned) req.scope[field] = assigned;
    }
    next();
  };
}

/** Returns a filter suitable for Prisma where clauses. */
function getScopeFilter(req) {
  return req.scope ? { ...req.scope } : {};
}

export { getScopeFilter };
export default enforceScope;