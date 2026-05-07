-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DPO', 'EDITOR', 'PROCESS_OWNER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('DRAFT', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ChecklistAnswer" AS ENUM ('YES', 'NO', 'NA', 'PARTIAL', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('RECEIVED', 'TRIAGED', 'DISMISSED', 'ASSESSED', 'CONTAINED', 'NOTIFICATION_PENDING', 'NOTIFIED_CNIL', 'PERSONS_NOTIFIED', 'PERSONS_NOTIFICATION_WAIVED', 'REMEDIATED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "BreachCategory" AS ENUM ('CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY');

-- CreateEnum
CREATE TYPE "WaiverGround" AS ENUM ('ENCRYPTION', 'RISK_MITIGATED', 'DISPROPORTIONATE_EFFORT_PUBLIC_COMM');

-- CreateEnum
CREATE TYPE "RiskLikelihood" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationFilingPhase" AS ENUM ('INITIAL', 'COMPLEMENTARY');

-- CreateEnum
CREATE TYPE "NotificationFilingChannel" AS ENUM ('PORTAL', 'EMAIL', 'POST');

-- CreateEnum
CREATE TYPE "PersonsNotificationMethod" AS ENUM ('EMAIL', 'POST', 'PUBLIC_COMMUNICATION', 'IN_APP');

-- CreateEnum
CREATE TYPE "RegulatorInteractionDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "RegulatorInteractionKind" AS ENUM ('FILING_INITIAL', 'FILING_COMPLEMENTARY', 'RFI_RECEIVED', 'RFI_RESPONDED', 'CLOSURE_NOTICE', 'SANCTION_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "RemediationActionItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DsrType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION');

-- CreateEnum
CREATE TYPE "DsrStatus" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'AWAITING_REQUESTER', 'IDENTITY_VERIFIED', 'IN_PROGRESS', 'RESPONDED', 'PARTIALLY_FULFILLED', 'REJECTED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DsrDeadlineProfile" AS ENUM ('STANDARD_30D', 'EXTENDED_90D', 'HEALTH_8D', 'HEALTH_OLD_60D');

-- CreateEnum
CREATE TYPE "DsrRejectionReason" AS ENUM ('MANIFESTLY_UNFOUNDED', 'EXCESSIVE', 'IDENTITY_UNVERIFIABLE', 'REPEAT_NO_NEW_INFO', 'LEGAL_BASIS_OVERRIDE');

-- CreateEnum
CREATE TYPE "DsrPauseReason" AS ENUM ('IDENTITY_VERIFICATION', 'SCOPE_CLARIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TreatmentProcessingActionTaken" AS ENUM ('NONE', 'ACCESS_EXPORT', 'RECTIFIED', 'DELETED', 'RESTRICTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "VendorPropagationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PROPAGATED', 'REFUSED');

-- CreateEnum
CREATE TYPE "RequesterCommunicationKind" AS ENUM ('ACKNOWLEDGEMENT', 'EXTENSION_NOTICE', 'CLARIFICATION_REQUEST', 'RESPONSE', 'REJECTION', 'WITHDRAWAL_CONFIRMATION');

-- CreateEnum
CREATE TYPE "RequesterCommunicationChannel" AS ENUM ('EMAIL', 'POSTAL', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('VIOLATION', 'DSR');

-- CreateEnum
CREATE TYPE "CommentVisibility" AS ENUM ('INTERNAL', 'AUDITOR_VISIBLE');

-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('EVIDENCE', 'CNIL_FILING', 'PERSONS_NOTIFICATION', 'REQUESTER_ID', 'RESPONSE_EXPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DecisionKind" AS ENUM ('DISMISS_BREACH', 'NOTIFY_CNIL', 'WAIVE_PERSONS_NOTIFICATION', 'EXTEND_DSR_DEADLINE', 'REJECT_DSR', 'CLOSE_DSR_PARTIAL', 'REOPEN', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventKind" AS ENUM ('STATUS_CHANGE', 'COMMENT', 'RISK_ASSESSMENT_RECORDED', 'ATTACHMENT_ADDED', 'DECISION', 'NOTIFICATION_SENT', 'ASSIGNMENT', 'REMINDER_SENT', 'INTERACTION_LOGGED', 'PAUSE_STARTED', 'PAUSE_ENDED', 'MIGRATION');

-- CreateEnum
CREATE TYPE "ContentRevisionField" AS ENUM ('CNIL_FILING_DRAFT', 'PERSONS_NOTIFICATION_BODY', 'REQUESTER_RESPONSE', 'REJECTION_LETTER', 'DSR_RESPONSE_NOTES', 'VIOLATION_NARRATIVE');

-- CreateEnum
CREATE TYPE "LinkedEntity" AS ENUM ('TREATMENT', 'VIOLATION', 'CHECKLIST_ITEM');

-- CreateEnum
CREATE TYPE "DpaStatus" AS ENUM ('MISSING', 'DRAFT', 'SENT', 'SIGNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VendorAssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AUDITOR',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "companyName" TEXT,
    "siren" TEXT,
    "address" TEXT,
    "representativeName" TEXT,
    "representativeRole" TEXT,
    "dpoName" TEXT,
    "dpoEmail" TEXT,
    "dpoPhone" TEXT,
    "freshnessThresholdMonths" INTEGER NOT NULL DEFAULT 6,
    "reviewCycleMonths" INTEGER NOT NULL DEFAULT 12,
    "annualTurnover" BIGINT,
    "enforceSeparationOfDuties" BOOLEAN NOT NULL DEFAULT true,
    "notifyDsrDeadline" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorDpaExpiry" BOOLEAN NOT NULL DEFAULT true,
    "notifyTreatmentReview" BOOLEAN NOT NULL DEFAULT true,
    "notifyViolation72h" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "refNumber" INTEGER,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "subPurposes" TEXT[],
    "legalBasis" TEXT,
    "personCategories" TEXT[],
    "dataCategories" JSONB,
    "hasSensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "sensitiveCategories" TEXT[],
    "recipientTypes" TEXT[],
    "recipients" JSONB,
    "transfers" JSONB,
    "retentionPeriod" TEXT,
    "securityMeasures" TEXT[],
    "securityMeasuresDetailed" JSONB,
    "hasEvaluationScoring" BOOLEAN NOT NULL DEFAULT false,
    "hasAutomatedDecisions" BOOLEAN NOT NULL DEFAULT false,
    "hasSystematicMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "isLargeScale" BOOLEAN NOT NULL DEFAULT false,
    "hasCrossDatasetLinking" BOOLEAN NOT NULL DEFAULT false,
    "involvesVulnerablePersons" BOOLEAN NOT NULL DEFAULT false,
    "usesInnovativeTech" BOOLEAN NOT NULL DEFAULT false,
    "canExcludeFromRights" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "status" "TreatmentStatus" NOT NULL DEFAULT 'DRAFT',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_responses" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "response" "ChecklistAnswer" NOT NULL,
    "reason" TEXT,
    "actionPlan" TEXT,
    "assignedTo" TEXT,
    "deadline" TIMESTAMP(3),
    "priority" "Priority",
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "respondedBy" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL,
    "remediation" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'RECEIVED',
    "assignedTo" TEXT,
    "dataCategories" TEXT[],
    "estimatedRecords" INTEGER,
    "crossBorder" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closureReason" TEXT,
    "lessonsLearned" TEXT,
    "occurredAt" TIMESTAMP(3),
    "awarenessAt" TIMESTAMP(3) NOT NULL,
    "breachCategories" "BreachCategory"[],
    "dismissalReason" TEXT,
    "delayJustification" TEXT,
    "personsNotificationWaiver" "WaiverGround",
    "waiverJustification" TEXT,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "hash" TEXT NOT NULL DEFAULT '',
    "previousHash" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_risk_assessments" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "likelihood" "RiskLikelihood" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "computedRiskLevel" "RiskSeverity" NOT NULL,
    "affectedDataCategories" TEXT[],
    "estimatedSubjectCount" INTEGER,
    "estimatedRecordCount" INTEGER,
    "crossBorder" BOOLEAN NOT NULL DEFAULT false,
    "potentialConsequences" TEXT NOT NULL,
    "mitigatingFactors" TEXT,
    "assessedBy" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesId" TEXT,

    CONSTRAINT "breach_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_notification_filings" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "phase" "NotificationFilingPhase" NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL,
    "regulator" TEXT NOT NULL DEFAULT 'CNIL',
    "referenceNumber" TEXT,
    "channel" "NotificationFilingChannel" NOT NULL,
    "filedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breach_notification_filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons_notifications" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "method" "PersonsNotificationMethod" NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL,
    "recipientScope" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulator_interactions" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "direction" "RegulatorInteractionDirection" NOT NULL,
    "kind" "RegulatorInteractionKind" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "regulator" TEXT NOT NULL DEFAULT 'CNIL',
    "referenceNumber" TEXT,
    "summary" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulator_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_action_items" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),
    "doneBy" TEXT,
    "status" "RemediationActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remediation_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_timeline" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" "TimelineEventKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_comments" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "CommentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "follow_up_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_attachments" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "sha256" TEXT NOT NULL,
    "previousSha256" TEXT,
    "category" "AttachmentCategory" NOT NULL DEFAULT 'OTHER',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededByAttachmentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,

    CONSTRAINT "follow_up_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_decisions" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" "DecisionKind" NOT NULL,
    "outcome" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "inputsSnapshot" JSONB NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededByDecisionId" TEXT,

    CONSTRAINT "follow_up_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_content_revisions" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" "ContentRevisionField" NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_recitals" (
    "id" SERIAL NOT NULL,
    "recitalNumber" INTEGER NOT NULL,
    "contentFr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "contentEs" TEXT NOT NULL,
    "contentDe" TEXT NOT NULL,
    "contentIt" TEXT NOT NULL,

    CONSTRAINT "regulation_recitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_articles" (
    "id" SERIAL NOT NULL,
    "articleNumber" INTEGER NOT NULL,
    "chapter" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "contentFr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "contentEs" TEXT NOT NULL,
    "contentDe" TEXT NOT NULL,
    "contentIt" TEXT NOT NULL,

    CONSTRAINT "regulation_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "type" "DsrType" NOT NULL,
    "status" "DsrStatus" NOT NULL DEFAULT 'RECEIVED',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterDetails" TEXT,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityNotes" TEXT,
    "description" TEXT,
    "affectedSystems" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "extensionReason" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "deadlineProfile" "DsrDeadlineProfile" NOT NULL DEFAULT 'STANDARD_30D',
    "extensionNotifiedAt" TIMESTAMP(3),
    "rejectionReason" "DsrRejectionReason",
    "rejectionDetails" TEXT,
    "recourseInformedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnReason" TEXT,
    "partialFulfilmentNotes" TEXT,
    "feeApplied" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" DECIMAL(65,30),
    "responseNotes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closureReason" TEXT,
    "createdBy" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsr_pause_intervals" (
    "id" TEXT NOT NULL,
    "dsrId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL,
    "resumedAt" TIMESTAMP(3),
    "reason" "DsrPauseReason" NOT NULL,
    "reasonDetails" TEXT,
    "startedBy" TEXT NOT NULL,

    CONSTRAINT "dsr_pause_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsr_treatment_processing_logs" (
    "dsrId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3),
    "findingsSummary" TEXT,
    "actionTaken" "TreatmentProcessingActionTaken" NOT NULL DEFAULT 'NONE',
    "actionTakenAt" TIMESTAMP(3),
    "performedBy" TEXT,
    "vendorPropagationStatus" "VendorPropagationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsr_treatment_processing_logs_pkey" PRIMARY KEY ("dsrId","treatmentId")
);

-- CreateTable
CREATE TABLE "requester_communications" (
    "id" TEXT NOT NULL,
    "dsrId" TEXT NOT NULL,
    "kind" "RequesterCommunicationKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "channel" "RequesterCommunicationChannel" NOT NULL,
    "contentRevisionId" TEXT,
    "sentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requester_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_treatments" (
    "violationId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,

    CONSTRAINT "violation_treatments_pkey" PRIMARY KEY ("violationId","treatmentId")
);

-- CreateTable
CREATE TABLE "compliance_snapshots" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "checklistScore" INTEGER NOT NULL,
    "freshnessScore" INTEGER NOT NULL,
    "violationScore" INTEGER NOT NULL,
    "treatmentsTotal" INTEGER NOT NULL,
    "treatmentsValidated" INTEGER NOT NULL,
    "checklistCompleted" INTEGER NOT NULL,
    "checklistTotal" INTEGER NOT NULL,
    "openViolations" INTEGER NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "linkedEntity" "LinkedEntity" NOT NULL,
    "linkedEntityId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "country" TEXT,
    "dpaStatus" "DpaStatus" NOT NULL DEFAULT 'MISSING',
    "dpaSigned" TIMESTAMP(3),
    "dpaExpiry" TIMESTAMP(3),
    "dpaDocumentId" TEXT,
    "isSubProcessor" BOOLEAN NOT NULL DEFAULT false,
    "parentVendorId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTreatment" (
    "vendorId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,

    CONSTRAINT "VendorTreatment_pkey" PRIMARY KEY ("vendorId","treatmentId")
);

-- CreateTable
CREATE TABLE "vendor_assessments" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "VendorAssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rss_feeds" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rss_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_updates" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "impactLevel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "treatmentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "leadTime" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "treatments_refNumber_key" ON "treatments"("refNumber");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_responses_itemId_key" ON "checklist_responses"("itemId");

-- CreateIndex
CREATE INDEX "breach_risk_assessments_violationId_idx" ON "breach_risk_assessments"("violationId");

-- CreateIndex
CREATE INDEX "breach_notification_filings_violationId_idx" ON "breach_notification_filings"("violationId");

-- CreateIndex
CREATE INDEX "persons_notifications_violationId_idx" ON "persons_notifications"("violationId");

-- CreateIndex
CREATE INDEX "regulator_interactions_violationId_idx" ON "regulator_interactions"("violationId");

-- CreateIndex
CREATE INDEX "remediation_action_items_violationId_idx" ON "remediation_action_items"("violationId");

-- CreateIndex
CREATE INDEX "follow_up_timeline_entity_performedAt_idx" ON "follow_up_timeline"("entityType", "entityId", "performedAt" DESC);

-- CreateIndex
CREATE INDEX "follow_up_timeline_entityType_entityId_idx" ON "follow_up_timeline"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "follow_up_comments_entityType_entityId_idx" ON "follow_up_comments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "follow_up_attachments_entityType_entityId_idx" ON "follow_up_attachments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "follow_up_decisions_entityType_entityId_idx" ON "follow_up_decisions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "follow_up_content_revisions_entity_idx" ON "follow_up_content_revisions"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_content_revisions_entity_field_version_key" ON "follow_up_content_revisions"("entityType", "entityId", "field", "version");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_recitals_recitalNumber_key" ON "regulation_recitals"("recitalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_articles_articleNumber_key" ON "regulation_articles"("articleNumber");

-- CreateIndex
CREATE INDEX "dsr_pause_intervals_dsrId_idx" ON "dsr_pause_intervals"("dsrId");

-- CreateIndex
CREATE INDEX "requester_communications_dsrId_idx" ON "requester_communications"("dsrId");

-- CreateIndex
CREATE UNIQUE INDEX "rss_feeds_url_key" ON "rss_feeds"("url");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_updates_guid_key" ON "regulatory_updates"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "screenings_treatmentId_key" ON "screenings"("treatmentId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "notification_log_kind_sentAt_idx" ON "notification_log"("kind", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_kind_recordId_leadTime_key" ON "notification_log"("kind", "recordId", "leadTime");

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_respondedBy_fkey" FOREIGN KEY ("respondedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_risk_assessments" ADD CONSTRAINT "breach_risk_assessments_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_risk_assessments" ADD CONSTRAINT "breach_risk_assessments_assessedBy_fkey" FOREIGN KEY ("assessedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_risk_assessments" ADD CONSTRAINT "breach_risk_assessments_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "breach_risk_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notification_filings" ADD CONSTRAINT "breach_notification_filings_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notification_filings" ADD CONSTRAINT "breach_notification_filings_filedBy_fkey" FOREIGN KEY ("filedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons_notifications" ADD CONSTRAINT "persons_notifications_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons_notifications" ADD CONSTRAINT "persons_notifications_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulator_interactions" ADD CONSTRAINT "regulator_interactions_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulator_interactions" ADD CONSTRAINT "regulator_interactions_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_action_items" ADD CONSTRAINT "remediation_action_items_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_action_items" ADD CONSTRAINT "remediation_action_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_action_items" ADD CONSTRAINT "remediation_action_items_doneBy_fkey" FOREIGN KEY ("doneBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_comments" ADD CONSTRAINT "follow_up_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_supersededByAttachmentId_fkey" FOREIGN KEY ("supersededByAttachmentId") REFERENCES "follow_up_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_decisions" ADD CONSTRAINT "follow_up_decisions_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_decisions" ADD CONSTRAINT "follow_up_decisions_supersededByDecisionId_fkey" FOREIGN KEY ("supersededByDecisionId") REFERENCES "follow_up_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_content_revisions" ADD CONSTRAINT "follow_up_content_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_pause_intervals" ADD CONSTRAINT "dsr_pause_intervals_dsrId_fkey" FOREIGN KEY ("dsrId") REFERENCES "data_subject_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_pause_intervals" ADD CONSTRAINT "dsr_pause_intervals_startedBy_fkey" FOREIGN KEY ("startedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_treatment_processing_logs" ADD CONSTRAINT "dsr_treatment_processing_logs_dsrId_fkey" FOREIGN KEY ("dsrId") REFERENCES "data_subject_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_treatment_processing_logs" ADD CONSTRAINT "dsr_treatment_processing_logs_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_treatment_processing_logs" ADD CONSTRAINT "dsr_treatment_processing_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requester_communications" ADD CONSTRAINT "requester_communications_dsrId_fkey" FOREIGN KEY ("dsrId") REFERENCES "data_subject_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requester_communications" ADD CONSTRAINT "requester_communications_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requester_communications" ADD CONSTRAINT "requester_communications_contentRevisionId_fkey" FOREIGN KEY ("contentRevisionId") REFERENCES "follow_up_content_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_treatments" ADD CONSTRAINT "violation_treatments_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_treatments" ADD CONSTRAINT "violation_treatments_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_parentVendorId_fkey" FOREIGN KEY ("parentVendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTreatment" ADD CONSTRAINT "VendorTreatment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTreatment" ADD CONSTRAINT "VendorTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessments" ADD CONSTRAINT "vendor_assessments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessments" ADD CONSTRAINT "vendor_assessments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessments" ADD CONSTRAINT "vendor_assessments_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_updates" ADD CONSTRAINT "regulatory_updates_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "rss_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
