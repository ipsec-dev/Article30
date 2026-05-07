'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PERSON_CATEGORIES, DATA_CATEGORIES, SENSITIVE_DATA_CATEGORIES } from '@article30/shared';
import { ArticleTooltip } from '@/components/domain/article-tooltip';
import type { TreatmentWizardFormData } from './types';

interface CheckboxRowProps {
  code: string;
  label: string;
  isSelected: boolean;
  onToggle: (code: string) => void;
}

function PersonCategoryCheckbox({ code, label, isSelected, onToggle }: Readonly<CheckboxRowProps>) {
  const handleChange = useCallback(() => onToggle(code), [code, onToggle]);
  return (
    <label className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleChange}
        className="w-4 h-4 rounded border-[var(--a30-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
      />
      <span className="text-sm text-[var(--ink-2)]">{label}</span>
    </label>
  );
}

function SensitiveCategoryCheckbox({
  code,
  label,
  isSelected,
  onToggle,
}: Readonly<CheckboxRowProps>) {
  const handleChange = useCallback(() => onToggle(code), [code, onToggle]);
  return (
    <label className="flex items-center gap-2 p-2 rounded border border-orange-200 bg-[var(--surface)] cursor-pointer hover:bg-orange-100 transition-colors">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleChange}
        className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
      />
      <span className="text-sm text-[var(--ink-2)]">{label}</span>
    </label>
  );
}

interface DataCategoryFieldsProps {
  locale: string;
  description: string;
  retentionPeriod: string;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRetentionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DataCategoryFields({
  locale,
  description,
  retentionPeriod,
  onDescriptionChange,
  onRetentionChange,
}: Readonly<DataCategoryFieldsProps>) {
  const isFr = locale === 'fr';
  const descLabel = 'Description';
  let descPlaceholder: string;
  if (isFr) {
    descPlaceholder = 'Precisez les donnees collectees...';
  } else {
    descPlaceholder = 'Specify the data collected...';
  }
  let retentionLabel: string;
  if (isFr) {
    retentionLabel = 'Duree de conservation';
  } else {
    retentionLabel = 'Retention period';
  }
  let retentionPlaceholder: string;
  if (isFr) {
    retentionPlaceholder = 'Ex: 5 ans';
  } else {
    retentionPlaceholder = 'Ex: 5 years';
  }
  return (
    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">{descLabel}</Label>
        <Textarea
          value={description}
          onChange={onDescriptionChange}
          rows={2}
          placeholder={descPlaceholder}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">{retentionLabel}</Label>
        <Input
          value={retentionPeriod}
          onChange={onRetentionChange}
          placeholder={retentionPlaceholder}
          className="mt-1"
        />
      </div>
    </div>
  );
}

interface DataCategoryRowProps {
  code: string;
  label: string;
  locale: string;
  dataCategories: Array<{ category: string; description?: string; retentionPeriod?: string }>;
  onToggle: (code: string) => void;
  onUpdate: (
    index: number,
    field: 'category' | 'description' | 'retentionPeriod',
    value: string,
  ) => void;
}

function DataCategoryRow({
  code,
  label,
  locale,
  dataCategories,
  onToggle,
  onUpdate,
}: Readonly<DataCategoryRowProps>) {
  const existingEntry = dataCategories.find(dc => dc.category === code);
  const isSelected = !!existingEntry;
  const handleToggle = useCallback(() => onToggle(code), [code, onToggle]);
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const idx = dataCategories.findIndex(dc => dc.category === code);
      if (idx >= 0) {
        onUpdate(idx, 'description', e.target.value);
      }
    },
    [code, dataCategories, onUpdate],
  );
  const handleRetentionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = dataCategories.findIndex(dc => dc.category === code);
      if (idx >= 0) {
        onUpdate(idx, 'retentionPeriod', e.target.value);
      }
    },
    [code, dataCategories, onUpdate],
  );

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
        <DataCategoryFields
          locale={locale}
          description={existingEntry?.description || ''}
          retentionPeriod={existingEntry?.retentionPeriod || ''}
          onDescriptionChange={handleDescriptionChange}
          onRetentionChange={handleRetentionChange}
        />
      )}
    </div>
  );
}

export function Step2Data() {
  const { t, locale } = useI18n();
  const { setValue, watch } = useFormContext<TreatmentWizardFormData>();

  const watchedPersonCategories = watch('personCategories');
  const watchedDataCategories = watch('dataCategories');
  const watchedSensitiveCategories = watch('sensitiveCategories');
  const personCategories = useMemo(() => watchedPersonCategories || [], [watchedPersonCategories]);
  const dataCategories = useMemo(() => watchedDataCategories || [], [watchedDataCategories]);
  const sensitiveCategories = useMemo(
    () => watchedSensitiveCategories || [],
    [watchedSensitiveCategories],
  );
  const hasSensitiveData = watch('hasSensitiveData');

  const togglePersonCategory = useCallback(
    (code: string) => {
      const set = new Set(personCategories);
      let newCategories: string[];
      if (set.has(code)) {
        newCategories = personCategories.filter(c => c !== code);
      } else {
        newCategories = [...personCategories, code];
      }
      setValue('personCategories', newCategories);
    },
    [personCategories, setValue],
  );

  const toggleSensitiveCategory = useCallback(
    (code: string) => {
      const set = new Set(sensitiveCategories);
      let newCategories: string[];
      if (set.has(code)) {
        newCategories = sensitiveCategories.filter(c => c !== code);
      } else {
        newCategories = [...sensitiveCategories, code];
      }
      setValue('sensitiveCategories', newCategories);
    },
    [sensitiveCategories, setValue],
  );

  const removeDataCategory = useCallback(
    (index: number) => {
      setValue(
        'dataCategories',
        dataCategories.filter((_, i) => i !== index),
      );
    },
    [dataCategories, setValue],
  );

  const updateDataCategory = useCallback(
    (index: number, field: 'category' | 'description' | 'retentionPeriod', value: string) => {
      const newCategories = [...dataCategories];
      newCategories[index] = { ...newCategories[index], [field]: value };
      setValue('dataCategories', newCategories);
    },
    [dataCategories, setValue],
  );

  const toggleDataCategorySelection = useCallback(
    (code: string) => {
      const existingIndex = dataCategories.findIndex(dc => dc.category === code);
      if (existingIndex >= 0) {
        removeDataCategory(existingIndex);
        return;
      }
      setValue('dataCategories', [
        ...dataCategories,
        { category: code, description: '', retentionPeriod: '' },
      ]);
    },
    [dataCategories, removeDataCategory, setValue],
  );

  const handleSensitiveDataChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue('hasSensitiveData', e.target.checked),
    [setValue],
  );

  const isFr = locale === 'fr';
  const pickLabel = (item: { labelFr: string; labelEn: string }): string => {
    if (isFr) {
      return item.labelFr;
    }
    return item.labelEn;
  };
  let sectionSubtitle: string;
  if (isFr) {
    sectionSubtitle = 'Definissez les categories de personnes et de donnees concernees';
  } else {
    sectionSubtitle = 'Define the categories of persons and data concerned';
  }
  let dataCatSubtitle: string;
  if (isFr) {
    dataCatSubtitle = 'Selectionnez les categories de donnees traitees et precisez les details';
  } else {
    dataCatSubtitle = 'Select the data categories processed and specify details';
  }
  let sensitiveLabel: string;
  if (isFr) {
    sensitiveLabel = 'Ce traitement concerne des donnees sensibles';
  } else {
    sensitiveLabel = 'This treatment involves sensitive data';
  }
  let sensitiveIntro: string;
  if (isFr) {
    sensitiveIntro = 'Données au sens de ';
  } else {
    sensitiveIntro = 'Data within the meaning of ';
  }
  let articleNineLabel: string;
  if (isFr) {
    articleNineLabel = "l'article 9 du RGPD";
  } else {
    articleNineLabel = 'Article 9 of GDPR';
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{t('wizard.step.data')}</h2>
        <p className="text-sm text-[var(--ink-3)] mt-1">{sectionSubtitle}</p>
      </div>

      {/* Person Categories */}
      <div className="space-y-3">
        <Label>{t('treatment.personCategories')}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERSON_CATEGORIES.map(cat => (
            <PersonCategoryCheckbox
              key={cat.code}
              code={cat.code}
              label={pickLabel(cat)}
              isSelected={personCategories.includes(cat.code)}
              onToggle={togglePersonCategory}
            />
          ))}
        </div>
      </div>

      {/* Data Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('treatment.dataCategories')}</Label>
        </div>
        <p className="text-sm text-[var(--ink-3)]">{dataCatSubtitle}</p>

        <div className="space-y-3">
          {DATA_CATEGORIES.map(cat => (
            <DataCategoryRow
              key={cat.code}
              code={cat.code}
              label={pickLabel(cat)}
              locale={locale}
              dataCategories={dataCategories}
              onToggle={toggleDataCategorySelection}
              onUpdate={updateDataCategory}
            />
          ))}
        </div>
      </div>

      {/* Sensitive Data Toggle */}
      <div className="space-y-3 pt-4 border-t">
        <label htmlFor="hasSensitiveData" className="flex items-center gap-3 cursor-pointer">
          <input
            id="hasSensitiveData"
            type="checkbox"
            checked={hasSensitiveData}
            onChange={handleSensitiveDataChange}
            aria-label={sensitiveLabel}
            className="w-5 h-5 rounded border-[var(--a30-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <div>
            <span className="font-medium text-[var(--ink)]">{sensitiveLabel}</span>
            <p className="text-sm text-[var(--ink-3)]">
              {sensitiveIntro}
              <ArticleTooltip article="9">{articleNineLabel}</ArticleTooltip>
            </p>
          </div>
        </label>

        {/* Sensitive Categories */}
        {hasSensitiveData && (
          <div className="ml-8 space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <Label className="text-orange-800">{t('treatment.sensitiveCategories')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SENSITIVE_DATA_CATEGORIES.map(cat => (
                <SensitiveCategoryCheckbox
                  key={cat.code}
                  code={cat.code}
                  label={pickLabel(cat)}
                  isSelected={sensitiveCategories.includes(cat.code)}
                  onToggle={toggleSensitiveCategory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
