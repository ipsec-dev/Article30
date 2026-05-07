import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, VendorAssessment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { VENDOR_ASSESSMENT_QUESTIONS } from '@article30/shared';
import { NotificationService } from '../notifications/notification.service';
import { loadNotificationContext } from '../notifications/notification-context';
import { formatDateLocale, shortRef } from '../notifications/format';
import { resolveRecipientLocale } from '../notifications/locale-resolver';

interface AnswerEntry {
  questionId: string;
  answer: 'YES' | 'PARTIAL' | 'NO' | 'NA';
  notes?: string;
}

const INCLUDE_RELATIONS = {
  creator: { select: PRISMA_SELECT.userRef },
  reviewer: { select: PRISMA_SELECT.userRef },
} as const;

const PARTIAL_WEIGHT_DIVISOR = 2;
const PERCENT_MULTIPLIER = 100;
const ASSESSMENT_NOT_FOUND = 'Assessment not found';

@Injectable()
export class VendorAssessmentsService {
  private readonly logger = new Logger(VendorAssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async findByVendor(vendorId: string) {
    return this.prisma.vendorAssessment.findFirst({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_RELATIONS,
    });
  }

  async create(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const assessment = await this.prisma.vendorAssessment.create({
      data: {
        vendorId,
        createdBy: userId,
        status: 'PENDING',
        answers: [],
      },
      include: INCLUDE_RELATIONS,
    });

    this.logger.log({
      event: 'vendor.assessment.created',
      assessmentId: assessment.id,
      vendorId,
      userId,
    });
    return assessment;
  }

  async update(id: string, answers: AnswerEntry[]) {
    const assessment = await this.prisma.vendorAssessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new NotFoundException(ASSESSMENT_NOT_FOUND);
    }
    if (assessment.status === 'APPROVED' || assessment.status === 'REJECTED') {
      throw new ForbiddenException('Cannot update a reviewed assessment');
    }

    const score = this.computeScore(answers);

    return this.prisma.vendorAssessment.update({
      where: { id },
      data: {
        score,
        answers: answers as unknown as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async submit(id: string) {
    const assessment = await this.prisma.vendorAssessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new NotFoundException(ASSESSMENT_NOT_FOUND);
    }
    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
      throw new ForbiddenException('Assessment cannot be submitted in current status');
    }

    const updated = await this.prisma.vendorAssessment.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: { ...INCLUDE_RELATIONS, vendor: { select: { name: true } } },
    });

    this.logger.log({ event: 'vendor.assessment.submitted', assessmentId: id });

    await this.emitQuestionnaireReturnedNotification(updated);

    return updated;
  }

  private async emitQuestionnaireReturnedNotification(
    assessment: VendorAssessment & { vendor: { name: string } },
  ): Promise<void> {
    // Instant-notification side-effects must never fail the user-facing
    // operation: the assessment row is already persisted when we get here.
    // Vendors have no assignee — recipient is always the org DPO.
    // submittedDate uses the row's Prisma-managed updatedAt (set atomically by
    // the SUBMIT update) so the displayed date matches the persisted timestamp.
    try {
      const { org } = await loadNotificationContext(this.prisma, null);
      const locale = resolveRecipientLocale(org?.locale ?? null);
      await this.notifications.notify({
        kind: 'vendor.questionnaire-returned',
        recordId: assessment.vendorId,
        assigneeEmail: null,
        orgDpoEmail: org?.dpoEmail ?? null,
        orgLocale: org?.locale ?? 'fr',
        orgCompanyName: org?.companyName ?? '',
        recipientRole: 'dpo',
        context: {
          recipientFirstName: org?.dpoName ?? '',
          vendorName: assessment.vendor.name,
          submittedDate: formatDateLocale(assessment.updatedAt, locale),
          shortRef: shortRef('VEN', assessment.vendorId),
          recordUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/vendors/${assessment.vendorId}`,
        },
      });
    } catch (err) {
      this.logger.error({
        event: 'notification.failed',
        kind: 'vendor.questionnaire-returned',
        recordId: assessment.vendorId,
        err,
      });
    }
  }

  async review(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes: string | undefined,
    userId: string,
  ) {
    const assessment = await this.prisma.vendorAssessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new NotFoundException(ASSESSMENT_NOT_FOUND);
    }
    if (assessment.status !== 'SUBMITTED') {
      throw new ForbiddenException('Only submitted assessments can be reviewed');
    }

    const updated = await this.prisma.vendorAssessment.update({
      where: { id },
      data: {
        status,
        reviewNotes: reviewNotes ?? null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: INCLUDE_RELATIONS,
    });

    this.logger.log({ event: 'vendor.assessment.reviewed', assessmentId: id, status, userId });
    return updated;
  }

  computeScore(answers: AnswerEntry[]): number {
    let earned = 0;
    let applicable = 0;

    const applicableQuestions = VENDOR_ASSESSMENT_QUESTIONS.filter(q => {
      const answer = answers.find(a => a.questionId === q.id);
      return answer && answer.answer !== 'NA';
    });

    for (const q of applicableQuestions) {
      const answer = answers.find(a => a.questionId === q.id);
      applicable += q.weight;
      if (answer?.answer === 'YES') {
        earned += q.weight;
      } else if (answer?.answer === 'PARTIAL') {
        earned += q.weight / PARTIAL_WEIGHT_DIVISOR;
      } else {
        // NO answer — no credit
      }
    }

    if (applicable === 0) {
      return 0;
    }
    return Math.round((earned / applicable) * PERCENT_MULTIPLIER);
  }
}
