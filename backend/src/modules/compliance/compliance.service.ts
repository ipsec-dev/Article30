import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VALID_CHECKLIST_ITEM_IDS, Severity } from '@article30/shared';
import { ViolationStatus } from '@prisma/client';
import { runWithJobContext } from '../../common/logging/request-context';
import { PrismaService } from '../../prisma/prisma.service';

const SEVERITY_PENALTY: Record<string, number> = {
  [Severity.MEDIUM]: 5,
  [Severity.HIGH]: 10,
  [Severity.CRITICAL]: 15,
};

/**
 * Violation lifecycle states whose penalties no longer apply to the live score.
 * REMEDIATED and CLOSED both represent "no active risk" — keeping them in the
 * formula would let a single old incident drag the score down forever.
 */
const RESOLVED_VIOLATION_STATUSES: ViolationStatus[] = ['REMEDIATED', 'CLOSED'];

const CHECKLIST_WEIGHT = 0.4;
const FRESHNESS_WEIGHT = 0.4;
const VIOLATIONS_WEIGHT = 0.2;
const PARTIAL_CREDIT = 0.5;
const PERCENTAGE_MULTIPLIER = 100;
const MAX_VIOLATION_SCORE = 100;
const GDPR_FINE_RATE = 0.04;
const GDPR_FINE_MINIMUM = 20_000_000;

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeScore() {
    const [checklistResponses, treatments, violations] = await Promise.all([
      this.prisma.checklistResponse.findMany(),
      this.prisma.treatment.findMany({ select: { status: true } }),
      this.prisma.violation.findMany({
        where: { status: { notIn: RESOLVED_VIOLATION_STATUSES } },
        select: { severity: true },
      }),
    ]);

    const { checklistScore, compliantCount, total } =
      this.computeChecklistScore(checklistResponses);
    const { freshnessScore, validatedTreatments, totalTreatments } =
      this.computeFreshnessScore(treatments);
    const { violationScore, penalties, openByLevel } = this.computeViolationScore(violations);

    const hasData = checklistResponses.length > 0 || treatments.length > 0 || violations.length > 0;
    let score: number;
    if (hasData) {
      score = Math.round(
        checklistScore * CHECKLIST_WEIGHT +
          freshnessScore * FRESHNESS_WEIGHT +
          violationScore * VIOLATIONS_WEIGHT,
      );
    } else {
      score = 0;
    }

    return {
      score,
      breakdown: {
        checklist: {
          score: checklistScore,
          weight: CHECKLIST_WEIGHT,
          answered: compliantCount,
          total,
        },
        freshness: {
          score: freshnessScore,
          weight: FRESHNESS_WEIGHT,
          validated: validatedTreatments,
          total: totalTreatments,
        },
        violations: {
          score: violationScore,
          weight: VIOLATIONS_WEIGHT,
          penalties,
          openByLevel,
        },
      },
    };
  }

  private computeChecklistScore(checklistResponses: { response: string; reason: string | null }[]) {
    const total = VALID_CHECKLIST_ITEM_IDS.length;
    let compliantCount = 0;
    for (const r of checklistResponses) {
      if (r.response === 'YES') {
        compliantCount += 1;
      } else if (r.response === 'NA' && r.reason) {
        compliantCount += 1;
      } else if (r.response === 'PARTIAL') {
        compliantCount += PARTIAL_CREDIT;
      } else {
        // NO, or NA without reason — no credit
      }
    }
    let checklistScore: number;
    if (total > 0) {
      checklistScore = (compliantCount / total) * PERCENTAGE_MULTIPLIER;
    } else {
      checklistScore = 0;
    }
    return { checklistScore, compliantCount, total };
  }

  private computeFreshnessScore(treatments: { status: string }[]) {
    const totalTreatments = treatments.length;
    const validatedTreatments = treatments.filter(t => t.status === 'VALIDATED').length;
    let freshnessScore: number;
    if (totalTreatments === 0) {
      // No treatments registered → don't penalise the band. Mirrors the
      // violations sub-score which defaults to 100 when nothing is open.
      // Without this default, an org with a perfect checklist and zero
      // incidents was capped at 60% just for not having logged a register
      // entry yet.
      freshnessScore = PERCENTAGE_MULTIPLIER;
    } else {
      freshnessScore = (validatedTreatments / totalTreatments) * PERCENTAGE_MULTIPLIER;
    }
    return { freshnessScore, validatedTreatments, totalTreatments };
  }

  private computeViolationScore(violations: { severity: string }[]) {
    const openByLevel: Record<string, number> = {
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    let penalties = 0;
    for (const v of violations) {
      const penalty = SEVERITY_PENALTY[v.severity] ?? 0;
      if (penalty > 0) {
        openByLevel[v.severity] = (openByLevel[v.severity] ?? 0) + 1;
        penalties += penalty;
      }
    }
    const violationScore = Math.max(0, MAX_VIOLATION_SCORE - penalties);
    return { violationScore, penalties, openByLevel };
  }

  async createSnapshot() {
    const result = await this.computeScore();
    const snapshot = await this.prisma.complianceSnapshot.create({
      data: {
        score: result.score,
        checklistScore: Math.round(result.breakdown.checklist.score),
        freshnessScore: Math.round(result.breakdown.freshness.score),
        violationScore: Math.round(result.breakdown.violations.score),
        treatmentsTotal: result.breakdown.freshness.total,
        treatmentsValidated: result.breakdown.freshness.validated,
        checklistCompleted: result.breakdown.checklist.answered,
        checklistTotal: result.breakdown.checklist.total,
        openViolations:
          result.breakdown.violations.openByLevel.MEDIUM +
          result.breakdown.violations.openByLevel.HIGH +
          result.breakdown.violations.openByLevel.CRITICAL,
        snapshotDate: new Date(),
      },
    });
    this.logger.log({ event: 'compliance.snapshot.created', score: result.score });
    return snapshot;
  }

  async getSnapshots() {
    return this.prisma.complianceSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' },
    });
  }

  async computeFineExposure() {
    const org = await this.prisma.organization.findFirst();
    const { score } = await this.computeScore();

    if (!org?.annualTurnover) {
      return {
        annualTurnover: null,
        maxFine: null,
        estimatedExposure: null,
        complianceScore: score,
      };
    }

    const turnover = Number(org.annualTurnover);
    const fourPercent = Math.round(turnover * GDPR_FINE_RATE);
    const maxFine = Math.max(fourPercent, GDPR_FINE_MINIMUM);
    const estimatedExposure = Math.round(maxFine * (1 - score / PERCENTAGE_MULTIPLIER));

    return {
      maxFine,
      estimatedExposure,
      annualTurnover: turnover,
      complianceScore: score,
    };
  }

  @Cron('0 0 1 * *')
  async handleMonthlyCron() {
    await runWithJobContext({ jobName: 'compliance-snapshot' }, async () => {
      this.logger.debug({ event: 'compliance.snapshot.scheduled' });
      await this.createSnapshot();
      // compliance.snapshot.created is emitted inside createSnapshot() — don't double-log
    });
  }
}
