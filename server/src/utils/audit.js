import prisma from '../config/db.js';

/** Creates middleware that records the completed request as an audit event. */
function audit(action, resource) {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (req.user) {
        prisma.auditLog.create({
          data: { userId: req.user.id, action, resource, ipAddress: req.ip },
        }).catch(() => {});
      }
    });
    next();
  };
}

export default audit;