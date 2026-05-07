'use client';

import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DpaStatus } from '@article30/shared';

const SELECT_CLASS =
  'rounded-md border border-[var(--a30-border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

interface DpaSectionProps {
  dpaStatus: DpaStatus;
  dpaSigned: string;
  dpaExpiry: string;
  isSubProcessor: boolean;
  parentVendorId: string;
  vendors: { id: string; name: string }[];
  onDpaStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDpaSignedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDpaExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubProcessorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParentVendorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function DpaSection({
  dpaStatus,
  dpaSigned,
  dpaExpiry,
  isSubProcessor,
  parentVendorId,
  vendors,
  onDpaStatusChange,
  onDpaSignedChange,
  onDpaExpiryChange,
  onSubProcessorChange,
  onParentVendorChange,
}: Readonly<DpaSectionProps>) {
  const { t } = useI18n();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dpaStatus">{t('vendor.dpaStatus')}</Label>
          <select
            id="dpaStatus"
            className={SELECT_CLASS}
            value={dpaStatus}
            onChange={onDpaStatusChange}
          >
            {Object.values(DpaStatus).map(s => (
              <option key={s} value={s}>
                {t(`vendor.dpaStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dpaSigned">{t('vendor.dpaSigned')}</Label>
          <Input id="dpaSigned" type="date" value={dpaSigned} onChange={onDpaSignedChange} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dpaExpiry">{t('vendor.dpaExpiry')}</Label>
          <Input id="dpaExpiry" type="date" value={dpaExpiry} onChange={onDpaExpiryChange} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isSubProcessor"
          type="checkbox"
          checked={isSubProcessor}
          onChange={onSubProcessorChange}
          className="size-4 rounded border-[var(--a30-border)]"
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
