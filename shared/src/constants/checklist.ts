import { ChecklistCategory, type ChecklistItemDef } from '../types';

/**
 * Organization-level governance posture checklist.
 *
 * Per-treatment compliance items (lawfulness, retention, rights, security
 * measures, etc.) are intentionally excluded — those are captured by the
 * per-treatment screening flow, the treatment fiche, and the DSR module.
 * What stays here is what an auditor would ask once for the organization
 * as a whole, regardless of which treatments exist.
 */
export const CHECKLIST_ITEMS: readonly ChecklistItemDef[] = [
  // Breach Notification (Art. 33-34) ──
  {
    id: 'art33-breach',
    category: ChecklistCategory.BREACH,
    articleRef: 'Art. 33',
    label: {
      fr: 'Une procédure de notification des violations à la CNIL (72h) est en place',
      en: 'Breach notification procedure to the supervisory authority (72h) is in place',
    },
  },
  {
    id: 'art34-communication',
    category: ChecklistCategory.BREACH,
    articleRef: 'Art. 34',
    label: {
      fr: 'La communication des violations aux personnes concernées est prévue',
      en: 'Communication of breach to affected data subjects is planned',
    },
  },

  // Privacy by Design (Art. 25, 35) ──
  {
    id: 'art25-design',
    category: ChecklistCategory.PRIVACY_BY_DESIGN,
    articleRef: 'Art. 25(1)',
    label: {
      fr: 'La protection des données dès la conception est intégrée aux projets',
      en: 'Privacy by design is integrated into project workflows',
    },
  },
  {
    id: 'art25-default',
    category: ChecklistCategory.PRIVACY_BY_DESIGN,
    articleRef: 'Art. 25(2)',
    label: {
      fr: 'La protection des données par défaut est assurée par les outils internes',
      en: 'Privacy-by-default is enforced across internal tools',
    },
  },
  {
    id: 'art35-dpia',
    category: ChecklistCategory.PRIVACY_BY_DESIGN,
    articleRef: 'Art. 35',
    label: {
      fr: 'Une procédure d’AIPD est définie pour les traitements à risque élevé',
      en: 'A DPIA process is defined for high-risk processing',
    },
  },

  // Processor Management (Art. 26-28) ──
  {
    id: 'art28-dpa',
    category: ChecklistCategory.PROCESSOR_MANAGEMENT,
    articleRef: 'Art. 28',
    label: {
      fr: 'Des contrats de sous-traitance sont en place avec tous les sous-traitants',
      en: 'Data processing agreements are in place with all processors',
    },
  },
  {
    id: 'art28-subprocessor',
    category: ChecklistCategory.PROCESSOR_MANAGEMENT,
    articleRef: 'Art. 28(2)',
    label: {
      fr: "L'autorisation et le contrôle des sous-traitants ultérieurs sont assurés",
      en: 'Sub-processor authorization and oversight are enforced',
    },
  },
  {
    id: 'art26-joint',
    category: ChecklistCategory.PROCESSOR_MANAGEMENT,
    articleRef: 'Art. 26',
    label: {
      fr: 'Les arrangements de responsabilité conjointe sont documentés',
      en: 'Joint-controller arrangements are documented',
    },
  },
  {
    id: 'art27-representative',
    category: ChecklistCategory.PROCESSOR_MANAGEMENT,
    articleRef: 'Art. 27',
    label: {
      fr: "Un représentant dans l'UE est désigné si applicable",
      en: 'EU representative is designated where applicable',
    },
  },

  // DPO & Governance (Art. 37-39) ──
  {
    id: 'art37-designation',
    category: ChecklistCategory.DPO_GOVERNANCE,
    articleRef: 'Art. 37',
    label: {
      fr: 'Un DPO est désigné lorsque requis',
      en: 'A DPO is designated where required',
    },
  },
  {
    id: 'art38-position',
    category: ChecklistCategory.DPO_GOVERNANCE,
    articleRef: 'Art. 38',
    label: {
      fr: 'Le DPO dispose des ressources nécessaires et est indépendant',
      en: 'The DPO is properly resourced and independent',
    },
  },
  {
    id: 'art39-tasks',
    category: ChecklistCategory.DPO_GOVERNANCE,
    articleRef: 'Art. 39',
    label: {
      fr: 'Les missions du DPO sont clairement définies et exécutées',
      en: 'DPO tasks are clearly defined and executed',
    },
  },

  // International Transfers (Art. 44-49) ──
  {
    id: 'art44-principle',
    category: ChecklistCategory.INTERNATIONAL_TRANSFERS,
    articleRef: 'Art. 44',
    label: {
      fr: 'Une politique encadre les transferts internationaux de données',
      en: 'A policy governs international data transfers',
    },
  },
  {
    id: 'art46-safeguards',
    category: ChecklistCategory.INTERNATIONAL_TRANSFERS,
    articleRef: 'Art. 46',
    label: {
      fr: 'Des garanties appropriées (CCT, BCR) sont disponibles pour les transferts',
      en: 'Appropriate safeguards (SCCs, BCRs) are available for transfers',
    },
  },
  {
    id: 'art49-derogations',
    category: ChecklistCategory.INTERNATIONAL_TRANSFERS,
    articleRef: 'Art. 49',
    label: {
      fr: 'Les dérogations aux transferts sont documentées en absence de garanties',
      en: 'Transfer derogations are documented when safeguards are unavailable',
    },
  },

  // Records & Accountability (Art. 5(2), 24, 30) ──
  {
    id: 'art30-records',
    category: ChecklistCategory.RECORDS_ACCOUNTABILITY,
    articleRef: 'Art. 30',
    label: {
      fr: 'Le registre des activités de traitement est tenu à jour',
      en: 'The records of processing activities are kept up to date',
    },
  },
  {
    id: 'art24-accountability',
    category: ChecklistCategory.RECORDS_ACCOUNTABILITY,
    articleRef: 'Art. 24',
    label: {
      fr: 'Des mesures organisationnelles démontrent la conformité',
      en: 'Organizational measures demonstrate compliance',
    },
  },
  {
    id: 'art5-2-demonstrate',
    category: ChecklistCategory.RECORDS_ACCOUNTABILITY,
    articleRef: 'Art. 5(2)',
    label: {
      fr: 'La capacité à démontrer la conformité aux principes est assurée',
      en: 'Ability to demonstrate compliance with the principles is in place',
    },
  },
] as const;

export const VALID_CHECKLIST_ITEM_IDS = CHECKLIST_ITEMS.map(item => item.id);

export type ChecklistItemId = (typeof CHECKLIST_ITEMS)[number]['id'];

export const CHECKLIST_CATEGORIES = Object.values(ChecklistCategory);
