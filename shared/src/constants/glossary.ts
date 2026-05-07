export type GlossaryCategory =
  | 'acronym' // pure abbreviations (DPO, DPIA, GDPR…)
  | 'concept' // foundational terms (Personal data, Consent, Profiling…)
  | 'role' // actors (Controller, Processor, EU representative…)
  | 'process' // procedures + rights (DSAR, 72h notification, Right to erasure…)
  | 'framework'; // standards & laws adjacent to GDPR (ISO 27001, NIS2, eIDAS…)

export interface GlossaryEntry {
  /** Stable slug for URL anchor / React key. Lowercase, dash-separated. */
  id: string;
  /** Canonical display term (matches the locale's primary form; e.g. "DPIA / AIPD"). */
  term: { fr: string; en: string };
  category: GlossaryCategory;
  /** Alternate names / synonyms / acronym expansions. Used in search. */
  aliases?: string[];
  definition: { fr: string; en: string };
  /** Optional article/regulation references shown as plain text below the def. */
  references?: string[];
}

export const GLOSSARY: ReadonlyArray<GlossaryEntry> = [
  // Acronyms

  {
    id: 'gdpr',
    term: { fr: 'RGPD / GDPR', en: 'GDPR / RGPD' },
    category: 'acronym',
    aliases: [
      'General Data Protection Regulation',
      'Règlement Général sur la Protection des Données',
      'Regulation (EU) 2016/679',
    ],
    definition: {
      fr: "Règlement (UE) 2016/679 du Parlement européen et du Conseil, applicable depuis le 25 mai 2018, qui harmonise la protection des données personnelles au sein de l'Union européenne et de l'Espace économique européen.",
      en: 'Regulation (EU) 2016/679 of the European Parliament and of the Council, applicable from 25 May 2018, which harmonises the protection of personal data across the European Union and the European Economic Area.',
    },
    references: ['Règlement (UE) 2016/679'],
  },
  {
    id: 'dpo',
    term: { fr: 'DPO / Délégué à la Protection des Données', en: 'DPO / Data Protection Officer' },
    category: 'acronym',
    aliases: ['Data Protection Officer', 'Délégué à la Protection des Données', 'DPD'],
    definition: {
      fr: "Personne désignée par le responsable de traitement ou le sous-traitant pour veiller à la conformité au RGPD, conseiller l'organisation et servir de point de contact avec l'autorité de contrôle. Sa désignation est obligatoire pour les organismes publics, les traitements à grande échelle de données sensibles et les traitements impliquant une surveillance systématique à grande échelle.",
      en: 'Person appointed by the controller or processor to oversee GDPR compliance, advise the organisation, and act as a contact point with the supervisory authority. Designation is mandatory for public bodies, large-scale processing of sensitive data, and large-scale systematic monitoring.',
    },
    references: ['Art. 37–39 RGPD'],
  },
  {
    id: 'dpia',
    term: {
      fr: "AIPD / Analyse d'Impact relative à la Protection des Données",
      en: 'DPIA / Data Protection Impact Assessment',
    },
    category: 'acronym',
    aliases: [
      'Data Protection Impact Assessment',
      "Analyse d'Impact relative à la Protection des Données",
      'AIPD',
      'PIA',
    ],
    definition: {
      fr: "Processus documenté visant à identifier et atténuer les risques élevés que présente un traitement pour les droits et libertés des personnes concernées. Obligatoire lorsque le traitement est susceptible d'engendrer un risque élevé (au moins deux critères CNIL).",
      en: 'Documented process to identify and mitigate the high risks a processing operation poses to the rights and freedoms of data subjects. Mandatory when the processing is likely to result in a high risk (at least two CNIL criteria).',
    },
    references: ['Art. 35 RGPD'],
  },
  {
    id: 'dpa-agreement',
    term: { fr: 'DPA / Contrat de sous-traitance', en: 'DPA / Data Processing Agreement' },
    category: 'acronym',
    aliases: ['Data Processing Agreement', 'Contrat de sous-traitance', 'Data Processing Addendum'],
    definition: {
      fr: "Contrat écrit obligatoire conclu entre le responsable de traitement et chaque sous-traitant, fixant l'objet, la durée, la nature et la finalité du traitement, les obligations et droits du responsable, ainsi que les mesures techniques et organisationnelles imposées au sous-traitant.",
      en: "Mandatory written contract between the controller and each processor, specifying the subject matter, duration, nature and purpose of the processing, the controller's obligations and rights, and the technical and organisational measures required of the processor.",
    },
    references: ['Art. 28 RGPD'],
  },
  {
    id: 'edpb',
    term: {
      fr: 'CEPD / Comité Européen de la Protection des Données',
      en: 'EDPB / European Data Protection Board',
    },
    category: 'acronym',
    aliases: [
      'European Data Protection Board',
      'Comité Européen de la Protection des Données',
      'CEPD',
    ],
    definition: {
      fr: "Organe indépendant de l'Union européenne composé des représentants des autorités de contrôle nationales et du Contrôleur européen de la protection des données. Il veille à l'application cohérente du RGPD dans l'ensemble de l'EEE, émet des lignes directrices et peut adopter des décisions contraignantes.",
      en: 'Independent body of the European Union composed of representatives of national supervisory authorities and the European Data Protection Supervisor. It ensures consistent application of the GDPR across the EEA, issues guidelines, and may adopt binding decisions.',
    },
    references: ['Art. 68–76 RGPD'],
  },
  {
    id: 'cnil',
    term: { fr: 'CNIL', en: 'CNIL' },
    category: 'acronym',
    aliases: [
      "Commission Nationale de l'Informatique et des Libertés",
      'Commission Nationale de l’Informatique et des Libertés',
    ],
    definition: {
      fr: "Autorité administrative indépendante française chargée de veiller à la protection des données personnelles. En tant qu'autorité chef de file pour les organismes établis principalement en France, elle instruit les plaintes, réalise des contrôles et peut prononcer des sanctions.",
      en: 'French independent administrative authority responsible for protecting personal data. As the lead supervisory authority for organisations established primarily in France, it handles complaints, conducts audits, and may impose sanctions.',
    },
    references: ['Loi Informatique et Libertés', 'Art. 56 RGPD'],
  },
  {
    id: 'edps',
    term: {
      fr: 'CEPD / Contrôleur européen de la protection des données',
      en: 'EDPS / European Data Protection Supervisor',
    },
    category: 'acronym',
    aliases: [
      'European Data Protection Supervisor',
      'Contrôleur européen de la protection des données',
    ],
    definition: {
      fr: "Autorité de contrôle indépendante de l'Union européenne chargée de surveiller le traitement des données personnelles par les institutions et organes de l'UE, distinct du CEPD (Comité) qui supervise la cohérence entre États membres.",
      en: 'Independent supervisory authority of the European Union responsible for monitoring the processing of personal data by EU institutions and bodies, distinct from the EDPB (Board) which supervises consistency between Member States.',
    },
    references: ['Art. 52–54 Règlement (CE) 2018/1725'],
  },
  {
    id: 'bcr',
    term: { fr: "BCR / Règles d'entreprise contraignantes", en: 'BCR / Binding Corporate Rules' },
    category: 'acronym',
    aliases: ['Binding Corporate Rules', "Règles d'entreprise contraignantes"],
    definition: {
      fr: "Politiques de protection des données personnelles approuvées par l'autorité de contrôle compétente, adoptées par un groupe multinational pour encadrer les transferts de données personnelles vers des pays tiers au sein du même groupe.",
      en: 'Personal data protection policies approved by the competent supervisory authority, adopted by a multinational group to govern transfers of personal data to third countries within the same group.',
    },
    references: ['Art. 47 RGPD'],
  },
  {
    id: 'scc',
    term: { fr: 'CCT / Clauses Contractuelles Types', en: 'SCC / Standard Contractual Clauses' },
    category: 'acronym',
    aliases: [
      'Standard Contractual Clauses',
      'Clauses Contractuelles Types',
      'CCT',
      'Model clauses',
    ],
    definition: {
      fr: "Clauses types adoptées par la Commission européenne constituant une garantie appropriée pour le transfert de données personnelles vers des pays tiers. Elles lient contractuellement l'exportateur et l'importateur de données et imposent des obligations alignées sur le RGPD.",
      en: 'Standard clauses adopted by the European Commission constituting an appropriate safeguard for transferring personal data to third countries. They contractually bind the data exporter and importer and impose GDPR-aligned obligations.',
    },
    references: ['Art. 46(2)(c) RGPD', "Décision d'exécution (UE) 2021/914"],
  },
  {
    id: 'eu-us-dpf',
    term: {
      fr: 'Cadre EU-États-Unis de protection des données / EU-US DPF',
      en: 'EU-US Data Privacy Framework / EU-US DPF',
    },
    category: 'acronym',
    aliases: ['Data Privacy Framework', 'DPF', 'EU-US DPF', 'Privacy Shield successor'],
    definition: {
      fr: "Mécanisme de transfert adopté par décision d'adéquation de la Commission européenne en juillet 2023, permettant le transfert de données personnelles vers les organisations certifiées aux États-Unis sans nécessiter de garanties supplémentaires telles que des CCT.",
      en: 'Transfer mechanism adopted by an adequacy decision of the European Commission in July 2023, enabling transfers of personal data to certified US organisations without requiring additional safeguards such as SCCs.',
    },
    references: ['Art. 45 RGPD', "Décision d'exécution (UE) 2023/1795"],
  },
  {
    id: 'ropa',
    term: { fr: 'Registre Article 30 / ROPA', en: 'ROPA / Records of Processing Activities' },
    category: 'acronym',
    aliases: [
      'Records of Processing Activities',
      'Registre des activités de traitement',
      'Article 30 register',
    ],
    definition: {
      fr: "Document interne obligatoire tenu par le responsable de traitement et, lorsqu'applicable, par le sous-traitant, recensant l'ensemble des activités de traitement de données personnelles, leurs finalités, bases légales, catégories de données, destinataires, durées de conservation et mesures de sécurité.",
      en: 'Mandatory internal document maintained by the controller and, where applicable, the processor, listing all personal data processing activities, their purposes, legal bases, categories of data, recipients, retention periods, and security measures.',
    },
    references: ['Art. 30 RGPD'],
  },
  {
    id: 'dsar',
    term: { fr: "DSR / Demande d'accès", en: 'DSAR / Data Subject Access Request' },
    category: 'acronym',
    aliases: [
      'Data Subject Access Request',
      "Demande d'accès",
      'DSR',
      'Subject Access Request',
      'SAR',
    ],
    definition: {
      fr: "Demande exercée par une personne concernée auprès d'un responsable de traitement afin d'obtenir confirmation que des données la concernant sont traitées, d'en avoir une copie et d'en connaître les caractéristiques (finalité, durée, destinataires, etc.). Le responsable dispose d'un délai d'un mois, prorogeable de deux mois en cas de complexité.",
      en: 'Request made by a data subject to a controller to obtain confirmation that data concerning them is being processed, a copy of that data, and information about its characteristics (purpose, duration, recipients, etc.). The controller has one month to respond, extendable by two months in complex cases.',
    },
    references: ['Art. 15 RGPD'],
  },

  // Adjacent legal frameworks

  {
    id: 'eprivacy',
    term: { fr: 'Directive ePrivacy', en: 'ePrivacy Directive' },
    category: 'framework',
    aliases: [
      'Directive vie privée et communications électroniques',
      '2002/58/CE',
      'Cookie Directive',
    ],
    definition: {
      fr: "Directive 2002/58/CE relative au traitement des données à caractère personnel et à la protection de la vie privée dans le secteur des communications électroniques, transposée en droit français dans la loi Informatique et Libertés. Elle encadre notamment l'utilisation des cookies et traceurs.",
      en: 'Directive 2002/58/EC on the processing of personal data and the protection of privacy in the electronic communications sector, transposed into French law in the Loi Informatique et Libertés. It governs in particular the use of cookies and trackers.',
    },
    references: ['Directive 2002/58/CE'],
  },
  {
    id: 'nis2',
    term: { fr: 'Directive NIS 2', en: 'NIS2 Directive' },
    category: 'framework',
    aliases: ['Network and Information Security Directive 2', 'NIS2', '(UE) 2022/2555'],
    definition: {
      fr: "Directive (UE) 2022/2555 relative à un niveau élevé commun de cybersécurité dans l'Union, abrogeant la directive NIS 1. Elle impose des obligations de gestion des risques et de notification d'incidents aux entités essentielles et importantes dans des secteurs critiques.",
      en: 'Directive (EU) 2022/2555 on measures for a high common level of cybersecurity across the Union, repealing NIS 1. It imposes risk management obligations and incident notification requirements on essential and important entities in critical sectors.',
    },
    references: ['Directive (UE) 2022/2555'],
  },
  {
    id: 'dsa',
    term: { fr: 'DSA / Loi sur les services numériques', en: 'DSA / Digital Services Act' },
    category: 'framework',
    aliases: [
      'Digital Services Act',
      'Loi sur les services numériques',
      'Règlement (UE) 2022/2065',
    ],
    definition: {
      fr: "Règlement (UE) 2022/2065 qui établit des règles harmonisées pour la responsabilité des intermédiaires en ligne concernant les contenus illicites, la transparence algorithmique et l'interdiction de certaines pratiques publicitaires ciblées, notamment envers les mineurs.",
      en: 'Regulation (EU) 2022/2065 establishing harmonised rules for the liability of online intermediaries regarding illegal content, algorithmic transparency, and the prohibition of certain targeted advertising practices, particularly towards minors.',
    },
    references: ['Règlement (UE) 2022/2065'],
  },
  {
    id: 'dma',
    term: { fr: 'DMA / Loi sur les marchés numériques', en: 'DMA / Digital Markets Act' },
    category: 'framework',
    aliases: ['Digital Markets Act', 'Loi sur les marchés numériques', 'Règlement (UE) 2022/1925'],
    definition: {
      fr: "Règlement (UE) 2022/1925 visant à garantir des marchés numériques équitables et contestables. Il impose des obligations spécifiques aux «contrôleurs d'accès» (grandes plateformes numériques) et comporte des restrictions relatives à la combinaison des données personnelles entre services.",
      en: "Regulation (EU) 2022/1925 aimed at ensuring fair and contestable digital markets. It imposes specific obligations on 'gatekeepers' (large digital platforms) and includes restrictions on combining personal data across services.",
    },
    references: ['Règlement (UE) 2022/1925'],
  },
  {
    id: 'dora',
    term: {
      fr: 'DORA / Règlement sur la résilience opérationnelle numérique',
      en: 'DORA / Digital Operational Resilience Act',
    },
    category: 'framework',
    aliases: ['Digital Operational Resilience Act', 'Règlement (UE) 2022/2554'],
    definition: {
      fr: "Règlement (UE) 2022/2554 imposant aux entités financières de l'UE des exigences harmonisées en matière de gestion des risques liés aux technologies de l'information et de la communication (TIC), de tests de résilience et de notification d'incidents.",
      en: 'Regulation (EU) 2022/2554 imposing harmonised requirements on EU financial entities for managing information and communication technology (ICT) risks, resilience testing, and incident reporting.',
    },
    references: ['Règlement (UE) 2022/2554'],
  },
  {
    id: 'ai-act',
    term: { fr: 'Règlement IA / AI Act', en: 'AI Act / Règlement IA' },
    category: 'framework',
    aliases: ['Artificial Intelligence Act', 'AI Act', 'Règlement (UE) 2024/1689'],
    definition: {
      fr: "Règlement (UE) 2024/1689 établissant des règles harmonisées sur l'intelligence artificielle selon une approche fondée sur le risque. Il interdit certaines pratiques d'IA, impose des obligations de transparence et de robustesse pour les systèmes à risque élevé, et prévoit des interactions explicites avec le RGPD pour les systèmes traitant des données personnelles.",
      en: 'Regulation (EU) 2024/1689 establishing harmonised rules on artificial intelligence based on a risk-based approach. It prohibits certain AI practices, imposes transparency and robustness obligations for high-risk systems, and provides explicit interactions with the GDPR for systems processing personal data.',
    },
    references: ['Règlement (UE) 2024/1689'],
  },
  {
    id: 'ccpa',
    term: { fr: 'CCPA (Californie)', en: 'CCPA (California)' },
    category: 'framework',
    aliases: ['California Consumer Privacy Act', 'CPRA', 'California Privacy Rights Act'],
    definition: {
      fr: 'Loi californienne sur la protection de la vie privée des consommateurs, en vigueur depuis 2020 et renforcée par la CPRA (2023). Elle accorde aux résidents californiens des droits sur leurs données personnelles analogues à ceux du RGPD (accès, suppression, opt-out de la vente).',
      en: 'California Consumer Privacy Act, in force since 2020 and strengthened by the CPRA (2023). It grants California residents rights over their personal data analogous to those under the GDPR (access, deletion, opt-out of sale).',
    },
    references: ['Cal. Civ. Code § 1798.100 et seq.'],
  },
  {
    id: 'lgpd',
    term: { fr: 'LGPD (Brésil)', en: 'LGPD (Brazil)' },
    category: 'framework',
    aliases: ['Lei Geral de Proteção de Dados', 'LGPD'],
    definition: {
      fr: "Loi brésilienne générale sur la protection des données (Lei n° 13.709/2018), entrée en vigueur en 2020. Inspirée du RGPD, elle institue une base légale obligatoire pour tout traitement, reconnaît dix hypothèses légitimes et crée l'ANPD (Autorité nationale de protection des données).",
      en: 'Brazilian General Data Protection Law (Lei n° 13.709/2018), in force since 2020. Modelled on the GDPR, it requires a legal basis for all processing, recognises ten lawful grounds, and establishes the ANPD (National Data Protection Authority).',
    },
    references: ['Lei n° 13.709/2018'],
  },
  {
    id: 'pipl',
    term: { fr: 'PIPL (Chine)', en: 'PIPL (China)' },
    category: 'framework',
    aliases: [
      'Personal Information Protection Law',
      'Loi sur la protection des informations personnelles',
    ],
    definition: {
      fr: "Loi chinoise sur la protection des informations personnelles, en vigueur depuis novembre 2021. Elle s'applique aux traitements de données de ressortissants chinois, impose le consentement ou une autre base légale, et prévoit des exigences strictes pour les transferts transfrontaliers.",
      en: "China's Personal Information Protection Law, in force since November 2021. It applies to processing data of Chinese nationals, requires consent or another lawful basis, and sets strict requirements for cross-border transfers.",
    },
    references: ['PIPL (Chine, 2021)'],
  },
  {
    id: 'eidas',
    term: { fr: 'eIDAS', en: 'eIDAS' },
    category: 'framework',
    aliases: [
      'Electronic Identification, Authentication and Trust Services',
      'Règlement (UE) 910/2014',
      'eIDAS 2.0',
    ],
    definition: {
      fr: "Règlement (UE) n° 910/2014 relatif à l'identification électronique et aux services de confiance pour les transactions électroniques au sein du marché intérieur. Il encadre la signature électronique, le cachet électronique, l'horodatage et l'identification électronique. La révision eIDAS 2.0 (Règlement (UE) 2024/1183) introduit le Portefeuille européen d'identité numérique.",
      en: 'Regulation (EU) No 910/2014 on electronic identification and trust services for electronic transactions in the internal market. It governs electronic signatures, seals, timestamps, and electronic identification. The eIDAS 2.0 revision (Regulation (EU) 2024/1183) introduces the European Digital Identity Wallet.',
    },
    references: ['Règlement (UE) n° 910/2014', 'Règlement (UE) 2024/1183'],
  },

  // Concepts

  {
    id: 'personal-data',
    term: {
      fr: 'Données à caractère personnel',
      en: 'Personal data',
    },
    category: 'concept',
    aliases: ['Donnée personnelle', 'Personal information', 'PII'],
    definition: {
      fr: "Toute information se rapportant à une personne physique identifiée ou identifiable, directement ou indirectement, notamment par référence à un identifiant (nom, numéro d'identification, données de localisation, identifiant en ligne) ou à un ou plusieurs éléments caractéristiques de son identité physique, physiologique, génétique, psychique, économique, culturelle ou sociale.",
      en: 'Any information relating to an identified or identifiable natural person, directly or indirectly, in particular by reference to an identifier (name, identification number, location data, online identifier) or to one or more factors specific to their physical, physiological, genetic, mental, economic, cultural or social identity.',
    },
    references: ['Art. 4(1) RGPD'],
  },
  {
    id: 'special-category-data',
    term: {
      fr: 'Données sensibles / Catégories particulières',
      en: 'Special category data / Sensitive data',
    },
    category: 'concept',
    aliases: [
      'Données sensibles',
      'Catégories particulières de données',
      'Sensitive data',
      'Special categories',
    ],
    definition: {
      fr: "Catégories de données personnelles dont le traitement est en principe interdit, sauf exceptions explicites : données révélant l'origine raciale ou ethnique, les opinions politiques, les convictions religieuses ou philosophiques, l'appartenance syndicale, les données génétiques, biométriques aux fins d'identification unique, les données de santé, ou relatives à la vie sexuelle ou à l'orientation sexuelle.",
      en: 'Categories of personal data whose processing is in principle prohibited, except in explicitly listed circumstances: data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade-union membership, genetic data, biometric data for unique identification, health data, or data relating to sex life or sexual orientation.',
    },
    references: ['Art. 9 RGPD'],
  },
  {
    id: 'health-data',
    term: { fr: 'Données de santé', en: 'Health data' },
    category: 'concept',
    aliases: ['Medical data', 'Données médicales'],
    definition: {
      fr: "Catégorie particulière de données personnelles relatives à la santé physique ou mentale d'une personne physique, y compris la prestation de services de soins de santé, qui révèlent des informations sur l'état de santé de cette personne. Elles ne peuvent être traitées qu'en présence d'une des exceptions de l'art. 9(2) RGPD.",
      en: 'Special category of personal data relating to the physical or mental health of a natural person, including the provision of health care services, which reveal information about their health status. They may only be processed under one of the exceptions in Art. 9(2) GDPR.',
    },
    references: ['Art. 4(15), Art. 9 RGPD'],
  },
  {
    id: 'biometric-data',
    term: { fr: 'Données biométriques', en: 'Biometric data' },
    category: 'concept',
    aliases: ['Biometrics', 'Biometrie'],
    definition: {
      fr: "Données à caractère personnel résultant d'un traitement technique spécifique, relatives aux caractéristiques physiques, physiologiques ou comportementales d'une personne physique, qui permettent ou confirment son identification unique (empreintes digitales, géométrie du visage, iris, voix).",
      en: 'Personal data resulting from specific technical processing relating to the physical, physiological or behavioural characteristics of a natural person, which allow or confirm the unique identification of that person (fingerprints, facial geometry, iris, voice).',
    },
    references: ['Art. 4(14), Art. 9 RGPD'],
  },
  {
    id: 'data-subject',
    term: { fr: 'Personne concernée', en: 'Data subject' },
    category: 'concept',
    aliases: ['Personne physique', 'Natural person'],
    definition: {
      fr: "Personne physique identifiée ou identifiable dont les données à caractère personnel font l'objet d'un traitement. Seules les personnes physiques (et non les personnes morales) bénéficient de la protection du RGPD.",
      en: 'An identified or identifiable natural person whose personal data is being processed. Only natural persons (not legal entities) are protected under the GDPR.',
    },
    references: ['Art. 4(1) RGPD'],
  },
  {
    id: 'processing',
    term: { fr: 'Traitement', en: 'Processing' },
    category: 'concept',
    aliases: ['Traitement de données', 'Data processing'],
    definition: {
      fr: "Toute opération ou ensemble d'opérations effectuées ou non à l'aide de procédés automatisés et appliquées à des données à caractère personnel : collecte, enregistrement, organisation, structuration, conservation, adaptation, modification, extraction, consultation, utilisation, communication, diffusion, effacement ou destruction.",
      en: 'Any operation or set of operations performed on personal data, whether or not by automated means: collection, recording, organisation, structuring, storage, adaptation, alteration, retrieval, consultation, use, disclosure, dissemination, erasure or destruction.',
    },
    references: ['Art. 4(2) RGPD'],
  },
  {
    id: 'profiling',
    term: { fr: 'Profilage', en: 'Profiling' },
    category: 'concept',
    aliases: ['Profiling', 'Profilage automatisé'],
    definition: {
      fr: "Toute forme de traitement automatisé de données personnelles consistant à utiliser ces données pour évaluer certains aspects personnels relatifs à une personne physique — notamment pour analyser ou prédire des éléments concernant son rendement au travail, sa situation économique, sa santé, ses préférences, ses centres d'intérêt, son comportement, sa localisation ou ses déplacements.",
      en: 'Any form of automated processing of personal data consisting of the use of personal data to evaluate certain personal aspects relating to a natural person — in particular to analyse or predict elements concerning their work performance, economic situation, health, personal preferences, interests, behaviour, location or movements.',
    },
    references: ['Art. 4(4) RGPD'],
  },
  {
    id: 'automated-decision',
    term: { fr: 'Décision automatisée', en: 'Automated decision-making' },
    category: 'concept',
    aliases: [
      'Automated individual decision-making',
      'Décision individuelle automatisée',
      'Algorithmic decision',
    ],
    definition: {
      fr: "Décision prise sur le seul fondement d'un traitement automatisé, y compris le profilage, qui produit des effets juridiques concernant une personne ou l'affecte de manière significative. Le RGPD confère aux personnes concernées un droit à ne pas être soumises à une telle décision sauf exceptions.",
      en: 'A decision based solely on automated processing, including profiling, which produces legal effects concerning a person or similarly significantly affects them. The GDPR gives data subjects the right not to be subject to such a decision, except in defined circumstances.',
    },
    references: ['Art. 22 RGPD'],
  },
  {
    id: 'lawful-basis',
    term: { fr: 'Base légale', en: 'Lawful basis' },
    category: 'concept',
    aliases: ['Legal basis', 'Legal ground', 'Fondement juridique'],
    definition: {
      fr: "Condition juridique parmi les six prévues à l'art. 6 du RGPD qui doit être satisfaite pour qu'un traitement de données personnelles soit licite : consentement, exécution d'un contrat, obligation légale, sauvegarde des intérêts vitaux, mission d'intérêt public ou intérêts légitimes.",
      en: 'One of the six legal conditions listed in Art. 6 GDPR that must be met for processing personal data to be lawful: consent, contract performance, legal obligation, vital interests, public task, or legitimate interests.',
    },
    references: ['Art. 6 RGPD'],
  },
  {
    id: 'consent',
    term: { fr: 'Consentement', en: 'Consent' },
    category: 'concept',
    aliases: ['Consentement éclairé', 'Informed consent', 'Opt-in'],
    definition: {
      fr: "Manifestation de volonté libre, spécifique, éclairée et univoque par laquelle la personne concernée accepte, par une déclaration ou un acte positif clair, que des données la concernant fassent l'objet d'un traitement. Le consentement doit pouvoir être retiré à tout moment, aussi facilement qu'il a été donné.",
      en: "A freely given, specific, informed and unambiguous indication of the data subject's wishes by which they signify, by a statement or a clear affirmative action, their agreement to the processing of their personal data. Consent must be as easy to withdraw as to give.",
    },
    references: ['Art. 4(11) RGPD', 'Art. 7 RGPD'],
  },
  {
    id: 'legitimate-interests',
    term: { fr: 'Intérêts légitimes', en: 'Legitimate interests' },
    category: 'concept',
    aliases: ['Legitimate interest', 'LIA', 'Legitimate interests assessment'],
    definition: {
      fr: 'Base légale applicable lorsque le traitement est nécessaire aux fins des intérêts légitimes poursuivis par le responsable du traitement ou par un tiers, à moins que ne prévalent les intérêts ou libertés et droits fondamentaux de la personne concernée. Une mise en balance (LIA) est requise.',
      en: 'Lawful basis applicable where processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where those interests are overridden by the interests or fundamental rights of the data subject. A legitimate-interests assessment (LIA) is required.',
    },
    references: ['Art. 6(1)(f) RGPD'],
  },
  {
    id: 'contractual-necessity',
    term: { fr: 'Nécessité contractuelle', en: 'Contractual necessity' },
    category: 'concept',
    aliases: ["Exécution d'un contrat", 'Contract performance'],
    definition: {
      fr: "Base légale qui permet le traitement de données personnelles lorsque celui-ci est nécessaire à l'exécution d'un contrat auquel la personne concernée est partie, ou à l'exécution de mesures précontractuelles prises à sa demande.",
      en: 'Lawful basis that allows processing when it is necessary for the performance of a contract to which the data subject is party, or in order to take steps at their request prior to entering into a contract.',
    },
    references: ['Art. 6(1)(b) RGPD'],
  },
  {
    id: 'legal-obligation',
    term: { fr: 'Obligation légale', en: 'Legal obligation' },
    category: 'concept',
    aliases: ['Legal requirement', 'Obligation réglementaire'],
    definition: {
      fr: "Base légale permettant le traitement lorsqu'il est nécessaire au respect d'une obligation légale à laquelle le responsable du traitement est soumis. L'obligation doit être fondée sur le droit de l'Union ou le droit national.",
      en: 'Lawful basis allowing processing when it is necessary for compliance with a legal obligation to which the controller is subject. The obligation must be based on Union or Member State law.',
    },
    references: ['Art. 6(1)(c) RGPD'],
  },
  {
    id: 'vital-interests',
    term: { fr: 'Intérêts vitaux', en: 'Vital interests' },
    category: 'concept',
    aliases: ['Sauvegarde des intérêts vitaux'],
    definition: {
      fr: "Base légale applicable lorsque le traitement est nécessaire à la sauvegarde des intérêts vitaux de la personne concernée ou d'une autre personne physique. Elle ne doit être invoquée qu'en dernier recours, notamment en situation d'urgence médicale.",
      en: 'Lawful basis applicable when processing is necessary to protect the vital interests of the data subject or another natural person. It should only be relied upon as a last resort, particularly in medical emergencies.',
    },
    references: ['Art. 6(1)(d) RGPD'],
  },
  {
    id: 'public-interest',
    term: { fr: "Mission d'intérêt public", en: 'Public interest / Public task' },
    category: 'concept',
    aliases: ["Mission d'intérêt public", 'Public task', 'Official authority'],
    definition: {
      fr: "Base légale applicable lorsque le traitement est nécessaire à l'exécution d'une mission d'intérêt public ou relevant de l'exercice de l'autorité publique dont est investi le responsable du traitement. Elle doit être fondée sur le droit de l'Union ou national.",
      en: 'Lawful basis applicable when processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller. It must be based on Union or Member State law.',
    },
    references: ['Art. 6(1)(e) RGPD'],
  },
  {
    id: 'pseudonymisation',
    term: { fr: 'Pseudonymisation', en: 'Pseudonymisation' },
    category: 'concept',
    aliases: ['Pseudonymization', 'Pseudonymous data'],
    definition: {
      fr: 'Traitement de données personnelles de telle façon que celles-ci ne puissent plus être attribuées à une personne concernée précise sans recours à des informations supplémentaires, à condition que ces informations supplémentaires soient conservées séparément et soumises à des mesures techniques et organisationnelles. Les données pseudonymisées restent des données personnelles.',
      en: 'Processing of personal data in such a manner that they can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately and subject to technical and organisational measures. Pseudonymised data remains personal data.',
    },
    references: ['Art. 4(5) RGPD', 'Art. 25, 32 RGPD'],
  },
  {
    id: 'anonymisation',
    term: { fr: 'Anonymisation', en: 'Anonymisation' },
    category: 'concept',
    aliases: ['Anonymization', 'Anonymous data', 'Données anonymes'],
    definition: {
      fr: "Processus par lequel les données personnelles sont irréversiblement modifiées de sorte qu'il soit impossible, en tenant compte de toutes les mesures raisonnablement susceptibles d'être mises en œuvre, d'identifier la personne concernée directement ou indirectement. Les données véritablement anonymes ne sont plus soumises au RGPD.",
      en: 'Process by which personal data is irreversibly altered so that it is impossible, taking into account all reasonably likely measures, to identify the data subject directly or indirectly. Truly anonymous data is no longer subject to the GDPR.',
    },
    references: ['Considérant 26 RGPD', 'Avis 5/2014 WP29'],
  },
  {
    id: 'encryption',
    term: { fr: 'Chiffrement', en: 'Encryption' },
    category: 'concept',
    aliases: ['Encryption', 'Cryptographie', 'Data encryption'],
    definition: {
      fr: "Mesure technique de sécurité qui transforme des données lisibles (texte en clair) en données illisibles (texte chiffré) à l'aide d'un algorithme et d'une clé, de sorte que seul le détenteur de la clé appropriée puisse les déchiffrer. Le chiffrement est explicitement mentionné parmi les mesures de sécurité appropriées dans le RGPD.",
      en: 'A technical security measure that transforms readable data (plaintext) into unreadable data (ciphertext) using an algorithm and a key, so that only the holder of the appropriate key can decrypt it. Encryption is explicitly cited as an appropriate security measure in the GDPR.',
    },
    references: ['Art. 32(1)(a) RGPD'],
  },
  {
    id: 'personal-data-breach',
    term: { fr: 'Violation de données personnelles', en: 'Personal data breach' },
    category: 'concept',
    aliases: ['Data breach', 'Security incident', 'Incident de sécurité', 'Fuite de données'],
    definition: {
      fr: "Violation de la sécurité entraînant, de manière accidentelle ou illicite, la destruction, la perte, l'altération, la divulgation non autorisée de données à caractère personnel transmises, conservées ou traitées d'une autre manière, ou l'accès non autorisé à de telles données.",
      en: 'A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data transmitted, stored or otherwise processed.',
    },
    references: ['Art. 4(12) RGPD'],
  },
  {
    id: 'data-minimisation',
    term: { fr: 'Minimisation des données', en: 'Data minimisation' },
    category: 'concept',
    aliases: ['Data minimization', 'Minimisation', 'Principe de minimisation'],
    definition: {
      fr: 'Principe selon lequel les données à caractère personnel doivent être adéquates, pertinentes et limitées à ce qui est nécessaire au regard des finalités pour lesquelles elles sont traitées. Il interdit la collecte systématique et préventive de données sans finalité précise.',
      en: 'Principle stating that personal data must be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed. It prohibits systematic and pre-emptive data collection without a specific purpose.',
    },
    references: ['Art. 5(1)(c) RGPD'],
  },
  {
    id: 'purpose-limitation',
    term: { fr: 'Limitation des finalités', en: 'Purpose limitation' },
    category: 'concept',
    aliases: ['Purpose specification', 'Limitation de finalité'],
    definition: {
      fr: 'Principe selon lequel les données à caractère personnel doivent être collectées pour des finalités déterminées, explicites et légitimes, et ne pas être traitées ultérieurement de manière incompatible avec ces finalités.',
      en: 'Principle stating that personal data must be collected for specified, explicit and legitimate purposes and not further processed in a manner incompatible with those purposes.',
    },
    references: ['Art. 5(1)(b) RGPD'],
  },
  {
    id: 'storage-limitation',
    term: { fr: 'Limitation de la conservation', en: 'Storage limitation' },
    category: 'concept',
    aliases: ['Retention limitation', 'Conservation des données', 'Data retention'],
    definition: {
      fr: "Principe selon lequel les données à caractère personnel doivent être conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire au regard des finalités pour lesquelles elles sont traitées.",
      en: 'Principle stating that personal data must be kept in a form permitting identification of data subjects for no longer than is necessary for the purposes for which the data are processed.',
    },
    references: ['Art. 5(1)(e) RGPD'],
  },
  {
    id: 'accuracy',
    term: { fr: 'Exactitude', en: 'Accuracy' },
    category: 'concept',
    aliases: ['Data accuracy', 'Data quality', 'Qualité des données'],
    definition: {
      fr: 'Principe imposant que les données à caractère personnel soient exactes et, si nécessaire, tenues à jour, et que toutes les mesures raisonnables soient prises pour que les données inexactes soient effacées ou rectifiées sans tarder.',
      en: 'Principle requiring that personal data be accurate and, where necessary, kept up to date, and that every reasonable step be taken to ensure that inaccurate data is erased or rectified without delay.',
    },
    references: ['Art. 5(1)(d) RGPD'],
  },
  {
    id: 'integrity-confidentiality',
    term: {
      fr: 'Intégrité et confidentialité',
      en: 'Integrity and confidentiality',
    },
    category: 'concept',
    aliases: ['Security principle', 'Principe de sécurité'],
    definition: {
      fr: "Principe selon lequel les données à caractère personnel doivent être traitées de façon à garantir une sécurité appropriée, y compris la protection contre le traitement non autorisé ou illicite et contre la perte, la destruction ou les dégâts d'origine accidentelle, à l'aide de mesures techniques ou organisationnelles appropriées.",
      en: 'Principle stating that personal data must be processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing, accidental loss, destruction or damage, using appropriate technical or organisational measures.',
    },
    references: ['Art. 5(1)(f) RGPD'],
  },
  {
    id: 'accountability',
    term: { fr: 'Responsabilité / Accountability', en: 'Accountability' },
    category: 'concept',
    aliases: ['Principe de responsabilité', 'Accountability principle'],
    definition: {
      fr: "Principe selon lequel le responsable du traitement est responsable du respect de l'ensemble des principes du RGPD et est en mesure de le démontrer. Il implique la mise en place de politiques internes, d'une documentation, d'une formation et de contrôles permettant de prouver la conformité.",
      en: 'Principle whereby the controller is responsible for compliance with all GDPR principles and must be able to demonstrate such compliance. It requires the establishment of internal policies, documentation, training and controls to prove compliance.',
    },
    references: ['Art. 5(2) RGPD', 'Art. 24 RGPD'],
  },
  {
    id: 'privacy-by-design',
    term: { fr: 'Protection dès la conception', en: 'Privacy by design' },
    category: 'concept',
    aliases: ['Privacy by Design', 'PbD', 'Data protection by design'],
    definition: {
      fr: "Obligation pour le responsable du traitement d'intégrer les principes de protection des données dès la conception des systèmes et processus, notamment en choisissant les mesures techniques et organisationnelles les plus protectrices de la vie privée dès le départ.",
      en: 'Obligation for the controller to integrate data protection principles at the design stage of systems and processes, in particular by choosing the most privacy-protective technical and organisational measures from the outset.',
    },
    references: ['Art. 25(1) RGPD'],
  },
  {
    id: 'privacy-by-default',
    term: { fr: 'Protection par défaut', en: 'Privacy by default' },
    category: 'concept',
    aliases: ['Privacy by Default', 'Data protection by default'],
    definition: {
      fr: "Obligation pour le responsable du traitement de mettre en œuvre des mesures techniques et organisationnelles appropriées pour garantir que, par défaut, seules les données nécessaires à chaque finalité sont traitées, et que la quantité de données collectées, l'étendue du traitement et la durée de conservation sont minimales.",
      en: 'Obligation for the controller to implement appropriate technical and organisational measures to ensure that, by default, only personal data necessary for each specific purpose is processed, and that the amount collected, the extent of processing, and the storage period are minimal.',
    },
    references: ['Art. 25(2) RGPD'],
  },
  {
    id: 'cross-border-transfer',
    term: { fr: 'Transfert international', en: 'Cross-border transfer' },
    category: 'concept',
    aliases: ['International transfer', 'Third-country transfer', 'Transfert vers pays tiers'],
    definition: {
      fr: "Tout transfert de données à caractère personnel vers un pays tiers (hors EEE) ou une organisation internationale, soumis aux exigences du Chapitre V du RGPD. Il doit reposer sur une décision d'adéquation, des garanties appropriées (CCT, BCR, etc.) ou une dérogation spécifique.",
      en: 'Any transfer of personal data to a third country (outside the EEA) or an international organisation, subject to the requirements of Chapter V of the GDPR. It must be based on an adequacy decision, appropriate safeguards (SCCs, BCRs, etc.) or a specific derogation.',
    },
    references: ['Chap. V (Art. 44–49) RGPD'],
  },
  {
    id: 'adequacy-decision',
    term: { fr: "Décision d'adéquation", en: 'Adequacy decision' },
    category: 'concept',
    aliases: ['Adequacy finding', 'Pays adéquat'],
    definition: {
      fr: "Décision adoptée par la Commission européenne reconnaissant qu'un pays tiers, un territoire ou un secteur spécifique assure un niveau de protection des données personnelles essentiellement équivalent à celui garanti dans l'EEE. Un tel pays peut recevoir des données sans qu'une garantie supplémentaire soit nécessaire.",
      en: 'Decision adopted by the European Commission recognising that a third country, territory or specific sector ensures a level of data protection essentially equivalent to that guaranteed within the EEA. Data may be transferred to such a country without requiring additional safeguards.',
    },
    references: ['Art. 45 RGPD'],
  },
  {
    id: 'one-stop-shop',
    term: { fr: 'Guichet unique', en: 'One-stop shop' },
    category: 'concept',
    aliases: ['OSS mechanism', 'One-stop-shop mechanism'],
    definition: {
      fr: "Mécanisme du RGPD en vertu duquel un responsable de traitement ou sous-traitant établi dans plusieurs États membres (ou ayant son établissement principal dans un seul État membre) n'a à traiter qu'avec une seule autorité de contrôle — l'autorité chef de file — pour les traitements transfrontaliers.",
      en: 'GDPR mechanism whereby a controller or processor established in multiple Member States (or with a single main establishment in one Member State) only needs to deal with a single supervisory authority — the lead supervisory authority — for cross-border processing.',
    },
    references: ['Art. 56 RGPD', 'Considérant 127 RGPD'],
  },
  {
    id: 'lead-supervisory-authority',
    term: { fr: 'Autorité chef de file', en: 'Lead supervisory authority' },
    category: 'concept',
    aliases: ['LSA', 'Lead DPA', 'Autorité de contrôle chef de file'],
    definition: {
      fr: "Autorité de contrôle de l'État membre dans lequel se situe l'établissement principal d'un responsable de traitement ou d'un sous-traitant. Elle est compétente pour agir en tant qu'autorité chef de file dans le cadre des traitements transfrontaliers, en coopération avec les autorités de contrôle concernées.",
      en: 'Supervisory authority of the Member State where the main establishment of a controller or processor is located. It is competent to act as the lead supervisory authority for cross-border processing, in cooperation with the concerned supervisory authorities.',
    },
    references: ['Art. 56 RGPD'],
  },
  {
    id: 'pii',
    term: {
      fr: 'IPI / Informations à caractère personnel identifiables',
      en: 'PII / Personally Identifiable Information',
    },
    category: 'concept',
    aliases: ['Personally Identifiable Information', 'PII', 'Personal information'],
    definition: {
      fr: "Terme d'origine américaine et ISO (ISO/IEC 29101) désignant les informations permettant d'identifier directement ou indirectement un individu. Notion proche de celle de «données personnelles» au sens du RGPD, mais plus large dans certains contextes ISO — le RGPD reste la référence normative en Europe.",
      en: "Term of US and ISO origin (ISO/IEC 29101) referring to information that can directly or indirectly identify an individual. Closely related to the concept of 'personal data' under the GDPR, but broader in some ISO contexts — the GDPR remains the normative reference in Europe.",
    },
    references: ['Art. 4(1) RGPD', 'ISO/IEC 29101'],
  },

  // Roles

  {
    id: 'controller',
    term: { fr: 'Responsable de traitement', en: 'Controller' },
    category: 'role',
    aliases: ['Data controller', 'Responsable du traitement'],
    definition: {
      fr: "Personne physique ou morale, autorité publique, service ou autre organisme qui, seul ou conjointement avec d'autres, détermine les finalités et les moyens du traitement des données à caractère personnel. Il supporte la responsabilité principale de conformité au RGPD.",
      en: 'A natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data. The controller bears primary GDPR compliance responsibility.',
    },
    references: ['Art. 4(7) RGPD'],
  },
  {
    id: 'joint-controllers',
    term: { fr: 'Responsables conjoints du traitement', en: 'Joint controllers' },
    category: 'role',
    aliases: ['Co-controllers', 'Joint data controllers', 'Coresponsables'],
    definition: {
      fr: "Deux responsables de traitement ou plus qui déterminent conjointement les finalités et les moyens d'un traitement. Ils doivent définir leurs responsabilités respectives par accord interne transparent et en communiquer l'essentiel aux personnes concernées.",
      en: 'Two or more controllers who jointly determine the purposes and means of processing. They must define their respective responsibilities by transparent internal arrangement and make the essence of that arrangement available to data subjects.',
    },
    references: ['Art. 26 RGPD'],
  },
  {
    id: 'processor',
    term: { fr: 'Sous-traitant', en: 'Processor' },
    category: 'role',
    aliases: ['Data processor', 'Prestataire', 'Sous-traitant RGPD'],
    definition: {
      fr: 'Personne physique ou morale, autorité publique, service ou autre organisme qui traite des données à caractère personnel pour le compte du responsable du traitement. Le sous-traitant ne peut agir que sur instruction documentée du responsable et doit conclure un DPA.',
      en: 'A natural or legal person, public authority, agency or other body which processes personal data on behalf of the controller. The processor may only act on documented instructions from the controller and must conclude a DPA.',
    },
    references: ['Art. 4(8) RGPD', 'Art. 28 RGPD'],
  },
  {
    id: 'sub-processor',
    term: { fr: 'Sous-traitant ultérieur', en: 'Sub-processor' },
    category: 'role',
    aliases: ['Sub-processor', 'Sous-traitant de rang 2'],
    definition: {
      fr: "Sous-traitant qui fait appel à un autre sous-traitant pour réaliser des activités de traitement spécifiques pour le compte du responsable du traitement. L'engagement d'un sous-traitant ultérieur est soumis à l'autorisation préalable, générale ou spécifique, du responsable du traitement.",
      en: 'A processor that engages another processor to carry out specific processing activities on behalf of the controller. Engaging a sub-processor requires prior specific or general authorisation from the controller.',
    },
    references: ['Art. 28(2) RGPD'],
  },
  {
    id: 'eu-representative',
    term: { fr: "Représentant dans l'UE", en: 'EU representative' },
    category: 'role',
    aliases: ['Représentant UE', 'Article 27 representative'],
    definition: {
      fr: "Personne physique ou morale établie dans l'Union désignée par écrit par un responsable de traitement ou un sous-traitant non établi dans l'UE, qui sert de point de contact pour les autorités de contrôle et les personnes concernées. La désignation est obligatoire sauf exceptions.",
      en: 'A natural or legal person established in the Union designated in writing by a controller or processor not established in the EU, acting as a point of contact for supervisory authorities and data subjects. Designation is mandatory unless exceptions apply.',
    },
    references: ['Art. 27 RGPD'],
  },
  {
    id: 'recipient',
    term: { fr: 'Destinataire', en: 'Recipient' },
    category: 'role',
    aliases: ['Data recipient', 'Destinataire des données'],
    definition: {
      fr: "Personne physique ou morale, autorité publique, service ou tout autre organisme qui reçoit communication de données à caractère personnel, qu'il s'agisse ou non d'un tiers. Les autorités publiques susceptibles de recevoir communication de données dans le cadre d'une mission particulière ne sont pas considérées comme des destinataires.",
      en: 'A natural or legal person, public authority, agency or another body, to which personal data is disclosed, whether a third party or not. Public authorities which may receive personal data in the framework of a particular inquiry are not regarded as recipients.',
    },
    references: ['Art. 4(9) RGPD'],
  },
  {
    id: 'third-party',
    term: { fr: 'Tiers', en: 'Third party' },
    category: 'role',
    aliases: ['Third party', 'Tiers au traitement'],
    definition: {
      fr: "Personne physique ou morale, autorité publique, service ou organisme autre que la personne concernée, le responsable du traitement, le sous-traitant et les personnes qui, placées sous l'autorité directe du responsable du traitement ou du sous-traitant, sont autorisées à traiter les données à caractère personnel.",
      en: 'A natural or legal person, public authority, agency or body other than the data subject, controller, processor and persons who, under the direct authority of the controller or processor, are authorised to process personal data.',
    },
    references: ['Art. 4(10) RGPD'],
  },
  {
    id: 'supervisory-authority',
    term: { fr: 'Autorité de contrôle', en: 'Supervisory authority' },
    category: 'role',
    aliases: ['Data Protection Authority', 'DPA', 'Autorité de protection des données'],
    definition: {
      fr: "Autorité publique indépendante établie par un État membre de l'EEE pour contrôler l'application du RGPD. En France, il s'agit de la CNIL. Les autorités de contrôle ont compétence pour mener des enquêtes, imposer des mesures correctives et prononcer des sanctions administratives.",
      en: 'An independent public authority established by an EEA Member State to supervise the application of the GDPR. In France, this is the CNIL. Supervisory authorities have powers to conduct investigations, impose corrective measures, and impose administrative fines.',
    },
    references: ['Art. 4(21) RGPD', 'Art. 51–59 RGPD'],
  },

  // Processes / Rights

  {
    id: 'right-to-access',
    term: { fr: "Droit d'accès", en: 'Right to access' },
    category: 'process',
    aliases: ['Right of access', 'Access request', 'SAR'],
    definition: {
      fr: "Droit de la personne concernée d'obtenir du responsable du traitement la confirmation que des données la concernant sont ou ne sont pas traitées, et, lorsqu'elles le sont, une copie de ces données ainsi que des informations sur les finalités, catégories de données, destinataires, durées de conservation et droits disponibles.",
      en: 'Right of the data subject to obtain from the controller confirmation as to whether or not their personal data is being processed and, if so, a copy of that data and information on the purposes, categories of data, recipients, retention periods and available rights.',
    },
    references: ['Art. 15 RGPD'],
  },
  {
    id: 'right-to-rectification',
    term: { fr: 'Droit de rectification', en: 'Right to rectification' },
    category: 'process',
    aliases: ['Rectification', 'Correction of data'],
    definition: {
      fr: "Droit de la personne concernée d'obtenir, dans les meilleurs délais, la rectification des données à caractère personnel inexactes la concernant et de compléter les données incomplètes.",
      en: 'Right of the data subject to obtain from the controller without undue delay the rectification of inaccurate personal data concerning them and to have incomplete personal data completed.',
    },
    references: ['Art. 16 RGPD'],
  },
  {
    id: 'right-to-erasure',
    term: {
      fr: "Droit à l'effacement / Droit à l'oubli",
      en: 'Right to erasure / Right to be forgotten',
    },
    category: 'process',
    aliases: ['Right to be forgotten', "Droit à l'oubli", 'Erasure request'],
    definition: {
      fr: "Droit de la personne concernée d'obtenir l'effacement, dans les meilleurs délais, de données la concernant. Ce droit s'applique notamment lorsque les données ne sont plus nécessaires, que le consentement est retiré sans autre base légale, que la personne s'oppose au traitement ou que le traitement est illicite.",
      en: 'Right of the data subject to obtain from the controller the erasure of personal data concerning them without undue delay. This right applies notably when data is no longer necessary, consent is withdrawn without another legal basis, the person objects, or the processing is unlawful.',
    },
    references: ['Art. 17 RGPD'],
  },
  {
    id: 'right-to-restriction',
    term: { fr: 'Droit à la limitation du traitement', en: 'Right to restriction of processing' },
    category: 'process',
    aliases: ['Restriction of processing', 'Limitation du traitement'],
    definition: {
      fr: "Droit de la personne concernée d'obtenir du responsable la limitation du traitement lorsque l'exactitude est contestée, le traitement illicite mais la personne s'oppose à l'effacement, les données ne sont plus nécessaires mais requises pour une action en justice, ou un droit d'opposition est en attente de vérification.",
      en: 'Right of the data subject to obtain from the controller the restriction of processing where accuracy is contested, processing is unlawful but the person opposes erasure, data is no longer needed but required for legal claims, or an objection is pending verification.',
    },
    references: ['Art. 18 RGPD'],
  },
  {
    id: 'right-to-portability',
    term: { fr: 'Droit à la portabilité', en: 'Right to data portability' },
    category: 'process',
    aliases: ['Data portability', 'Portabilité des données'],
    definition: {
      fr: 'Droit de la personne concernée de recevoir les données la concernant dans un format structuré, couramment utilisé et lisible par machine, et de les transmettre à un autre responsable du traitement, lorsque le traitement repose sur le consentement ou un contrat et est effectué par des procédés automatisés.',
      en: 'Right of the data subject to receive personal data concerning them in a structured, commonly used and machine-readable format and to transmit those data to another controller, where processing is based on consent or a contract and carried out by automated means.',
    },
    references: ['Art. 20 RGPD'],
  },
  {
    id: 'right-to-object',
    term: { fr: "Droit d'opposition", en: 'Right to object' },
    category: 'process',
    aliases: ['Right to object', "Droit d'opposition", 'Opt-out'],
    definition: {
      fr: "Droit de la personne concernée de s'opposer à tout moment au traitement de données la concernant, fondé sur les intérêts légitimes ou une mission d'intérêt public, ainsi qu'à tout traitement à des fins de prospection commerciale y compris le profilage qui lui est associé.",
      en: 'Right of the data subject to object at any time to processing of personal data concerning them, based on legitimate interests or a public task, as well as to any processing for direct marketing purposes including associated profiling.',
    },
    references: ['Art. 21 RGPD'],
  },
  {
    id: 'breach-notification-authority',
    term: {
      fr: "Notification de violation à l'autorité (72h)",
      en: 'Notification of breach to supervisory authority (72h)',
    },
    category: 'process',
    aliases: ['72h notification', 'Breach notification to DPA', 'Notification CNIL'],
    definition: {
      fr: "Obligation pour le responsable du traitement, en cas de violation de données personnelles susceptible d'engendrer un risque pour les droits et libertés des personnes, de notifier l'autorité de contrôle compétente dans un délai de 72 heures après avoir pris connaissance de la violation.",
      en: 'Obligation for the controller, in the event of a personal data breach likely to result in a risk to the rights and freedoms of persons, to notify the competent supervisory authority within 72 hours after becoming aware of the breach.',
    },
    references: ['Art. 33 RGPD'],
  },
  {
    id: 'breach-communication-subjects',
    term: {
      fr: 'Communication de violation aux personnes concernées',
      en: 'Communication of breach to data subjects',
    },
    category: 'process',
    aliases: [
      'Breach communication',
      'Communication aux personnes',
      'Data breach notification to individuals',
    ],
    definition: {
      fr: "Obligation pour le responsable du traitement de communiquer, dans les meilleurs délais, une violation de données personnelles à la personne concernée lorsque cette violation est susceptible d'engendrer un risque élevé pour ses droits et libertés, afin qu'elle puisse prendre les précautions nécessaires.",
      en: 'Obligation for the controller to communicate, without undue delay, a personal data breach to the data subject when it is likely to result in a high risk to their rights and freedoms, so they can take necessary precautions.',
    },
    references: ['Art. 34 RGPD'],
  },
  {
    id: 'dpia-process',
    term: { fr: "Procédure d'AIPD", en: 'DPIA process' },
    category: 'process',
    aliases: ['DPIA process', "Procédure d'AIPD", 'PIA process'],
    definition: {
      fr: "Processus documenté que le responsable du traitement doit mettre en œuvre avant d'entreprendre un traitement susceptible d'engendrer un risque élevé. Il comprend la description du traitement, l'évaluation de la nécessité et proportionnalité, l'évaluation des risques et les mesures d'atténuation envisagées.",
      en: 'Documented process that the controller must implement before undertaking processing likely to result in a high risk. It includes a description of the processing, assessment of necessity and proportionality, risk assessment, and envisaged mitigation measures.',
    },
    references: ['Art. 35 RGPD'],
  },
  {
    id: 'prior-consultation',
    term: { fr: 'Consultation préalable', en: 'Prior consultation' },
    category: 'process',
    aliases: ['Consultation préalable CNIL', 'Prior consultation with DPA'],
    definition: {
      fr: "Obligation pour le responsable du traitement de consulter l'autorité de contrôle avant de procéder à un traitement lorsque l'AIPD indique que le traitement présenterait un risque élevé en l'absence de mesures prises pour atténuer ce risque.",
      en: 'Obligation for the controller to consult the supervisory authority before proceeding with a processing operation where the DPIA indicates that the processing would result in a high risk if no measures are taken to mitigate the risk.',
    },
    references: ['Art. 36 RGPD'],
  },
  {
    id: 'records-maintenance',
    term: {
      fr: 'Tenue du registre des traitements',
      en: 'Maintenance of records of processing activities',
    },
    category: 'process',
    aliases: ['Registre Art. 30', 'Records maintenance', 'ROPA maintenance'],
    definition: {
      fr: "Obligation pour tout responsable de traitement de tenir un registre écrit (papier ou électronique) des activités de traitement dont il est responsable, contenant les informations listées à l'art. 30(1) RGPD, et de le mettre à disposition de l'autorité de contrôle sur demande.",
      en: 'Obligation for every controller to maintain a written (paper or electronic) record of processing activities under their responsibility, containing the information listed in Art. 30(1) GDPR, and to make it available to the supervisory authority on request.',
    },
    references: ['Art. 30 RGPD'],
  },
  {
    id: 'cooperation-authority',
    term: {
      fr: "Coopération avec l'autorité de contrôle",
      en: 'Cooperation with the supervisory authority',
    },
    category: 'process',
    aliases: ['Coopération CNIL', 'DPA cooperation'],
    definition: {
      fr: "Obligation du responsable du traitement et du sous-traitant de coopérer, sur demande, avec l'autorité de contrôle dans l'accomplissement de ses missions, notamment en fournissant l'accès aux locaux et aux équipements, aux données et aux informations nécessaires.",
      en: 'Obligation of the controller and processor to cooperate, on request, with the supervisory authority in the performance of its tasks, in particular by providing access to premises and equipment, data and information necessary.',
    },
    references: ['Art. 31 RGPD'],
  },

  // Security / Adjacent compliance frameworks

  {
    id: 'iso-27001',
    term: { fr: 'ISO/IEC 27001 — SMSI', en: 'ISO/IEC 27001 — ISMS' },
    category: 'framework',
    aliases: [
      'ISO 27001',
      'ISMS',
      'Information Security Management System',
      "Système de Management de la Sécurité de l'Information",
      'SMSI',
    ],
    definition: {
      fr: "Norme internationale définissant les exigences relatives à l'établissement, la mise en œuvre, la maintenance et l'amélioration continue d'un Système de Management de la Sécurité de l'Information (SMSI). Sa certification atteste d'une démarche structurée de gestion des risques liés à la sécurité de l'information.",
      en: 'International standard specifying the requirements for establishing, implementing, maintaining and continually improving an Information Security Management System (ISMS). Certification demonstrates a structured approach to managing information security risks.',
    },
    references: ['ISO/IEC 27001:2022'],
  },
  {
    id: 'iso-27701',
    term: { fr: 'ISO/IEC 27701 — SMVP', en: 'ISO/IEC 27701 — PIMS' },
    category: 'framework',
    aliases: [
      'ISO 27701',
      'PIMS',
      'Privacy Information Management System',
      'Système de Management de la Protection de la Vie Privée',
      'SMVP',
    ],
    definition: {
      fr: "Extension de l'ISO/IEC 27001 et 27002 fournissant des lignes directrices pour l'établissement, la mise en œuvre, la maintenance et l'amélioration continue d'un Système de Management de la Protection de la Vie Privée (SMVP). Elle propose un cadre de référence aligné sur le RGPD pour responsables de traitement et sous-traitants.",
      en: 'Extension of ISO/IEC 27001 and 27002 providing guidance for establishing, implementing, maintaining and continually improving a Privacy Information Management System (PIMS). It offers a GDPR-aligned framework for both controllers and processors.',
    },
    references: ['ISO/IEC 27701:2019'],
  },
  {
    id: 'iso-27018',
    term: { fr: 'ISO/IEC 27018 — IPI cloud', en: 'ISO/IEC 27018 — Cloud PII' },
    category: 'framework',
    aliases: ['ISO 27018', 'Cloud PII standard', 'Cloud privacy standard'],
    definition: {
      fr: 'Norme internationale qui établit des objectifs de contrôle, des contrôles et des lignes directrices pour la mise en œuvre de mesures de protection des informations à caractère personnel (IPI) dans le contexte du cloud computing public, à destination des sous-traitants agissant en tant que prestataires de cloud.',
      en: 'International standard establishing control objectives, controls and guidelines for implementing measures to protect personally identifiable information (PII) processed in public cloud computing environments, aimed at cloud service processors.',
    },
    references: ['ISO/IEC 27018:2019'],
  },
  {
    id: 'anssi',
    term: { fr: 'ANSSI', en: 'ANSSI' },
    category: 'framework',
    aliases: [
      "Agence Nationale de la Sécurité des Systèmes d'Information",
      'French cybersecurity agency',
    ],
    definition: {
      fr: "Agence gouvernementale française rattachée au Premier ministre, chargée de la sécurité et de la défense des systèmes d'information de l'État et d'assister les administrations et les entreprises. Elle publie des recommandations et des guides de bonnes pratiques en matière de sécurité informatique.",
      en: 'French government agency attached to the Prime Minister, responsible for the security and defence of State information systems and for assisting public bodies and companies. It publishes recommendations and best-practice guides on information security.',
    },
    references: ['Décret n° 2009-834 du 7 juillet 2009'],
  },
  {
    id: 'secnumcloud',
    term: { fr: 'SecNumCloud', en: 'SecNumCloud' },
    category: 'framework',
    aliases: ['Qualification SecNumCloud', 'SecNumCloud ANSSI'],
    definition: {
      fr: "Qualification délivrée par l'ANSSI attestant qu'un prestataire de services cloud respecte un référentiel exigeant de sécurité (techniques, organisationnelles, juridiques). Elle constitue une garantie de souveraineté numérique et de protection contre les accès non-autorisés, notamment par des lois extra-européennes.",
      en: 'Qualification issued by ANSSI certifying that a cloud service provider meets a demanding security framework (technical, organisational, legal). It provides a guarantee of digital sovereignty and protection against unauthorised access, notably by extra-European laws.',
    },
    references: ['Référentiel SecNumCloud v3.2'],
  },
  {
    id: 'mfa',
    term: { fr: 'MFA / Authentification multi-facteurs', en: 'MFA / Multi-Factor Authentication' },
    category: 'framework',
    aliases: [
      'Multi-Factor Authentication',
      '2FA',
      'Two-Factor Authentication',
      'Authentification à deux facteurs',
      'Double authentification',
    ],
    definition: {
      fr: "Mécanisme d'authentification combinant au moins deux facteurs indépendants parmi : quelque chose que l'on sait (mot de passe), quelque chose que l'on possède (token, téléphone) et quelque chose que l'on est (biométrie). Il réduit significativement le risque de compromission en cas de vol de mot de passe.",
      en: 'Authentication mechanism combining at least two independent factors from: something known (password), something possessed (token, phone), and something inherent (biometrics). It significantly reduces the risk of compromise in the event of password theft.',
    },
    references: ['Art. 32 RGPD', "ANSSI — Guide d'authentification"],
  },
  {
    id: 'cookie-consent',
    term: { fr: 'Bandeau cookies / Consentement cookies', en: 'Cookie consent' },
    category: 'framework',
    aliases: ['Cookie banner', 'Cookie notice', 'Bandeau cookies'],
    definition: {
      fr: "Interface informant les utilisateurs des cookies et traceurs déposés sur leur terminal et recueillant leur consentement préalable lorsque requis par la directive ePrivacy et les lignes directrices de la CNIL. Le consentement doit être libre, spécifique, éclairé et univoque ; le refus doit être aussi simple que l'acceptation.",
      en: 'Interface informing users of cookies and trackers placed on their device and collecting their prior consent where required by the ePrivacy Directive and CNIL guidelines. Consent must be freely given, specific, informed and unambiguous; refusal must be as easy as acceptance.',
    },
    references: ['Directive 2002/58/CE', 'Lignes directrices CNIL sur les cookies'],
  },
  {
    id: 'cmp',
    term: {
      fr: 'CMP / Plateforme de gestion du consentement',
      en: 'CMP / Consent Management Platform',
    },
    category: 'framework',
    aliases: ['Consent Management Platform', 'Plateforme de gestion du consentement', 'CMP'],
    definition: {
      fr: "Solution technique permettant aux organisations de collecter, stocker, gérer et prouver les consentements des utilisateurs aux cookies et autres traceurs, dans le respect des exigences légales. Les CMP conformes s'appuient généralement sur des standards comme le TCF (Transparency and Consent Framework) de l'IAB Europe.",
      en: 'Technical solution enabling organisations to collect, store, manage and demonstrate user consent to cookies and other trackers, in compliance with legal requirements. Compliant CMPs typically rely on standards such as the IAB Europe Transparency and Consent Framework (TCF).',
    },
    references: ['Directive 2002/58/CE', 'Lignes directrices CNIL sur les cookies'],
  },
  {
    id: 'soc2',
    term: { fr: 'SOC 2', en: 'SOC 2' },
    category: 'framework',
    aliases: ['Service Organization Control 2', 'SOC 2 Type I', 'SOC 2 Type II', 'AICPA SOC 2'],
    definition: {
      fr: "Cadre d'audit américain développé par l'AICPA (American Institute of Certified Public Accountants) évaluant les contrôles d'une organisation de services relativement à cinq critères de confiance : sécurité, disponibilité, intégrité du traitement, confidentialité et protection de la vie privée.",
      en: "US audit framework developed by the AICPA (American Institute of Certified Public Accountants) assessing a service organisation's controls against five trust services criteria: security, availability, processing integrity, confidentiality, and privacy.",
    },
    references: ['AICPA SOC 2 criteria'],
  },
  {
    id: 'nist-csf',
    term: { fr: 'Cadre de cybersécurité NIST', en: 'NIST Cybersecurity Framework' },
    category: 'framework',
    aliases: ['NIST CSF', 'NIST Framework', 'CSF'],
    definition: {
      fr: 'Référentiel volontaire développé par le National Institute of Standards and Technology américain, structuré autour de six fonctions — Gouverner, Identifier, Protéger, Détecter, Répondre, Restaurer — fournissant des lignes directrices pour la gestion des risques de cybersécurité.',
      en: 'Voluntary framework developed by the US National Institute of Standards and Technology, structured around six functions — Govern, Identify, Protect, Detect, Respond, Recover — providing guidelines for managing cybersecurity risk.',
    },
    references: ['NIST CSF v2.0 (2024)'],
  },
  {
    id: 'dlp',
    term: { fr: 'DLP / Prévention de la perte de données', en: 'DLP / Data Loss Prevention' },
    category: 'framework',
    aliases: [
      'Data Loss Prevention',
      'Prévention de la perte de données',
      'Data Leakage Prevention',
    ],
    definition: {
      fr: "Ensemble de technologies et de processus visant à détecter et prévenir la divulgation non autorisée de données sensibles. Les solutions DLP surveillent les flux de données (en transit, au repos, en cours d'utilisation) et appliquent des règles pour bloquer ou alerter sur les tentatives d'exfiltration.",
      en: 'A set of technologies and processes designed to detect and prevent the unauthorised disclosure of sensitive data. DLP solutions monitor data flows (in transit, at rest, in use) and apply rules to block or alert on exfiltration attempts.',
    },
    references: ['Art. 32 RGPD'],
  },
  {
    id: 'siem',
    term: {
      fr: 'SIEM / Gestion des événements et des informations de sécurité',
      en: 'SIEM / Security Information and Event Management',
    },
    category: 'framework',
    aliases: ['Security Information and Event Management', 'SIEM', 'Journalisation et corrélation'],
    definition: {
      fr: 'Plateforme combinant la collecte centralisée de journaux (SIM) et la surveillance en temps réel des événements de sécurité (SEM). Elle permet de corréler des événements provenant de sources multiples, de détecter des incidents et de conserver les preuves nécessaires à la réponse sur incident et aux obligations de traçabilité du RGPD.',
      en: 'Platform combining centralised log collection (SIM) and real-time monitoring of security events (SEM). It correlates events from multiple sources, detects incidents, and retains evidence needed for incident response and GDPR traceability obligations.',
    },
    references: ['Art. 32 RGPD'],
  },
];
