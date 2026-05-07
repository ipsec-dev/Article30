import { Role } from '../types';

export const WRITE_ROLES = [Role.ADMIN, Role.DPO, Role.EDITOR] as const;
export const DELETE_ROLES = [Role.ADMIN, Role.DPO] as const;
export const DSR_ROLES = [Role.ADMIN, Role.DPO] as const;
export const VALIDATE_ROLES = [Role.ADMIN, Role.DPO] as const;
export const EXPORT_ROLES = [Role.ADMIN, Role.DPO, Role.AUDITOR] as const;
export const AUDIT_ROLES = [Role.ADMIN, Role.DPO, Role.AUDITOR] as const;
export const ADMIN_ROLES = [Role.ADMIN] as const;
export const TREATMENT_WRITE_ROLES = [
  Role.ADMIN,
  Role.DPO,
  Role.EDITOR,
  Role.PROCESS_OWNER,
] as const;

/** Roles that can READ follow-up surface (timeline, decisions, attachments, comments). */
export const FOLLOW_UP_READ_ROLES = [
  Role.ADMIN,
  Role.DPO,
  Role.EDITOR,
  Role.PROCESS_OWNER,
  Role.AUDITOR,
] as const;

/** Roles that can WRITE follow-up content (post comments, upload attachments, soft-delete attachments). */
export const FOLLOW_UP_WRITE_ROLES = [
  Role.ADMIN,
  Role.DPO,
  Role.EDITOR,
  Role.PROCESS_OWNER,
] as const;
