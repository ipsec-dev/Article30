import type { DsrStateMachineStatus } from '@article30/shared';

export type { DsrStateMachineStatus };

// Discriminator: target status
// The hook accepts a free-form payload and the backend validates server-side.
export type DsrTransitionPayloadFields = Record<string, unknown>;

export interface DsrDetail {
  id: string;
  type: string;
  status: DsrStateMachineStatus;
  requesterName: string;
  requesterEmail: string;
  requesterDetails: string | null;
  identityVerified: boolean;
  identityNotes: string | null;
  description: string | null;
  affectedSystems: string | null;
  receivedAt: string;
  deadline: string;
  extensionReason: string | null;
  responseNotes: string | null;
  respondedAt: string | null;
  closedAt: string | null;
  closureReason: string | null;
  rejectionReason: string | null;
  rejectionDetails: string | null;
  partialFulfilmentNotes: string | null;
  withdrawnReason: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  creator: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  treatments: { id: string; name: string }[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type DsrPauseReason = 'IDENTITY_VERIFICATION' | 'SCOPE_CLARIFICATION' | 'OTHER';

export interface DsrPause {
  id: string;
  dsrId: string;
  reason: DsrPauseReason;
  reasonDetails: string | null;
  pausedAt: string;
  resumedAt: string | null;
  startedBy: string;
  organizationId: string;
}

export type TreatmentProcessingActionTaken =
  | 'NONE'
  | 'ACCESS_EXPORT'
  | 'RECTIFIED'
  | 'DELETED'
  | 'RESTRICTED'
  | 'NOT_APPLICABLE';

export type VendorPropagationStatus = 'NOT_REQUIRED' | 'PENDING' | 'PROPAGATED' | 'REFUSED';

export interface DsrTreatmentProcessing {
  dsrId: string;
  treatmentId: string;
  organizationId: string;
  treatmentName: string;
  searchedAt: string | null;
  findingsSummary: string | null;
  actionTaken: TreatmentProcessingActionTaken;
  actionTakenAt: string | null;
  vendorPropagationStatus: VendorPropagationStatus;
  createdAt: string;
  updatedAt: string;
}

export type RequesterCommunicationKind =
  | 'ACKNOWLEDGEMENT'
  | 'EXTENSION_NOTICE'
  | 'CLARIFICATION_REQUEST'
  | 'RESPONSE'
  | 'REJECTION'
  | 'WITHDRAWAL_CONFIRMATION';

export type RequesterCommunicationChannel = 'EMAIL' | 'POSTAL' | 'IN_PERSON';

export interface DsrCommunication {
  id: string;
  dsrId: string;
  organizationId: string;
  kind: RequesterCommunicationKind;
  sentAt: string;
  channel: RequesterCommunicationChannel;
  contentRevisionId: string | null;
  sentBy: string | null;
  createdAt: string;
}
