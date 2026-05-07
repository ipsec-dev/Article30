import * as XLSX from 'xlsx';
import {
  TREATMENT_IMPORT_COLUMNS,
  TREATMENT_IMPORT_LIST_SEPARATOR,
  TREATMENT_IMPORT_LIMITS,
} from '@article30/shared';

type Row = Partial<Record<(typeof TREATMENT_IMPORT_COLUMNS)[number], string>>;

export function buildXlsx(rows: Row[]): Buffer {
  const wb = XLSX.utils.book_new();
  const aoa: string[][] = [
    [...TREATMENT_IMPORT_COLUMNS],
    ...rows.map(r => TREATMENT_IMPORT_COLUMNS.map(col => r[col] ?? '')),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, 'Treatments');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function buildXlsxMissingColumn(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = TREATMENT_IMPORT_COLUMNS.filter(c => c !== 'name');
  const sheet = XLSX.utils.aoa_to_sheet([[...headers]]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Treatments');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function buildXlsxOverCap(): Buffer {
  const rows: Row[] = Array.from({ length: TREATMENT_IMPORT_LIMITS.maxRows + 1 }, (_, i) => ({
    name: `t-${i}`,
  }));
  return buildXlsx(rows);
}

export const LIST_SEP = TREATMENT_IMPORT_LIST_SEPARATOR;
