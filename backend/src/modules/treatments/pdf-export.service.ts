import { Injectable } from '@nestjs/common';
import { Organization, Treatment } from '@prisma/client';
import PDFDocument from 'pdfkit';
import {
  LEGAL_BASES,
  SENSITIVE_DATA_CATEGORIES,
  GUARANTEE_TYPES,
  DATA_CATEGORIES,
  PERSON_CATEGORIES,
  RECIPIENT_TYPES,
  SECURITY_MEASURES,
  RiskLevel,
  FreshnessStatus,
  TreatmentIndicators,
  DataCategoryEntry,
  RecipientEntry,
  SecurityMeasureEntry,
  TransferEntry,
} from '@article30/shared';
import {
  PDF_COLORS,
  PDF_FONT_BOLD,
  PDF_FONT_REGULAR,
  PDF_FONT_SIZES,
  PDF_LAYOUT,
  PDF_PAGE_MARGINS,
  PDF_TABLE,
  TREATMENT_STATUS_LABELS,
  drawFooterAllPages,
  drawHeader,
  drawPill,
  drawSectionHeader,
  drawTable,
  formatDate,
  formatHashSeal,
  registerArticle30Fonts,
  setPdfMetadata,
  type PdfLocale,
} from '../../common/pdf/pdf-style';
import { AuditLogService } from '../audit-log/audit-log.service';

interface TreatmentWithIndicators extends Treatment {
  indicators?: TreatmentIndicators | null;
}

const PDF_SPACING = {
  SECTION_GAP: 0.5,
  TABLE_GAP: 0.3,
  MOVE_DOWN_FULL: 1,
} as const;

const PDF_COL_RATIO = {
  DATA_CAT: [0.3, 0.4, 0.3] as const, // NOSONAR — column width ratios
  RECIPIENT: [0.4, 0.6] as const, // NOSONAR — column width ratios
  TRANSFER: [0.35, 0.25, 0.4] as const, // NOSONAR — column width ratios
  SECURITY: [0.4, 0.6] as const, // NOSONAR — column width ratios
} as const;

const RISK_CRITERIA_COUNT = 9;
const PLACEHOLDER = '—';

interface TreatmentStrings {
  metaTitle: string;
  metaSubject: string;
  headerTitle: string;
  headerCreated: string;
  sectionOrg: string;
  sectionTreatment: string;
  sectionData: string;
  sectionRecipients: string;
  sectionRetention: string;
  sectionIndicators: string;
  sectionRisk: string;
  notSpecifiedM: string;
  notSpecifiedF: string;
  none: string;
  noneM: string;
  yes: string;
  no: string;
  never: string;
  notPlanned: string;
  statusValidatedAt: string;
  bullet: Record<string, string>;
  table: Record<string, string>;
  risk: Record<string, string>;
  riskLevel: Record<string, string>;
  freshness: Record<string, string>;
}

const STRINGS: Record<PdfLocale, TreatmentStrings> = {
  fr: {
    metaTitle: 'Fiche de traitement',
    metaSubject: 'Registre des traitements (RGPD Art. 30)',
    headerTitle: 'Fiche de traitement N°',
    headerCreated: 'Créé le',
    sectionOrg: 'Organisme',
    sectionTreatment: 'Traitement',
    sectionData: 'Données traitées',
    sectionRecipients: 'Destinataires & transferts',
    sectionRetention: 'Conservation & sécurité',
    sectionIndicators: 'Indicateurs',
    sectionRisk: 'Critères de risque (AIPD)',
    notSpecifiedM: 'Non renseigné',
    notSpecifiedF: 'Non renseignée',
    none: 'Aucune',
    noneM: 'Aucun',
    yes: 'Oui',
    no: 'Non',
    never: 'Jamais',
    notPlanned: 'Non planifiée',
    statusValidatedAt: 'Validé le',
    bullet: {
      companyName: 'Raison sociale',
      siren: 'SIREN',
      address: 'Adresse',
      representative: 'Représentant',
      dpo: 'DPO',
      name: 'Nom',
      purpose: 'Finalité principale',
      subPurposes: 'Sous-finalités',
      legalBasis: 'Base légale',
      status: 'Statut',
      personCategories: 'Catégories de personnes',
      sensitiveData: 'Données sensibles (Art. 9)',
      retention: 'Durée globale',
      completeness: 'Complétude',
      risk: 'Risque',
      freshness: 'Fraîcheur',
      lastReview: 'Dernière revue',
      nextReview: 'Prochaine revue',
    },
    table: {
      dataCategories: 'Catégories de données',
      dataCategoriesEmpty: 'Catégories de données : Aucune',
      colCategory: 'Catégorie',
      colDescription: 'Description',
      colRetention: 'Rétention',
      recipients: 'Destinataires',
      recipientsEmpty: 'Destinataires : Aucun',
      colType: 'Type',
      colPrecision: 'Précision',
      transfers: 'Transferts hors UE',
      transfersEmpty: 'Transferts hors UE : Aucun',
      colOrg: 'Organisation',
      colCountry: 'Pays',
      colGuarantee: 'Garantie',
      security: 'Mesures de sécurité',
      securityEmpty: 'Mesures de sécurité : Aucune',
    },
    risk: {
      criteria: 'critères',
      evaluation: 'Évaluation / notation',
      automated: 'Décision automatisée',
      monitoring: 'Surveillance systématique',
      sensitive: 'Données sensibles',
      largeScale: 'Grande échelle',
      crossDataset: 'Croisement de données',
      vulnerable: 'Personnes vulnérables',
      innovative: 'Technologie innovante',
      exclusion: 'Exclusion de droits',
      aipdRequired: 'AIPD recommandée',
    },
    riskLevel: { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé' },
    freshness: { FRESH: 'À jour', PENDING_REVIEW: 'Revue en attente', OUTDATED: 'Obsolète' },
  },
  en: {
    metaTitle: 'Processing record',
    metaSubject: 'Records of processing activities (GDPR Art. 30)',
    headerTitle: 'Processing record No.',
    headerCreated: 'Created on',
    sectionOrg: 'Organisation',
    sectionTreatment: 'Processing activity',
    sectionData: 'Data processed',
    sectionRecipients: 'Recipients & transfers',
    sectionRetention: 'Retention & security',
    sectionIndicators: 'Indicators',
    sectionRisk: 'Risk criteria (DPIA)',
    notSpecifiedM: 'Not specified',
    notSpecifiedF: 'Not specified',
    none: 'None',
    noneM: 'None',
    yes: 'Yes',
    no: 'No',
    never: 'Never',
    notPlanned: 'Not planned',
    statusValidatedAt: 'Validated on',
    bullet: {
      companyName: 'Company name',
      siren: 'SIREN',
      address: 'Address',
      representative: 'Representative',
      dpo: 'DPO',
      name: 'Name',
      purpose: 'Primary purpose',
      subPurposes: 'Sub-purposes',
      legalBasis: 'Legal basis',
      status: 'Status',
      personCategories: 'Categories of persons',
      sensitiveData: 'Sensitive data (Art. 9)',
      retention: 'Overall retention',
      completeness: 'Completeness',
      risk: 'Risk',
      freshness: 'Freshness',
      lastReview: 'Last review',
      nextReview: 'Next review',
    },
    table: {
      dataCategories: 'Data categories',
      dataCategoriesEmpty: 'Data categories: None',
      colCategory: 'Category',
      colDescription: 'Description',
      colRetention: 'Retention',
      recipients: 'Recipients',
      recipientsEmpty: 'Recipients: None',
      colType: 'Type',
      colPrecision: 'Detail',
      transfers: 'Transfers outside EU',
      transfersEmpty: 'Transfers outside EU: None',
      colOrg: 'Organisation',
      colCountry: 'Country',
      colGuarantee: 'Safeguard',
      security: 'Security measures',
      securityEmpty: 'Security measures: None',
    },
    risk: {
      criteria: 'criteria',
      evaluation: 'Evaluation / scoring',
      automated: 'Automated decision-making',
      monitoring: 'Systematic monitoring',
      sensitive: 'Sensitive data',
      largeScale: 'Large scale',
      crossDataset: 'Dataset combination',
      vulnerable: 'Vulnerable persons',
      innovative: 'Innovative technology',
      exclusion: 'Exclusion from rights',
      aipdRequired: 'DPIA recommended',
    },
    riskLevel: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' },
    freshness: { FRESH: 'Up to date', PENDING_REVIEW: 'Review pending', OUTDATED: 'Outdated' },
  },
};

@Injectable()
export class PdfExportService {
  constructor(private readonly auditLog: AuditLogService) {}

  async generatePdf(
    treatment: TreatmentWithIndicators,
    org: Organization,
    userId: string,
    locale: PdfLocale = 'fr',
  ): Promise<Buffer> {
    const auditEntry = await this.auditLog.create({
      action: 'EXPORT',
      entity: 'treatment',
      entityId: treatment.id,
      oldValue: null,
      newValue: { format: 'pdf', exportedAt: new Date().toISOString(), locale },
      performedBy: userId,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: PDF_PAGE_MARGINS,
        bufferPages: true,
      });
      registerArticle30Fonts(doc);
      const s = STRINGS[locale];
      setPdfMetadata(doc, {
        title: `${s.metaTitle} — ${treatment.name}`,
        subject: s.metaSubject,
        keywords: ['RGPD', 'GDPR', 'Article 30', 'Register', 'Treatment'],
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildDocument(doc, treatment, org, auditEntry.hash, locale);
      doc.end();
    });
  }

  private buildDocument(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    org: Organization,
    auditHash: string,
    locale: PdfLocale,
  ): void {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    this.drawDocumentHeader(doc, treatment, org, locale);
    this.drawOrganisationSection(doc, org, locale);
    this.drawTreatmentSection(doc, treatment, locale);
    this.drawDataProcessedSection(doc, treatment, pageWidth, locale);
    this.drawRecipientsTransfersSection(doc, treatment, pageWidth, locale);
    this.drawRetentionSecuritySection(doc, treatment, pageWidth, locale);
    this.drawIndicatorsSection(doc, treatment, locale);
    this.drawRiskCriteriaSection(doc, treatment, locale);
    this.drawDocumentFooter(doc, auditHash, locale);
  }

  private drawDocumentHeader(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    org: Organization,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawHeader(doc, {
      org,
      title: `${s.headerTitle} ${treatment.refNumber ?? 'N/A'}`,
      subtitle: treatment.name,
      meta: `${s.headerCreated} ${formatDate(treatment.createdAt, locale)}`,
    });
  }

  private drawDocumentFooter(doc: PDFKit.PDFDocument, auditHash: string, locale: PdfLocale): void {
    drawFooterAllPages(doc, {
      hashSeal: formatHashSeal(auditHash),
      locale,
    });
  }

  private drawOrganisationSection(
    doc: PDFKit.PDFDocument,
    org: Organization,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionOrg);
    this.drawBulletPoint(doc, s.bullet.companyName, org.companyName ?? s.notSpecifiedM);
    this.drawBulletPoint(doc, s.bullet.siren, org.siren ?? s.notSpecifiedM);
    this.drawBulletPoint(doc, s.bullet.address, org.address ?? s.notSpecifiedF);
    this.drawBulletPoint(doc, s.bullet.representative, org.representativeName ?? s.notSpecifiedM);
    this.drawBulletPoint(doc, s.bullet.dpo, this.formatDpo(org, locale));
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  private drawTreatmentSection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionTreatment);
    this.drawBulletPoint(doc, s.bullet.name, treatment.name);
    this.drawBulletPoint(doc, s.bullet.purpose, treatment.purpose ?? s.notSpecifiedF);
    this.drawBulletPoint(
      doc,
      s.bullet.subPurposes,
      this.formatArray(treatment.subPurposes, locale),
    );
    this.drawBulletPoint(
      doc,
      s.bullet.legalBasis,
      this.getLegalBasisLabel(treatment.legalBasis, locale),
    );
    this.drawStatusBullet(doc, treatment, locale);
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  /**
   * Statut row: bullet label, then a colored pill (green for VALIDATED, amber
   * for DRAFT) + optional "validated on …" suffix. Mirrors the web's
   * `<StatusBadge>` rather than printing a raw enum.
   */
  private drawStatusBullet(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    const palette =
      treatment.status === 'VALIDATED'
        ? { fill: PDF_COLORS.successBg, fg: PDF_COLORS.successFg }
        : { fill: PDF_COLORS.warnBg, fg: PDF_COLORS.warnFg };
    const statusLabel = TREATMENT_STATUS_LABELS[locale][treatment.status] ?? treatment.status;

    const x = doc.page.margins.left;
    const y = doc.y;
    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(PDF_COLORS.dark)
      .text(`• ${s.bullet.status} : `, x, y, { continued: false });
    const labelEndX = x + doc.widthOfString(`• ${s.bullet.status} : `);

    // Pill width adapts to label width with small horizontal padding.
    doc.font(PDF_FONT_BOLD).fontSize(PDF_FONT_SIZES.pill);
    const pillWidth = Math.max(50, doc.widthOfString(statusLabel) + 16);
    drawPill(doc, {
      label: statusLabel,
      palette,
      x: labelEndX,
      y: y + 1,
      width: pillWidth,
    });

    if (treatment.validatedAt) {
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.body)
        .fillColor(PDF_COLORS.medium)
        .text(
          `  · ${s.statusValidatedAt} ${formatDate(treatment.validatedAt, locale)}`,
          labelEndX + pillWidth + 4,
          y,
          { lineBreak: false },
        );
    }
    doc.x = x;
    doc.y = Math.max(doc.y, y + PDF_LAYOUT.pillHeight) + 2;
  }

  private drawDataProcessedSection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    pageWidth: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionData);
    this.drawBulletPoint(
      doc,
      s.bullet.personCategories,
      this.formatPersonCategories(treatment.personCategories, locale),
    );
    doc.moveDown(PDF_SPACING.TABLE_GAP);
    this.drawDataCategoriesTable(
      doc,
      treatment.dataCategories as DataCategoryEntry[] | null,
      pageWidth,
      locale,
    );
    if (treatment.hasSensitiveData && treatment.sensitiveCategories?.length > 0) {
      this.drawBulletPoint(
        doc,
        s.bullet.sensitiveData,
        this.formatSensitiveCategories(treatment.sensitiveCategories, locale),
      );
    }
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  private drawRecipientsTransfersSection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    pageWidth: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionRecipients);
    this.drawRecipientsTable(
      doc,
      treatment.recipients as RecipientEntry[] | null,
      pageWidth,
      locale,
    );
    doc.moveDown(PDF_SPACING.TABLE_GAP);
    this.drawTransfersTable(doc, treatment.transfers as TransferEntry[] | null, pageWidth, locale);
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  private drawRetentionSecuritySection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    pageWidth: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionRetention);
    this.drawBulletPoint(doc, s.bullet.retention, treatment.retentionPeriod ?? s.notSpecifiedF);
    doc.moveDown(PDF_SPACING.TABLE_GAP);
    this.drawSecurityMeasuresTable(
      doc,
      treatment.securityMeasuresDetailed as SecurityMeasureEntry[] | null,
      pageWidth,
      locale,
    );
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  private drawIndicatorsSection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    locale: PdfLocale,
  ): void {
    if (!treatment.indicators) {
      return;
    }
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionIndicators);
    this.drawBulletPoint(doc, s.bullet.completeness, `${treatment.indicators.completenessScore}%`);
    this.drawBulletPoint(
      doc,
      s.bullet.risk,
      `${this.getRiskLevelLabel(treatment.indicators.riskLevel, locale)} (${treatment.indicators.riskCriteriaCount}/${RISK_CRITERIA_COUNT} ${s.risk.criteria})`,
    );
    this.drawBulletPoint(
      doc,
      s.bullet.freshness,
      this.getFreshnessLabel(treatment.indicators.freshnessStatus, locale),
    );
    const lastReviewText = treatment.lastReviewedAt
      ? formatDate(treatment.lastReviewedAt, locale)
      : s.never;
    this.drawBulletPoint(doc, s.bullet.lastReview, lastReviewText);
    const nextReviewText = treatment.nextReviewAt
      ? formatDate(treatment.nextReviewAt, locale)
      : s.notPlanned;
    this.drawBulletPoint(doc, s.bullet.nextReview, nextReviewText);
    doc.moveDown(PDF_SPACING.SECTION_GAP);
  }

  private drawRiskCriteriaSection(
    doc: PDFKit.PDFDocument,
    treatment: TreatmentWithIndicators,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawSectionHeader(doc, s.sectionRisk);
    this.drawRiskCriterion(doc, s.risk.evaluation, treatment.hasEvaluationScoring);
    this.drawRiskCriterion(doc, s.risk.automated, treatment.hasAutomatedDecisions);
    this.drawRiskCriterion(doc, s.risk.monitoring, treatment.hasSystematicMonitoring);
    this.drawRiskCriterion(doc, s.risk.sensitive, treatment.hasSensitiveData);
    this.drawRiskCriterion(doc, s.risk.largeScale, treatment.isLargeScale);
    this.drawRiskCriterion(doc, s.risk.crossDataset, treatment.hasCrossDatasetLinking);
    this.drawRiskCriterion(doc, s.risk.vulnerable, treatment.involvesVulnerablePersons);
    this.drawRiskCriterion(doc, s.risk.innovative, treatment.usesInnovativeTech);
    this.drawRiskCriterion(doc, s.risk.exclusion, treatment.canExcludeFromRights);
    doc.moveDown(PDF_SPACING.TABLE_GAP);

    const aipdRequired = treatment.indicators?.aipdRequired ?? false;
    const aipdLabel = aipdRequired ? s.yes : s.no;
    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(aipdRequired ? PDF_COLORS.danger : PDF_COLORS.success)
      .text(`→ ${s.risk.aipdRequired} : ${aipdLabel}`, {
        indent: PDF_TABLE.rowIndent,
      });
    doc.fillColor(PDF_COLORS.dark);
    doc.moveDown(PDF_SPACING.MOVE_DOWN_FULL);
  }

  private drawBulletPoint(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(PDF_COLORS.dark)
      .text(`• ${label} : `, { continued: true })
      .font(PDF_FONT_REGULAR)
      .text(value);
  }

  /**
   * Risk-criterion row. Filled circle for present (= AIPD-relevant risk),
   * empty circle for absent. Color follows risk semantics: red when present,
   * green when absent — same convention as the web's risk strip. When
   * present, the row sits on a faint red tint to mirror the web's tinted
   * card pattern.
   */
  private drawRiskCriterion(doc: PDFKit.PDFDocument, label: string, value: boolean): void {
    const icon = value ? '●' : '○';
    const color = value ? PDF_COLORS.danger : PDF_COLORS.success;
    const rowHeight = PDF_FONT_SIZES.body + 6;
    const x = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startY = doc.y;

    if (value) {
      doc
        .save()
        .roundedRect(x, startY - 1, width, rowHeight, 3)
        .fill(PDF_COLORS.dangerBg)
        .restore();
    }

    doc.x = x;
    doc.y = startY + 2;
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.body)
      .fillColor(color)
      .text(`${icon}  `, { continued: true, indent: PDF_TABLE.rowIndent })
      .fillColor(PDF_COLORS.dark)
      .text(label);
    doc.y = Math.max(doc.y, startY + rowHeight);
  }

  private drawDataCategoriesTable(
    doc: PDFKit.PDFDocument,
    categories: DataCategoryEntry[] | null,
    width: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawTable(doc, {
      label: s.table.dataCategories,
      emptyLabel: s.table.dataCategoriesEmpty,
      width,
      columns: [
        { header: s.table.colCategory, ratio: PDF_COL_RATIO.DATA_CAT[0] },
        { header: s.table.colDescription, ratio: PDF_COL_RATIO.DATA_CAT[1] },
        { header: s.table.colRetention, ratio: PDF_COL_RATIO.DATA_CAT[2] },
      ],
      rows: (categories ?? []).map(cat => [
        this.getDataCategoryLabel(cat.category, locale),
        cat.description ?? PLACEHOLDER,
        cat.retentionPeriod ?? PLACEHOLDER,
      ]),
    });
  }

  private drawRecipientsTable(
    doc: PDFKit.PDFDocument,
    recipients: RecipientEntry[] | null,
    width: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawTable(doc, {
      label: s.table.recipients,
      emptyLabel: s.table.recipientsEmpty,
      width,
      columns: [
        { header: s.table.colType, ratio: PDF_COL_RATIO.RECIPIENT[0] },
        { header: s.table.colPrecision, ratio: PDF_COL_RATIO.RECIPIENT[1] },
      ],
      rows: (recipients ?? []).map(rec => [
        this.getRecipientTypeLabel(rec.type, locale),
        rec.precision ?? PLACEHOLDER,
      ]),
    });
  }

  private drawTransfersTable(
    doc: PDFKit.PDFDocument,
    transfers: TransferEntry[] | null,
    width: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawTable(doc, {
      label: s.table.transfers,
      emptyLabel: s.table.transfersEmpty,
      width,
      columns: [
        { header: s.table.colOrg, ratio: PDF_COL_RATIO.TRANSFER[0] },
        { header: s.table.colCountry, ratio: PDF_COL_RATIO.TRANSFER[1] },
        { header: s.table.colGuarantee, ratio: PDF_COL_RATIO.TRANSFER[2] },
      ],
      rows: (transfers ?? []).map(transfer => [
        transfer.destinationOrg,
        transfer.country,
        this.getGuaranteeTypeLabel(transfer.guaranteeType, locale),
      ]),
    });
  }

  private drawSecurityMeasuresTable(
    doc: PDFKit.PDFDocument,
    measures: SecurityMeasureEntry[] | null,
    width: number,
    locale: PdfLocale,
  ): void {
    const s = STRINGS[locale];
    drawTable(doc, {
      label: s.table.security,
      emptyLabel: s.table.securityEmpty,
      width,
      columns: [
        { header: s.table.colType, ratio: PDF_COL_RATIO.SECURITY[0] },
        { header: s.table.colPrecision, ratio: PDF_COL_RATIO.SECURITY[1] },
      ],
      rows: (measures ?? []).map(measure => [
        this.getSecurityMeasureLabel(measure.type, locale),
        measure.precision ?? PLACEHOLDER,
      ]),
    });
  }

  private getLegalBasisLabel(code: string | null, locale: PdfLocale): string {
    if (!code) {
      return STRINGS[locale].notSpecifiedF;
    }
    const basis = LEGAL_BASES.find(b => b.code === code);
    if (!basis) return code;
    return locale === 'en' ? basis.labelEn : basis.labelFr;
  }

  private getDataCategoryLabel(code: string, locale: PdfLocale): string {
    const cat = DATA_CATEGORIES.find(c => c.code === code);
    if (!cat) return code;
    return locale === 'en' ? cat.labelEn : cat.labelFr;
  }

  private getRecipientTypeLabel(code: string, locale: PdfLocale): string {
    const type = RECIPIENT_TYPES.find(t => t.code === code);
    if (!type) return code;
    return locale === 'en' ? type.labelEn : type.labelFr;
  }

  private getSecurityMeasureLabel(code: string, locale: PdfLocale): string {
    const measure = SECURITY_MEASURES.find(m => m.code === code);
    if (!measure) return code;
    return locale === 'en' ? measure.labelEn : measure.labelFr;
  }

  private getSensitiveDataCategoryLabel(code: string, locale: PdfLocale): string {
    const cat = SENSITIVE_DATA_CATEGORIES.find(c => c.code === code);
    if (!cat) return code;
    return locale === 'en' ? cat.labelEn : cat.labelFr;
  }

  private getGuaranteeTypeLabel(code: string, locale: PdfLocale): string {
    const type = GUARANTEE_TYPES.find(t => t.code === code);
    if (!type) return code;
    return locale === 'en' ? type.labelEn : type.labelFr;
  }

  private getPersonCategoryLabel(code: string, locale: PdfLocale): string {
    const cat = PERSON_CATEGORIES.find(c => c.code === code);
    if (!cat) return code;
    return locale === 'en' ? cat.labelEn : cat.labelFr;
  }

  private getRiskLevelLabel(level: RiskLevel, locale: PdfLocale): string {
    const map = STRINGS[locale].riskLevel;
    return map[level] ?? level;
  }

  private getFreshnessLabel(status: FreshnessStatus, locale: PdfLocale): string {
    const map = STRINGS[locale].freshness;
    return map[status] ?? status;
  }

  private formatArray(arr: string[] | null, locale: PdfLocale): string {
    if (!arr || arr.length === 0) {
      return STRINGS[locale].none;
    }
    return arr.join(', ');
  }

  private formatDpo(org: Organization, locale: PdfLocale): string {
    const parts = [org.dpoName, org.dpoEmail, org.dpoPhone].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' · ');
    }
    return STRINGS[locale].notSpecifiedM;
  }

  private formatPersonCategories(categories: string[], locale: PdfLocale): string {
    if (!categories || categories.length === 0) {
      return STRINGS[locale].none;
    }
    return categories.map(c => this.getPersonCategoryLabel(c, locale)).join(', ');
  }

  private formatSensitiveCategories(categories: string[], locale: PdfLocale): string {
    if (!categories || categories.length === 0) {
      return STRINGS[locale].none;
    }
    return categories.map(c => this.getSensitiveDataCategoryLabel(c, locale)).join(', ');
  }
}
