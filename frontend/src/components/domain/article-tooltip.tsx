'use client';

import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n/context';

// GDPR Article content (abbreviated for tooltips)
const GDPR_ARTICLES: Record<
  string,
  { titleFr: string; titleEn: string; contentFr: string; contentEn: string }
> = {
  '6': {
    titleFr: 'Article 6 - Licéité du traitement',
    titleEn: 'Article 6 - Lawfulness of processing',
    contentFr: `Le traitement n'est licite que si au moins une des conditions suivantes est remplie:
a) consentement de la personne concernée
b) exécution d'un contrat
c) obligation légale
d) sauvegarde des intérêts vitaux
e) mission d'intérêt public
f) intérêts légitimes du responsable`,
    contentEn: `Processing shall be lawful only if at least one of the following applies:
a) consent of the data subject
b) performance of a contract
c) legal obligation
d) vital interests
e) public interest task
f) legitimate interests of the controller`,
  },
  '9': {
    titleFr: 'Article 9 - Catégories particulières de données',
    titleEn: 'Article 9 - Special categories of data',
    contentFr:
      "Le traitement des données révélant l'origine raciale/ethnique, les opinions politiques, " +
      "les convictions religieuses, l'appartenance syndicale, les données génétiques, biométriques, " +
      'de santé ou concernant la vie sexuelle est interdit, sauf exceptions.',
    contentEn:
      'Processing of data revealing racial/ethnic origin, political opinions, religious beliefs, ' +
      'trade union membership, genetic data, biometric data, health data, or sex life data is ' +
      'prohibited, with exceptions.',
  },
  '13': {
    titleFr: 'Article 13 - Informations à fournir',
    titleEn: 'Article 13 - Information to be provided',
    contentFr:
      'Lorsque des données sont collectées auprès de la personne concernée, le responsable ' +
      "du traitement lui fournit les informations sur l'identité du responsable, les finalités, " +
      'les destinataires, la durée de conservation et les droits.',
    contentEn:
      'Where personal data are collected from the data subject, the controller shall provide ' +
      'information about identity, purposes, recipients, retention period and rights.',
  },
  '17': {
    titleFr: "Article 17 - Droit à l'effacement",
    titleEn: 'Article 17 - Right to erasure',
    contentFr:
      "La personne concernée a le droit d'obtenir l'effacement de ses données lorsque celles-ci " +
      'ne sont plus nécessaires, le consentement est retiré, ou le traitement est illicite.',
    contentEn:
      'The data subject has the right to obtain erasure of personal data where data are no ' +
      'longer necessary, consent is withdrawn, or processing is unlawful.',
  },
  '25': {
    titleFr: 'Article 25 - Protection des données dès la conception',
    titleEn: 'Article 25 - Data protection by design',
    contentFr:
      'Le responsable du traitement met en œuvre des mesures techniques et organisationnelles ' +
      'appropriées pour garantir que, par défaut, seules les données nécessaires sont traitées.',
    contentEn:
      'The controller shall implement appropriate technical and organisational measures to ensure ' +
      'that, by default, only personal data necessary are processed.',
  },
  '32': {
    titleFr: 'Article 32 - Sécurité du traitement',
    titleEn: 'Article 32 - Security of processing',
    contentFr:
      'Le responsable du traitement met en œuvre des mesures appropriées: pseudonymisation, ' +
      'chiffrement, capacité à garantir la confidentialité, intégrité, disponibilité et ' +
      'résilience des systèmes.',
    contentEn:
      'The controller shall implement appropriate measures including: pseudonymisation, ' +
      'encryption, ability to ensure confidentiality, integrity, availability and resilience ' +
      'of systems.',
  },
  '35': {
    titleFr: "Article 35 - Analyse d'impact (AIPD)",
    titleEn: 'Article 35 - Data protection impact assessment',
    contentFr:
      "Lorsqu'un traitement est susceptible d'engendrer un risque élevé pour les droits et " +
      "libertés des personnes, le responsable effectue une analyse d'impact préalable.",
    contentEn:
      'Where processing is likely to result in a high risk to the rights and freedoms of natural ' +
      'persons, the controller shall carry out an impact assessment prior to the processing.',
  },
  '44': {
    titleFr: 'Article 44 - Principe général des transferts',
    titleEn: 'Article 44 - General principle for transfers',
    contentFr: `Un transfert de données vers un pays tiers ne peut avoir lieu que si le responsable respecte les conditions prévues au chapitre V du RGPD.`,
    contentEn: `Any transfer of personal data to a third country shall only take place if the conditions in Chapter V of the GDPR are complied with.`,
  },
  '45': {
    titleFr: "Article 45 - Décisions d'adéquation",
    titleEn: 'Article 45 - Adequacy decisions',
    contentFr: `Un transfert peut avoir lieu vers un pays tiers si la Commission a décidé que ce pays assure un niveau de protection adéquat.`,
    contentEn: `A transfer may take place to a third country if the Commission has decided that the country ensures an adequate level of protection.`,
  },
  '46': {
    titleFr: 'Article 46 - Garanties appropriées',
    titleEn: 'Article 46 - Appropriate safeguards',
    contentFr:
      "En l'absence de décision d'adéquation, un transfert peut avoir lieu avec des garanties " +
      "appropriées: clauses contractuelles types (CCT), règles d'entreprise contraignantes (BCR), " +
      'codes de conduite approuvés.',
    contentEn:
      'In absence of an adequacy decision, a transfer may take place with appropriate safeguards: ' +
      'standard contractual clauses (SCC), binding corporate rules (BCR), approved codes of conduct.',
  },
  '49': {
    titleFr: 'Article 49 - Dérogations',
    titleEn: 'Article 49 - Derogations',
    contentFr:
      "En l'absence de décision d'adéquation ou de garanties appropriées, un transfert ne peut " +
      'avoir lieu que dans des situations spécifiques: consentement explicite, nécessité ' +
      'contractuelle, intérêt public important, etc.',
    contentEn:
      'In absence of adequacy decision or appropriate safeguards, a transfer may only take place ' +
      'in specific situations: explicit consent, contractual necessity, important public interest, etc.',
  },
};

// Risk criteria articles (CNIL/WP29 guidelines)
const RISK_CRITERIA_ARTICLES: Record<
  string,
  { titleFr: string; titleEn: string; contentFr: string; contentEn: string }
> = {
  EVALUATION_SCORING: {
    titleFr: 'Critère 1 - Évaluation/Notation',
    titleEn: 'Criterion 1 - Evaluation/Scoring',
    contentFr:
      'Profilage et notation, y compris les prédictions concernant le rendement au travail, la ' +
      'situation économique, la santé, les préférences personnelles, le comportement.',
    contentEn:
      'Profiling and scoring, including predictions about work performance, economic situation, ' +
      'health, personal preferences, behavior.',
  },
  AUTOMATED_DECISIONS: {
    titleFr: 'Critère 2 - Décision automatisée',
    titleEn: 'Criterion 2 - Automated decision',
    contentFr:
      'Prise de décision automatisée avec effet juridique ou effet significatif similaire: ' +
      "exclusion d'une prestation, refus de crédit, recrutement automatisé. (Art. 22 RGPD)",
    contentEn:
      'Automated decision-making with legal or similarly significant effect: exclusion from ' +
      'benefits, credit refusal, automated recruitment. (Art. 22 GDPR)',
  },
  SYSTEMATIC_MONITORING: {
    titleFr: 'Critère 3 - Surveillance systématique',
    titleEn: 'Criterion 3 - Systematic monitoring',
    contentFr: `Surveillance systématique utilisée pour observer, surveiller ou contrôler les personnes concernées, y compris via des réseaux ou la vidéosurveillance.`,
    contentEn: `Systematic monitoring used to observe, monitor or control data subjects, including via networks or video surveillance.`,
  },
  SENSITIVE_DATA: {
    titleFr: 'Critère 4 - Données sensibles (Art. 9)',
    titleEn: 'Criterion 4 - Sensitive data (Art. 9)',
    contentFr: `Traitement de catégories particulières de données (Art. 9) ou données relatives aux condamnations pénales (Art. 10).`,
    contentEn: `Processing of special categories of data (Art. 9) or data relating to criminal convictions (Art. 10).`,
  },
  LARGE_SCALE: {
    titleFr: 'Critère 5 - Grande échelle',
    titleEn: 'Criterion 5 - Large scale',
    contentFr: `Traitement à grande échelle: nombre de personnes concernées, volume de données, durée ou permanence, étendue géographique.`,
    contentEn: `Large-scale processing: number of data subjects, volume of data, duration or permanence, geographical extent.`,
  },
  CROSS_DATASET: {
    titleFr: 'Critère 6 - Croisement de données',
    titleEn: 'Criterion 6 - Cross-dataset linking',
    contentFr: `Croisement ou combinaison d'ensembles de données provenant de différentes opérations de traitement effectuées à des fins différentes.`,
    contentEn: `Matching or combining datasets from different processing operations performed for different purposes.`,
  },
  VULNERABLE_PERSONS: {
    titleFr: 'Critère 7 - Personnes vulnérables',
    titleEn: 'Criterion 7 - Vulnerable persons',
    contentFr: `Traitement concernant des personnes vulnérables: enfants, employés, personnes âgées, patients, demandeurs d'asile, etc.`,
    contentEn: `Processing concerning vulnerable data subjects: children, employees, elderly, patients, asylum seekers, etc.`,
  },
  INNOVATIVE_TECH: {
    titleFr: 'Critère 8 - Technologie innovante',
    titleEn: 'Criterion 8 - Innovative technology',
    contentFr: `Utilisation de nouvelles solutions technologiques ou organisationnelles: IA, reconnaissance faciale, empreinte digitale combinée à reconnaissance faciale, IoT.`,
    contentEn: `Use of new technological or organisational solutions: AI, facial recognition, fingerprint combined with facial recognition, IoT.`,
  },
  EXCLUSION_RIGHTS: {
    titleFr: 'Critère 9 - Exclusion de droits',
    titleEn: 'Criterion 9 - Exclusion from rights',
    contentFr: `Traitement empêchant les personnes d'exercer un droit ou de bénéficier d'un service ou d'un contrat. (Art. 22 RGPD)`,
    contentEn: `Processing preventing data subjects from exercising a right or using a service or contract. (Art. 22 GDPR)`,
  },
};

type ArticleTooltipProps = Readonly<{
  article: string;
  children: ReactNode;
  className?: string;
}>;

export function ArticleTooltip({ article, children, className }: ArticleTooltipProps) {
  const { locale } = useI18n();
  const articleData = GDPR_ARTICLES[article];

  if (!articleData) {
    return <>{children}</>;
  }

  let title: string;
  if (locale === 'fr') {
    title = articleData.titleFr;
  } else {
    title = articleData.titleEn;
  }

  let content: string;
  if (locale === 'fr') {
    content = articleData.contentFr;
  } else {
    content = articleData.contentEn;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={`cursor-help border-b border-dashed ${className || ''}`}
            style={{ borderColor: 'var(--a30-border)' }}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-md p-4"
          sideOffset={5}
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}
        >
          <div className="space-y-2">
            <p className="font-semibold text-sm" style={{ color: 'var(--primary-100)' }}>
              {title}
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-line">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type RiskCriterionTooltipProps = Readonly<{
  criterion: string;
  children: ReactNode;
  className?: string;
}>;

export function RiskCriterionTooltip({
  criterion,
  children,
  className,
}: RiskCriterionTooltipProps) {
  const { locale } = useI18n();
  const criterionData = RISK_CRITERIA_ARTICLES[criterion];

  if (!criterionData) {
    return <>{children}</>;
  }

  let title: string;
  if (locale === 'fr') {
    title = criterionData.titleFr;
  } else {
    title = criterionData.titleEn;
  }

  let content: string;
  if (locale === 'fr') {
    content = criterionData.contentFr;
  } else {
    content = criterionData.contentEn;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className || ''}`}>{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-sm p-3"
          sideOffset={5}
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}
        >
          <div className="space-y-2">
            <p className="font-semibold text-sm" style={{ color: 'var(--amber-400)' }}>
              {title}
            </p>
            <p className="text-xs leading-relaxed">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
