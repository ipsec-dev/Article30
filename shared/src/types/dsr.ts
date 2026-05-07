export enum DsrType {
  ACCESS = 'ACCESS',
  RECTIFICATION = 'RECTIFICATION',
  ERASURE = 'ERASURE',
  RESTRICTION = 'RESTRICTION',
  PORTABILITY = 'PORTABILITY',
  OBJECTION = 'OBJECTION',
}

export enum DsrStatus {
  RECEIVED = 'RECEIVED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_REQUESTER = 'AWAITING_REQUESTER',
  RESPONDED = 'RESPONDED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  CLOSED = 'CLOSED',
}

export interface DataSubjectRequestDto {
  id: string;
  type: DsrType;
  status: DsrStatus;
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
  createdBy: string | null;
  assignedTo: string | null;
  creator: { id: string; firstName: string; lastName: string } | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DsrStatsDto {
  total: number;
  byStatus: Record<DsrStatus, number>;
  byType: Record<DsrType, number>;
  overdue: number;
  avgResponseDays: number;
  thisMonth: number;
}
