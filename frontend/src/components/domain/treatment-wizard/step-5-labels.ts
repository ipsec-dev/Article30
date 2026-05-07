export interface Step5Labels {
  subtitleIntro: string;
  aipdArticleLabel: string;
  subtitleTail: string;
  riskLevelHeading: string;
  criteriaCountText: string;
  conclusionSuffix: string;
}

export function getStep5Labels(isFr: boolean, criteriaCount: number): Step5Labels {
  if (isFr) {
    return {
      subtitleIntro: 'Évaluez les critères de risque CNIL pour déterminer si une ',
      aipdArticleLabel: 'AIPD (Art. 35)',
      subtitleTail: ' est requise',
      riskLevelHeading: 'Niveau de risque',
      criteriaCountText: `${criteriaCount}/9 criteres selectionnes`,
      conclusionSuffix: `${criteriaCount} critere(s) de risque identifie(s)`,
    };
  }
  return {
    subtitleIntro: 'Evaluate CNIL risk criteria to determine if a ',
    aipdArticleLabel: 'DPIA (Art. 35)',
    subtitleTail: ' is required',
    riskLevelHeading: 'Risk level',
    criteriaCountText: `${criteriaCount}/9 criteria selected`,
    conclusionSuffix: `${criteriaCount} risk criteria identified`,
  };
}
