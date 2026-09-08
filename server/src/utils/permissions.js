import prisma from '../config/db.js';

const ACTIONS = [
  'view_national_data', 'view_state_data', 'view_district_data', 'recommend_work',
  'review_recommendation', 'sanction_work', 'assign_implementing_agency', 'execute_work',
  'update_work_progress', 'upload_execution_documents', 'view_ai_alerts', 'investigate_anomaly',
  'inspect_works', 'generate_reports', 'file_grievance', 'track_grievance',
];

/** Checks whether a role has an allowed database permission for an action. */
async function hasPermission(role, action) {
  const permission = await prisma.permission.findUnique({ where: { role_action: { role, action } } });
  return Boolean(permission?.allowed);
}

/** Creates middleware that blocks requests without the configured permission. */
function requirePermission(action) {
  return async (req, res, next) => {
    if (!ACTIONS.includes(action)) return res.status(500).json({ error: 'Unknown permission action' });
    if (!(await hasPermission(req.user.role, action))) return res.status(403).json({ error: 'Permission denied' });
    req.permissionAction = action;
    next();
  };
}

export { ACTIONS, hasPermission, requirePermission };