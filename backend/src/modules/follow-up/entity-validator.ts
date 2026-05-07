import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntityValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Throws NotFoundException if (entityType, entityId) does not resolve to a real
   * entity row. Returns void on success.
   *
   * Single-tenant: there's exactly one organization, so existence is the whole
   * check. The polymorphic FK semantics still need defending — the entityType
   * has to match the table the entityId actually lives in.
   */
  async validate(entityType: EntityType, entityId: string): Promise<void> {
    const exists = await this.findEntity(entityType, entityId);
    if (!exists) {
      throw new NotFoundException(`${entityType} ${entityId} not found`);
    }
  }

  private async findEntity(entityType: EntityType, entityId: string) {
    if (entityType === 'VIOLATION') {
      return this.prisma.violation.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
    }
    if (entityType === 'DSR') {
      return this.prisma.dataSubjectRequest.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
    }
    // Exhaustiveness guard: when EntityType grows (M2/M3 may add TREATMENT
    // or VENDOR), this throws instead of silently returning null and producing
    // a misleading "not found" error.
    const _exhaustive: never = entityType;
    throw new Error(`Unsupported entity type: ${String(_exhaustive)}`);
  }
}
