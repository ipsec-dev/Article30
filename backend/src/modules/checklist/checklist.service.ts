import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { VALID_CHECKLIST_ITEM_IDS } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { UpsertResponseDto } from './dto/upsert-response.dto';

const REVIEW_INTERVAL_MONTHS = 12;

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.checklistResponse.findMany({
      orderBy: { itemId: 'asc' },
      include: {
        responder: { select: PRISMA_SELECT.userRef },
        assignee: { select: PRISMA_SELECT.userRef },
      },
    });
  }

  async upsert(itemId: string, dto: UpsertResponseDto, userId: string) {
    if (!(VALID_CHECKLIST_ITEM_IDS as readonly string[]).includes(itemId)) {
      throw new BadRequestException('Unknown checklist item');
    }

    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setMonth(nextReview.getMonth() + REVIEW_INTERVAL_MONTHS);

    let deadline: Date | null = null;
    if (dto.deadline) {
      deadline = new Date(dto.deadline);
    }

    const data = {
      deadline,
      response: dto.response,
      reason: dto.reason ?? null,
      actionPlan: dto.actionPlan ?? null,
      assignedTo: dto.assignedTo ?? null,
      priority: dto.priority ?? null,
      lastReviewedAt: now,
      nextReviewAt: nextReview,
    };

    this.logger.log({
      event: 'checklist.response.recorded',
      response: dto.response,
      itemId,
      userId,
    });
    return this.prisma.checklistResponse.upsert({
      where: { itemId },
      create: {
        itemId,
        ...data,
        respondedBy: userId,
      },
      update: {
        ...data,
        respondedBy: userId,
        respondedAt: now,
      },
    });
  }
}
