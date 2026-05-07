export const TREATMENT_IMPORT_COLUMNS = [
  'name',
  'purpose',
  'legalBasis',
  'personCategories',
  'subPurposes',
  'retentionPeriod',
  'assignedToEmail',
] as const;

export type TreatmentImportColumn = (typeof TREATMENT_IMPORT_COLUMNS)[number];

export const TREATMENT_IMPORT_REQUIRED_COLUMNS: ReadonlyArray<TreatmentImportColumn> = ['name'];

export const TREATMENT_IMPORT_LIMITS = {
  maxRows: 500,
  maxBytes: 5 * 1024 * 1024,
} as const;

export const TREATMENT_IMPORT_LIST_SEPARATOR = ';' as const;

export const TREATMENT_IMPORT_TEMPLATE_FILENAME = 'treatments-template.xlsx' as const;
