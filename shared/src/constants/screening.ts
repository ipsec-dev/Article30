import type { ScreeningQuestionDef } from '../types';

export const SCREENING_QUESTIONS: readonly ScreeningQuestionDef[] = [
  {
    id: 'q1',
    articleRef: 'Art. 5(1)(a)',
    label: {
      fr: 'Les traitements sont licites, loyaux et transparents',
      en: 'Processing is lawful, fair and transparent',
    },
  },
  {
    id: 'q2',
    articleRef: 'Art. 5(1)(b)',
    label: {
      fr: 'Les données sont collectées pour des finalités déterminées',
      en: 'Data collected for specified purposes',
    },
  },
  {
    id: 'q3',
    articleRef: 'Art. 5(1)(c)',
    label: {
      fr: 'Les données collectées sont adéquates, pertinentes et limitées',
      en: 'Data is adequate, relevant, and limited',
    },
  },
  {
    id: 'q4',
    articleRef: 'Art. 5(1)(d)',
    label: {
      fr: 'Les données personnelles sont exactes et tenues à jour',
      en: 'Data is accurate and kept up to date',
    },
  },
  {
    id: 'q5',
    articleRef: 'Art. 5(1)(e)',
    label: {
      fr: 'Les durées de conservation sont définies et respectées',
      en: 'Retention periods defined and respected',
    },
  },
  {
    id: 'q6',
    articleRef: 'Art. 5(1)(f)',
    label: {
      fr: "L'intégrité et la confidentialité des données sont assurées",
      en: 'Integrity and confidentiality ensured',
    },
  },
  {
    id: 'q7',
    articleRef: 'Art. 6',
    label: {
      fr: 'Une base légale est identifiée pour chaque traitement',
      en: 'Legal basis identified for each processing',
    },
  },
  {
    id: 'q8',
    articleRef: 'Art. 6(1)(a)',
    label: {
      fr: 'Le consentement est recueilli de manière conforme',
      en: 'Consent properly collected',
    },
  },
  {
    id: 'q9',
    articleRef: 'Art. 12',
    label: {
      fr: 'Les personnes sont informées de manière transparente',
      en: 'Individuals informed transparently',
    },
  },
  {
    id: 'q10',
    articleRef: 'Art. 15-18, 20-21',
    label: {
      fr: 'Les droits des personnes sont garantis (accès, rectification, effacement, limitation, portabilité, opposition)',
      en: 'Data subject rights ensured (access, rectification, erasure, restriction, portability, objection)',
    },
  },
  {
    id: 'q11',
    articleRef: 'Art. 22',
    label: {
      fr: 'Des garanties existent pour les décisions individuelles automatisées',
      en: 'Safeguards for automated decision-making',
    },
  },
  {
    id: 'q12',
    articleRef: 'Art. 32',
    label: {
      fr: 'Des mesures de sécurité appropriées sont en place (techniques, chiffrement, gestion des incidents)',
      en: 'Appropriate security measures in place (technical, encryption, incident response)',
    },
  },
  {
    id: 'q13',
    articleRef: 'Art. 33-34',
    label: {
      fr: 'La notification et communication des violations sont prévues',
      en: 'Breach notification and communication procedures in place',
    },
  },
  {
    id: 'q14',
    articleRef: 'Art. 25',
    label: {
      fr: 'La protection des données dès la conception et par défaut est intégrée',
      en: 'Privacy by design and by default implemented',
    },
  },
  {
    id: 'q15',
    articleRef: 'Art. 35',
    label: {
      fr: 'Une AIPD est réalisée pour les traitements à risque élevé',
      en: 'DPIA conducted for high-risk processing',
    },
  },
  {
    id: 'q16',
    articleRef: 'Art. 26-28',
    label: {
      fr: 'La gestion des sous-traitants est assurée (contrats, sous-traitants ultérieurs, responsabilité conjointe, représentant UE)',
      en: 'Processor management ensured (DPA, sub-processors, joint controllers, EU representative)',
    },
  },
  {
    id: 'q17',
    articleRef: 'Art. 37-39',
    label: {
      fr: 'La gouvernance DPO est en place (désignation, indépendance, missions)',
      en: 'DPO governance in place (designation, independence, tasks)',
    },
  },
  {
    id: 'q18',
    articleRef: 'Art. 44-49',
    label: {
      fr: 'Les transferts internationaux disposent de garanties appropriées',
      en: 'International transfers have appropriate safeguards',
    },
  },
  {
    id: 'q19',
    articleRef: 'Art. 5(2), 24, 30',
    label: {
      fr: 'La responsabilité et la tenue du registre sont assurées',
      en: 'Accountability and records maintained',
    },
  },
  {
    id: 'q20',
    articleRef: 'Art. 9-10',
    label: {
      fr: 'Le traitement des données sensibles et pénales est encadré',
      en: 'Sensitive and criminal data processing is governed',
    },
  },
];

export const VALID_SCREENING_IDS = SCREENING_QUESTIONS.map(q => q.id);
