export interface OrgForm {
  companyName: string;
  siren: string;
  address: string;
  representativeName: string;
  representativeRole: string;
  dpoName: string;
  dpoEmail: string;
  dpoPhone: string;
  annualTurnover: string;
}

export interface FreshnessForm {
  freshnessThresholdMonths: number;
  reviewCycleMonths: number;
}
