'use client';

import { useI18n } from '@/i18n/context';
import { Label } from '@/components/ui/label';
import { TreatmentChecklistItem } from './treatment-checklist-item';

interface TreatmentsSectionProps {
  treatments: { id: string; name: string }[];
  treatmentIds: string[];
  onToggle: (id: string) => void;
}

export function TreatmentsSection({
  treatments,
  treatmentIds,
  onToggle,
}: Readonly<TreatmentsSectionProps>) {
  const { t } = useI18n();
  if (treatments.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>{t('vendor.treatments')}</Label>
      <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--a30-border)] p-2">
        {treatments.map(tr => (
          <TreatmentChecklistItem
            key={tr.id}
            id={tr.id}
            name={tr.name}
            checked={treatmentIds.includes(tr.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
