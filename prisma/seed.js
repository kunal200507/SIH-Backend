import prisma from '../server/src/config/db.js';
import { ACTIONS } from '../server/src/utils/permissions.js';

const roles = {
  ADMIN: ACTIONS,
  MINISTRY: ['view_national_data', 'view_state_data', 'view_district_data', 'review_recommendation', 'sanction_work', 'assign_implementing_agency', 'view_ai_alerts', 'investigate_anomaly', 'inspect_works', 'generate_reports', 'track_grievance'],
  STATE_NODAL: ['view_state_data', 'view_district_data', 'review_recommendation', 'sanction_work', 'assign_implementing_agency', 'update_work_progress', 'view_ai_alerts', 'investigate_anomaly', 'inspect_works', 'generate_reports', 'track_grievance'],
  DISTRICT_AUTHORITY: ['view_state_data', 'view_district_data', 'review_recommendation', 'sanction_work', 'assign_implementing_agency', 'execute_work', 'update_work_progress', 'upload_execution_documents', 'view_ai_alerts', 'investigate_anomaly', 'inspect_works', 'generate_reports', 'track_grievance'],
  MP: ['view_state_data', 'view_district_data', 'recommend_work', 'review_recommendation', 'update_work_progress', 'view_ai_alerts', 'investigate_anomaly', 'generate_reports', 'track_grievance'],
  IMPLEMENTING_AGENCY: ['view_state_data', 'view_district_data', 'execute_work', 'update_work_progress', 'upload_execution_documents', 'view_ai_alerts', 'investigate_anomaly', 'generate_reports', 'track_grievance'],
  CITIZEN: ['view_national_data', 'view_state_data', 'view_district_data', 'view_ai_alerts', 'investigate_anomaly', 'file_grievance', 'track_grievance'],
};

/** Upserts every role/action permission from the authorization matrix. */
async function main() {
  for (const [role, allowedActions] of Object.entries(roles)) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { role_action: { role, action } },
        update: { allowed: allowedActions.includes(action) },
        create: { role, action, allowed: allowedActions.includes(action) },
      });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());