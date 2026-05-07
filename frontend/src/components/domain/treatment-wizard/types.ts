import type {
  DataCategoryEntry,
  RecipientEntry,
  SecurityMeasureEntry,
  TransferEntry,
  GuaranteeType,
} from '@article30/shared';

export interface TreatmentWizardFormData {
  name: string;
  purpose: string;
  subPurposes: string[];
  legalBasis: string;

  personCategories: string[];
  dataCategories: DataCategoryEntry[];
  hasSensitiveData: boolean;
  sensitiveCategories: string[];

  recipients: RecipientEntry[];
  transfers: TransferEntry[];

  retentionPeriod: string;
  securityMeasures: SecurityMeasureEntry[];

  // 9 CNIL criteria for AIPD determination
  hasEvaluationScoring: boolean;
  hasAutomatedDecisions: boolean;
  hasSystematicMonitoring: boolean;
  isLargeScale: boolean;
  hasCrossDatasetLinking: boolean;
  involvesVulnerablePersons: boolean;
  usesInnovativeTech: boolean;
  canExcludeFromRights: boolean;
}

export const WIZARD_STEPS = [
  'identification',
  'data',
  'recipients',
  'security',
  'riskAssessment',
  'summary',
] as const;

export const DEFAULT_FORM_DATA: TreatmentWizardFormData = {
  name: '',
  purpose: '',
  subPurposes: [],
  legalBasis: '',

  personCategories: [],
  dataCategories: [],
  hasSensitiveData: false,
  sensitiveCategories: [],

  recipients: [],
  transfers: [],

  retentionPeriod: '',
  securityMeasures: [],

  hasEvaluationScoring: false,
  hasAutomatedDecisions: false,
  hasSystematicMonitoring: false,
  isLargeScale: false,
  hasCrossDatasetLinking: false,
  involvesVulnerablePersons: false,
  usesInnovativeTech: false,
  canExcludeFromRights: false,
};

export const createEmptyTransfer = (): TransferEntry => ({
  destinationOrg: '',
  country: '',
  guaranteeType: 'SCC' as GuaranteeType,
  documentLink: '',
});

export const createEmptyRecipient = (): RecipientEntry => ({
  type: '',
  precision: '',
});

export const createEmptySecurityMeasure = (): SecurityMeasureEntry => ({
  type: '',
  precision: '',
});
