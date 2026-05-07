'use client';

import { useI18n } from '@/i18n/context';
import { Label } from '@/components/ui/label';

interface TreatmentChecklistItemProps {
  id: string;
  name: string;
  checked: boolean;
  onToggle: (id: string) => void;
}

function TreatmentChecklistItem({
  id,
  name,
  checked,
  onToggle,
}: Readonly<TreatmentChecklistItemProps>) {
  const handleChange = () => onToggle(id);
  return (
    <label
      className="flex items-center gap-2 rounded px-2 py-1 text-sm"
      style={{ color: 'var(--ink)', cursor: 'pointer' }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--surface-2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="size-4 rounded"
        style={{ borderColor: 'var(--a30-border)' }}
      />
      {name}
    </label>
  );
}

interface TreatmentChecklistProps {
  treatments: { id: string; name: string }[];
  treatmentIds: string[];
  onToggle: (id: string) => void;
}

export function TreatmentChecklist({
  treatments,
  treatmentIds,
  onToggle,
}: Readonly<TreatmentChecklistProps>) {
  const { t } = useI18n();
  if (treatments.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>{t('vendor.treatments')}</Label>
      <div
        className="max-h-48 overflow-y-auto rounded-md border p-2"
        style={{ borderColor: 'var(--a30-border)' }}
      >
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
