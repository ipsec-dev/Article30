import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  LegalBasis,
  TREATMENT_IMPORT_COLUMNS,
  TREATMENT_IMPORT_LIMITS,
  TREATMENT_IMPORT_LIST_SEPARATOR,
  TREATMENT_IMPORT_REQUIRED_COLUMNS,
} from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { TreatmentsService } from './treatments.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { ImportPreviewDto, ImportRowDto, ImportCommitResultDto } from './dto/import-preview.dto';
import { acquireXactLock } from '../../common/pg-locks';

@Injectable()
export class TreatmentsImportService {
  private readonly logger = new Logger(TreatmentsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly treatments: TreatmentsService,
    private readonly auditLog: AuditLogService,
  ) {}

  generateTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    const legalBasisValues = Object.values(LegalBasis).join(', ');
    const readme = XLSX.utils.aoa_to_sheet([
      ['Treatment register import — read me'],
      [''],
      ['Fill the "Treatments" sheet, one row per treatment.'],
      ['Required column: name. All other columns are optional.'],
      ['Multi-value cells (personCategories, subPurposes) use ";" as separator.'],
      [`legalBasis must be exactly one of: ${legalBasisValues}.`],
      ['assignedToEmail must match an existing user email; leave empty for unassigned.'],
      ['Maximum 500 rows / 5 MB per upload.'],
      [''],
      ['Invalid rows are reported in the preview before any data is written.'],
    ]);
    readme['!cols'] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(wb, readme, 'Read me');

    const headers = [...TREATMENT_IMPORT_COLUMNS];
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, sheet, 'Treatments');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async parseAndValidate(buffer: Buffer): Promise<ImportPreviewDto> {
    if (buffer.length > TREATMENT_IMPORT_LIMITS.maxBytes) {
      throw new BadRequestException('file_too_large');
    }

    let parsed: ReturnType<typeof this.parseSheet>;
    try {
      parsed = this.parseSheet(buffer);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('xlsx_unreadable');
    }
    const { headerRow, dataRows, cell } = parsed;

    const missing = TREATMENT_IMPORT_REQUIRED_COLUMNS.filter(c => !headerRow.includes(c));
    if (missing.length > 0) {
      throw new BadRequestException(`missing_columns:${missing.join(',')}`);
    }

    if (dataRows.length > TREATMENT_IMPORT_LIMITS.maxRows) {
      throw new BadRequestException(
        `too_many_rows:${dataRows.length}>${TREATMENT_IMPORT_LIMITS.maxRows}`,
      );
    }

    // `assignedToEmail` (XLSX column) maps to the `assignedTo` UUID field
    // on Treatment via an email lookup against the User table.
    const allEmails = dataRows.map(r => cell(r, 'assignedToEmail')).filter(e => e.length > 0);
    const emailToUserId = await this.resolveEmails(allEmails);

    const allNames = dataRows.map(r => cell(r, 'name')).filter(n => n.length > 0);
    const existingNames = await this.findExistingNames(allNames);

    const inFileCounts = new Map<string, number>();
    for (const n of allNames) inFileCounts.set(n, (inFileCounts.get(n) ?? 0) + 1);

    const legalBasisValues = new Set<string>(Object.values(LegalBasis));

    const rows: ImportRowDto[] = dataRows.map((row, i) => {
      const errors: string[] = [];
      const name = cell(row, 'name');
      const legalBasis = cell(row, 'legalBasis');
      const assignedEmail = cell(row, 'assignedToEmail');

      if (!name) errors.push('missing_name');
      if (legalBasis && !legalBasisValues.has(legalBasis)) errors.push('invalid_legal_basis');
      if (assignedEmail && !emailToUserId.has(this.normalizeEmail(assignedEmail)))
        errors.push('unknown_assignee_email');

      let status: ImportRowDto['status'] = errors.length > 0 ? 'invalid' : 'ok';

      if (status === 'ok' && name) {
        if (existingNames.has(name)) {
          errors.push('name_conflict_existing');
          status = 'conflict';
        } else if ((inFileCounts.get(name) ?? 0) > 1) {
          errors.push('name_conflict_in_file');
          status = 'conflict';
        }
      }

      return { rowNumber: i + 2, name, status, errors };
    });

    const summary = rows.reduce(
      (acc, r) => {
        acc[r.status] += 1;
        acc.total += 1;
        return acc;
      },
      { ok: 0, conflict: 0, invalid: 0, total: 0 },
    );

    return { rows, summary };
  }

  async commit(buffer: Buffer, userId: string): Promise<ImportCommitResultDto> {
    const preview = await this.parseAndValidate(buffer);
    if (preview.summary.invalid + preview.summary.conflict > 0) {
      throw new ConflictException({ message: 'import_preview_has_errors', preview });
    }

    // Re-parse to recover raw cell values for DTO construction. We don't pass DTOs
    // through the preview shape on purpose: re-parsing the original bytes keeps
    // the commit faithful to what was uploaded, and any drift between the two
    // parses (none expected — parsing is deterministic) would be caught by the
    // validation we just ran.
    const { dataRows, cell } = this.parseSheet(buffer);
    const emailToUserId = await this.resolveEmails(
      dataRows.map(r => cell(r, 'assignedToEmail')).filter(e => e.length > 0),
    );

    const inserted = await this.prisma.$transaction(async tx => {
      // refNumber is @unique on Treatment. Without serialization, two concurrent
      // imports could both read the same _max(refNumber) and the second insert
      // would fail with P2002. The advisory lock is xact-scoped — released on
      // commit/abort.
      await acquireXactLock(tx, 'treatment-import');

      const out: Array<{ id: string; name: string }> = [];
      for (const row of dataRows) {
        const dto: CreateTreatmentDto = {
          name: cell(row, 'name'),
          purpose: cell(row, 'purpose') || undefined,
          legalBasis: (cell(row, 'legalBasis') as CreateTreatmentDto['legalBasis']) || undefined,
          personCategories: this.parseListCell(cell(row, 'personCategories')),
          subPurposes: this.parseListCell(cell(row, 'subPurposes')),
          retentionPeriod: cell(row, 'retentionPeriod') || undefined,
          assignedTo: emailToUserId.get(this.normalizeEmail(cell(row, 'assignedToEmail'))),
        };
        const created = await this.treatments.create(dto, userId, tx);
        out.push({ id: created.id, name: created.name });
      }
      return out;
    });

    // Audit-log writes happen AFTER commit, outside the transaction. The audit-log
    // service runs its own serializable retry loop; nesting would risk deadlock.
    // A failed audit write logs a warning but does NOT undo the treatment insert.
    for (const t of inserted) {
      try {
        await this.auditLog.create({
          action: 'CREATE',
          entity: 'treatment',
          entityId: t.id,
          oldValue: null,
          newValue: { name: t.name },
          performedBy: userId,
        });
      } catch (err) {
        this.logger.warn({ event: 'treatment.import.audit.failed', treatmentId: t.id, err });
      }
    }

    return { created: inserted.length };
  }

  private parseSheet(buffer: Buffer): {
    headerRow: string[];
    dataRows: string[][];
    cell: (row: string[], col: string) => string;
  } {
    const wb = XLSX.read(buffer, {
      type: 'buffer',
      cellHTML: false,
      cellFormula: false,
      cellStyles: false,
      sheetStubs: false,
      bookVBA: false,
      dense: true,
    });
    const sheet = wb.Sheets['Treatments'] ?? wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new BadRequestException('treatments_sheet_missing');

    const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    const headerRow = (aoa[0] ?? []).map(h => String(h).trim());
    const headerIndex = new Map<string, number>(headerRow.map((h, i) => [h, i]));
    const cell = (r: string[], col: string): string => {
      const idx = headerIndex.get(col);
      if (idx === undefined) return '';
      return String(r[idx] ?? '').trim();
    };
    const dataRows = aoa.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
    return { headerRow, dataRows, cell };
  }

  private parseListCell(value: string): string[] {
    return value
      .split(TREATMENT_IMPORT_LIST_SEPARATOR)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private normalizeEmail(value: string): string {
    return value.normalize('NFKC').toLowerCase().trim();
  }

  private async resolveEmails(emails: ReadonlyArray<string>): Promise<Map<string, string>> {
    const unique = Array.from(
      new Set(emails.map(e => this.normalizeEmail(e)).filter(e => e.length > 0)),
    );
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { email: { in: unique } },
      select: { id: true, email: true },
    });
    return new Map(users.map(u => [u.email, u.id]));
  }

  private async findExistingNames(names: ReadonlyArray<string>): Promise<Set<string>> {
    if (names.length === 0) return new Set();
    const found = await this.prisma.treatment.findMany({
      where: { name: { in: [...names] } },
      select: { name: true },
    });
    return new Set(found.map(t => t.name));
  }
}
