import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LinkedEntity, Role, DOCUMENT_READ_ROLES, FOLLOW_UP_READ_ROLES } from '@article30/shared';
import { EntityType } from '@prisma/client';
import type { Document, FollowUpAttachment } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/request-user';
import { ownsTreatment, treatmentOwnershipWhere, isProcessOwner } from './treatment-ownership';

function ensureRole(
  user: RequestUser | undefined,
  allowed: readonly Role[],
): asserts user is RequestUser {
  // RequestUser.role is the Prisma-generated Role type; allowed comes from
  // @article30/shared. Same string values, nominally different types - cast
  // through readonly string[] to bridge them without losing call-site safety.
  if (!user || !(allowed as readonly string[]).includes(user.role)) {
    throw new ForbiddenException();
  }
}

export async function assertCanReadDocument(
  user: RequestUser | undefined,
  document: Document,
  prisma: PrismaService,
): Promise<void> {
  ensureRole(user, DOCUMENT_READ_ROLES);
  if (!isProcessOwner(user)) return;

  switch (document.linkedEntity) {
    case LinkedEntity.TREATMENT: {
      const treatment = await prisma.treatment.findUnique({
        where: { id: document.linkedEntityId },
        select: { createdBy: true, assignedTo: true },
      });
      if (!treatment || !ownsTreatment(treatment, user.id)) {
        throw new NotFoundException();
      }
      return;
    }
    case LinkedEntity.VIOLATION: {
      const violation = await prisma.violation.findUnique({
        where: { id: document.linkedEntityId },
        select: { createdBy: true, assignedTo: true },
      });
      if (!violation) throw new NotFoundException();
      if (violation.createdBy === user.id || violation.assignedTo === user.id) return;
      const linked = await prisma.violationTreatment.findFirst({
        where: {
          violationId: document.linkedEntityId,
          treatment: treatmentOwnershipWhere(user.id),
        },
        select: { violationId: true },
      });
      if (!linked) throw new NotFoundException();
      return;
    }
    case LinkedEntity.CHECKLIST_ITEM:
      // Org-wide artefact - no per-user scoping beyond the role gate.
      return;
    default: {
      const _exhaustive: never = document.linkedEntity;
      throw new NotFoundException();
    }
  }
}

export async function assertCanReadFollowUpAttachment(
  user: RequestUser | undefined,
  attachment: FollowUpAttachment,
  prisma: PrismaService,
): Promise<void> {
  ensureRole(user, FOLLOW_UP_READ_ROLES);
  if (!isProcessOwner(user)) return;

  switch (attachment.entityType) {
    case EntityType.VIOLATION: {
      const violation = await prisma.violation.findUnique({
        where: { id: attachment.entityId },
        select: { createdBy: true, assignedTo: true },
      });
      if (!violation) throw new NotFoundException();
      if (violation.createdBy === user.id || violation.assignedTo === user.id) return;
      const linked = await prisma.violationTreatment.findFirst({
        where: { violationId: attachment.entityId, treatment: treatmentOwnershipWhere(user.id) },
        select: { violationId: true },
      });
      if (!linked) throw new NotFoundException();
      return;
    }
    case EntityType.DSR: {
      const linked = await prisma.dsrTreatmentProcessingLog.findFirst({
        where: { dsrId: attachment.entityId, treatment: treatmentOwnershipWhere(user.id) },
        select: { dsrId: true },
      });
      if (!linked) throw new NotFoundException();
      return;
    }
    default: {
      const _exhaustive: never = attachment.entityType;
      throw new NotFoundException();
    }
  }
}
