'use client';

import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DpaTooltip } from '@/components/domain/dpa-tooltip';
import { DpaStatus } from '@article30/shared';

const SELECT_CLASS = 'rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';

interface DpaFieldsProps {
  dpaStatus: DpaStatus;
  dpaSigned: string;
  dpaExpiry: string;
  onDpaStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDpaSignedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDpaExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DpaFields({
  dpaStatus,
  dpaSigned,
  dpaExpiry,
  onDpaStatusChange,
  onDpaSignedChange,
  onDpaExpiryChange,
}: Readonly<DpaFieldsProps>) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dpaStatus" className="inline-flex items-center gap-1">
          {t('vendor.dpaStatus')}
          <DpaTooltip />
        </Label>
        <select
          id="dpaStatus"
          className={SELECT_CLASS}
          value={dpaStatus}
          onChange={onDpaStatusChange}
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--ink)',
            borderColor: 'var(--a30-border)',
          }}
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
  );
}
