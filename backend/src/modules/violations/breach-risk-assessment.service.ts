import { Injectable } from '@nestjs/common';
import { Prisma, RiskLikelihood, RiskSeverity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { acquireXactLock } from '../../common/pg-locks';
import { EntityValidator } from '../follow-up/entity-validator';
import { TimelineService } from '../follow-up/timeline.service';

export interface CreateRiskAssessmentInput {
  violationId: string;
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  affectedDataCategories: string[];
  estimatedSubjectCount?: number;
  estimatedRecordCount?: number;
  crossBorder: boolean;
  potentialConsequences: string;
  mitigatingFactors?: string;
  assessedBy: string;
}

const RISK_RANK: Record<RiskLikelihood, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function computeRiskLevel(likelihood: RiskLikelihood, severity: RiskSeverity): RiskSeverity {
  return RISK_RANK[likelihood] >= RISK_RANK[severity]
    ? (likelihood as unknown as RiskSeverity)
    : severity;
}

@Injectable()
export class BreachRiskAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
  ) {}

  async create(input: CreateRiskAssessmentInput) {
    await this.entityValidator.validate('VIOLATION', input.violationId);

    const computedRiskLevel = computeRiskLevel(input.likelihood, input.severity);

    return this.prisma.$transaction(async tx => {
      // Serialize concurrent creates so the supersession chain stays linear.
      await acquireXactLock(tx, 'risk-assessment', input.violationId);

      // Find current head (non-superseded latest assessment).
      const previous = await tx.breachRiskAssessment.findFirst({
        where: { violationId: input.violationId },
        orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, supersedesId: true },
      });
      const supersedesId = previous?.id ?? null;

      const assessment = await tx.breachRiskAssessment.create({
        data: {
          violationId: input.violationId,
          likelihood: input.likelihood,
          severity: input.severity,
          computedRiskLevel,
          affectedDataCategories: input.affectedDataCategories,
          estimatedSubjectCount: input.estimatedSubjectCount,
          estimatedRecordCount: input.estimatedRecordCount,
          crossBorder: input.crossBorder,
          potentialConsequences: input.potentialConsequences,
          mitigatingFactors: input.mitigatingFactors,
          assessedBy: input.assessedBy,
          supersedesId,
        },
      });

      await tx.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'RISK_ASSESSMENT_RECORDED',
          payload: {
            riskAssessmentId: assessment.id,
            likelihood: assessment.likelihood,
            severity: assessment.severity,
            computedRiskLevel: assessment.computedRiskLevel,
          } as Prisma.InputJsonValue,
          performedBy: input.assessedBy,
        },
      });

      return assessment;
    });
  }

  async current(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.breachRiskAssessment.findFirst({
      where: { violationId },
      orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async history(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.breachRiskAssessment.findMany({
      where: { violationId },
      orderBy: [{ assessedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
