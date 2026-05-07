import type { TreatmentWizardFormData } from './types';

export function transformFormToApi(data: TreatmentWizardFormData) {
  const {
    securityMeasures,
    transfers,
    recipients,
    dataCategories,
    legalBasis,
    purpose,
    retentionPeriod,
    subPurposes,
    ...rest
  } = data;
  return {
    ...rest,
    legalBasis: legalBasis || undefined,
    purpose: purpose || undefined,
    retentionPeriod: retentionPeriod || undefined,
    subPurposes: subPurposes.filter(s => s.trim()),
    securityMeasuresDetailed: securityMeasures.filter(s => s.type),
    recipients: recipients.filter(r => r.type),
    dataCategories: dataCategories.filter(d => d.category),
    transfers: transfers
      .filter(t => t.destinationOrg || t.country)
      .map(t => ({
        ...t,
        documentLink: t.documentLink || undefined,
      })),
  };
}
