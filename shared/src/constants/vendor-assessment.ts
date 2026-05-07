export const VENDOR_ASSESSMENT_QUESTIONS = [
  {
    id: 'q1',
    category: 'data-protection',
    weight: 15,
    label: {
      en: 'Does the vendor have a documented data protection policy?',
      fr: "Le sous-traitant dispose-t-il d'une politique de protection des donn\u00e9es document\u00e9e ?",
    },
  },
  {
    id: 'q2',
    category: 'data-protection',
    weight: 15,
    label: {
      en: 'Is there a designated DPO or privacy officer?',
      fr: 'Y a-t-il un DPO ou responsable de la vie priv\u00e9e d\u00e9sign\u00e9 ?',
    },
  },
  {
    id: 'q3',
    category: 'security',
    weight: 15,
    label: {
      en: 'Are appropriate technical security measures in place (encryption, access controls)?',
      fr: "Des mesures de s\u00e9curit\u00e9 techniques appropri\u00e9es sont-elles en place (chiffrement, contr\u00f4le d'acc\u00e8s) ?",
    },
  },
  {
    id: 'q4',
    category: 'security',
    weight: 10,
    label: {
      en: 'Has the vendor undergone a security audit or certification (ISO 27001, SOC 2)?',
      fr: "Le sous-traitant a-t-il fait l'objet d'un audit de s\u00e9curit\u00e9 ou d'une certification (ISO 27001, SOC 2) ?",
    },
  },
  {
    id: 'q5',
    category: 'breach',
    weight: 10,
    label: {
      en: 'Is there a breach notification procedure compliant with Art. 33?',
      fr: "Existe-t-il une proc\u00e9dure de notification des violations conforme \u00e0 l'Art. 33 ?",
    },
  },
  {
    id: 'q6',
    category: 'subprocessors',
    weight: 10,
    label: {
      en: 'Are sub-processors documented and authorized?',
      fr: 'Les sous-traitants ult\u00e9rieurs sont-ils document\u00e9s et autoris\u00e9s ?',
    },
  },
  {
    id: 'q7',
    category: 'transfers',
    weight: 10,
    label: {
      en: 'Are international data transfers covered by appropriate safeguards?',
      fr: 'Les transferts internationaux sont-ils couverts par des garanties appropri\u00e9es ?',
    },
  },
  {
    id: 'q8',
    category: 'retention',
    weight: 5,
    label: {
      en: 'Are data retention and deletion policies defined?',
      fr: 'Les politiques de conservation et de suppression des donn\u00e9es sont-elles d\u00e9finies ?',
    },
  },
  {
    id: 'q9',
    category: 'rights',
    weight: 5,
    label: {
      en: 'Can the vendor support data subject rights requests?',
      fr: "Le sous-traitant peut-il r\u00e9pondre aux demandes d'exercice des droits ?",
    },
  },
  {
    id: 'q10',
    category: 'contractual',
    weight: 5,
    label: {
      en: 'Does the DPA include all required Art. 28 clauses?',
      fr: "Le contrat de sous-traitance inclut-il toutes les clauses requises par l'Art. 28 ?",
    },
  },
] as const;
