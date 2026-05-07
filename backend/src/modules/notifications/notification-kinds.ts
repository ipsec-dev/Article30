import type { TemplateId } from '../mail/mail.service';

// Source of truth for every (kind, template, instant?, settings-toggle?) tuple.
// Adding a new event = appending here + adding two template files.

export const NOTIFICATION_KINDS = [
  'dsr.submitted',
  'dsr.deadline-approaching',
  'violation.logged',
  'violation.high-severity-72h-kickoff',
  'violation.72h-window',
  'vendor.questionnaire-returned',
  'vendor.dpa-expiring',
  'treatment.review-due',
  'action-item.assigned',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// Instant kinds always send (no per-org toggle); scheduled kinds map to a
// boolean column on Organization that can disable them. Reserved for future
// callers (notably the scheduler in Task 8) that need to filter scheduled-only
// kinds — kept exported so the catalog stays the single source of truth.
export const INSTANT_KINDS: ReadonlySet<NotificationKind> = new Set([
  'dsr.submitted',
  'violation.logged',
  'violation.high-severity-72h-kickoff',
  'vendor.questionnaire-returned',
  'action-item.assigned',
]);

// Maps each scheduled kind to the Organization boolean column that gates it.
export const KIND_TO_SETTING = {
  'dsr.deadline-approaching': 'notifyDsrDeadline',
  'violation.72h-window': 'notifyViolation72h',
  'vendor.dpa-expiring': 'notifyVendorDpaExpiry',
  'treatment.review-due': 'notifyTreatmentReview',
} as const satisfies Partial<Record<NotificationKind, string>>;

// Settings keys that gate scheduled kinds — derived from KIND_TO_SETTING values
// so callers can't typo the column name (downstream Tasks 4-7-8 use this in
// their `settings` arg type).
export type NotificationSettingKey = (typeof KIND_TO_SETTING)[keyof typeof KIND_TO_SETTING];

// Maps each kind to its mail template id (matches files in
// backend/src/modules/mail/templates/<id>.{fr,en}.txt).
export const KIND_TO_TEMPLATE: Record<NotificationKind, TemplateId> = {
  'dsr.submitted': 'dsr-submitted',
  'dsr.deadline-approaching': 'dsr-deadline',
  'violation.logged': 'violation-logged',
  'violation.high-severity-72h-kickoff': 'violation-72h-kickoff',
  'violation.72h-window': 'violation-72h',
  'vendor.questionnaire-returned': 'vendor-questionnaire-returned',
  'vendor.dpa-expiring': 'vendor-dpa-expiring',
  'treatment.review-due': 'treatment-review-due',
  'action-item.assigned': 'action-item-assigned',
};
