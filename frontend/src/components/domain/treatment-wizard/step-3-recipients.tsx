'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RECIPIENT_TYPES, GUARANTEE_TYPES, ADEQUATE_COUNTRIES } from '@article30/shared';
import { ArticleTooltip } from '@/components/domain/article-tooltip';
import type { TreatmentWizardFormData } from './types';
import { createEmptyRecipient, createEmptyTransfer } from './types';
import type { GuaranteeType } from '@article30/shared';

type RecipientField = 'type' | 'precision';
type TransferField = 'destinationOrg' | 'country' | 'guaranteeType' | 'documentLink';
type Recipient = { type: string; precision?: string };
type Transfer = {
  destinationOrg: string;
  country: string;
  guaranteeType: GuaranteeType;
  documentLink?: string;
};

const DELETE_ICON_PATH =
  'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={DELETE_ICON_PATH} />
    </svg>
  );
}

interface RecipientRowProps {
  index: number;
  recipient: Recipient;
  locale: string;
  onUpdate: (index: number, field: RecipientField, value: string) => void;
  onRemove: (index: number) => void;
}

interface RecipientRowLabels {
  heading: string;
  precisionLabel: string;
  typePlaceholder: string;
  precisionPlaceholder: string;
}

function getRecipientRowLabels(isFr: boolean, index: number): RecipientRowLabels {
  if (isFr) {
    return {
      heading: `Destinataire ${index + 1}`,
      precisionLabel: 'Precision',
      typePlaceholder: 'Selectionnez un type',
      precisionPlaceholder: 'Nom ou description...',
    };
  }
  return {
    heading: `Recipient ${index + 1}`,
    precisionLabel: 'Details',
    typePlaceholder: 'Select a type',
    precisionPlaceholder: 'Name or description...',
  };
}

function pickRecipientLabel(rt: { labelFr: string; labelEn: string }, isFr: boolean): string {
  if (isFr) {
    return rt.labelFr;
  }
  return rt.labelEn;
}

function RecipientRow({
  index,
  recipient,
  locale,
  onUpdate,
  onRemove,
}: Readonly<RecipientRowProps>) {
  const handleTypeChange = useCallback(
    (v: string) => onUpdate(index, 'type', v),
    [index, onUpdate],
  );
  const handlePrecisionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, 'precision', e.target.value),
    [index, onUpdate],
  );
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  const isFr = locale === 'fr';
  const { heading, precisionLabel, typePlaceholder, precisionPlaceholder } = getRecipientRowLabels(
    isFr,
    index,
  );

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-[var(--surface-2)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--ink-2)]">{heading}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
          <DeleteIcon />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={recipient.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder={typePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {RECIPIENT_TYPES.map(rt => (
                <SelectItem key={rt.code} value={rt.code}>
                  {pickRecipientLabel(rt, isFr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{precisionLabel}</Label>
          <Input
            value={recipient.precision || ''}
            onChange={handlePrecisionChange}
            placeholder={precisionPlaceholder}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

interface TransferRowProps {
  index: number;
  transfer: Transfer;
  locale: string;
  onUpdate: (index: number, field: TransferField, value: string) => void;
  onRemove: (index: number) => void;
}

interface TransferRowLabels {
  heading: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  adequacyLabel: string;
  guaranteeLabel: string;
  guaranteePlaceholder: string;
  documentLinkLabel: string;
}

function getTransferRowLabels(isFr: boolean, index: number): TransferRowLabels {
  if (isFr) {
    return {
      heading: `Transfert ${index + 1}`,
      destinationLabel: 'Organisation destinataire',
      destinationPlaceholder: "Nom de l'organisation...",
      countryLabel: 'Pays',
      countryPlaceholder: 'Ex: Etats-Unis',
      adequacyLabel: "Pays avec decision d'adequation",
      guaranteeLabel: 'Type de garantie',
      guaranteePlaceholder: 'Selectionnez une garantie',
      documentLinkLabel: 'Lien document',
    };
  }
  return {
    heading: `Transfer ${index + 1}`,
    destinationLabel: 'Destination organization',
    destinationPlaceholder: 'Organization name...',
    countryLabel: 'Country',
    countryPlaceholder: 'Ex: United States',
    adequacyLabel: 'Country with adequacy decision',
    guaranteeLabel: 'Guarantee type',
    guaranteePlaceholder: 'Select a guarantee',
    documentLinkLabel: 'Document link',
  };
}

function pickGuaranteeLabel(gt: { labelFr: string; labelEn: string }, isFr: boolean): string {
  if (isFr) {
    return gt.labelFr;
  }
  return gt.labelEn;
}

function TransferRow({ index, transfer, locale, onUpdate, onRemove }: Readonly<TransferRowProps>) {
  const handleDestinationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, 'destinationOrg', e.target.value),
    [index, onUpdate],
  );
  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, 'country', e.target.value),
    [index, onUpdate],
  );
  const handleGuaranteeChange = useCallback(
    (v: string) => onUpdate(index, 'guaranteeType', v),
    [index, onUpdate],
  );
  const handleDocumentLinkChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, 'documentLink', e.target.value),
    [index, onUpdate],
  );
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  const isAdequateCountry =
    transfer.country &&
    ADEQUATE_COUNTRIES.includes(transfer.country as (typeof ADEQUATE_COUNTRIES)[number]);

  const isFr = locale === 'fr';
  const {
    heading,
    destinationLabel,
    destinationPlaceholder,
    countryLabel,
    countryPlaceholder,
    adequacyLabel,
    guaranteeLabel,
    guaranteePlaceholder,
    documentLinkLabel,
  } = getTransferRowLabels(isFr, index);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-amber-50 border-amber-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-amber-800">{heading}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
          <DeleteIcon />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{destinationLabel}</Label>
          <Input
            value={transfer.destinationOrg}
            onChange={handleDestinationChange}
            placeholder={destinationPlaceholder}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{countryLabel}</Label>
          <Input
            value={transfer.country}
            onChange={handleCountryChange}
            placeholder={countryPlaceholder}
            className="mt-1"
          />
          {isAdequateCountry && <p className="text-xs text-green-600 mt-1">{adequacyLabel}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{guaranteeLabel}</Label>
          <Select value={transfer.guaranteeType} onValueChange={handleGuaranteeChange}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder={guaranteePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {GUARANTEE_TYPES.map(gt => (
                <SelectItem key={gt.code} value={gt.code}>
                  {pickGuaranteeLabel(gt, isFr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{documentLinkLabel}</Label>
          <Input
            value={transfer.documentLink || ''}
            onChange={handleDocumentLinkChange}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

interface Step3Labels {
  subtitle: string;
  addRecipientLabel: string;
  emptyRecipients: string;
  transfersIntro: string;
  transfersArticleLabel: string;
  addTransferLabel: string;
  emptyTransfers: string;
}

function getStep3Labels(isFr: boolean): Step3Labels {
  if (isFr) {
    return {
      subtitle: 'Identifiez les destinataires des donnees et les transferts hors UE',
      addRecipientLabel: '+ Ajouter un destinataire',
      emptyRecipients: 'Aucun destinataire ajoute. Cliquez sur "+ Ajouter" pour commencer.',
      transfersIntro: 'Transferts vers des pays tiers ',
      transfersArticleLabel: 'Art. 44-49 RGPD',
      addTransferLabel: '+ Ajouter un transfert',
      emptyTransfers: 'Aucun transfert hors UE declare',
    };
  }
  return {
    subtitle: 'Identify data recipients and transfers outside the EU',
    addRecipientLabel: '+ Add recipient',
    emptyRecipients: 'No recipients added. Click "+ Add" to start.',
    transfersIntro: 'Transfers to third countries ',
    transfersArticleLabel: 'Art. 44-49 GDPR',
    addTransferLabel: '+ Add transfer',
    emptyTransfers: 'No transfers outside EU declared',
  };
}

export function Step3Recipients() {
  const { t, locale } = useI18n();
  const { setValue, watch } = useFormContext<TreatmentWizardFormData>();

  const watchedRecipients = watch('recipients');
  const watchedTransfers = watch('transfers');
  const recipients = useMemo(() => watchedRecipients || [], [watchedRecipients]);
  const transfers = useMemo(() => watchedTransfers || [], [watchedTransfers]);

  const addRecipient = useCallback(() => {
    setValue('recipients', [...recipients, createEmptyRecipient()]);
  }, [recipients, setValue]);

  const removeRecipient = useCallback(
    (index: number) => {
      setValue(
        'recipients',
        recipients.filter((_, i) => i !== index),
      );
    },
    [recipients, setValue],
  );

  const updateRecipient = useCallback(
    (index: number, field: RecipientField, value: string) => {
      const newRecipients = [...recipients];
      newRecipients[index] = { ...newRecipients[index], [field]: value };
      setValue('recipients', newRecipients);
    },
    [recipients, setValue],
  );

  const addTransfer = useCallback(() => {
    setValue('transfers', [...transfers, createEmptyTransfer()]);
  }, [transfers, setValue]);

  const removeTransfer = useCallback(
    (index: number) => {
      setValue(
        'transfers',
        transfers.filter((_, i) => i !== index),
      );
    },
    [transfers, setValue],
  );

  const updateTransfer = useCallback(
    (index: number, field: TransferField, value: string) => {
      const newTransfers = [...transfers];
      newTransfers[index] = { ...newTransfers[index], [field]: value };
      setValue('transfers', newTransfers);
    },
    [transfers, setValue],
  );

  const isFr = locale === 'fr';
  const {
    subtitle,
    addRecipientLabel,
    emptyRecipients,
    transfersIntro,
    transfersArticleLabel,
    addTransferLabel,
    emptyTransfers,
  } = getStep3Labels(isFr);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{t('wizard.step.recipients')}</h2>
        <p className="text-sm text-[var(--ink-3)] mt-1">{subtitle}</p>
      </div>

      {/* Recipients */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{t('treatment.recipientTypes')}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
            {addRecipientLabel}
          </Button>
        </div>

        {recipients.length === 0 && (
          <p className="text-sm text-[var(--ink-4)] italic py-4 text-center border-2 border-dashed rounded-lg">
            {emptyRecipients}
          </p>
        )}
        {recipients.length > 0 && (
          <div className="space-y-3">
            {recipients.map((recipient, index) => (
              <RecipientRow
                key={`recipient-${index}`} // NOSONAR: rows are edited in-place by index, never reordered
                index={index}
                recipient={recipient}
                locale={locale}
                onUpdate={updateRecipient}
                onRemove={removeRecipient}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transfers outside EU */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('treatment.transfers')}</Label>
            <p className="text-sm text-[var(--ink-3)]">
              {transfersIntro}(<ArticleTooltip article="46">{transfersArticleLabel}</ArticleTooltip>
              )
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTransfer}>
            {addTransferLabel}
          </Button>
        </div>

        {transfers.length === 0 && (
          <p className="text-sm text-[var(--ink-4)] italic py-4 text-center border-2 border-dashed rounded-lg">
            {emptyTransfers}
          </p>
        )}
        {transfers.length > 0 && (
          <div className="space-y-4">
            {transfers.map((transfer, index) => (
              <TransferRow
                key={`transfer-${index}`} // NOSONAR: rows are edited in-place by index, never reordered
                index={index}
                transfer={transfer}
                locale={locale}
                onUpdate={updateTransfer}
                onRemove={removeTransfer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
