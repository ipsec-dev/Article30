export enum Role {
  ADMIN = 'ADMIN',
  DPO = 'DPO',
  EDITOR = 'EDITOR',
  PROCESS_OWNER = 'PROCESS_OWNER',
  AUDITOR = 'AUDITOR',
}

export enum TreatmentStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
}

export enum ChecklistAnswer {
  YES = 'YES',
  NO = 'NO',
  NA = 'NA',
  PARTIAL = 'PARTIAL',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ViolationStatus {
  DETECTED = 'DETECTED',
  ASSESSED = 'ASSESSED',
  CONTAINED = 'CONTAINED',
  NOTIFIED_CNIL = 'NOTIFIED_CNIL',
  NOTIFIED_PERSONS = 'NOTIFIED_PERSONS',
  REMEDIATED = 'REMEDIATED',
  CLOSED = 'CLOSED',
}

// Legal bases (RGPD Art. 6)
export enum LegalBasis {
  CONSENT = 'CONSENT',
  CONTRACT = 'CONTRACT',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTERESTS = 'VITAL_INTERESTS',
  PUBLIC_TASK = 'PUBLIC_TASK',
  LEGITIMATE_INTERESTS = 'LEGITIMATE_INTERESTS',
}

// Sensitive data categories (RGPD Art. 9)
export enum SensitiveDataCategory {
  RACIAL_ETHNIC = 'RACIAL_ETHNIC',
  POLITICAL = 'POLITICAL',
  RELIGIOUS = 'RELIGIOUS',
  TRADE_UNION = 'TRADE_UNION',
  GENETIC = 'GENETIC',
  BIOMETRIC = 'BIOMETRIC',
  HEALTH = 'HEALTH',
  SEX_LIFE = 'SEX_LIFE',
  SEXUAL_ORIENTATION = 'SEXUAL_ORIENTATION',
}

// Transfer guarantee types (RGPD Art. 46-49)
export enum GuaranteeType {
  ADEQUACY = 'ADEQUACY',
  SCC = 'SCC',
  BCR = 'BCR',
  CODE_OF_CONDUCT = 'CODE_OF_CONDUCT',
  CERTIFICATION = 'CERTIFICATION',
  DEROGATION_49 = 'DEROGATION_49',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum FreshnessStatus {
  FRESH = 'FRESH',
  PENDING_REVIEW = 'PENDING_REVIEW',
  OUTDATED = 'OUTDATED',
}

export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ChecklistCategory {
  BREACH = 'breach',
  PRIVACY_BY_DESIGN = 'privacy-by-design',
  PROCESSOR_MANAGEMENT = 'processor-management',
  DPO_GOVERNANCE = 'dpo-governance',
  INTERNATIONAL_TRANSFERS = 'international-transfers',
  RECORDS_ACCOUNTABILITY = 'records-accountability',
}

export interface ChecklistItemDef {
  id: string;
  category: ChecklistCategory;
  articleRef: string;
  label: { fr: string; en: string };
}

export enum ScreeningVerdict {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export interface ScreeningQuestionDef {
  id: string;
  articleRef: string;
  label: { fr: string; en: string };
}

export interface ScreeningDto {
  id: string;
  title: string;
  responses: Record<string, string>;
  score: number;
  verdict: ScreeningVerdict;
  treatmentId: string | null;
  createdBy: string;
  createdAt: string;
  creator?: { id: string; firstName: string; lastName: string };
  treatment?: { id: string; name: string } | null;
}

export interface DataCategoryEntry {
  category: string;
  description?: string;
  retentionPeriod?: string;
}

export interface RecipientEntry {
  type: string;
  precision?: string;
}

export interface SecurityMeasureEntry {
  type: string;
  precision?: string;
}

export interface TransferEntry {
  destinationOrg: string;
  country: string;
  guaranteeType: GuaranteeType;
  documentLink?: string;
}

export interface TreatmentIndicators {
  completenessScore: number;
  riskLevel: RiskLevel;
  riskCriteriaCount: number;
  freshnessStatus: FreshnessStatus;
  aipdRequired: boolean;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  approved: boolean;
  createdAt: string;
}

export interface TreatmentDto {
  id: string;
  refNumber: number | null;
  name: string;
  purpose: string | null;
  subPurposes: string[];
  legalBasis: string | null;

  personCategories: string[];
  dataCategories: DataCategoryEntry[] | null;

  // Sensitive data (Art. 9)
  hasSensitiveData: boolean;
  sensitiveCategories: string[];

  recipientTypes: string[];
  recipients: RecipientEntry[] | null;

  transfers: TransferEntry[] | null;

  retentionPeriod: string | null;
  securityMeasures: string[];
  securityMeasuresDetailed: SecurityMeasureEntry[] | null;

  // CNIL Risk Criteria (9 criteria for AIPD determination)
  hasEvaluationScoring: boolean;
  hasAutomatedDecisions: boolean;
  hasSystematicMonitoring: boolean;
  isLargeScale: boolean;
  hasCrossDatasetLinking: boolean;
  involvesVulnerablePersons: boolean;
  usesInnovativeTech: boolean;
  canExcludeFromRights: boolean;

  lastReviewedAt: string | null;
  nextReviewAt: string | null;

  status: TreatmentStatus;
  validatedBy: string | null;
  validatedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Populated relations (optional, included by detail/list endpoints)
  creator?: { id: string; firstName: string; lastName: string };
  validator?: { id: string; firstName: string; lastName: string };

  // Computed indicators (optional, returned by API)
  indicators?: TreatmentIndicators;
}

export interface ChecklistResponseDto {
  id: string;
  itemId: string;
  response: ChecklistAnswer;
  reason: string | null;
  actionPlan: string | null;
  assignedTo: string | null;
  deadline: string | null;
  priority: Priority | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  respondedBy: string;
  respondedAt: string;
}

export interface ViolationDto {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  awarenessAt: string;
  remediation: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: ViolationStatus;
  assignedTo: string | null;
  dataCategories: string[];
  estimatedRecords: number | null;
  crossBorder: boolean;
  closedAt: string | null;
  closureReason: string | null;
  lessonsLearned: string | null;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedBy: string;
  performedAt: string;
  performer?: { id: string; firstName: string | null; lastName: string | null };
}

export interface OrganizationDto {
  id: string;
  companyName: string | null;
  siren: string | null;
  address: string | null;
  representativeName: string | null;
  representativeRole: string | null;
  dpoName: string | null;
  dpoEmail: string | null;
  dpoPhone: string | null;

  // Freshness configuration (in months)
  freshnessThresholdMonths: number;
  reviewCycleMonths: number;
  annualTurnover: number | null;

  // Governance: when false, a user can validate a treatment they created.
  enforceSeparationOfDuties: boolean;
}

export interface RecitalDto {
  id: number;
  recitalNumber: number;
  contentFr: string;
  contentEn: string;
  contentEs: string;
  contentDe: string;
  contentIt: string;
}

export interface ArticleDto {
  id: number;
  articleNumber: number;
  chapter: string;
  titleFr: string;
  titleEn: string;
  contentFr: string;
  contentEn: string;
  contentEs: string;
  contentDe: string;
  contentIt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export enum LinkedEntity {
  TREATMENT = 'TREATMENT',
  VIOLATION = 'VIOLATION',
  CHECKLIST_ITEM = 'CHECKLIST_ITEM',
}

export interface DocumentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
  linkedEntity: LinkedEntity;
  linkedEntityId: string;
  uploadedBy: string;
  uploadedAt: string;
  uploader?: { id: string; firstName: string; lastName: string };
}

export enum DpaStatus {
  MISSING = 'MISSING',
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  EXPIRED = 'EXPIRED',
}

export enum VendorAssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface VendorAssessmentDto {
  id: string;
  vendorId: string;
  status: VendorAssessmentStatus;
  score: number | null;
  answers: { questionId: string; answer: string; notes?: string }[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; firstName: string; lastName: string };
  reviewer?: { id: string; firstName: string; lastName: string };
}

export interface VendorDto {
  id: string;
  name: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  dpaStatus: DpaStatus;
  dpaSigned: string | null;
  dpaExpiry: string | null;
  dpaDocumentId: string | null;
  isSubProcessor: boolean;
  parentVendorId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  treatments?: { id: string; name: string }[];
  subProcessors?: VendorDto[];
}

export enum RegulatoryUpdateStatus {
  NEW = 'NEW',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
}

export interface RegulatoryUpdateDto {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  description: string | null;
  url: string | null;
  source: string;
  publishedAt: string;
  impactLevel: string | null;
  status: RegulatoryUpdateStatus;
  saved: boolean;
  createdAt: string;
}

export interface RssFeedDto {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export { DsrType, DsrStatus } from './dsr';
export type { DataSubjectRequestDto, DsrStatsDto } from './dsr';
