import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { LegalBasis, TREATMENT_IMPORT_COLUMNS } from '@article30/shared';
import { TreatmentsImportService } from '../../src/modules/treatments/treatments-import.service';

describe('TreatmentsImportService.generateTemplate', () => {
  const service = new TreatmentsImportService(null as never, null as never, null as never);

  it('returns a buffer that opens as XLSX', () => {
    const buffer = service.generateTemplate();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Treatments');
  });

  it('writes every TREATMENT_IMPORT_COLUMNS header on the Treatments sheet', () => {
    const buffer = service.generateTemplate();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Treatments'];
    const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] as string[];
    expect(headers).toEqual([...TREATMENT_IMPORT_COLUMNS]);
  });

  it('includes a "Read me" sheet listing every LegalBasis value', () => {
    const buffer = service.generateTemplate();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Read me');

    const readme = wb.Sheets['Read me'];
    const rows = XLSX.utils.sheet_to_json<string[]>(readme, { header: 1 }) as string[][];
    const text = rows.flat().join(' ');

    for (const value of Object.values(LegalBasis)) {
      expect(text).toContain(value);
    }
  });
});
