import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { VENDOR_ASSESSMENT_QUESTIONS } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PDF_COLORS,
  PDF_FONT_BOLD,
  PDF_FONT_REGULAR,
  PDF_FONT_SIZES,
  PDF_LAYOUT,
  PDF_PAGE_MARGINS,
  drawFooterAllPages,
  drawHeader,
  drawSectionHeader,
  formatHashSeal,
  registerArticle30Fonts,
  setPdfMetadata,
} from '../../common/pdf/pdf-style';
import { AuditLogService } from '../audit-log/audit-log.service';

const ANSWER_OPTIONS = [
  { value: 'YES', labelFr: 'Oui', labelEn: 'Yes' },
  { value: 'NO', labelFr: 'Non', labelEn: 'No' },
  { value: 'PARTIAL', labelFr: 'Partiel', labelEn: 'Partial' },
  { value: 'NA', labelFr: 'N/A', labelEn: 'N/A' },
] as const;

@Injectable()
export class VendorQuestionnairePdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async generate(vendorId: string, userId: string): Promise<Buffer> {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    const org = await this.prisma.organization.findFirst();

    const auditEntry = await this.auditLog.create({
      action: 'EXPORT',
      entity: 'vendor',
      entityId: vendorId,
      oldValue: null,
      newValue: { format: 'pdf', exportedAt: new Date().toISOString() },
      performedBy: userId,
    });

    const doc = this.createDocument(vendor.name);
    const buffer = this.collectBuffer(doc);
    this.initForm(doc);

    this.drawCover(doc, org, vendor.name);
    this.drawInstructions(doc, org);
    this.drawRespondentFields(doc, vendor.name);
    this.drawQuestions(doc);
    this.drawSignatureFields(doc);
    this.drawFooter(doc, org, formatHashSeal(auditEntry.hash));

    doc.end();
    return buffer;
  }

  private createDocument(vendorName: string): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PDF_PAGE_MARGINS,
      bufferPages: true,
    });
    registerArticle30Fonts(doc);
    setPdfMetadata(doc, {
      title: `Questionnaire RGPD — ${vendorName}`,
      subject: 'Questionnaire de due-diligence sous-traitant (RGPD Art. 28)',
      keywords: ['RGPD', 'Article 28', 'Sous-traitant', 'Vendor', 'Due diligence'],
    });
    return doc;
  }

  private collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  private initForm(doc: PDFKit.PDFDocument): void {
    // PDFKit requires a font to be set before initForm.
    doc.font(PDF_FONT_REGULAR);
    doc.initForm();
  }

  private drawCover(
    doc: PDFKit.PDFDocument,
    org: { companyName?: string | null } | null,
    vendorName: string,
  ): void {
    drawHeader(doc, {
      org,
      title: 'Questionnaire de protection des données',
      subtitle: vendorName,
    });
  }

  private drawFooter(
    doc: PDFKit.PDFDocument,
    org: { dpoEmail?: string | null } | null,
    hashSeal: string,
  ): void {
    drawFooterAllPages(doc, {
      disclaimer: org?.dpoEmail
        ? `Merci de retourner ce document complété à ${org.dpoEmail}.`
        : 'Merci de retourner ce document complété à votre interlocuteur RGPD.',
      hashSeal,
    });
  }

  private drawInstructions(
    doc: PDFKit.PDFDocument,
    org: { companyName?: string | null } | null,
  ): void {
    const orgName = org?.companyName ?? 'notre organisation';
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(PDF_COLORS.dark)
      .text(
        `Ce questionnaire est adressé à votre organisation par ${orgName} dans le cadre de l'évaluation des sous-traitants au titre de l'article 28 du RGPD. Merci de répondre à chaque question, d'apporter les précisions utiles dans la zone de commentaire, puis de signer et retourner le document.`,
      );
    doc.moveDown(0.4);
    doc
      .fontSize(PDF_FONT_SIZES.detail)
      .fillColor(PDF_COLORS.medium)
      .text(
        'This questionnaire is sent to your organization in the context of GDPR Art. 28 sub-processor due diligence. Please answer every question, add any relevant detail in the comment area, then sign and return the document.',
      );
    doc.moveDown(0.8);
  }

  private drawRespondentFields(doc: PDFKit.PDFDocument, vendorName: string): void {
    drawSectionHeader(doc, 'Identité du répondant / Respondent details');
    const x = doc.page.margins.left;
    const fieldWidth = doc.page.width - x - doc.page.margins.right;

    const rows: Array<{ label: string; name: string; defaultValue?: string }> = [
      {
        label: 'Nom de l’organisation / Organization name',
        name: 'organization',
        defaultValue: vendorName,
      },
      { label: 'Nom du répondant / Respondent name', name: 'respondent_name' },
      { label: 'Fonction / Role', name: 'respondent_role' },
      { label: 'Email / Email', name: 'respondent_email' },
      { label: 'Téléphone / Phone', name: 'respondent_phone' },
    ];

    // Stacked layout: label on its own line, input field below. Avoids the
    // earlier two-column layout where bilingual labels wrapped awkwardly in a
    // 170pt narrow column.
    for (const row of rows) {
      const labelY = doc.y;
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.detail)
        .fillColor(PDF_COLORS.medium)
        .text(row.label, x, labelY, { width: fieldWidth });
      const fieldY = doc.y + 2;
      this.drawTextFieldWithBorder(doc, {
        name: row.name,
        x,
        y: fieldY,
        width: fieldWidth,
        height: PDF_LAYOUT.formTextFieldHeight,
        defaultValue: row.defaultValue ?? '',
      });
      doc.y = fieldY + PDF_LAYOUT.formTextFieldHeight + 8;
      doc.x = x;
    }
    doc.moveDown(0.4);
  }

  /**
   * Wraps `doc.formText` with a real visible stroke rectangle. PDFKit's
   * AcroForm widget appearance is minimal — `borderColor`/`borderWidth` show
   * up in interactive editors but not when the PDF is viewed/printed
   * statically. Drawing the rect ourselves guarantees visible field outlines
   * regardless of viewer.
   */
  private drawTextFieldWithBorder(
    doc: PDFKit.PDFDocument,
    opts: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      defaultValue: string;
      multiline?: boolean;
    },
  ): void {
    doc
      .save()
      .roundedRect(opts.x, opts.y, opts.width, opts.height, 2)
      .strokeColor(PDF_COLORS.divider)
      .lineWidth(PDF_LAYOUT.formFieldBorderWidth)
      .stroke()
      .restore();
    doc.formText(opts.name, opts.x, opts.y, opts.width, opts.height, {
      borderColor: PDF_COLORS.divider,
      borderWidth: PDF_LAYOUT.formFieldBorderWidth,
      defaultValue: opts.defaultValue,
      fontSize: PDF_FONT_SIZES.body,
      multiline: opts.multiline,
    });
  }

  private drawCheckboxWithBorder(
    doc: PDFKit.PDFDocument,
    opts: { name: string; x: number; y: number; size: number },
  ): void {
    doc
      .save()
      .rect(opts.x, opts.y, opts.size, opts.size)
      .strokeColor(PDF_COLORS.divider)
      .lineWidth(PDF_LAYOUT.formFieldBorderWidth)
      .stroke()
      .restore();
    doc.formCheckbox(opts.name, opts.x, opts.y, opts.size, opts.size, {
      borderColor: PDF_COLORS.divider,
      borderWidth: PDF_LAYOUT.formFieldBorderWidth,
    });
  }

  private drawQuestions(doc: PDFKit.PDFDocument): void {
    drawSectionHeader(doc, 'Questions / Questions');
    const x = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    let qIndex = 0;
    for (const question of VENDOR_ASSESSMENT_QUESTIONS) {
      this.ensureRoom(doc, PDF_LAYOUT.formQuestionBlockHeight);
      qIndex += 1;

      const startY = doc.y;
      doc
        .font(PDF_FONT_BOLD)
        .fontSize(PDF_FONT_SIZES.body)
        .fillColor(PDF_COLORS.dark)
        .text(`${qIndex}. ${question.label.fr}`, x, startY, { width });
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.detail)
        .fillColor(PDF_COLORS.medium)
        .text(question.label.en, { width });

      doc.moveDown(0.3);

      // Checkbox row — one named field per option (vendor will check exactly one
      // per the printed instruction; AcroForm radio groups are clunkier and not
      // worth the extra plumbing for v1).
      const rowY = doc.y;
      let cursor = x;
      for (const option of ANSWER_OPTIONS) {
        this.drawCheckboxWithBorder(doc, {
          name: `${question.id}_${option.value}`,
          x: cursor,
          y: rowY,
          size: PDF_LAYOUT.formCheckboxSize,
        });
        const labelText = `${option.labelFr} / ${option.labelEn}`;
        doc
          .font(PDF_FONT_REGULAR)
          .fontSize(PDF_FONT_SIZES.detail)
          .fillColor(PDF_COLORS.dark)
          .text(
            labelText,
            cursor + PDF_LAYOUT.formCheckboxSize + PDF_LAYOUT.formCheckboxLabelGap,
            rowY + 1,
            {
              lineBreak: false,
            },
          );
        const labelWidth = doc.widthOfString(labelText);
        cursor +=
          PDF_LAYOUT.formCheckboxSize +
          PDF_LAYOUT.formCheckboxLabelGap +
          labelWidth +
          PDF_LAYOUT.formCheckboxGroupGap;
      }
      doc.x = x;
      doc.y = rowY + PDF_LAYOUT.formCheckboxSize + 6;

      // Multi-line comment field
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.detail)
        .fillColor(PDF_COLORS.medium)
        .text('Commentaire / Comment', x, doc.y);
      const commentY = doc.y + 2;
      this.drawTextFieldWithBorder(doc, {
        name: `${question.id}_comment`,
        x,
        y: commentY,
        width,
        height: PDF_LAYOUT.formCommentBoxHeight,
        defaultValue: '',
        multiline: true,
      });
      doc.x = x;
      doc.y = commentY + PDF_LAYOUT.formCommentBoxHeight + PDF_LAYOUT.formQuestionGap;
    }
    doc.moveDown(0.6);
  }

  private drawSignatureFields(doc: PDFKit.PDFDocument): void {
    this.ensureRoom(doc, 90);
    drawSectionHeader(doc, 'Signature / Sign-off');

    const x = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const halfWidth = (width - 20) / 2;

    const yLabel = doc.y;
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.detail)
      .fillColor(PDF_COLORS.dark)
      .text('Date', x, yLabel)
      .text('Signature', x + halfWidth + 20, yLabel);

    const yField = doc.y + 2;
    this.drawTextFieldWithBorder(doc, {
      name: 'signature_date',
      x,
      y: yField,
      width: halfWidth,
      height: PDF_LAYOUT.formTextFieldHeight,
      defaultValue: '',
    });
    this.drawTextFieldWithBorder(doc, {
      name: 'signature_name',
      x: x + halfWidth + 20,
      y: yField,
      width: halfWidth,
      height: PDF_LAYOUT.formTextFieldHeight,
      defaultValue: '',
    });
    doc.x = x;
    doc.y = yField + PDF_LAYOUT.formTextFieldHeight + 8;
  }

  private ensureRoom(doc: PDFKit.PDFDocument, blockHeight: number): void {
    const remaining =
      doc.page.height - doc.page.margins.bottom - PDF_LAYOUT.formPageBottomPadding - doc.y;
    if (remaining < blockHeight) {
      doc.addPage();
    }
  }
}
