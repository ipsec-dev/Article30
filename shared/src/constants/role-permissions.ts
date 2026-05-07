import { Role } from '../types';
import {
  ADMIN_ROLES,
  AUDIT_ROLES,
  DELETE_ROLES,
  DSR_ROLES,
  EXPORT_ROLES,
  FOLLOW_UP_READ_ROLES,
  FOLLOW_UP_WRITE_ROLES,
  TREATMENT_WRITE_ROLES,
  VALIDATE_ROLES,
  WRITE_ROLES,
} from './roles';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RoleCapabilityRoute {
  method: HttpMethod;
  /** Full path including the `/api` prefix, e.g. `/api/users`. */
  path: string;
}

export interface RoleCapability {
  /** Stable ID, dot-separated. Doubles as i18n key suffix. */
  id: string;
  /** i18n key for the action label. */
  labelKey: string;
  /** Roles allowed to perform this capability. */
  allowedRoles: readonly Role[];
  /** Backend routes that enforce this capability. Used by drift test only — never rendered. */
  routes: readonly RoleCapabilityRoute[];
}

export const ALL_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.DPO,
  Role.EDITOR,
  Role.PROCESS_OWNER,
  Role.AUDITOR,
];

export const ROLE_PERMISSION_MATRIX: readonly RoleCapability[] = [
  {
    id: 'dashboard.view',
    labelKey: 'roleMatrix.capability.dashboard.view',
    allowedRoles: ALL_ROLES,
    // Read endpoints are session-protected but have no @Roles() decorator.
    // Excluded from drift-test route checks.
    routes: [],
  },
  {
    id: 'treatment.write',
    labelKey: 'roleMatrix.capability.treatment.write',
    allowedRoles: TREATMENT_WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/treatments' },
      { method: 'PATCH', path: '/api/treatments/:id' },
    ],
  },
  {
    id: 'treatment.import',
    labelKey: 'roleMatrix.capability.treatment.import',
    allowedRoles: TREATMENT_WRITE_ROLES,
    routes: [
      { method: 'GET', path: '/api/treatments/import-template' },
      { method: 'POST', path: '/api/treatments/import' },
    ],
  },
  {
    id: 'treatment.validate',
    labelKey: 'roleMatrix.capability.treatment.validate',
    allowedRoles: VALIDATE_ROLES,
    routes: [
      { method: 'PATCH', path: '/api/treatments/:id/validate' },
      { method: 'PATCH', path: '/api/treatments/:id/invalidate' },
      // mark-reviewed and export-pdf use Role.ADMIN, Role.DPO inline (= VALIDATE_ROLES)
      { method: 'PATCH', path: '/api/treatments/:id/mark-reviewed' },
      { method: 'GET', path: '/api/treatments/:id/export-pdf' },
    ],
  },
  {
    id: 'treatment.delete',
    labelKey: 'roleMatrix.capability.treatment.delete',
    allowedRoles: DELETE_ROLES,
    routes: [{ method: 'DELETE', path: '/api/treatments/:id' }],
  },
  {
    id: 'treatment.export',
    labelKey: 'roleMatrix.capability.treatment.export',
    allowedRoles: EXPORT_ROLES,
    routes: [
      { method: 'GET', path: '/api/treatments/export' },
      // Audit package is also export-gated
      { method: 'GET', path: '/api/compliance/audit-package' },
    ],
  },
  {
    id: 'violation.write',
    labelKey: 'roleMatrix.capability.violation.write',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/violations' },
      { method: 'PATCH', path: '/api/violations/:id' },
    ],
  },
  {
    id: 'checklist.respond',
    labelKey: 'roleMatrix.capability.checklist.respond',
    allowedRoles: WRITE_ROLES,
    routes: [{ method: 'PUT', path: '/api/checklist/:itemId' }],
  },
  {
    id: 'auditLog.view',
    labelKey: 'roleMatrix.capability.auditLog.view',
    allowedRoles: AUDIT_ROLES,
    routes: [
      { method: 'GET', path: '/api/audit-log' },
      { method: 'GET', path: '/api/audit-log/verify' },
      // Compliance report, screenings list, regulatory-updates list are also audit-gated
      { method: 'GET', path: '/api/compliance/report' },
      { method: 'GET', path: '/api/screenings' },
      { method: 'GET', path: '/api/screenings/:id' },
      { method: 'GET', path: '/api/screenings/:id/pdf' },
      { method: 'GET', path: '/api/regulatory-updates' },
      { method: 'GET', path: '/api/regulatory-updates/new-count' },
      { method: 'GET', path: '/api/dsr/stats' },
    ],
  },
  {
    id: 'compliance.snapshot',
    labelKey: 'roleMatrix.capability.compliance.snapshot',
    allowedRoles: VALIDATE_ROLES,
    routes: [{ method: 'POST', path: '/api/compliance/snapshot' }],
  },
  {
    id: 'dsr.access',
    labelKey: 'roleMatrix.capability.dsr.access',
    allowedRoles: DSR_ROLES,
    routes: [
      { method: 'GET', path: '/api/dsr' },
      { method: 'GET', path: '/api/dsr/:id' },
      { method: 'POST', path: '/api/dsr' },
      { method: 'PATCH', path: '/api/dsr/:id' },
      // DELETE /api/dsr/:id uses DELETE_ROLES (same set as DSR_ROLES: [ADMIN, DPO])
      { method: 'DELETE', path: '/api/dsr/:id' },
    ],
  },
  {
    id: 'users.manage',
    labelKey: 'roleMatrix.capability.users.manage',
    allowedRoles: ADMIN_ROLES,
    routes: [
      { method: 'GET', path: '/api/users' },
      { method: 'POST', path: '/api/users' },
      { method: 'PATCH', path: '/api/users/:id/approve' },
      { method: 'PATCH', path: '/api/users/:id/role' },
      { method: 'PATCH', path: '/api/users/:id/deactivate' },
      { method: 'PATCH', path: '/api/users/:id/admin-reset-password' },
    ],
  },
  {
    id: 'organization.edit',
    labelKey: 'roleMatrix.capability.organization.edit',
    allowedRoles: ADMIN_ROLES,
    routes: [
      { method: 'PATCH', path: '/api/organization' },
      { method: 'GET', path: '/api/rss-feeds' },
      { method: 'POST', path: '/api/rss-feeds' },
      { method: 'PATCH', path: '/api/rss-feeds/:id' },
      { method: 'DELETE', path: '/api/rss-feeds/:id' },
      { method: 'POST', path: '/api/regulatory-updates/sync' },
    ],
  },
  {
    id: 'organization.notifications',
    labelKey: 'roleMatrix.capability.organization.notifications',
    allowedRoles: VALIDATE_ROLES,
    routes: [
      { method: 'GET', path: '/api/organization/settings' },
      { method: 'PATCH', path: '/api/organization/settings' },
    ],
  },
  // Capabilities added in Task 2 to close gaps flagged by the drift test ──
  {
    id: 'screening.write',
    labelKey: 'roleMatrix.capability.screening.write',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/screenings' },
      { method: 'POST', path: '/api/screenings/:id/convert' },
    ],
  },
  {
    id: 'docs.write',
    labelKey: 'roleMatrix.capability.docs.write',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/documents/upload' },
      { method: 'DELETE', path: '/api/documents/:id' },
    ],
  },
  {
    id: 'vendor.write',
    labelKey: 'roleMatrix.capability.vendor.write',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/vendors' },
      { method: 'PATCH', path: '/api/vendors/:id' },
      { method: 'POST', path: '/api/vendors/:vendorId/assessment' },
      { method: 'PATCH', path: '/api/vendors/:vendorId/assessment/:assessmentId' },
      { method: 'PATCH', path: '/api/vendors/:vendorId/assessment/:assessmentId/submit' },
    ],
  },
  {
    id: 'vendor.delete',
    labelKey: 'roleMatrix.capability.vendor.delete',
    allowedRoles: DELETE_ROLES,
    routes: [{ method: 'DELETE', path: '/api/vendors/:id' }],
  },
  {
    id: 'vendorAssessment.review',
    labelKey: 'roleMatrix.capability.vendorAssessment.review',
    allowedRoles: VALIDATE_ROLES,
    routes: [{ method: 'PATCH', path: '/api/vendors/:vendorId/assessment/:assessmentId/review' }],
  },
  {
    id: 'regulatoryUpdate.triage',
    labelKey: 'roleMatrix.capability.regulatoryUpdate.triage',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'PATCH', path: '/api/regulatory-updates/:id/impact' },
      { method: 'PATCH', path: '/api/regulatory-updates/:id/status' },
    ],
  },
  {
    id: 'regulatoryUpdate.bookmark',
    labelKey: 'roleMatrix.capability.regulatoryUpdate.bookmark',
    allowedRoles: WRITE_ROLES,
    routes: [{ method: 'PATCH', path: '/api/regulatory-updates/:id/saved' }],
  },
  {
    id: 'followup.timeline.view',
    labelKey: 'roleMatrix.capability.followup.timeline.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/follow-up/timeline/:entityType/:entityId' }],
  },
  {
    id: 'followup.comment.read',
    labelKey: 'roleMatrix.capability.followup.comment.read',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/follow-up/comments/:entityType/:entityId' }],
  },
  {
    id: 'followup.comment.write',
    labelKey: 'roleMatrix.capability.followup.comment.write',
    allowedRoles: FOLLOW_UP_WRITE_ROLES,
    routes: [{ method: 'POST', path: '/api/follow-up/comments' }],
  },
  {
    id: 'followup.attachment.upload',
    labelKey: 'roleMatrix.capability.followup.attachment.upload',
    allowedRoles: FOLLOW_UP_WRITE_ROLES,
    routes: [{ method: 'POST', path: '/api/follow-up/attachments' }],
  },
  {
    id: 'followup.attachment.read',
    labelKey: 'roleMatrix.capability.followup.attachment.read',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [
      { method: 'GET', path: '/api/follow-up/attachments/:entityType/:entityId' },
      { method: 'GET', path: '/api/follow-up/attachments/:id/download' },
    ],
  },
  {
    id: 'followup.attachment.delete',
    labelKey: 'roleMatrix.capability.followup.attachment.delete',
    allowedRoles: FOLLOW_UP_WRITE_ROLES,
    routes: [{ method: 'DELETE', path: '/api/follow-up/attachments/:id' }],
  },
  {
    id: 'followup.decision.view',
    labelKey: 'roleMatrix.capability.followup.decision.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/follow-up/decisions/:entityType/:entityId' }],
  },
  // Violation workflow capabilities added in M2 Task 8
  {
    id: 'violation.workflow.transition',
    labelKey: 'roleMatrix.capability.violation.workflow.transition',
    allowedRoles: WRITE_ROLES,
    routes: [{ method: 'PATCH', path: '/api/violations/:id/transition' }],
  },
  {
    id: 'violation.risk.assess',
    labelKey: 'roleMatrix.capability.violation.risk.assess',
    allowedRoles: WRITE_ROLES,
    routes: [{ method: 'POST', path: '/api/violations/:id/risk-assessment' }],
  },
  {
    id: 'violation.risk.view',
    labelKey: 'roleMatrix.capability.violation.risk.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [
      { method: 'GET', path: '/api/violations/:id/risk-assessment' },
      { method: 'GET', path: '/api/violations/:id/risk-assessment/history' },
    ],
  },
  {
    id: 'violation.filing.view',
    labelKey: 'roleMatrix.capability.violation.filing.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [
      { method: 'GET', path: '/api/violations/:id/filings' },
      { method: 'GET', path: '/api/violations/:id/persons-notifications' },
    ],
  },
  {
    id: 'violation.regulator.write',
    labelKey: 'roleMatrix.capability.violation.regulator.write',
    allowedRoles: VALIDATE_ROLES,
    routes: [{ method: 'POST', path: '/api/violations/:id/regulator-interactions' }],
  },
  {
    id: 'violation.regulator.view',
    labelKey: 'roleMatrix.capability.violation.regulator.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/violations/:id/regulator-interactions' }],
  },
  {
    id: 'violation.remediation.write',
    labelKey: 'roleMatrix.capability.violation.remediation.write',
    allowedRoles: WRITE_ROLES,
    routes: [
      { method: 'POST', path: '/api/violations/:id/action-items' },
      { method: 'PATCH', path: '/api/violations/:id/action-items/:actionItemId' },
    ],
  },
  {
    id: 'violation.remediation.view',
    labelKey: 'roleMatrix.capability.violation.remediation.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/violations/:id/action-items' }],
  },
  // DSR workflow capabilities added in M3 Task 8
  {
    id: 'dsr.workflow.transition',
    labelKey: 'roleMatrix.capability.dsr.workflow.transition',
    allowedRoles: DSR_ROLES,
    routes: [{ method: 'PATCH', path: '/api/dsr/:id/transition' }],
  },
  {
    id: 'dsr.pause.write',
    labelKey: 'roleMatrix.capability.dsr.pause.write',
    allowedRoles: DSR_ROLES,
    routes: [
      { method: 'POST', path: '/api/dsr/:id/pauses' },
      { method: 'PATCH', path: '/api/dsr/:id/pauses/active/resume' },
    ],
  },
  {
    id: 'dsr.pause.view',
    labelKey: 'roleMatrix.capability.dsr.pause.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/dsr/:id/pauses' }],
  },
  {
    id: 'dsr.treatment.processing.write',
    labelKey: 'roleMatrix.capability.dsr.treatment.processing.write',
    allowedRoles: DSR_ROLES,
    routes: [
      { method: 'PATCH', path: '/api/dsr/:id/treatments/:treatmentId/processing' },
      { method: 'POST', path: '/api/dsr/:id/treatments/:treatmentId/link' },
    ],
  },
  {
    id: 'dsr.treatment.processing.view',
    labelKey: 'roleMatrix.capability.dsr.treatment.processing.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/dsr/:id/treatments/processing' }],
  },
  {
    id: 'dsr.communication.write',
    labelKey: 'roleMatrix.capability.dsr.communication.write',
    allowedRoles: DSR_ROLES,
    routes: [{ method: 'POST', path: '/api/dsr/:id/communications' }],
  },
  {
    id: 'dsr.communication.view',
    labelKey: 'roleMatrix.capability.dsr.communication.view',
    allowedRoles: FOLLOW_UP_READ_ROLES,
    routes: [{ method: 'GET', path: '/api/dsr/:id/communications' }],
  },
];
