export type EntityType = 'VIOLATION' | 'DSR';

export interface TimelineEvent {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  kind: string;
  payload: Record<string, unknown>;
  performedBy: string | null;
  performedAt: string;
}

export interface Comment {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  authorId: string;
  body: string;
  visibility: 'INTERNAL' | 'AUDITOR_VISIBLE';
  createdAt: string;
  editedAt: string | null;
}

export interface Attachment {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  sha256: string;
  previousSha256: string | null;
  uploadedBy: string;
  uploadedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
}
