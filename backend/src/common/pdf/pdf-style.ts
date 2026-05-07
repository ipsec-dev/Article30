/**
 * Shared visual language for every PDF the backend produces.
 *
 * Treat this module as the single source of truth: any per-PDF tweak that
 * doesn't fit one of the helpers below is a smell — fold it back in here so
 * the suite stays uniform.
 */

import path from 'node:path';

const FONTS_DIR = path.join(__dirname, 'fonts');

export const PDF_FONT_BOLD = 'Article30-Bold';
export const PDF_FONT_REGULAR = 'Article30-Regular';
export const PDF_MARGIN = 40;

/**
 * Default page margins for every PDFDocument the backend creates. Bottom is
 * intentionally larger than the others to reserve room for the per-page
 * footer + audit-hash seal stamped by `drawFooterAllPages`. Without this
 * reservation, the natural content flow can collide with the fixed-position
 * footer.
 */
export const PDF_PAGE_MARGINS = {
  top: PDF_MARGIN,
  bottom: 80,
  left: PDF_MARGIN,
  right: PDF_MARGIN,
} as const;

/**
 * Register the Article30 typeface (Inter) on a PDFKit document.
 *
 * Must be called once on every newly-constructed `PDFDocument` BEFORE any
 * `.font(...)` call. Uses the bundled TTF files at `common/pdf/fonts/` (copied
 * to dist by nest-cli's `assets` config).
 */
export function registerArticle30Fonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(PDF_FONT_REGULAR, path.join(FONTS_DIR, 'Inter-Regular.ttf'));
  doc.registerFont(PDF_FONT_BOLD, path.join(FONTS_DIR, 'Inter-Bold.ttf'));
}

// Article30 design tokens — kept in lockstep with frontend/src/app/globals.css :root.
// Web UI uses CSS custom properties (var(--primary), var(--ink), etc.); PDFs
// can't, so we mirror the same hex values here.
export const PDF_COLORS = {
  primary: '#4f46e5', // var(--primary) — indigo
  dark: '#1f2328', // var(--ink)
  medium: '#424a53', // var(--ink-2)
  light: '#8c959f', // var(--ink-4) — for footer/captions; ink-3 (#656d76) is too dark for "light"
  divider: '#d1d9e0', // var(--a30-border)
  white: '#ffffff',
  black: '#000000',
  success: '#1a7f37', // var(--success)
  warning: '#9a6700', // var(--warn)
  danger: '#cf222e', // var(--danger)
  // Tinted bg/fg pairs for pills, callouts, and answer/severity chips. Use these
  // instead of reaching for raw hex — drift between services becomes invisible.
  // Source of truth: the Tailwind palette consumed by the web's `<Badge>` component
  // (green/amber/red/blue 100/800), NOT the legacy `--danger-bg` CSS var which
  // is unused by Badge.
  successBg: '#dcfce7', // tw green-100
  successFg: '#166534', // tw green-800
  warnBg: '#fef3c7', // tw amber-100
  warnFg: '#92400e', // tw amber-800
  dangerBg: '#fee2e2', // tw red-100
  dangerFg: '#991b1b', // tw red-800
  // CRITICAL severity stays *tinted* (web uses red-200/red-900) rather than a
  // solid filled chip — keeps the visual step from HIGH consistent across media.
  criticalBg: '#fecaca', // tw red-200
  criticalFg: '#7f1d1d', // tw red-900
  infoBg: '#dbeafe', // tw blue-100
  infoFg: '#1e40af', // tw blue-800
  mutedBg: '#f6f8fa', // var(--surface-2)
  mutedFg: '#475569', // tw slate-600
} as const;

export const PDF_FONT_SIZES = {
  title: 20,
  subtitle: 12,
  meta: 9,
  sectionHeader: 11,
  body: 10,
  detail: 9,
  pill: 8,
  footer: 8,
  badgeLabel: 14,
  cover: 24,
  coverScore: 72,
} as const;

export const PDF_LAYOUT = {
  badgeHeight: 36,
  badgeWidth: 280,
  badgeRadius: 18,
  scoreBarHeight: 6,
  scoreBarRadius: 3,
  scoreBarWidth: 280,
  pillHeight: 14,
  pillRadius: 7,
  ruleWidth: 0.5,
  // Callout panel (drawCallout): rounded background block with padded body text.
  calloutRadius: 4,
  calloutPadX: 10,
  calloutPadY: 8,
  calloutLineGap: 2,
  // Card wrapper (drawCardWrapper): rounded outline + interior padding,
  // mirrors the web's <Card> primitive at print scale.
  cardRadius: 6,
  cardPadX: 12,
  cardPadY: 12,
  cardBorderWidth: 0.6,
  // AcroForm field tokens (vendor questionnaire). Don't tweak per-PDF — fold
  // any new form layout back into these.
  formCheckboxSize: 12,
  formCheckboxLabelGap: 4,
  formCheckboxGroupGap: 14,
  formTextFieldHeight: 18,
  formCommentBoxHeight: 36,
  formPageBottomPadding: 80,
  formQuestionBlockHeight: 110,
  formQuestionGap: 8,
  formFieldBorderWidth: 0.5,
  // Pinned distance from the page's bottom *edge* (not bottom margin) for the
  // top of the per-page footer drawn by `drawFooterAllPages`. The page's
  // bottom margin (PDF_PAGE_MARGINS.bottom) is set wider than this so content
  // auto-page-breaks above the footer area instead of overlapping it.
  footerPinFromBottom: 50,
} as const;

export const PDF_TABLE = {
  /** Bullet-style horizontal indent for the section label drawn above a table. */
  bulletIndent: 10,
  /** Horizontal indent applied to data rows so the table sits inside the section. */
  rowIndent: 20,
  /** Vertical offset used to align column headers on the same baseline; assumes
   * detail-size text height of ~10pt. Don't change without re-eyeballing every PDF. */
  headerOffset: 10,
  /** Vertical gap between the section label and the column header row. */
  headerGap: 0.2,
  /** Vertical gap between data rows (0.5 line heights). Bumped from 0.3 so
   * adjacent rows don't visually glue together — important when one cell wraps
   * to two lines. */
  rowGap: 0.5,
} as const;

/** UI language for a generated PDF. Mirrors the frontend's `Locale` type. */
export type PdfLocale = 'fr' | 'en';

// Both locales use the same dd/mm/yyyy numeric format the web uses everywhere
// (frontend/src/lib/dates.ts). Switching EN to a "dd MMM yyyy" short-month
// shape silently created a print-vs-screen mismatch — keep them aligned.
const DATE_FMT_FR = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DATE_FMT_EN = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(value: Date | string, locale: PdfLocale = 'fr'): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return (locale === 'en' ? DATE_FMT_EN : DATE_FMT_FR).format(d);
}

interface OrgHeader {
  companyName?: string | null;
}

interface DrawHeaderOptions {
  org?: OrgHeader | null;
  title: string;
  subtitle?: string;
  meta?: string;
  /** Layout direction. Defaults to 'left' (Article30 editorial); 'center' kept
   * for backwards-compatibility with cover-page style PDFs (badges, score). */
  align?: 'left' | 'center';
}

export function drawHorizontalRule(doc: PDFKit.PDFDocument): void {
  const x1 = doc.page.margins.left;
  const x2 = doc.page.width - doc.page.margins.right;
  const y = doc.y;
  doc
    .save()
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(PDF_COLORS.divider)
    .lineWidth(PDF_LAYOUT.ruleWidth)
    .stroke()
    .restore();
}

export function drawHeader(doc: PDFKit.PDFDocument, opts: DrawHeaderOptions): void {
  const align = opts.align ?? 'left';
  if (opts.org?.companyName) {
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.meta)
      .fillColor(PDF_COLORS.light)
      .text(opts.org.companyName, { align: 'right' });
  }
  doc.moveDown(0.4);
  doc
    .font(PDF_FONT_BOLD)
    .fontSize(PDF_FONT_SIZES.title)
    .fillColor(PDF_COLORS.dark)
    .text(opts.title, { align });
  if (opts.subtitle) {
    doc.moveDown(0.3);
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.subtitle)
      .fillColor(PDF_COLORS.medium)
      .text(opts.subtitle, { align });
  }
  if (opts.meta) {
    doc.moveDown(0.2);
    doc
      .font(PDF_FONT_REGULAR)
      .fontSize(PDF_FONT_SIZES.meta)
      .fillColor(PDF_COLORS.light)
      .text(opts.meta, { align });
  }
  doc.moveDown(0.6);
  drawHorizontalRule(doc);
  doc.moveDown(0.6);
}

/**
 * Section heading — Article30 design: sentence-case bold with a small
 * indigo accent dot at the left. Matches the web's `SectionTitle` primitive
 * (no eyebrow, no UPPERCASE — that pattern was explicitly killed in the
 * Notion/GitHub direction set during the design chat).
 */
export function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  color: string = PDF_COLORS.dark,
): void {
  const x = doc.page.margins.left;
  const y = doc.y;
  const dotSize = 3;
  const dotGap = 6;
  // Indigo accent dot
  doc
    .save()
    .circle(x + dotSize / 2, y + PDF_FONT_SIZES.sectionHeader / 2 + 1, dotSize / 2)
    .fill(PDF_COLORS.primary)
    .restore();
  // Title
  doc
    .font(PDF_FONT_BOLD)
    .fontSize(PDF_FONT_SIZES.sectionHeader)
    .fillColor(color)
    .text(title, x + dotSize + dotGap, y);
  doc.x = x;
  doc.moveDown(0.3);
}

interface DrawFooterOptions {
  disclaimer?: string;
  locale?: PdfLocale;
}

const FOOTER_GENERATED_BY: Record<PdfLocale, (date: string) => string> = {
  fr: date => `Généré le ${date} par Article30`,
  en: date => `Generated on ${date} by Article30`,
};

/**
 * Renders the footer rule + "Generated on …" line + optional disclaimer at
 * the cursor's current Y. Uses absolute positioning (no `moveDown`) so it
 * cannot accidentally trigger a page break — important for
 * `drawFooterAllPages` which iterates a snapshotted page count and would
 * orphan footers on overflow pages.
 */
export function drawFooter(doc: PDFKit.PDFDocument, opts: DrawFooterOptions = {}): void {
  const locale = opts.locale ?? 'fr';
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const ruleY = doc.y;

  // Rule
  doc
    .save()
    .moveTo(x, ruleY)
    .lineTo(x + width, ruleY)
    .strokeColor(PDF_COLORS.divider)
    .lineWidth(PDF_LAYOUT.ruleWidth)
    .stroke()
    .restore();

  let cursorY = ruleY + 6;
  doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.footer).fillColor(PDF_COLORS.light);
  doc.text(FOOTER_GENERATED_BY[locale](formatDate(new Date(), locale)), x, cursorY, {
    width,
    align: 'center',
    lineBreak: false,
  });
  cursorY += PDF_FONT_SIZES.footer + 2;

  if (opts.disclaimer) {
    doc.text(opts.disclaimer, x, cursorY, {
      width,
      align: 'center',
      lineBreak: false,
    });
    cursorY += PDF_FONT_SIZES.footer + 2;
  }

  doc.y = cursorY;
}

interface DrawBadgeOptions {
  label: string;
  color: string;
  width?: number;
  height?: number;
}

export function drawBadge(doc: PDFKit.PDFDocument, opts: DrawBadgeOptions): void {
  const width = opts.width ?? PDF_LAYOUT.badgeWidth;
  const height = opts.height ?? PDF_LAYOUT.badgeHeight;
  const x = (doc.page.width - width) / 2;
  const y = doc.y;

  doc.save().roundedRect(x, y, width, height, PDF_LAYOUT.badgeRadius).fill(opts.color).restore();

  // Vertical centering — PDFKit's `baseline: 'middle'` aligns the em-box
  // center to the supplied y. Pure (height - fontSize)/2 math leaves caps
  // visibly off-center because Inter's ascent + descent ≠ fontSize and the
  // 'alphabetic' default baseline puts the line-box top at y, not the caps.
  doc.font(PDF_FONT_BOLD).fontSize(PDF_FONT_SIZES.badgeLabel).fillColor(PDF_COLORS.white);
  doc.text(opts.label, x, y + height / 2, {
    width,
    align: 'center',
    baseline: 'middle',
    lineBreak: false,
  });

  doc.x = doc.page.margins.left;
  doc.y = y + height + 10;
}

interface DrawScoreBarOptions {
  score: number;
  color: string;
  showPercent?: boolean;
  /** Optional left edge — when omitted, the bar centers on the page. */
  x?: number;
  /** Optional top edge — when omitted, the bar uses `doc.y`. */
  y?: number;
  /** Optional bar width — when omitted, defaults to PDF_LAYOUT.scoreBarWidth. */
  width?: number;
}

const SCORE_PERCENT = 100;

interface DrawDonutOptions {
  score: number;
  size?: number;
  stroke?: number;
  /** Centre point. Defaults to current cursor position with the donut anchored to the left margin. */
  x?: number;
  y?: number;
  /** Color for the filled arc. Defaults to PDF_COLORS.primary. */
  color?: string;
}

/**
 * Donut chart matching the web's `Donut` primitive — track ring + arc + centred percentage label.
 * Renders independently of cursor: caller specifies x/y or it anchors to current `doc.x`/`doc.y`.
 * Cursor is restored afterwards.
 */
export function drawDonut(doc: PDFKit.PDFDocument, opts: DrawDonutOptions): void {
  const size = opts.size ?? 72;
  const stroke = opts.stroke ?? 7;
  const score = Math.max(0, Math.min(SCORE_PERCENT, opts.score));
  const arcColor = opts.color ?? PDF_COLORS.primary;
  const cx = (opts.x ?? doc.x) + size / 2;
  const cy = (opts.y ?? doc.y) + size / 2;
  const radius = (size - stroke) / 2;
  const startAngle = -Math.PI / 2; // 12 o'clock
  const endAngle = startAngle + (score / SCORE_PERCENT) * 2 * Math.PI;

  // Track (full ring)
  doc
    .save()
    .lineWidth(stroke)
    .strokeColor(PDF_COLORS.divider)
    .circle(cx, cy, radius)
    .stroke()
    .restore();

  // Filled arc
  if (score > 0) {
    const segments = 64;
    const step = (endAngle - startAngle) / segments;
    doc.save().lineWidth(stroke).strokeColor(arcColor).lineCap('round');
    doc.moveTo(cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle));
    for (let i = 1; i <= segments; i++) {
      const a = startAngle + i * step;
      doc.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    }
    doc.stroke().restore();
  }

  // Centre label "{score}%"
  const labelFontSize = Math.round(size * 0.28);
  const percentFontSize = Math.round(size * 0.16);
  doc.save().font(PDF_FONT_BOLD).fontSize(labelFontSize).fillColor(PDF_COLORS.dark);
  const labelText = String(score);
  const labelWidth = doc.widthOfString(labelText);
  // baseline-y is height/4 above center for visual centering
  doc.text(labelText, cx - labelWidth / 2, cy - labelFontSize / 2);
  doc.restore();
  doc.save().font(PDF_FONT_REGULAR).fontSize(percentFontSize).fillColor(PDF_COLORS.medium);
  const percentText = '%';
  doc.text(percentText, cx - labelWidth / 2 + labelWidth + 1, cy - percentFontSize / 2 + 4);
  doc.restore();
}

interface DrawHashSealOptions {
  /** Short hash string from formatHashSeal(). */
  short: string;
  /** Optional leading label, defaults to "Audit". */
  label?: string;
}

/**
 * Format a full audit-log chain hash as the short pill rendered by drawHashSeal.
 * Example: "f3a210b9...91c4d5e6" → "f3a2…d5e6".
 */
export function formatHashSeal(fullHash: string): string {
  if (fullHash.length < 8) return fullHash;
  return `${fullHash.slice(0, 4)}…${fullHash.slice(-4)}`;
}

/**
 * Audit hash-seal chip — small mono text with leading label and a small
 * "chain" glyph (square outline + two diagonal strokes), mirrors the web's
 * `HashSeal` primitive (the `.hash-chain` repeating-linear-gradient pattern).
 * Used in PDF footers to convey the tamper-evident seal.
 */
/**
 * Audit hash-seal chip — small mono text with leading label and a small
 * "chain" glyph (square outline + two diagonal strokes), mirrors the web's
 * `HashSeal` primitive (the `.hash-chain` repeating-linear-gradient pattern).
 * Used in PDF footers to convey the tamper-evident seal.
 *
 * Implementation note: do NOT wrap in `doc.save()/restore()`. PDFKit's
 * `text(..., { lineBreak: false })` produces an unbalanced PDF content stream
 * inside an explicit save block, emitting "Restoring state when no valid
 * states to pop" warnings on every page. Since this is always the LAST thing
 * drawn on each page (via `drawFooterAllPages`), state pollution is harmless.
 */
export function drawHashSeal(doc: PDFKit.PDFDocument, opts: DrawHashSealOptions): void {
  const label = opts.label ?? 'Audit';
  const text = `${label} ${opts.short}`;
  const glyphSize = 6;
  const glyphTextGap = 4;

  doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.footer).fillColor(PDF_COLORS.light);
  const textWidth = doc.widthOfString(text);
  const totalWidth = glyphSize + glyphTextGap + textWidth;
  const startX = (doc.page.width - totalWidth) / 2;
  const baselineY = doc.y;
  // Vertically centre the glyph against the text cap height.
  const glyphY = baselineY + (PDF_FONT_SIZES.footer - glyphSize) / 2;

  // Square outline + two diagonal strokes — reads as a "chain" pattern at
  // this scale without needing PDFKit's clip path (which produced state
  // imbalance on later pages).
  doc.lineWidth(0.4).strokeColor(PDF_COLORS.light);
  doc.rect(startX, glyphY, glyphSize, glyphSize).stroke();
  doc
    .moveTo(startX, glyphY + glyphSize)
    .lineTo(startX + glyphSize, glyphY)
    .stroke();
  doc
    .moveTo(startX + glyphSize / 2, glyphY + glyphSize)
    .lineTo(startX + glyphSize, glyphY + glyphSize / 2)
    .stroke();

  // Reset fill to text color (stroke calls don't touch fillColor but be defensive).
  doc.fillColor(PDF_COLORS.light);
  // Width gets a 4pt buffer beyond the measured text — without it, hashes
  // whose chars happen to be slightly wider than average wrap onto a second
  // line ("Audit 2e4e…" / "7cbc"). PDFKit honours `lineBreak: false` for
  // line-internal wrapping but still re-flows when the rendered width
  // exceeds the supplied bounding `width`.
  doc.text(text, startX + glyphSize + glyphTextGap, baselineY, {
    width: textWidth + 4,
    lineBreak: false,
  });
}

export function drawScoreBar(doc: PDFKit.PDFDocument, opts: DrawScoreBarOptions): void {
  // Default to a centered 280pt bar with the percent caption underneath
  // (cover-page convention). Callers can override `x`, `y`, `width` for
  // inline / left-aligned layouts (e.g. score-breakdown rows).
  const width = opts.width ?? PDF_LAYOUT.scoreBarWidth;
  const x = opts.x ?? (doc.page.width - width) / 2;
  const y = opts.y ?? doc.y;
  const filled = (Math.max(0, Math.min(SCORE_PERCENT, opts.score)) / SCORE_PERCENT) * width;

  doc
    .save()
    .roundedRect(x, y, width, PDF_LAYOUT.scoreBarHeight, PDF_LAYOUT.scoreBarRadius)
    .fill(PDF_COLORS.divider)
    .restore();

  if (filled > 0) {
    doc
      .save()
      .roundedRect(x, y, filled, PDF_LAYOUT.scoreBarHeight, PDF_LAYOUT.scoreBarRadius)
      .fill(opts.color)
      .restore();
  }

  if (opts.showPercent !== false) {
    doc
      .font(PDF_FONT_BOLD)
      .fontSize(PDF_FONT_SIZES.meta)
      .fillColor(PDF_COLORS.medium)
      .text(`${opts.score}%`, x, y + PDF_LAYOUT.scoreBarHeight + 4, {
        width,
        align: 'center',
      });
  }

  doc.x = doc.page.margins.left;
  doc.y = y + PDF_LAYOUT.scoreBarHeight + 14;
}

interface PillPalette {
  fill: string;
  fg: string;
}

interface DrawPillOptions {
  label: string;
  palette: PillPalette;
  x: number;
  y: number;
  width: number;
}

export function drawPill(doc: PDFKit.PDFDocument, opts: DrawPillOptions): void {
  doc
    .save()
    .roundedRect(opts.x, opts.y, opts.width, PDF_LAYOUT.pillHeight, PDF_LAYOUT.pillRadius)
    .fill(opts.palette.fill)
    .restore();
  // Vertical centering — see `drawBadge` for the rationale behind using
  // `baseline: 'middle'` instead of computing offsets from fontSize.
  doc.font(PDF_FONT_BOLD).fontSize(PDF_FONT_SIZES.pill).fillColor(opts.palette.fg);
  doc.text(opts.label, opts.x, opts.y + PDF_LAYOUT.pillHeight / 2, {
    width: opts.width,
    align: 'center',
    baseline: 'middle',
    lineBreak: false,
  });
}

/**
 * Tables write absolute X coordinates per column; without this, doc.x stays
 * in the rightmost column and every subsequent line cascades off-page.
 */
export function resetCursorToLeftMargin(doc: PDFKit.PDFDocument): void {
  doc.x = doc.page.margins.left;
}

interface PdfTableColumn {
  header: string;
  /** Fraction of the table width to allocate. Ratios should sum to 1.0. */
  ratio: number;
}

interface DrawTableOptions {
  /** Section label drawn in bold above the table (e.g. "  Categories de donnees:"). */
  label: string;
  /** Optional fallback rendered when rows is empty (e.g. "  Categories: Aucune"). */
  emptyLabel?: string;
  columns: PdfTableColumn[];
  /** Rows pre-mapped to cell strings; each row's length must match columns.length. */
  rows: string[][];
  /** Total available width — usually `doc.page.width - left - right margins`. */
  width: number;
}

/**
 * Draws a labelled multi-column table with absolute-x cell positioning.
 * Replaces the per-PDF `drawXTable` private methods.
 *
 * The header alignment trick (`headerY = doc.y - PDF_TABLE.headerOffset`) is
 * fragile — see PDF_TABLE.headerOffset comment.
 */
export function drawTable(doc: PDFKit.PDFDocument, opts: DrawTableOptions): void {
  if (opts.rows.length === 0) {
    if (opts.emptyLabel) {
      doc
        .font(PDF_FONT_REGULAR)
        .fontSize(PDF_FONT_SIZES.detail)
        .text(opts.emptyLabel, { indent: PDF_TABLE.bulletIndent });
    }
    return;
  }

  doc
    .font(PDF_FONT_BOLD)
    .fontSize(PDF_FONT_SIZES.detail)
    .text(opts.label, { indent: PDF_TABLE.bulletIndent });
  doc.moveDown(PDF_TABLE.headerGap);

  const colWidths = opts.columns.map(c => opts.width * c.ratio);
  const offsets: number[] = [];
  let acc = 0;
  for (const w of colWidths) {
    offsets.push(acc);
    acc += w;
  }
  const startX = doc.x + PDF_TABLE.rowIndent;

  // Header row — first cell sets baseline; subsequent cells use the
  // computed `headerY` to stay on the same line.
  doc.font(PDF_FONT_BOLD).fontSize(PDF_FONT_SIZES.pill);
  doc.text(opts.columns[0].header, startX, doc.y, { width: colWidths[0], continued: false });
  const headerY = doc.y - PDF_TABLE.headerOffset;
  for (let i = 1; i < opts.columns.length; i++) {
    doc.text(opts.columns[i].header, startX + offsets[i], headerY, { width: colWidths[i] });
  }

  // Data rows. Per-row, write each cell from the same `rowY`, then advance
  // to the *tallest* cell's bottom so wrapped cells don't bleed into the
  // next row.
  doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.pill);
  for (const row of opts.rows) {
    const rowY = doc.y;
    let rowBottom = rowY;
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], startX + offsets[i], rowY, { width: colWidths[i] });
      if (doc.y > rowBottom) rowBottom = doc.y;
    }
    doc.y = rowBottom;
    doc.moveDown(PDF_TABLE.rowGap);
  }
  resetCursorToLeftMargin(doc);
}

/**
 * Shared bilingual labels for the answer enum used by the screening,
 * audit-package checklist, and vendor questionnaire PDFs. Single source of
 * truth — don't re-declare per file.
 */
export const ANSWER_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    YES: 'Oui',
    NO: 'Non',
    PARTIAL: 'Partiel',
    NA: 'N/A',
    IN_PROGRESS: 'En cours',
  },
  en: {
    YES: 'Yes',
    NO: 'No',
    PARTIAL: 'Partial',
    NA: 'N/A',
    IN_PROGRESS: 'In progress',
  },
};

export const SEVERITY_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    LOW: 'Faible',
    MEDIUM: 'Moyenne',
    HIGH: 'Élevée',
    CRITICAL: 'Critique',
  },
  en: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  },
};

export const VIOLATION_STATUS_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    DETECTED: 'Détectée',
    ASSESSED: 'Évaluée',
    CONTAINED: 'Contenue',
    NOTIFIED_CNIL: 'Notifiée CNIL',
    NOTIFIED_PERSONS: 'Personnes notifiées',
    REMEDIATED: 'Remédiée',
    CLOSED: 'Clôturée',
  },
  en: {
    DETECTED: 'Detected',
    ASSESSED: 'Assessed',
    CONTAINED: 'Contained',
    NOTIFIED_CNIL: 'CNIL notified',
    NOTIFIED_PERSONS: 'Persons notified',
    REMEDIATED: 'Remediated',
    CLOSED: 'Closed',
  },
};

export const TREATMENT_STATUS_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    DRAFT: 'Brouillon',
    VALIDATED: 'Validé',
  },
  en: {
    DRAFT: 'Draft',
    VALIDATED: 'Validated',
  },
};

export const CHECKLIST_CATEGORY_LABELS: Record<PdfLocale, Record<string, string>> = {
  fr: {
    breach: 'Violations & incidents',
    'privacy-by-design': 'Privacy by design',
    'processor-management': 'Sous-traitants',
    'dpo-governance': 'DPO & gouvernance',
    'international-transfers': 'Transferts internationaux',
    'records-accountability': 'Registre & redevabilité',
  },
  en: {
    breach: 'Breaches & incidents',
    'privacy-by-design': 'Privacy by design',
    'processor-management': 'Processor management',
    'dpo-governance': 'DPO & governance',
    'international-transfers': 'International transfers',
    'records-accountability': 'Records & accountability',
  },
};

/** Pulls the localized label for an enum value from a bilingual map; falls
 * back to the raw value if missing. */
export function localizedLabel(
  map: Record<PdfLocale, Record<string, string>>,
  locale: PdfLocale,
  key: string,
): string {
  return map[locale][key] ?? key;
}

const ANSWER_PALETTE: Record<string, PillPalette> = {
  YES: { fill: PDF_COLORS.successBg, fg: PDF_COLORS.successFg },
  NO: { fill: PDF_COLORS.dangerBg, fg: PDF_COLORS.dangerFg },
  PARTIAL: { fill: PDF_COLORS.warnBg, fg: PDF_COLORS.warnFg },
  IN_PROGRESS: { fill: PDF_COLORS.infoBg, fg: PDF_COLORS.infoFg },
  NA: { fill: PDF_COLORS.mutedBg, fg: PDF_COLORS.mutedFg },
};

const SEVERITY_PALETTE: Record<string, PillPalette> = {
  LOW: { fill: PDF_COLORS.infoBg, fg: PDF_COLORS.infoFg },
  MEDIUM: { fill: PDF_COLORS.warnBg, fg: PDF_COLORS.warnFg },
  HIGH: { fill: PDF_COLORS.dangerBg, fg: PDF_COLORS.dangerFg },
  CRITICAL: { fill: PDF_COLORS.criticalBg, fg: PDF_COLORS.criticalFg },
};

interface DrawSemanticPillOptions {
  x: number;
  y: number;
  width: number;
  locale?: PdfLocale;
}

/** Pill chip rendering an answer-enum value with the canonical label + palette. */
export function drawAnswerPill(
  doc: PDFKit.PDFDocument,
  answer: string,
  opts: DrawSemanticPillOptions,
): void {
  const locale = opts.locale ?? 'fr';
  drawPill(doc, {
    label: ANSWER_LABELS[locale][answer] ?? answer,
    palette: ANSWER_PALETTE[answer] ?? ANSWER_PALETTE.NA,
    x: opts.x,
    y: opts.y,
    width: opts.width,
  });
}

/** Pill chip rendering a severity-enum value with the canonical label + palette. */
export function drawSeverityPill(
  doc: PDFKit.PDFDocument,
  severity: string,
  opts: DrawSemanticPillOptions,
): void {
  const locale = opts.locale ?? 'fr';
  drawPill(doc, {
    label: SEVERITY_LABELS[locale][severity] ?? severity,
    palette: SEVERITY_PALETTE[severity] ?? SEVERITY_PALETTE.LOW,
    x: opts.x,
    y: opts.y,
    width: opts.width,
  });
}

interface DrawCalloutOptions {
  tone: 'danger' | 'warn' | 'success' | 'info';
  lines: string[];
}

const CALLOUT_PALETTE: Record<DrawCalloutOptions['tone'], PillPalette> = {
  danger: { fill: PDF_COLORS.dangerBg, fg: PDF_COLORS.danger },
  warn: { fill: PDF_COLORS.warnBg, fg: PDF_COLORS.warnFg },
  success: { fill: PDF_COLORS.successBg, fg: PDF_COLORS.successFg },
  info: { fill: PDF_COLORS.infoBg, fg: PDF_COLORS.infoFg },
};

/**
 * Tinted callout panel — rounded background + padded body lines. Used for
 * red flags, attention boxes, success confirmations. Replaces ad-hoc panels
 * inlined in individual services.
 *
 * Page-safety: PDFKit shapes don't span page boundaries. If the callout
 * wouldn't fit in the remaining page space, force a page break first so the
 * box and its body sit together on the next page.
 */
export function drawCallout(doc: PDFKit.PDFDocument, opts: DrawCalloutOptions): void {
  if (opts.lines.length === 0) return;

  const palette = CALLOUT_PALETTE[opts.tone];
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const innerWidth = width - 2 * PDF_LAYOUT.calloutPadX;

  doc.font(PDF_FONT_REGULAR).fontSize(PDF_FONT_SIZES.detail);
  const totalTextHeight = opts.lines.reduce(
    (acc, line) =>
      acc + doc.heightOfString(line, { width: innerWidth }) + PDF_LAYOUT.calloutLineGap,
    0,
  );
  const blockHeight = totalTextHeight + 2 * PDF_LAYOUT.calloutPadY;

  // Force a page break if the callout would overflow the content area.
  const pageContentBottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + blockHeight > pageContentBottom) {
    doc.addPage();
  }

  const startY = doc.y;
  doc
    .save()
    .roundedRect(x, startY, width, blockHeight, PDF_LAYOUT.calloutRadius)
    .fill(palette.fill)
    .restore();

  let cursorY = startY + PDF_LAYOUT.calloutPadY;
  doc.fillColor(palette.fg);
  for (const line of opts.lines) {
    doc.text(line, x + PDF_LAYOUT.calloutPadX, cursorY, { width: innerWidth });
    cursorY = doc.y + PDF_LAYOUT.calloutLineGap;
  }
  resetCursorToLeftMargin(doc);
  doc.y = startY + blockHeight;
}

/**
 * Wraps the output of `render()` in a rounded outline + interior padding —
 * the print analogue of the web's `<Card>` primitive. Use sparingly: only
 * for sections the web explicitly cards (e.g. screening answers, vendor
 * detail blocks).
 *
 * Page-safety: PDFKit cannot draw a single shape across page boundaries.
 * If the estimated `bodyHeight` would overflow the current page, the helper
 * silently renders without the card chrome rather than producing an orphaned
 * outline that clips at the page break. Content still flows correctly.
 */
export function drawCardWrapper(
  doc: PDFKit.PDFDocument,
  bodyHeight: number,
  render: () => void,
): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startY = doc.y;
  const totalHeight = bodyHeight + 2 * PDF_LAYOUT.cardPadY;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const fitsOnPage = startY + totalHeight <= pageBottom;

  if (fitsOnPage) {
    doc
      .save()
      .lineWidth(PDF_LAYOUT.cardBorderWidth)
      .strokeColor(PDF_COLORS.divider)
      .roundedRect(x, startY, width, totalHeight, PDF_LAYOUT.cardRadius)
      .stroke()
      .restore();
    doc.x = x + PDF_LAYOUT.cardPadX;
    doc.y = startY + PDF_LAYOUT.cardPadY;
    render();
    doc.x = x;
    doc.y = startY + totalHeight + 6;
  } else {
    // Content won't fit on this page — render without the outline so the
    // page break flows naturally.
    render();
  }
}

interface DrawFooterAllPagesOptions {
  disclaimer?: string;
  /** Short hash from formatHashSeal() — stamped under the footer on every page. */
  hashSeal?: string;
  locale?: PdfLocale;
}

/**
 * Stamps the footer (and optional audit-hash seal) on every buffered page at
 * a fixed distance from the page bottom. Use this for multi-page PDFs created
 * with `bufferPages: true`. Single-page PDFs can keep using `drawFooter`
 * directly at end-of-document.
 *
 * Each per-page render is wrapped in its own save/restore to isolate it from
 * any inherited state on naturally-overflowed pages — without this, PDFKit
 * emits "Restoring state when no valid states to pop" warnings on later pages.
 */
export function drawFooterAllPages(
  doc: PDFKit.PDFDocument,
  opts: DrawFooterAllPagesOptions = {},
): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);

    // PDFKit's `text()` triggers a page break whenever the cursor sits below
    // the page's bottom margin. The footer lives BELOW that margin (in the
    // reserved bottom strip), so we temporarily push the bottom margin to
    // zero before drawing — otherwise every footer line spawns a new page.
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Pin from the page bottom edge (NOT the bottom margin) so the footer
    // sits in the reserved bottom strip below the content area.
    const footerY = doc.page.height - PDF_LAYOUT.footerPinFromBottom;
    doc.x = doc.page.margins.left;
    doc.y = footerY;
    drawFooter(doc, { disclaimer: opts.disclaimer, locale: opts.locale });
    if (opts.hashSeal) drawHashSeal(doc, { short: opts.hashSeal });

    doc.page.margins.bottom = originalBottom;
  }
}

interface PdfMetadata {
  title: string;
  subject?: string;
  keywords?: string[];
}

/**
 * Sets PDF document-info metadata so PDF readers show meaningful titles
 * instead of "untitled". Call once after `new PDFDocument(...)`. Author is
 * always "Article30".
 */
export function setPdfMetadata(doc: PDFKit.PDFDocument, opts: PdfMetadata): void {
  doc.info.Title = opts.title;
  doc.info.Author = 'Article30';
  if (opts.subject) doc.info.Subject = opts.subject;
  if (opts.keywords) doc.info.Keywords = opts.keywords.join(', ');
}
