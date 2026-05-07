export type ViolationStatus =
  | 'RECEIVED'
  | 'TRIAGED'
  | 'DISMISSED'
  | 'ASSESSED'
  | 'CONTAINED'
  | 'NOTIFICATION_PENDING'
  | 'NOTIFIED_CNIL'
  | 'PERSONS_NOTIFIED'
  | 'PERSONS_NOTIFICATION_WAIVED'
  | 'REMEDIATED'
  | 'CLOSED'
  | 'REOPENED';

export interface ViolationDetail {
  id: string;
  title: string;
  status: ViolationStatus;
  severity: string;
  awarenessAt: string | null;
  occurredAt: string | null;
  breachCategories: string[];
  dismissalReason: string | null;
  delayJustification: string | null;
  personsNotificationWaiver: string | null;
  waiverJustification: string | null;
  closureReason: string | null;
  lessonsLearned: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  id: string;
  violationId: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  computedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedDataCategories: string[];
  estimatedSubjectCount: number | null;
  estimatedRecordCount: number | null;
  crossBorder: boolean;
  potentialConsequences: string;
  mitigatingFactors: string | null;
  assessedBy: string;
  assessedAt: string;
  supersedesId: string | null;
}

export interface NotificationFiling {
  id: string;
  violationId: string;
  phase: 'INITIAL' | 'COMPLEMENTARY';
  filedAt: string;
  regulator: string;
  referenceNumber: string | null;
  channel: 'PORTAL' | 'EMAIL' | 'POST';
  filedBy: string;
  createdAt: string;
}

export interface PersonsNotification {
  id: string;
  violationId: string;
  method: 'EMAIL' | 'POST' | 'PUBLIC_COMMUNICATION' | 'IN_APP';
  notifiedAt: string;
  recipientScope: string;
  sentBy: string;
  createdAt: string;
}

export interface RegulatorInteraction {
  id: string;
  violationId: string;
  direction: 'OUTBOUND' | 'INBOUND';
  kind:
    | 'FILING_INITIAL'
    | 'FILING_COMPLEMENTARY'
    | 'RFI_RECEIVED'
    | 'RFI_RESPONDED'
    | 'CLOSURE_NOTICE'
    | 'SANCTION_NOTICE'
    | 'OTHER';
  occurredAt: string;
  regulator: string;
  referenceNumber: string | null;
  summary: string;
  recordedBy: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  violationId: string;
  title: string;
  description: string | null;
  ownerId: string;
  deadline: string;
  doneAt: string | null;
  doneBy: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

// Discriminator: target status
// The hook accepts a free-form payload and the backend validates server-side.
// Common fields per target listed below for documentation purposes.
// (We keep this free-form to match the backend's unknown-payload contract.)
export type TransitionPayloadFields = Record<string, unknown>;
