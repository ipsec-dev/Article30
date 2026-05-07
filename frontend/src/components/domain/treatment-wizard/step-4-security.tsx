'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SECURITY_MEASURES } from '@article30/shared';
import { ArticleTooltip } from '@/components/domain/article-tooltip';
import type { TreatmentWizardFormData } from './types';
import { createEmptySecurityMeasure } from './types';

type SecurityMeasureField = 'type' | 'precision';
type SecurityMeasure = { type: string; precision?: string };

const DETAILS_PLACEHOLDER_FR = 'Decrivez les mesures specifiques...';
const DETAILS_PLACEHOLDER_EN = 'Describe specific measures...';
const DETAILS_LABEL_FR = 'Precision';
const DETAILS_LABEL_EN = 'Details';

interface SecurityMeasureCardProps {
  code: string;
  label: string;
  locale: string;
  existingEntry: SecurityMeasure | undefined;
  securityMeasures: SecurityMeasure[];
  onToggle: (code: string) => void;
  onUpdate: (index: number, field: SecurityMeasureField, value: string) => void;
}

function SecurityMeasureCard({
  code,
  label,
  locale,
  existingEntry,
  securityMeasures,
  onToggle,
  onUpdate,
}: Readonly<SecurityMeasureCardProps>) {
  const isSelected = !!existingEntry;
  const handleToggle = useCallback(() => onToggle(code), [code, onToggle]);
  const handlePrecisionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const idx = securityMeasures.findIndex(sm => sm.type === code);
      if (idx >= 0) {
        onUpdate(idx, 'precision', e.target.value);
      }
    },
    [code, securityMeasures, onUpdate],
  );

  const isFr = locale === 'fr';
  let detailsLabel: string;
  if (isFr) {
    detailsLabel = DETAILS_LABEL_FR;
  } else {
    detailsLabel = DETAILS_LABEL_EN;
  }
  let detailsPlaceholder: string;
  if (isFr) {
    detailsPlaceholder = DETAILS_PLACEHOLDER_FR;
  } else {
    detailsPlaceholder = DETAILS_PLACEHOLDER_EN;
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-[var(--a30-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
        />
        <span className="font-medium text-[var(--ink)]">{label}</span>
      </label>

      {isSelected && (
        <div className="ml-6">
          <Label className="text-xs">{detailsLabel}</Label>
          <Textarea
            value={existingEntry?.precision || ''}
            onChange={handlePrecisionChange}
            rows={2}
            placeholder={detailsPlaceholder}
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

interface CustomMeasureCardProps {
  actualIndex: number;
  measure: SecurityMeasure;
  locale: string;
  onUpdate: (index: number, field: SecurityMeasureField, value: string) => void;
  onRemove: (index: number) => void;
}

function CustomMeasureCard({
  actualIndex,
  measure,
  locale,
  onUpdate,
  onRemove,
}: Readonly<CustomMeasureCardProps>) {
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(actualIndex, 'type', e.target.value),
    [actualIndex, onUpdate],
  );
  const handlePrecisionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onUpdate(actualIndex, 'precision', e.target.value),
    [actualIndex, onUpdate],
  );
  const handleRemove = useCallback(() => onRemove(actualIndex), [actualIndex, onRemove]);

  const isFr = locale === 'fr';
  let heading: string;
  if (isFr) {
    heading = 'Mesure personnalisee';
  } else {
    heading = 'Custom measure';
  }
  let typeLabel: string;
  if (isFr) {
    typeLabel = 'Type de mesure';
  } else {
    typeLabel = 'Measure type';
  }
  let typePlaceholder: string;
  if (isFr) {
    typePlaceholder = 'Ex: Audit de securite';
  } else {
    typePlaceholder = 'Ex: Security audit';
  }
  let detailsLabel: string;
  if (isFr) {
    detailsLabel = DETAILS_LABEL_FR;
  } else {
    detailsLabel = DETAILS_LABEL_EN;
  }
  let detailsPlaceholder: string;
  if (isFr) {
    detailsPlaceholder = DETAILS_PLACEHOLDER_FR;
  } else {
    detailsPlaceholder = DETAILS_PLACEHOLDER_EN;
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 mt-3 bg-[var(--surface-2)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--ink-2)]">{heading}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs">{typeLabel}</Label>
          <Input
            value={measure.type}
            onChange={handleTypeChange}
            placeholder={typePlaceholder}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{detailsLabel}</Label>
          <Textarea
            value={measure.precision || ''}
            onChange={handlePrecisionChange}
            rows={2}
            placeholder={detailsPlaceholder}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

interface Step4Labels {
  subtitleIntro: string;
  article32Label: string;
  retentionPlaceholder: string;
  retentionHelp: string;
  measuresIntro: string;
  addCustomLabel: string;
  summaryHeading: string;
  retentionSummaryLabel: string;
  retentionSummaryEmpty: string;
  measuresSummaryLabel: string;
  selectedWord: string;
}

function getStep4Labels(isFr: boolean): Step4Labels {
  if (isFr) {
    return {
      subtitleIntro: 'Définissez la durée de conservation et les ',
      article32Label: 'mesures de sécurité (Art. 32)',
      retentionPlaceholder: 'Ex: 5 ans apres la fin de la relation contractuelle',
      retentionHelp:
        "Duree de conservation globale du traitement. Vous pouvez definir des durees specifiques par categorie de donnees a l'etape 2.",
      measuresIntro: 'Selectionnez les mesures de securite mises en place et precisez les details',
      addCustomLabel: '+ Ajouter une mesure personnalisee',
      summaryHeading: 'Resume',
      retentionSummaryLabel: 'Duree de conservation: ',
      retentionSummaryEmpty: 'Non definie',
      measuresSummaryLabel: 'Mesures de securite: ',
      selectedWord: 'selectionnee(s)',
    };
  }
  return {
    subtitleIntro: 'Define retention period and ',
    article32Label: 'security measures (Art. 32)',
    retentionPlaceholder: 'Ex: 5 years after the end of the contractual relationship',
    retentionHelp:
      'Global retention period for the treatment. You can define specific durations per data category in step 2.',
    measuresIntro: 'Select the security measures in place and specify details',
    addCustomLabel: '+ Add custom measure',
    summaryHeading: 'Summary',
    retentionSummaryLabel: 'Retention period: ',
    retentionSummaryEmpty: 'Not defined',
    measuresSummaryLabel: 'Security measures: ',
    selectedWord: 'selected',
  };
}

function pickMeasureLabel(measure: { labelFr: string; labelEn: string }, isFr: boolean): string {
  if (isFr) {
    return measure.labelFr;
  }
  return measure.labelEn;
}

export function Step4Security() {
  const { t, locale } = useI18n();
  const { register, setValue, watch } = useFormContext<TreatmentWizardFormData>();

  const retentionPeriod = watch('retentionPeriod');
  const watchedSecurityMeasures = watch('securityMeasures');
  const securityMeasures = useMemo(() => watchedSecurityMeasures || [], [watchedSecurityMeasures]);

  const addSecurityMeasure = useCallback(() => {
    setValue('securityMeasures', [...securityMeasures, createEmptySecurityMeasure()]);
  }, [securityMeasures, setValue]);

  const removeSecurityMeasure = useCallback(
    (index: number) => {
      setValue(
        'securityMeasures',
        securityMeasures.filter((_, i) => i !== index),
      );
    },
    [securityMeasures, setValue],
  );

  const updateSecurityMeasure = useCallback(
    (index: number, field: SecurityMeasureField, value: string) => {
      const newMeasures = [...securityMeasures];
      newMeasures[index] = { ...newMeasures[index], [field]: value };
      setValue('securityMeasures', newMeasures);
    },
    [securityMeasures, setValue],
  );

  const toggleSecurityMeasureSelection = useCallback(
    (code: string) => {
      const existingIndex = securityMeasures.findIndex(sm => sm.type === code);
      if (existingIndex >= 0) {
        removeSecurityMeasure(existingIndex);
        return;
      }
      setValue('securityMeasures', [...securityMeasures, { type: code, precision: '' }]);
    },
    [securityMeasures, removeSecurityMeasure, setValue],
  );

  const isFr = locale === 'fr';
  const {
    subtitleIntro,
    article32Label,
    retentionPlaceholder,
    retentionHelp,
    measuresIntro,
    addCustomLabel,
    summaryHeading,
    retentionSummaryLabel,
    retentionSummaryEmpty,
    measuresSummaryLabel,
    selectedWord,
  } = getStep4Labels(isFr);
  const retentionSummary = retentionPeriod || retentionSummaryEmpty;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{t('wizard.step.security')}</h2>
        <p className="text-sm text-[var(--ink-3)] mt-1">
          {subtitleIntro}
          <ArticleTooltip article="32">{article32Label}</ArticleTooltip>
        </p>
      </div>

      {/* Global Retention Period */}
      <div className="space-y-2">
        <Label htmlFor="retentionPeriod">{t('treatment.retentionPeriod')}</Label>
        <Input
          id="retentionPeriod"
          {...register('retentionPeriod')}
          placeholder={retentionPlaceholder}
        />
        <p className="text-xs text-[var(--ink-3)]">{retentionHelp}</p>
      </div>

      {/* Security Measures */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label>{t('treatment.securityMeasures')}</Label>
        </div>
        <p className="text-sm text-[var(--ink-3)]">{measuresIntro}</p>

        <div className="space-y-3">
          {SECURITY_MEASURES.map(measure => (
            <SecurityMeasureCard
              key={measure.code}
              code={measure.code}
              label={pickMeasureLabel(measure, isFr)}
              locale={locale}
              existingEntry={securityMeasures.find(sm => sm.type === measure.code)}
              securityMeasures={securityMeasures}
              onToggle={toggleSecurityMeasureSelection}
              onUpdate={updateSecurityMeasure}
            />
          ))}
        </div>

        {/* Add custom security measure */}
        <div className="pt-4">
          <Button type="button" variant="outline" size="sm" onClick={addSecurityMeasure}>
            {addCustomLabel}
          </Button>

          {/* Custom measures (those without a predefined type code) */}
          {securityMeasures
            .filter(sm => !SECURITY_MEASURES.some(m => m.code === sm.type))
            .map(measure => {
              const actualIndex = securityMeasures.indexOf(measure);
              return (
                <CustomMeasureCard
                  key={`custom-measure-${actualIndex}`}
                  actualIndex={actualIndex}
                  measure={measure}
                  locale={locale}
                  onUpdate={updateSecurityMeasure}
                  onRemove={removeSecurityMeasure}
                />
              );
            })}
        </div>
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="bg-[var(--primary-50)] border border-[var(--primary-100)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--primary)]">{summaryHeading}</h4>
          <ul className="mt-2 text-sm text-[var(--primary-600)] space-y-1">
            <li>
              {retentionSummaryLabel}
              <strong>{retentionSummary}</strong>
            </li>
            <li>
              {measuresSummaryLabel}
              <strong>
                {securityMeasures.length} {selectedWord}
              </strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
