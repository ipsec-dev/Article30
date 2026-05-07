export const LEGAL_BASES = [
  { code: 'CONSENT', labelFr: 'Consentement', labelEn: 'Consent' },
  { code: 'CONTRACT', labelFr: "Exécution d'un contrat", labelEn: 'Contract performance' },
  { code: 'LEGAL_OBLIGATION', labelFr: 'Obligation légale', labelEn: 'Legal obligation' },
  { code: 'VITAL_INTERESTS', labelFr: 'Intérêts vitaux', labelEn: 'Vital interests' },
  { code: 'PUBLIC_TASK', labelFr: "Mission d'intérêt public", labelEn: 'Public task' },
  { code: 'LEGITIMATE_INTERESTS', labelFr: 'Intérêts légitimes', labelEn: 'Legitimate interests' },
] as const;

export const DATA_CATEGORIES = [
  { code: 'CIVIL_STATUS', labelFr: 'État civil, identité', labelEn: 'Civil status, identity' },
  { code: 'PROFESSIONAL', labelFr: 'Vie professionnelle', labelEn: 'Professional life' },
  { code: 'PERSONAL', labelFr: 'Vie personnelle', labelEn: 'Personal life' },
  {
    code: 'ECONOMIC',
    labelFr: 'Informations économiques et financières',
    labelEn: 'Economic and financial data',
  },
  { code: 'CONNECTION', labelFr: 'Données de connexion', labelEn: 'Connection data' },
  { code: 'LOCATION', labelFr: 'Données de localisation', labelEn: 'Location data' },
] as const;

export const SENSITIVE_DATA_CATEGORIES = [
  {
    code: 'RACIAL_ETHNIC',
    labelFr: 'Origine raciale ou ethnique',
    labelEn: 'Racial or ethnic origin',
  },
  { code: 'POLITICAL', labelFr: 'Opinions politiques', labelEn: 'Political opinions' },
  {
    code: 'RELIGIOUS',
    labelFr: 'Convictions religieuses ou philosophiques',
    labelEn: 'Religious or philosophical beliefs',
  },
  { code: 'TRADE_UNION', labelFr: 'Appartenance syndicale', labelEn: 'Trade union membership' },
  { code: 'GENETIC', labelFr: 'Données génétiques', labelEn: 'Genetic data' },
  { code: 'BIOMETRIC', labelFr: 'Données biométriques', labelEn: 'Biometric data' },
  { code: 'HEALTH', labelFr: 'Données de santé', labelEn: 'Health data' },
  { code: 'SEX_LIFE', labelFr: 'Vie sexuelle', labelEn: 'Sex life' },
  { code: 'SEXUAL_ORIENTATION', labelFr: 'Orientation sexuelle', labelEn: 'Sexual orientation' },
] as const;

export const GUARANTEE_TYPES = [
  { code: 'ADEQUACY', labelFr: "Décision d'adéquation", labelEn: 'Adequacy decision' },
  {
    code: 'SCC',
    labelFr: 'Clauses contractuelles types (CCT)',
    labelEn: 'Standard contractual clauses',
  },
  {
    code: 'BCR',
    labelFr: "Règles d'entreprise contraignantes (BCR)",
    labelEn: 'Binding corporate rules',
  },
  {
    code: 'CODE_OF_CONDUCT',
    labelFr: 'Code de conduite approuvé',
    labelEn: 'Approved code of conduct',
  },
  {
    code: 'CERTIFICATION',
    labelFr: 'Mécanisme de certification',
    labelEn: 'Certification mechanism',
  },
  { code: 'DEROGATION_49', labelFr: 'Dérogation Art. 49', labelEn: 'Derogation Art. 49' },
] as const;

export const PERSON_CATEGORIES = [
  { code: 'EMPLOYEES', labelFr: 'Employés', labelEn: 'Employees' },
  { code: 'INTERNAL_SERVICES', labelFr: 'Services internes', labelEn: 'Internal services' },
  { code: 'CLIENTS', labelFr: 'Clients', labelEn: 'Clients' },
  { code: 'SUPPLIERS', labelFr: 'Fournisseurs', labelEn: 'Suppliers' },
  { code: 'SERVICE_PROVIDERS', labelFr: 'Prestataires', labelEn: 'Service providers' },
  { code: 'PROSPECTS', labelFr: 'Prospects', labelEn: 'Prospects' },
  { code: 'CANDIDATES', labelFr: 'Candidats', labelEn: 'Candidates' },
] as const;

export const RECIPIENT_TYPES = [
  {
    code: 'INTERNAL_SERVICE',
    labelFr: 'Service interne traitant les données',
    labelEn: 'Internal service processing the data',
  },
  { code: 'SUBCONTRACTORS', labelFr: 'Sous-traitants', labelEn: 'Subcontractors' },
  {
    code: 'THIRD_COUNTRIES',
    labelFr: 'Destinataires dans des pays tiers ou organisations internationales',
    labelEn: 'Recipients in third countries or international organizations',
  },
  {
    code: 'PARTNERS',
    labelFr: 'Partenaires institutionnels ou commerciaux',
    labelEn: 'Institutional or commercial partners',
  },
] as const;

export const SECURITY_MEASURES = [
  { code: 'TRACEABILITY', labelFr: 'Mesures de traçabilité', labelEn: 'Traceability measures' },
  {
    code: 'SOFTWARE_PROTECTION',
    labelFr: 'Mesures de protection logicielle',
    labelEn: 'Software protection measures',
  },
  { code: 'BACKUP', labelFr: 'Sauvegarde des données', labelEn: 'Data backup' },
  { code: 'ENCRYPTION', labelFr: 'Chiffrement des données', labelEn: 'Data encryption' },
  {
    code: 'ACCESS_CONTROL',
    labelFr: "Contrôle d'accès des utilisateurs",
    labelEn: 'User access control',
  },
  {
    code: 'SUBCONTRACTOR_CONTROL',
    labelFr: 'Contrôle des sous-traitants',
    labelEn: 'Subcontractor control',
  },
] as const;

export const RISK_CRITERIA = [
  {
    code: 'EVALUATION_SCORING',
    labelFr: 'Évaluation ou notation de personnes',
    labelEn: 'Evaluation or scoring of individuals',
  },
  {
    code: 'AUTOMATED_DECISIONS',
    labelFr: 'Décisions automatisées avec effet juridique',
    labelEn: 'Automated decisions with legal effect',
  },
  {
    code: 'SYSTEMATIC_MONITORING',
    labelFr: 'Surveillance systématique',
    labelEn: 'Systematic monitoring',
  },
  {
    code: 'SENSITIVE_DATA',
    labelFr: 'Données sensibles (Art. 9)',
    labelEn: 'Sensitive data (Art. 9)',
  },
  {
    code: 'LARGE_SCALE',
    labelFr: 'Traitement à grande échelle',
    labelEn: 'Large-scale processing',
  },
  {
    code: 'CROSS_DATASET',
    labelFr: 'Croisement de jeux de données',
    labelEn: 'Cross-dataset linking',
  },
  { code: 'VULNERABLE_PERSONS', labelFr: 'Personnes vulnérables', labelEn: 'Vulnerable persons' },
  { code: 'INNOVATIVE_TECH', labelFr: 'Technologie innovante', labelEn: 'Innovative technology' },
  {
    code: 'EXCLUSION_RIGHTS',
    labelFr: "Exclusion du bénéfice d'un droit/service",
    labelEn: 'Exclusion from rights/services',
  },
] as const;

// Completeness weights (total = 100)
export const COMPLETENESS_WEIGHTS = {
  name: 10,
  purpose: 15,
  legalBasis: 10,
  personCategories: 10,
  dataCategories: 10,
  recipients: 10,
  retentionPeriod: 10,
  securityMeasures: 10,
  transfers: 5,
  sensitiveCategories: 5,
  riskCriteria: 5,
} as const;

export const ADEQUATE_COUNTRIES = [
  'Andorra',
  'Argentina',
  'Canada',
  'Guernsey',
  'Isle of Man',
  'Faroe Islands',
  'Israel',
  'Jersey',
  'New Zealand',
  'Switzerland',
  'Uruguay',
] as const;
