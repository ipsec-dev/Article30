import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { PdfExportService } from './pdf-export.service';
import type { PdfLocale } from '../../common/pdf/pdf-style';
import { TreatmentStatus } from '@article30/shared';
import { RequestUser } from '../../common/types/request-user';
import { computeIndicators, computeIndicatorsOrNull } from './indicators/treatment-indicators';
import { toCsv } from '../../common/utils/csv';
import {
  isProcessOwner,
  ownsTreatment,
  treatmentOwnershipWhere,
} from '../../common/authorization/treatment-ownership';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class TreatmentsService {
  private readonly logger = new Logger(TreatmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  async findAll(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, user?: RequestUser) {
    let where: Prisma.TreatmentWhereInput = {};
    if (isProcessOwner(user) && user) {
      where = treatmentOwnershipWhere(user.id);
    }

    const [treatments, total, org] = await Promise.all([
      this.prisma.treatment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { refNumber: 'asc' },
        include: { creator: { select: PRISMA_SELECT.userRef } },
      }),
      this.prisma.treatment.count({ where }),
      this.prisma.organization.findFirst(),
    ]);

    const data = treatments.map(t => ({ ...t, indicators: computeIndicatorsOrNull(t, org) }));

    return { data, total, page, limit };
  }

  async findOne(id: string, user?: RequestUser) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        validator: { select: PRISMA_SELECT.userRef },
      },
    });
    if (!treatment) {
      throw new NotFoundException('Treatment not found');
    }

    if (isProcessOwner(user) && user && !ownsTreatment(treatment, user.id)) {
      throw new ForbiddenException('You do not have access to this treatment');
    }

    const org = await this.prisma.organization.findFirst();
    return { ...treatment, indicators: computeIndicatorsOrNull(treatment, org) };
  }

  async create(dto: CreateTreatmentDto, userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    // No inner $transaction wrapper: callers either pass `tx` (bulk import takes a
    // pg_advisory_xact_lock to serialise refNumber allocation) or rely on the
    // unique constraint to surface the rare race on the single-row POST path.
    const max = await client.treatment.aggregate({ _max: { refNumber: true } });
    const refNumber = (max._max.refNumber ?? 0) + 1;

    const treatment = await client.treatment.create({
      data: this.buildCreateData(dto, refNumber, userId),
    });

    const org = await client.organization.findFirst();
    this.logger.log({
      event: 'treatment.created',
      treatmentId: treatment.id,
      refNumber: treatment.refNumber,
      userId,
    });
    return { ...treatment, indicators: computeIndicatorsOrNull(treatment, org) };
  }

  private buildCreateData(dto: CreateTreatmentDto, refNumber: number, userId: string) {
    return {
      refNumber,
      name: dto.name,
      purpose: dto.purpose,
      subPurposes: dto.subPurposes ?? [],
      legalBasis: dto.legalBasis,
      personCategories: dto.personCategories ?? [],
      dataCategories: (dto.dataCategories as unknown as Prisma.InputJsonValue) ?? undefined,
      hasSensitiveData: dto.hasSensitiveData,
      sensitiveCategories: dto.sensitiveCategories ?? [],
      recipientTypes: dto.recipientTypes ?? [],
      recipients: (dto.recipients as unknown as Prisma.InputJsonValue) ?? undefined,
      transfers: (dto.transfers as unknown as Prisma.InputJsonValue) ?? undefined,
      retentionPeriod: dto.retentionPeriod,
      securityMeasures: dto.securityMeasures ?? [],
      securityMeasuresDetailed:
        (dto.securityMeasuresDetailed as unknown as Prisma.InputJsonValue) ?? undefined,
      hasEvaluationScoring: dto.hasEvaluationScoring,
      hasAutomatedDecisions: dto.hasAutomatedDecisions,
      hasSystematicMonitoring: dto.hasSystematicMonitoring,
      isLargeScale: dto.isLargeScale,
      hasCrossDatasetLinking: dto.hasCrossDatasetLinking,
      involvesVulnerablePersons: dto.involvesVulnerablePersons,
      usesInnovativeTech: dto.usesInnovativeTech,
      canExcludeFromRights: dto.canExcludeFromRights,
      createdBy: userId,
      assignedTo: dto.assignedTo,
    };
  }

  async update(id: string, dto: UpdateTreatmentDto, user?: RequestUser) {
    await this.findOne(id, user);
    const data: Prisma.TreatmentUpdateInput = {};

    this.applyScalarFields(data, dto);
    this.applyJsonFields(data, dto);
    this.applyAssignee(data, dto);
    this.applyRiskFields(data, dto);

    this.logger.debug({ event: 'treatment.updated', treatmentId: id });
    const treatment = await this.prisma.treatment.update({ where: { id }, data });
    const org = await this.prisma.organization.findFirst();
    return { ...treatment, indicators: computeIndicatorsOrNull(treatment, org) };
  }

  private applyScalarFields(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    this.applyBasicScalarFields(data, dto);
    this.applyListScalarFields(data, dto);
  }

  private applyBasicScalarFields(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.purpose !== undefined) {
      data.purpose = dto.purpose;
    }
    if (dto.subPurposes !== undefined) {
      data.subPurposes = dto.subPurposes;
    }
    if (dto.legalBasis !== undefined) {
      data.legalBasis = dto.legalBasis;
    }
    if (dto.retentionPeriod !== undefined) {
      data.retentionPeriod = dto.retentionPeriod;
    }
  }

  private applyListScalarFields(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    if (dto.personCategories !== undefined) {
      data.personCategories = dto.personCategories;
    }
    if (dto.recipientTypes !== undefined) {
      data.recipientTypes = dto.recipientTypes;
    }
    if (dto.securityMeasures !== undefined) {
      data.securityMeasures = dto.securityMeasures;
    }
    if (dto.hasSensitiveData !== undefined) {
      data.hasSensitiveData = dto.hasSensitiveData;
    }
    if (dto.sensitiveCategories !== undefined) {
      data.sensitiveCategories = dto.sensitiveCategories;
    }
  }

  private applyJsonFields(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    if (dto.dataCategories !== undefined) {
      data.dataCategories = dto.dataCategories as unknown as Prisma.InputJsonValue;
    }
    if (dto.recipients !== undefined) {
      data.recipients = dto.recipients as unknown as Prisma.InputJsonValue;
    }
    if (dto.transfers !== undefined) {
      data.transfers = dto.transfers as unknown as Prisma.InputJsonValue;
    }
    if (dto.securityMeasuresDetailed !== undefined) {
      data.securityMeasuresDetailed =
        dto.securityMeasuresDetailed as unknown as Prisma.InputJsonValue;
    }
  }

  private applyAssignee(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo) {
        data.assignee = { connect: { id: dto.assignedTo } };
      } else {
        data.assignee = { disconnect: true };
      }
    }
  }

  private applyRiskFields(data: Prisma.TreatmentUpdateInput, dto: UpdateTreatmentDto): void {
    if (dto.hasEvaluationScoring !== undefined) {
      data.hasEvaluationScoring = dto.hasEvaluationScoring;
    }
    if (dto.hasAutomatedDecisions !== undefined) {
      data.hasAutomatedDecisions = dto.hasAutomatedDecisions;
    }
    if (dto.hasSystematicMonitoring !== undefined) {
      data.hasSystematicMonitoring = dto.hasSystematicMonitoring;
    }
    if (dto.isLargeScale !== undefined) {
      data.isLargeScale = dto.isLargeScale;
    }
    if (dto.hasCrossDatasetLinking !== undefined) {
      data.hasCrossDatasetLinking = dto.hasCrossDatasetLinking;
    }
    if (dto.involvesVulnerablePersons !== undefined) {
      data.involvesVulnerablePersons = dto.involvesVulnerablePersons;
    }
    if (dto.usesInnovativeTech !== undefined) {
      data.usesInnovativeTech = dto.usesInnovativeTech;
    }
    if (dto.canExcludeFromRights !== undefined) {
      data.canExcludeFromRights = dto.canExcludeFromRights;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    this.logger.log({ event: 'treatment.deleted', treatmentId: id });
    return this.prisma.treatment.delete({ where: { id } });
  }

  async validate(id: string, userId: string) {
    const treatment = await this.findOne(id);
    await this.assertSeparationOfDuties(treatment.createdBy, userId);
    if (treatment.status === TreatmentStatus.VALIDATED) {
      throw new ForbiddenException('Already validated');
    }
    this.logger.log({ event: 'treatment.validated', treatmentId: id, userId });
    return this.prisma.treatment.update({
      where: { id },
      data: {
        status: TreatmentStatus.VALIDATED,
        validatedBy: userId,
        validatedAt: new Date(),
      },
    });
  }

  async invalidate(id: string, userId: string) {
    const treatment = await this.findOne(id);
    await this.assertSeparationOfDuties(treatment.createdBy, userId);
    if (treatment.status === TreatmentStatus.DRAFT) {
      throw new ForbiddenException('Already in draft');
    }
    this.logger.log({ event: 'treatment.invalidated', treatmentId: id });
    return this.prisma.treatment.update({
      where: { id },
      data: {
        status: TreatmentStatus.DRAFT,
        validatedBy: null,
        validatedAt: null,
      },
    });
  }

  private async assertSeparationOfDuties(createdBy: string, userId: string): Promise<void> {
    if (createdBy !== userId) {
      return;
    }
    const org = await this.prisma.organization.findFirst({
      select: { enforceSeparationOfDuties: true },
    });
    // Default-safe: if no org row exists yet, behave as if the rule is on.
    if (org === null || org.enforceSeparationOfDuties) {
      throw new ForbiddenException('Cannot validate your own treatment (separation of duties)');
    }
  }

  async markReviewed(id: string) {
    const org = await this.prisma.organization.findFirst();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const nextReviewAt = new Date();
    nextReviewAt.setMonth(nextReviewAt.getMonth() + org.reviewCycleMonths);

    const treatment = await this.prisma.treatment.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        nextReviewAt,
      },
    });

    this.logger.debug({ event: 'treatment.reviewed', treatmentId: id });
    return {
      ...treatment,
      indicators: computeIndicators(treatment, org),
    };
  }

  async exportCsv() {
    const treatments = await this.prisma.treatment.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'Name',
      'Purpose',
      'Legal Basis',
      'Person Categories',
      'Data Categories',
      'Recipient Types',
      'Retention Period',
      'Security Measures',
      'Status',
      'Created At',
    ];

    const rows = treatments.map(t => [
      t.name,
      t.purpose ?? '',
      t.legalBasis ?? '',
      t.personCategories.join('; '),
      t.dataCategories ?? '',
      t.recipientTypes.join('; '),
      t.retentionPeriod ?? '',
      t.securityMeasures.join('; '),
      t.status,
      t.createdAt.toISOString(),
    ]);

    const csv = toCsv(headers, rows);
    this.logger.log({ event: 'treatment.export.csv', count: treatments.length });
    return csv;
  }

  async exportPdf(id: string, userId: string, locale: PdfLocale = 'fr'): Promise<Buffer> {
    const treatment = await this.findOne(id);
    const org = await this.prisma.organization.findFirst();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    this.logger.log({ event: 'treatment.export.pdf', treatmentId: id, locale });
    return this.pdfExportService.generatePdf(treatment, org, userId, locale);
  }
}
