'use client';

import { useI18n } from '@/i18n/context';
import { Label } from '@/components/ui/label';

const SELECT_CLASS = 'rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';

interface SubProcessorFieldsProps {
  isSubProcessor: boolean;
  parentVendorId: string;
  vendors: { id: string; name: string }[];
  onSubProcessorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParentVendorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function SubProcessorFields({
  isSubProcessor,
  parentVendorId,
  vendors,
  onSubProcessorChange,
  onParentVendorChange,
}: Readonly<SubProcessorFieldsProps>) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          id="isSubProcessor"
          type="checkbox"
          checked={isSubProcessor}
          onChange={onSubProcessorChange}
          className="size-4 rounded"
          style={{ borderColor: 'var(--a30-border)' }}
        />
        <Label htmlFor="isSubProcessor">{t('vendor.isSubProcessor')}</Label>
      </div>

      {isSubProcessor && vendors.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="parentVendorId">{t('vendor.parentVendor')}</Label>
          <select
            id="parentVendorId"
            className={SELECT_CLASS}
            value={parentVendorId}
            onChange={onParentVendorChange}
            style={{
              backgroundColor: 'var(--surface-2)',
              color: 'var(--ink)',
              borderColor: 'var(--a30-border)',
            }}
          >
            <option value="">—</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
