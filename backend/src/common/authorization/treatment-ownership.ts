import type { Prisma } from '@prisma/client';
import { Role } from '@article30/shared';
import type { RequestUser } from '../types/request-user';

type TreatmentOwnershipFields = {
  createdBy: string;
  assignedTo: string | null;
};

export function isProcessOwner(user: RequestUser | undefined): boolean {
  return user?.role === Role.PROCESS_OWNER;
}

export function treatmentOwnershipWhere(userId: string): Prisma.TreatmentWhereInput {
  return { OR: [{ createdBy: userId }, { assignedTo: userId }] };
}

export function ownsTreatment(treatment: TreatmentOwnershipFields, userId: string): boolean {
  return treatment.createdBy === userId || treatment.assignedTo === userId;
}
