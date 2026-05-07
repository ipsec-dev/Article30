import { Injectable } from '@nestjs/common';

import PDFDocument from 'pdfkit';
import { CHECKLIST_ITEMS, CHECKLIST_CATEGORIES, type ChecklistItemDef } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplianceService } from './compliance.service';
import {
  CHECKLIST_CATEGORY_LABELS,
  PDF_COLORS,
  PDF_FONT_BOLD,
  PDF_FONT_REGULAR,
  PDF_FONT_SIZES,
  PDF_LAYOUT,
  PDF_PAGE_MARGINS,
  TREATMENT_STATUS_LABELS,
  VIOLATION_STATUS_LABELS,
  drawCallout,
  drawDonut,
  drawFooterAllPages,
  drawHeader,
  drawScoreBar,
  drawSectionHeader,
  drawSeverityPill,
  drawTable,
  formatDate,
  formatHashSeal,
  registerArticle30Fonts,
  setPdfMetadata,
  type PdfLocale,
} from '../../common/pdf/pdf-style';
import { AuditLogService } from '../audit-log/audit-log.service';

const SPACING = {
  COVER_TOP: 6,
  SECTION_GAP: 2,
  PARAGRAPH: 0.5,
  ITEM: 0.3,
  COVER_BOTTOM: 8,
  COVER_AFTER_ORG: 1,
  COVER_AFTER_SCORE: 4,
};

const PERCENTAGE_MULTIPLIER = 100;
const SNAPSHOT_HISTORY_LIMIT = 12;
const SEVERITY_PILL_WIDTH = 70;

interface ReportStrings {
  metaSubject: string;
  headerTitle: string;
  headerEmittedOn: string;
  scoreCaption: string;
  sectionOrg: string;
  sectionScore: string;
  globalScore: string;
  pillarChecklist: string;
  pillarFreshness: string;
  pillarViolations: string;
  weight: string;
  itemsCompliant: string; // X/Y items
  treatmentsValidated: string; // X/Y treatments validated
  penaltyPoints: string; // X penalty points
  sectionFines: string;
  annualTurnover: string;
  maxFine: string;
  estimatedExposure: string;
  sectionHistory: string;
  snapshotsLabel: string;
  colDate: string;
  colGlobal: string;
  colChecklist: string;
  colFreshness: string;
  colViolations: string;
  sectionTreatments: string;
  treatmentsTotal: string;
  byStatus: string;
  treatmentsEmpty: string;
  colStatus: string;
  colCount: string;
  sectionViolations: string;
  noViolations: string;
  found: string; // "Found on"
  status: string; // "Status:"
  remediation: string;
  noRemediation: string;
  bullet: Record<string, string>;
  sectionChecklist: string;
  actionPlan: string;
}

const STRINGS: Record<PdfLocale, ReportStrings> = {
  fr: {
    metaSubject: 'Synthèse de conformité RGPD',
    headerTitle: 'Rapport de conformité RGPD',
    headerEmittedOn: 'Émis le',
    scoreCaption: 'Score de conformité',
    sectionOrg: 'Organisation',
    sectionScore: 'Détail du score',
    globalScore: 'Score global',
    pillarChecklist: 'Liste de contrôle',
    pillarFreshness: 'Fraîcheur',
    pillarViolations: 'Violations',
    weight: 'poids',
    itemsCompliant: 'items conformes',
    treatmentsValidated: 'traitements validés',
    penaltyPoints: 'points de pénalité',
    sectionFines: 'Exposition aux sanctions',
    annualTurnover: "Chiffre d'affaires annuel",
    maxFine: 'Sanction maximale (Art. 83)',
    estimatedExposure: 'Exposition estimée',
    sectionHistory: 'Historique du score (12 derniers mois)',
    snapshotsLabel: 'Snapshots',
    colDate: 'Date',
    colGlobal: 'Global',
    colChecklist: 'Liste',
    colFreshness: 'Fraîcheur',
    colViolations: 'Violations',
    sectionTreatments: "Vue d'ensemble des traitements",
    treatmentsTotal: 'Total',
    byStatus: 'Par statut',
    treatmentsEmpty: 'Aucun traitement enregistré.',
    colStatus: 'Statut',
    colCount: 'Nombre',
    sectionViolations: 'Violations',
    noViolations: 'Aucune violation ouverte.',
    found: 'Découverte',
    status: 'Statut',
    remediation: 'Remédiation',
    noRemediation: 'Aucune',
    bullet: {
      companyName: 'Raison sociale',
      siren: 'SIREN',
      address: 'Adresse',
      dpoName: 'DPO',
      representativeName: 'Représentant',
    },
    sectionChecklist: 'Conformité de la liste de contrôle par catégorie',
    actionPlan: "Plan d'action",
  },
  en: {
    metaSubject: 'GDPR compliance summary',
    headerTitle: 'GDPR compliance report',
    headerEmittedOn: 'Issued on',
    scoreCaption: 'Compliance score',
    sectionOrg: 'Organisation',
    sectionScore: 'Score breakdown',
    globalScore: 'Global score',
    pillarChecklist: 'Checklist',
    pillarFreshness: 'Freshness',
    pillarViolations: 'Violations',
    weight: 'weight',
    itemsCompliant: 'items compliant',
    treatmentsValidated: 'records validated',
    penaltyPoints: 'penalty points',
    sectionFines: 'Fine exposure',
    annualTurnover: 'Annual turnover',
    maxFine: 'Maximum fine (Art. 83)',
    estimatedExposure: 'Estimated exposure',
    sectionHistory: 'Score history (last 12 months)',
    snapshotsLabel: 'Snapshots',
    colDate: 'Date',
    colGlobal: 'Global',
    colChecklist: 'Checklist',
    colFreshness: 'Freshness',
    colViolations: 'Violations',
    sectionTreatments: 'Records overview',
    treatmentsTotal: 'Total',
    byStatus: 'By status',
    treatmentsEmpty: 'No records yet.',
    colStatus: 'Status',
    colCount: 'Count',
    sectionViolations: 'Violations',
    noViolations: 'No open violations.',
    found: 'Discovered',
    status: 'Status',
    remediation: 'Remediation',
    noRemediation: 'None',
    bullet: {
      companyName: 'Company name',
      siren: 'SIREN',
      address: 'Address',
      dpoName: 'DPO',
      representativeName: 'Representative',
    },
    sectionChecklist: 'Checklist compliance by category',
    actionPlan: 'Action plan',
  },
};

interface ScoreBreakdown {
  score: number;
  weight: number;
}
interface ChecklistBreakdown extends ScoreBreakdown {
  answered: number;
  total: number;
}
interface FreshnessBreakdown extends ScoreBreakdown {
  validated: number;
  total: number;
}
interface ViolationsBreakdown extends ScoreBreakdown {
  penalties: number;
}
interface ScoreData {
  score: number;
  breakdown: {
    checklist: ChecklistBreakdown;
    freshness: FreshnessBreakdown;
    violations: ViolationsBreakdown;
  };
}
interface FineData {
  maxFine: number | null;
  annualTurnover: number | null;
  estimatedExposure: number | null;
}
interface SnapshotRow {
  snapshotDate: Date;
  score: number;
  checklistScore: number;
  freshnessScore: number;
  violationScore: number;
}
interface TreatmentRow {
  status: string;
}
interface ViolationRow {
  severity: string;
  status: string;
  title: string;
  awarenessAt: Date;
  remediation: string | null;
}
interface OrgRow {
  id?: string;
  companyName?: string | null;
  siren?: string | null;
  address?: string | null;
  dpoName?: string | null;
  representativeName?: string | null;
}

/** Minimal shape used by the renderer — matches both the Prisma row and the
 * shared DTO without forcing nominal-type compatibility between them. */
interface ChecklistResponseRow {
  itemId: string;
  response: string;
  reason: string | null;
  actionPlan: string | null;
}

interface ReportData {
  org: OrgRow | null;
  scoreData: ScoreData;
  fineData: FineData;
  treatments: TreatmentRow[];
  violations: ViolationRow[];
  checklistResponses: ChecklistResponseRow[];
  snapshots: SnapshotRow[];
}

const SCORE_PILLAR_COLOR = (score: number): string => {
  if (score >= 80) return PDF_COLORS.success;
  if (score >= 50) return PDF_COLORS.warning;
  return PDF_COLORS.danger;
};

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly auditLog: AuditLogService,
  ) {}

  async generateReport(userId: string, locale: PdfLocale = 'fr'): Promise<Buffer> {
    const data = await this.loadReportData();
    const auditEntry = await this.recordExportAudit(userId, data.org?.id ?? 'unknown', locale);
    return this.buildReportPdf(data, locale, formatHashSeal(auditEntry.hash));
  }

  private async loadReportData(): Promise<ReportData> {
    const [org, scoreData, fineData, treatments, violations, checklistResponses, snapshots] =
      await Promise.all([
        this.prisma.organization.findFirst(),
        this.complianceService.computeScore(),
        this.complianceService.computeFineExposure(),
        this.prisma.treatment.findMany(),
        this.prisma.violation.findMany({ orderBy: { awarenessAt: 'desc' } }),
        this.prisma.checklistResponse.findMany(),
        this.prisma.complianceSnapshot.findMany({
          orderBy: { snapshotDate: 'desc' },
          take: SNAPSHOT_HISTORY_LIMIT,
        }),
      ]);
    return { org, scoreData, fineData, treatments, violations, checklistResponses, snapshots };
  }

  private recordExportAudit(
    userId: string,
    orgId: string,
    locale: PdfLocale,
  ): Promise<{ hash: string }> {
    return this.auditLog.create({
      action: 'EXPORT',
      entity: 'compliance-report',
      entityId: orgId,
      oldValue: null,
      newValue: { format: 'pdf', exportedAt: new Date().toISOString(), locale },
      performedBy: userId,
    });
  }

  private buildReportPdf(data: ReportData, locale: PdfLocale, hashSeal: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.createPdfDocument(data.org, locale);

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderReportSections(doc, data, locale);
      drawFooterAllPages(doc, { hashSeal, locale });

      doc.end();
    });
  }

  private createPdfDocument(org: OrgRow | null, locale: PdfLocale): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PDF_PAGE_MARGINS,
      bufferPages: true,
    });
    registerArticle30Fonts(doc);
    const s = STRINGS[locale];
    setPdfMetadata(doc, {
      title: `${s.headerTitle} — ${org?.companyName ?? s.sectionOrg}`,
      subject: s.metaSubject,
      keywords: ['RGPD', 'GDPR', 'Compliance', 'Score'],
    });
    return doc;
  }

  private renderReportSections(doc: PDFKit.PDFDocument, data: ReportData, locale: PdfLocale): void {
    this.renderCoverPage(doc, data.org, data.scoreData, locale);
    this.renderScoreBreakdownPage(doc, data.scoreData, data.fineData, data.snapshots, locale);
    this.renderTreatmentsPage(doc, data.treatments, locale);
    this.renderViolationsPage(doc, data.violations, locale);
    this.renderChecklistPage(doc, data.checklistResponses, locale);
  }

  private renderCoverPage(
    doc: PDFKit.PDFDocument,
    org: OrgRow | null,
    scoreData: ScoreData,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    doc.moveDown(SPACING.COVER_TOP);
    drawHeader(doc, {
      org,
      title: s.headerTitle,
      subtitle: org?.companyName ?? undefined,
      meta: `${s.headerEmittedOn} ${formatDate(new Date(), locale)}`,
    });

    doc.moveDown(SPACING.COVER_AFTER_SCORE);
    const donutSize = 180;
    const donutX = (doc.page.width - donutSize) / 2;
    doc.x = donutX;
    drawDonut(doc, {
      score: scoreData.score,
      size: donutSize,
      stroke: 14,
      color: SCORE_PILLAR_COLOR(scoreData.score),
    });
    // Advance cursor below the donut
    doc.x = doc.page.margins.left;
    doc.y = doc.y + donutSize + 12;
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.subtitle)
      .fillColor(PDF_COLORS.medium)
      .text(s.scoreCaption, { align: 'center' });

    const orgRows: Array<[string, string | null | undefined]> =
      org === null
        ? []
        : [
            [s.bullet.companyName, org.companyName],
            [s.bullet.siren, org.siren],
            [s.bullet.address, org.address],
            [s.bullet.dpoName, org.dpoName],
            [s.bullet.representativeName, org.representativeName],
          ];
    const hasAnyOrgValue = orgRows.some(([, value]) => Boolean(value));

    if (hasAnyOrgValue) {
      doc.moveDown(SPACING.COVER_BOTTOM);
      drawSectionHeader(doc, s.sectionOrg);
      doc.font(PDF_FONT_BOLD).fontSize(PDF_FONT_SIZES.body).fillColor(PDF_COLORS.dark);
      for (const [label, value] of orgRows) {
        if (!value) continue;
        doc
          .font(PDF_FONT_BOLD)
          .text(`• ${label} : `, { continued: true })
          .font(PDF_FONT_REGULAR)
          .text(value);
      }
    }
  }

  private renderScoreBreakdownPage(
    doc: PDFKit.PDFDocument,
    scoreData: ScoreData,
    fineData: FineData,
    snapshots: SnapshotRow[],
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    doc.addPage();
    drawSectionHeader(doc, s.sectionScore);
    doc.moveDown(SPACING.PARAGRAPH);

    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.subtitle)
      .fillColor(PDF_COLORS.dark)
      .text(`${s.globalScore} : ${scoreData.score}%`);
    doc.moveDown(SPACING.COVER_AFTER_ORG);

    this.renderScorePillar(
      doc,
      {
        label: s.pillarChecklist,
        weight: scoreData.breakdown.checklist.weight,
        score: scoreData.breakdown.checklist.score,
        caption: `${scoreData.breakdown.checklist.answered}/${scoreData.breakdown.checklist.total} ${s.itemsCompliant}`,
      },
      locale,
    );
    this.renderScorePillar(
      doc,
      {
        label: s.pillarFreshness,
        weight: scoreData.breakdown.freshness.weight,
        score: scoreData.breakdown.freshness.score,
        caption: `${scoreData.breakdown.freshness.validated}/${scoreData.breakdown.freshness.total} ${s.treatmentsValidated}`,
      },
      locale,
    );
    this.renderScorePillar(
      doc,
      {
        label: s.pillarViolations,
        weight: scoreData.breakdown.violations.weight,
        score: scoreData.breakdown.violations.score,
        caption: `${scoreData.breakdown.violations.penalties} ${s.penaltyPoints}`,
      },
      locale,
    );

    doc.moveDown(SPACING.SECTION_GAP);

    if (fineData.maxFine !== null) {
      drawSectionHeader(doc, s.sectionFines);
      doc.moveDown(SPACING.PARAGRAPH);
      doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.body).fillColor(PDF_COLORS.dark);
      doc.text(
        `${s.annualTurnover} : ${this.formatCurrency(fineData.annualTurnover ?? 0, locale)}`,
      );
      doc.text(`${s.maxFine} : ${this.formatCurrency(fineData.maxFine, locale)}`);
      doc.text(
        `${s.estimatedExposure} : ${this.formatCurrency(fineData.estimatedExposure ?? 0, locale)}`,
      );
    }

    if (snapshots.length > 0) {
      doc.moveDown(SPACING.SECTION_GAP);
      drawSectionHeader(doc, s.sectionHistory);
      doc.moveDown(SPACING.PARAGRAPH);
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      drawTable(doc, {
        label: s.snapshotsLabel,
        width: pageWidth,
        columns: [
          { header: s.colDate, ratio: 0.2 },
          { header: s.colGlobal, ratio: 0.15 },
          { header: s.colChecklist, ratio: 0.2 },
          { header: s.colFreshness, ratio: 0.2 },
          { header: s.colViolations, ratio: 0.25 },
        ],
        rows: snapshots.map(snap => [
          formatDate(snap.snapshotDate, locale),
          `${snap.score}%`,
          `${snap.checklistScore}%`,
          `${snap.freshnessScore}%`,
          `${snap.violationScore}%`,
        ]),
      });
    }
  }

  /**
   * Score pillar block — three lines at the same left margin:
   *   1. label (bold, dark) on the left + score% (bold, color-coded) on the right
   *   2. full-width left-aligned score bar
   *   3. caption (muted, detail font): "Poids X% · Y/Z items conformes"
   * Tighter and more report-like than the previous centered-280pt layout.
   */
  private renderScorePillar(
    doc: PDFKit.PDFDocument,
    pillar: { label: string; weight: number; score: number; caption: string },
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    const score = Math.round(pillar.score);
    const weight = Math.round(pillar.weight * PERCENTAGE_MULTIPLIER);
    const color = SCORE_PILLAR_COLOR(score);

    const x = doc.page.margins.left;
    const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelY = doc.y;

    // Line 1: label (bold) on left
    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(PDF_COLORS.dark)
      .text(pillar.label, x, labelY, { width: fullWidth, lineBreak: false });

    // Line 1 (right): score% in pillar color
    doc.fillColor(color);
    const scoreText = `${score}%`;
    const scoreWidth = doc.widthOfString(scoreText);
    doc.text(scoreText, x + fullWidth - scoreWidth, labelY, {
      width: scoreWidth,
      lineBreak: false,
    });

    // Line 2: full-width score bar
    const barY = labelY + PDF_FONT_SIZES.body + 4;
    drawScoreBar(doc, { score, color, x, y: barY, width: fullWidth, showPercent: false });

    // Line 3: caption
    const captionY = barY + PDF_LAYOUT.scoreBarHeight + 4;
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.detail)
      .fillColor(PDF_COLORS.medium)
      .text(`${s.weight} ${weight}% · ${pillar.caption}`, x, captionY, {
        width: fullWidth,
        lineBreak: false,
      });

    doc.x = x;
    doc.y = captionY + PDF_FONT_SIZES.detail + 8;
  }

  private renderTreatmentsPage(
    doc: PDFKit.PDFDocument,
    treatments: TreatmentRow[],
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    doc.addPage();
    drawSectionHeader(doc, s.sectionTreatments);
    doc.moveDown(SPACING.PARAGRAPH);

    const totalTreatments = treatments.length;
    const byStatus = treatments.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.subtitle)
      .fillColor(PDF_COLORS.dark)
      .text(`${s.treatmentsTotal} : ${totalTreatments}`);
    doc.moveDown(SPACING.PARAGRAPH);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    drawTable(doc, {
      label: s.byStatus,
      emptyLabel: s.treatmentsEmpty,
      width: pageWidth,
      columns: [
        { header: s.colStatus, ratio: 0.6 },
        { header: s.colCount, ratio: 0.4 },
      ],
      rows: Object.entries(byStatus).map(([status, count]) => [
        TREATMENT_STATUS_LABELS[locale][status] ?? status,
        String(count),
      ]),
    });
  }

  private renderViolationsPage(
    doc: PDFKit.PDFDocument,
    violations: ViolationRow[],
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    doc.addPage();
    drawSectionHeader(doc, s.sectionViolations);
    doc.moveDown(SPACING.PARAGRAPH);

    if (violations.length === 0) {
      drawCallout(doc, { tone: 'success', lines: [s.noViolations] });
      return;
    }

    const x = doc.page.margins.left;
    const titleX = x + SEVERITY_PILL_WIDTH + 10;
    const titleWidth = doc.page.width - doc.page.margins.right - titleX;

    for (const v of violations) {
      const startY = doc.y;
      drawSeverityPill(doc, v.severity, {
        x,
        y: startY + 1,
        width: SEVERITY_PILL_WIDTH,
        locale,
      });
      doc
        .font(PDF_FONT_BOLD)
        .fontSize(PDF_FONT_SIZES.body)
        .fillColor(PDF_COLORS.dark)
        .text(v.title, titleX, startY, { width: titleWidth });
      doc.x = titleX;
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.detail)
        .fillColor(PDF_COLORS.medium)
        .text(`${s.found} : ${formatDate(v.awarenessAt, locale)}`, { width: titleWidth })
        .text(`${s.status} : ${VIOLATION_STATUS_LABELS[locale][v.status] ?? v.status}`, {
          width: titleWidth,
        })
        // `||` not `??` so empty-string remediation falls back to "Aucune".
        .text(`${s.remediation} : ${v.remediation || s.noRemediation}`, { width: titleWidth });
      doc.x = x;
      doc.y = Math.max(doc.y, startY + PDF_LAYOUT.pillHeight) + 10;
    }
  }

  private renderChecklistPage(
    doc: PDFKit.PDFDocument,
    checklistResponses: ChecklistResponseRow[],
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    doc.addPage();
    drawSectionHeader(doc, s.sectionChecklist);
    doc.moveDown(SPACING.PARAGRAPH);

    const responseMap = new Map(checklistResponses.map(r => [r.itemId, r]));

    for (const category of CHECKLIST_CATEGORIES) {
      const items = CHECKLIST_ITEMS.filter(item => item.category === category);
      const compliantItems = items.filter(item => {
        const resp = responseMap.get(item.id);
        if (!resp) return false;
        if (resp.response === 'YES') return true;
        if (resp.response === 'NA' && resp.reason) return true;
        return false;
      });

      const percentage =
        items.length > 0
          ? Math.round((compliantItems.length / items.length) * PERCENTAGE_MULTIPLIER)
          : 0;
      const categoryLabel = CHECKLIST_CATEGORY_LABELS[locale][category] ?? category;

      doc.moveDown(SPACING.ITEM);
      doc
        .font(PDF_FONT_BOLD)
        .fontSize(PDF_FONT_SIZES.body)
        .fillColor(PDF_COLORS.primary)
        .text(`${categoryLabel} : ${percentage}% (${compliantItems.length}/${items.length})`);

      const nonCompliant = items.filter(item => {
        const resp = responseMap.get(item.id);
        if (!resp) return true;
        if (resp.response === 'YES') return false;
        if (resp.response === 'NA' && resp.reason) return false;
        return true;
      });

      this.renderNonCompliantItems(doc, nonCompliant, responseMap, locale);
    }
  }

  private renderNonCompliantItems(
    doc: PDFKit.PDFDocument,
    nonCompliant: ChecklistItemDef[],
    responseMap: ReadonlyMap<string, ChecklistResponseRow>,
    locale: PdfLocale,
  ): void {
    if (nonCompliant.length === 0) {
      return;
    }
    const s = STRINGS[locale];
    doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.detail).fillColor(PDF_COLORS.dark);
    for (const item of nonCompliant) {
      const resp = responseMap.get(item.id);
      const actionPlan = resp?.actionPlan;
      const itemLabel = locale === 'en' ? (item.label.en ?? item.label.fr) : item.label.fr;
      doc.text(`  • ${itemLabel} (${item.articleRef})`);
      if (actionPlan) {
        doc
          .fillColor(PDF_COLORS.medium)
          .text(`    ${s.actionPlan} : ${actionPlan}`)
          .fillColor(PDF_COLORS.dark);
      }
    }
  }

  private formatCurrency(amount: number, locale: PdfLocale): string {
    return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
