import { Injectable } from '@nestjs/common';
import archiver from 'archiver';

import PDFDocument from 'pdfkit';
import { CHECKLIST_ITEMS, CHECKLIST_CATEGORIES } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { ReportService } from './report.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { toCsv } from '../../common/utils/csv';
import {
  CHECKLIST_CATEGORY_LABELS,
  PDF_COLORS,
  PDF_FONT_BOLD,
  PDF_FONT_REGULAR,
  PDF_FONT_SIZES,
  PDF_LAYOUT,
  PDF_PAGE_MARGINS,
  VIOLATION_STATUS_LABELS,
  drawAnswerPill,
  drawCallout,
  drawFooterAllPages,
  drawHeader,
  drawSectionHeader,
  drawSeverityPill,
  formatDate,
  formatHashSeal,
  registerArticle30Fonts,
  setPdfMetadata,
  type PdfLocale,
} from '../../common/pdf/pdf-style';

const ZLIB_COMPRESSION_LEVEL = 9;
const SEVERITY_PILL_WIDTH = 70;
const ANSWER_PILL_WIDTH = 60;

const SPACING = {
  CATEGORY_GAP: 0.5,
  ITEM_GAP: 0.3,
  VIOLATION_GAP: 0.8,
};

interface ViolationEntry {
  severity: string;
  status: string;
  title: string;
  description: string | null;
  awarenessAt: Date;
  remediation: string | null;
  treatments: { treatment: { name: string } }[];
}

interface AuditPackStrings {
  emittedOn: string;
  // checklist PDF
  checklistTitle: string;
  checklistSubtitle: string;
  checklistMetaSubject: string;
  reason: string;
  actionPlan: string;
  // violations PDF
  violationsTitle: string;
  violationsMetaSubject: string;
  violationsCountSingular: string;
  violationsCountPlural: string;
  noViolations: string;
  description: string;
  found: string;
  status: string;
  remediation: string;
  noRemediation: string;
  linkedTreatments: string;
  // CSV headers (audit-package CSV is FR by convention since it's tabular data
  // bound for spreadsheets, but headers can still vary by locale)
  csvHeaders: string[];
}

const STRINGS: Record<PdfLocale, AuditPackStrings> = {
  fr: {
    emittedOn: 'Émis le',
    checklistTitle: 'Statut de conformité',
    checklistSubtitle: 'Liste de contrôle',
    checklistMetaSubject: 'Audit-pack : liste de contrôle RGPD',
    reason: 'Motif',
    actionPlan: "Plan d'action",
    violationsTitle: 'Registre des violations',
    violationsMetaSubject: 'Audit-pack : registre des violations RGPD',
    violationsCountSingular: 'entrée',
    violationsCountPlural: 'entrées',
    noViolations: 'Aucune violation enregistrée.',
    description: 'Description',
    found: 'Découverte',
    status: 'Statut',
    remediation: 'Remédiation',
    noRemediation: 'Aucune',
    linkedTreatments: 'Traitements liés',
    csvHeaders: [
      'Réf',
      'Nom',
      'Finalité',
      'Base légale',
      'Statut',
      'Créé par',
      'Créé le',
      'Validé par',
      'Validé le',
      'Dernière revue',
    ],
  },
  en: {
    emittedOn: 'Issued on',
    checklistTitle: 'Compliance status',
    checklistSubtitle: 'Checklist',
    checklistMetaSubject: 'Audit pack: GDPR checklist',
    reason: 'Reason',
    actionPlan: 'Action plan',
    violationsTitle: 'Violations register',
    violationsMetaSubject: 'Audit pack: GDPR violations register',
    violationsCountSingular: 'entry',
    violationsCountPlural: 'entries',
    noViolations: 'No violations recorded.',
    description: 'Description',
    found: 'Discovered',
    status: 'Status',
    remediation: 'Remediation',
    noRemediation: 'None',
    linkedTreatments: 'Linked records',
    csvHeaders: [
      'Ref',
      'Name',
      'Purpose',
      'Legal basis',
      'Status',
      'Created by',
      'Created on',
      'Validated by',
      'Validated on',
      'Last review',
    ],
  },
};

@Injectable()
export class AuditPackageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
    private readonly auditLog: AuditLogService,
  ) {}

  async generatePackage(userId: string, locale: PdfLocale = 'fr'): Promise<Buffer> {
    const org = await this.prisma.organization.findFirst();
    const orgId = org?.id ?? 'unknown';

    // The audit row is written before the bundle is generated so its hash can be sealed
    // into the PDFs. If generation fails afterwards the audit row remains — by design:
    // the log captures intent ("user requested an export"), not delivery.
    const auditEntry = await this.auditLog.create({
      action: 'EXPORT',
      entity: 'compliance-package',
      entityId: orgId,
      oldValue: null,
      newValue: { format: 'zip', exportedAt: new Date().toISOString(), locale },
      performedBy: userId,
    });

    const hashSeal = formatHashSeal(auditEntry.hash);

    const [summaryPdf, csv, checklistPdf, violationsPdf] = await Promise.all([
      this.reportService.generateReport(userId, locale),
      this.generateRegisterCsv(locale),
      this.generateChecklistPdf(hashSeal, locale),
      this.generateViolationsPdf(hashSeal, locale),
    ]);

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: ZLIB_COMPRESSION_LEVEL } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      const fileNames =
        locale === 'en'
          ? {
              summary: 'compliance-summary.pdf',
              csv: 'register.csv',
              checklist: 'checklist.pdf',
              violations: 'violations.pdf',
            }
          : {
              summary: 'synthese-conformite.pdf',
              csv: 'registre.csv',
              checklist: 'liste-controle.pdf',
              violations: 'violations.pdf',
            };

      archive.append(summaryPdf, { name: fileNames.summary });
      archive.append(csv, { name: fileNames.csv });
      archive.append(checklistPdf, { name: fileNames.checklist });
      archive.append(violationsPdf, { name: fileNames.violations });

      archive.finalize();
    });
  }

  private async generateRegisterCsv(locale: PdfLocale): Promise<string> {
    const treatments = await this.prisma.treatment.findMany({
      include: {
        creator: { select: PRISMA_SELECT.userName },
        validator: { select: PRISMA_SELECT.userName },
      },
      orderBy: { refNumber: 'asc' },
    });

    const headers = STRINGS[locale].csvHeaders;

    const formatOptionalDate = (value: Date | null | undefined): string => {
      if (!value) {
        return '';
      }
      return formatDate(value, locale);
    };
    const refNumberToString = (ref: number | null | undefined): string => {
      if (ref == null) {
        return '';
      }
      return String(ref);
    };

    const rows = treatments.map(t => [
      refNumberToString(t.refNumber),
      t.name,
      t.purpose ?? '',
      t.legalBasis ?? '',
      t.status,
      t.creator ? `${t.creator.firstName} ${t.creator.lastName}`.trim() : '',
      formatOptionalDate(t.createdAt),
      t.validator ? `${t.validator.firstName} ${t.validator.lastName}`.trim() : '',
      formatOptionalDate(t.validatedAt),
      formatOptionalDate(t.lastReviewedAt),
    ]);

    return toCsv(headers, rows);
  }

  private async generateChecklistPdf(hashSeal: string, locale: PdfLocale): Promise<Buffer> {
    const [checklistResponses, org] = await Promise.all([
      this.prisma.checklistResponse.findMany(),
      this.prisma.organization.findFirst(),
    ]);
    const responseMap = new Map(checklistResponses.map(r => [r.itemId, r]));
    const s = STRINGS[locale];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: PDF_PAGE_MARGINS,
        bufferPages: true,
      });
      registerArticle30Fonts(doc);
      setPdfMetadata(doc, {
        title: `${s.checklistSubtitle} — ${s.checklistTitle}`,
        subject: s.checklistMetaSubject,
        keywords: ['RGPD', 'GDPR', 'Audit', 'Checklist'],
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawHeader(doc, {
        org,
        title: s.checklistTitle,
        subtitle: s.checklistSubtitle,
        meta: `${s.emittedOn} ${formatDate(new Date(), locale)}`,
      });

      for (const category of CHECKLIST_CATEGORIES) {
        const items = CHECKLIST_ITEMS.filter(item => item.category === category);
        const compliantItems = items.filter(item => {
          const resp = responseMap.get(item.id);
          if (!resp) return false;
          if (resp.response === 'YES') return true;
          if (resp.response === 'NA' && resp.reason) return true;
          return false;
        });

        const categoryLabel = CHECKLIST_CATEGORY_LABELS[locale][category] ?? category;
        drawSectionHeader(doc, `${categoryLabel} (${compliantItems.length}/${items.length})`);

        const x = doc.page.margins.left;
        const labelX = x;
        const labelWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right - ANSWER_PILL_WIDTH - 8;
        const pillX = labelX + labelWidth + 8;

        for (const item of items) {
          const resp = responseMap.get(item.id);
          const response = resp?.response;
          const reason = resp?.reason;
          const actionPlan = resp?.actionPlan;
          const startY = doc.y;
          const itemLabel = locale === 'en' ? (item.label.en ?? item.label.fr) : item.label.fr;

          doc
            .font(PDF_FONT_BOLD)
            .fontSize(PDF_FONT_SIZES.detail)
            .fillColor(PDF_COLORS.dark)
            .text(`${itemLabel} [${item.articleRef}]`, labelX, startY, {
              width: labelWidth,
            });
          if (response) {
            drawAnswerPill(doc, response, {
              x: pillX,
              y: startY,
              width: ANSWER_PILL_WIDTH,
              locale,
            });
          } else {
            doc
              .font(PDF_FONT_REGULAR)
              .fontSize(PDF_FONT_SIZES.detail)
              .fillColor(PDF_COLORS.light)
              .text('—', pillX, startY + 1, { width: ANSWER_PILL_WIDTH, align: 'center' });
          }
          doc.x = labelX;
          doc.y = Math.max(doc.y, startY + PDF_LAYOUT.pillHeight) + 2;

          if (reason) {
            doc
              .font(PDF_FONT_REGULAR)
              .fontSize(PDF_FONT_SIZES.detail)
              .fillColor(PDF_COLORS.medium)
              .text(`${s.reason} : ${reason}`, { indent: 12 });
          }
          if (actionPlan) {
            doc
              .font(PDF_FONT_REGULAR)
              .fontSize(PDF_FONT_SIZES.detail)
              .fillColor(PDF_COLORS.medium)
              .text(`${s.actionPlan} : ${actionPlan}`, { indent: 12 });
          }
          doc.moveDown(SPACING.ITEM_GAP);
        }

        doc.moveDown(SPACING.CATEGORY_GAP);
      }

      drawFooterAllPages(doc, { hashSeal, locale });

      doc.end();
    });
  }

  private async generateViolationsPdf(hashSeal: string, locale: PdfLocale): Promise<Buffer> {
    const [violations, org] = await Promise.all([
      this.prisma.violation.findMany({
        include: {
          treatments: {
            include: {
              treatment: { select: PRISMA_SELECT.treatmentName },
            },
          },
        },
        orderBy: { awarenessAt: 'desc' },
      }),
      this.prisma.organization.findFirst(),
    ]);
    const s = STRINGS[locale];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: PDF_PAGE_MARGINS,
        bufferPages: true,
      });
      registerArticle30Fonts(doc);
      setPdfMetadata(doc, {
        title: s.violationsTitle,
        subject: s.violationsMetaSubject,
        keywords: ['RGPD', 'GDPR', 'Audit', 'Violations', 'Incidents'],
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const countLabel =
        violations.length > 1 ? s.violationsCountPlural : s.violationsCountSingular;
      drawHeader(doc, {
        org,
        title: s.violationsTitle,
        subtitle: `${violations.length} ${countLabel}`,
        meta: `${s.emittedOn} ${formatDate(new Date(), locale)}`,
      });

      if (violations.length === 0) {
        drawCallout(doc, { tone: 'success', lines: [s.noViolations] });
      } else {
        for (const v of violations) {
          this.renderViolationEntry(doc, v, locale);
        }
      }

      drawFooterAllPages(doc, { hashSeal, locale });

      doc.end();
    });
  }

  private renderViolationEntry(
    doc: PDFKit.PDFDocument,
    v: ViolationEntry,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    const x = doc.page.margins.left;
    const titleX = x + SEVERITY_PILL_WIDTH + 10;
    const titleWidth = doc.page.width - doc.page.margins.right - titleX;
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
    doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.detail).fillColor(PDF_COLORS.medium);

    if (v.description) {
      doc.text(`${s.description} : ${v.description}`, { width: titleWidth });
    }
    doc.text(`${s.found} : ${formatDate(v.awarenessAt, locale)}`, { width: titleWidth });
    doc.text(`${s.status} : ${VIOLATION_STATUS_LABELS[locale][v.status] ?? v.status}`, {
      width: titleWidth,
    });
    // `||` not `??` so empty-string remediation falls back to "Aucune".
    doc.text(`${s.remediation} : ${v.remediation || s.noRemediation}`, { width: titleWidth });

    const linkedTreatments = v.treatments.map(vt => vt.treatment.name);
    if (linkedTreatments.length > 0) {
      doc.text(`${s.linkedTreatments} : ${linkedTreatments.join(', ')}`, { width: titleWidth });
    }

    doc.x = x;
    doc.moveDown(SPACING.VIOLATION_GAP);
  }
}
