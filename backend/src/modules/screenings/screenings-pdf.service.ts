import { Injectable, NotFoundException } from '@nestjs/common';
import { SCREENING_QUESTIONS } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import PDFDocument from 'pdfkit';
import {
  ANSWER_LABELS,
  PDF_COLORS,
  PDF_FONT_REGULAR,
  PDF_FONT_SIZES,
  PDF_LAYOUT,
  PDF_PAGE_MARGINS,
  drawAnswerPill,
  drawBadge,
  drawCallout,
  drawCardWrapper,
  drawFooterAllPages,
  drawHeader,
  drawScoreBar,
  drawSectionHeader,
  formatDate,
  formatHashSeal,
  registerArticle30Fonts,
  setPdfMetadata,
  type PdfLocale,
} from '../../common/pdf/pdf-style';
import { AuditLogService } from '../audit-log/audit-log.service';

const STRINGS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    title: 'Checklist de traitement',
    metadataSubject: 'Évaluation préalable de traitement (RGPD)',
    sectionAnswers: 'Détail des réponses',
    sectionRedFlags: "Points d'attention",
    disclaimer:
      "Cette évaluation ne se substitue pas à une analyse d'impact (AIPD) complète ni à l'avis du DPO.",
  },
  en: {
    title: 'Treatment screening checklist',
    metadataSubject: 'Pre-assessment of a processing activity (GDPR)',
    sectionAnswers: 'Answers',
    sectionRedFlags: 'Points to watch',
    disclaimer: 'This assessment does not replace a full DPIA or the DPO advice.',
  },
};

const VERDICT_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: { GREEN: 'Conforme', ORANGE: 'Attention requise', RED: 'Non conforme' },
  en: { GREEN: 'Compliant', ORANGE: 'Needs attention', RED: 'Non compliant' },
};

const VERDICT_COLORS: Record<string, string> = {
  GREEN: PDF_COLORS.success,
  ORANGE: PDF_COLORS.warning,
  RED: PDF_COLORS.danger,
};

const ANSWER_COL_WIDTH = 80;
const ROW_GAP = 6;
const SECTION_GAP = 14;

function pickLabel(label: { fr: string; en: string }, locale: PdfLocale): string {
  return label[locale] ?? label.fr;
}

@Injectable()
export class ScreeningsPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async generatePdf(id: string, userId: string, locale: PdfLocale = 'fr'): Promise<Buffer> {
    const screening = await this.loadScreening(id);
    const org = await this.prisma.organization.findFirst();
    const responses = screening.responses as Record<string, string>;
    const auditEntry = await this.recordExport(id, userId, locale);

    return new Promise((resolve, reject) => {
      const doc = this.createDocument(screening, locale);
      this.captureBytes(doc, resolve, reject);

      this.drawHeaderBlock(doc, screening, org, locale);
      this.drawVerdictBlock(doc, screening, locale);
      this.renderQuestions(doc, responses, locale);
      this.renderRedFlags(doc, responses, locale);
      this.drawFooterBlock(doc, auditEntry.hash, locale);

      doc.end();
    });
  }

  private async loadScreening(id: string) {
    const screening = await this.prisma.screening.findUnique({
      where: { id },
      include: { creator: { select: PRISMA_SELECT.userName } },
    });
    if (!screening) {
      throw new NotFoundException('Screening not found');
    }
    return screening;
  }

  private recordExport(id: string, userId: string, locale: PdfLocale) {
    return this.auditLog.create({
      action: 'EXPORT',
      entity: 'screening',
      entityId: id,
      oldValue: null,
      newValue: { format: 'pdf', exportedAt: new Date().toISOString(), locale },
      performedBy: userId,
    });
  }

  private createDocument(screening: { title: string }, locale: PdfLocale): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PDF_PAGE_MARGINS,
      bufferPages: true,
    });
    registerArticle30Fonts(doc);
    setPdfMetadata(doc, {
      title: `${STRINGS[locale].title} — ${screening.title}`,
      subject: STRINGS[locale].metadataSubject,
      keywords: ['RGPD', 'GDPR', 'Checklist', 'DPIA', 'AIPD'],
    });
    return doc;
  }

  private captureBytes(
    doc: PDFKit.PDFDocument,
    resolve: (buf: Buffer) => void,
    reject: (err: unknown) => void,
  ): void {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  }

  private drawHeaderBlock(
    doc: PDFKit.PDFDocument,
    screening: {
      title: string;
      createdAt: Date;
      creator: { firstName: string; lastName: string };
    },
    org: { companyName: string | null } | null,
    locale: PdfLocale,
  ): void {
    drawHeader(doc, {
      org,
      title: STRINGS[locale].title,
      subtitle: screening.title,
      meta: `${screening.creator.firstName} ${screening.creator.lastName} — ${formatDate(screening.createdAt, locale)}`,
    });
  }

  private drawVerdictBlock(
    doc: PDFKit.PDFDocument,
    screening: { verdict: string; score: number },
    locale: PdfLocale,
  ): void {
    const verdictColor = VERDICT_COLORS[screening.verdict] ?? PDF_COLORS.danger;
    drawBadge(doc, {
      label: VERDICT_LABELS[locale][screening.verdict] ?? screening.verdict,
      color: verdictColor,
    });
    drawScoreBar(doc, { score: screening.score, color: verdictColor });
  }

  private drawFooterBlock(doc: PDFKit.PDFDocument, hash: string, locale: PdfLocale): void {
    drawFooterAllPages(doc, {
      disclaimer: STRINGS[locale].disclaimer,
      hashSeal: formatHashSeal(hash),
      locale,
    });
  }

  private renderQuestions(
    doc: PDFKit.PDFDocument,
    responses: Record<string, string>,
    locale: PdfLocale,
  ): void {
    drawSectionHeader(doc, STRINGS[locale].sectionAnswers);

    const cardInnerWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right - 2 * PDF_LAYOUT.cardPadX;
    const labelWidth = cardInnerWidth - ANSWER_COL_WIDTH;
    const pillWidth = ANSWER_COL_WIDTH - 4;

    // Pre-measure body height so the card outline can be drawn before content.
    doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.detail);
    const bodyHeight = SCREENING_QUESTIONS.reduce((acc, q) => {
      const text = `${q.articleRef} — ${pickLabel(q.label, locale)}`;
      const labelHeight = doc.heightOfString(text, { width: labelWidth });
      return acc + Math.max(labelHeight, PDF_LAYOUT.pillHeight) + ROW_GAP;
    }, 0);

    drawCardWrapper(doc, bodyHeight, () => {
      const labelX = doc.x;
      const pillX = labelX + labelWidth;

      for (const q of SCREENING_QUESTIONS) {
        const answer = responses[q.id] ?? 'NA';
        const startY = doc.y;

        doc
          .font(PDF_FONT_REGULAR)
          .fontSize(PDF_FONT_SIZES.detail)
          .fillColor(PDF_COLORS.dark)
          .text(`${q.articleRef} — ${pickLabel(q.label, locale)}`, labelX, startY, {
            width: labelWidth,
          });

        const labelEndY = doc.y;
        drawAnswerPill(doc, answer, {
          x: pillX + 4,
          y: startY,
          width: pillWidth,
          locale,
        });
        doc.x = labelX;
        doc.y = Math.max(labelEndY, startY + PDF_LAYOUT.pillHeight) + ROW_GAP;
      }
    });
  }

  private renderRedFlags(
    doc: PDFKit.PDFDocument,
    responses: Record<string, string>,
    locale: PdfLocale,
  ): void {
    const redFlags = SCREENING_QUESTIONS.filter(
      q => responses[q.id] === 'NO' || responses[q.id] === 'PARTIAL',
    );
    if (redFlags.length === 0) {
      return;
    }

    const lines = redFlags.map(
      q =>
        `• ${q.articleRef} — ${pickLabel(q.label, locale)} (${ANSWER_LABELS[locale][responses[q.id]] ?? ''})`,
    );

    // Pre-measure callout + section header so we addPage *before* drawing the
    // header if they wouldn't fit together. drawCallout itself will addPage if
    // it overflows on its own, but that orphans the just-drawn section header
    // on the previous page.
    const innerWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right - 2 * PDF_LAYOUT.calloutPadX;
    doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.detail);
    const calloutBodyHeight = lines.reduce(
      (acc, line) =>
        acc + doc.heightOfString(line, { width: innerWidth }) + PDF_LAYOUT.calloutLineGap,
      0,
    );
    const headerHeight = PDF_FONT_SIZES.sectionHeader + 8;
    const blockTotal = SECTION_GAP + headerHeight + calloutBodyHeight + 2 * PDF_LAYOUT.calloutPadY;
    const pageContentBottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + blockTotal > pageContentBottom) {
      doc.addPage();
    } else {
      doc.y += SECTION_GAP;
    }

    drawSectionHeader(doc, STRINGS[locale].sectionRedFlags, PDF_COLORS.danger);
    drawCallout(doc, { tone: 'danger', lines });
  }
}
