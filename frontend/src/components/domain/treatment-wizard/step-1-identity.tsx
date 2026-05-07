'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEGAL_BASES } from '@article30/shared';
import { ArticleTooltip } from '@/components/domain/article-tooltip';
import type { TreatmentWizardFormData } from './types';

const MAX_SUB_PURPOSES = 5;

interface SubPurposeRowProps {
  index: number;
  value: string;
  locale: string;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function SubPurposeRow({ index, value, locale, onUpdate, onRemove }: Readonly<SubPurposeRowProps>) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, e.target.value),
    [index, onUpdate],
  );
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  let placeholder: string;
  if (locale === 'fr') {
    placeholder = `Sous-finalite ${index + 1}`;
  } else {
    placeholder = `Sub-purpose ${index + 1}`;
  }

  return (
    <div className="flex gap-2">
      <Input value={value} onChange={handleChange} placeholder={placeholder} />
      <Button type="button" variant="outline" size="sm" onClick={handleRemove} className="shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </Button>
    </div>
  );
}

interface Step1Labels {
  sectionSubtitle: string;
  namePlaceholder: string;
  nameErrorLabel: string;
  purposePlaceholder: string;
  subPurposesLabel: string;
  addLabel: string;
  emptySubLabel: string;
  legalBasisPlaceholder: string;
  legalBasisIntro: string;
  articleSixLabel: string;
}

function getStep1Labels(isFr: boolean): Step1Labels {
  if (isFr) {
    return {
      sectionSubtitle: 'Identifiez le traitement et sa finalite',
      namePlaceholder: 'Ex: Gestion des candidatures',
      nameErrorLabel: 'Ce champ est requis',
      purposePlaceholder: 'Decrivez la finalite principale du traitement...',
      subPurposesLabel: 'Sous-finalites',
      addLabel: '+ Ajouter',
      emptySubLabel: 'Aucune sous-finalite ajoutee',
      legalBasisPlaceholder: 'Selectionnez une base legale',
      legalBasisIntro: 'Base légale au sens de ',
      articleSixLabel: "l'article 6 du RGPD",
    };
  }
  return {
    sectionSubtitle: 'Identify the treatment and its purpose',
    namePlaceholder: 'Ex: Job applications management',
    nameErrorLabel: 'This field is required',
    purposePlaceholder: 'Describe the main purpose of the treatment...',
    subPurposesLabel: 'Sub-purposes',
    addLabel: '+ Add',
    emptySubLabel: 'No sub-purposes added',
    legalBasisPlaceholder: 'Select a legal basis',
    legalBasisIntro: 'Legal basis under ',
    articleSixLabel: 'Article 6 of GDPR',
  };
}

function pickLegalBasisLabel(basis: { labelFr: string; labelEn: string }, isFr: boolean): string {
  if (isFr) {
    return basis.labelFr;
  }
  return basis.labelEn;
}

export function Step1Identity() {
  const { t, locale } = useI18n();
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<TreatmentWizardFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subPurposes' as never,
  });

  const watchedSubPurposes = watch('subPurposes');
  const subPurposes = useMemo(() => watchedSubPurposes || [], [watchedSubPurposes]);
  const legalBasis = watch('legalBasis');

  const addSubPurpose = useCallback(() => {
    if (subPurposes.length < MAX_SUB_PURPOSES) {
      append('' as never);
    }
  }, [subPurposes.length, append]);

  const removeSubPurpose = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const updateSubPurpose = useCallback(
    (index: number, value: string) => {
      const newSubPurposes = [...subPurposes];
      newSubPurposes[index] = value;
      setValue('subPurposes', newSubPurposes);
    },
    [subPurposes, setValue],
  );

  const handleLegalBasisChange = useCallback((v: string) => setValue('legalBasis', v), [setValue]);

  const isFr = locale === 'fr';
  const labels = getStep1Labels(isFr);
  let nameInputClass: string;
  if (errors.name) {
    nameInputClass = 'border-red-500';
  } else {
    nameInputClass = '';
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          {t('wizard.step.identification')}
        </h2>
        <p className="text-sm text-[var(--ink-3)] mt-1">{labels.sectionSubtitle}</p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          {t('treatment.name')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register('name', { required: true })}
          placeholder={labels.namePlaceholder}
          className={nameInputClass}
        />
        {errors.name && <p className="text-sm text-red-500">{labels.nameErrorLabel}</p>}
      </div>

      {/* Purpose */}
      <div className="space-y-2">
        <Label htmlFor="purpose">{t('treatment.purpose')}</Label>
        <Textarea
          id="purpose"
          {...register('purpose')}
          rows={3}
          placeholder={labels.purposePlaceholder}
        />
      </div>

      {/* Sub-purposes (dynamic list) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            {labels.subPurposesLabel}
            <span className="text-[var(--ink-4)] font-normal ml-2">
              ({subPurposes.length}/{MAX_SUB_PURPOSES})
            </span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSubPurpose}
            disabled={subPurposes.length >= MAX_SUB_PURPOSES}
          >
            {labels.addLabel}
          </Button>
        </div>

        {subPurposes.length === 0 && (
          <p className="text-sm text-[var(--ink-4)] italic">{labels.emptySubLabel}</p>
        )}
        {subPurposes.length > 0 && (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <SubPurposeRow
                key={field.id}
                index={index}
                value={subPurposes[index] ?? ''}
                locale={locale}
                onUpdate={updateSubPurpose}
                onRemove={removeSubPurpose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legal Basis */}
      <div className="space-y-2">
        <Label htmlFor="legalBasis">{t('treatment.legalBasis')}</Label>
        <Select value={legalBasis} onValueChange={handleLegalBasisChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={labels.legalBasisPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {LEGAL_BASES.map(basis => (
              <SelectItem key={basis.code} value={basis.code}>
                {pickLegalBasisLabel(basis, isFr)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--ink-3)]">
          {labels.legalBasisIntro}
          <ArticleTooltip article="6">{labels.articleSixLabel}</ArticleTooltip>
        </p>
      </div>
    </div>
  );
}
