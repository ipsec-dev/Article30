'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DpaTooltip } from '@/components/domain/dpa-tooltip';
import { DpaStatus } from '@article30/shared';
import type { PaginatedResponse } from '@article30/shared';

interface VendorRow {
  id: string;
  name: string;
  country: string | null;
  dpaStatus: DpaStatus;
  dpaExpiry: string | null;
  _count: { treatments: number };
}

const DPA_STATUS_COLORS: Record<DpaStatus, string> = {
  [DpaStatus.MISSING]: 'bg-[var(--danger-alpha)] text-[var(--danger)]',
  [DpaStatus.DRAFT]: 'bg-[var(--warn-alpha)] text-[var(--warn)]',
  [DpaStatus.SENT]: 'bg-[var(--info-alpha)] text-[var(--info)]',
  [DpaStatus.SIGNED]: 'bg-[var(--success-alpha)] text-[var(--success)]',
  [DpaStatus.EXPIRED]: 'bg-[var(--danger-alpha)] text-[var(--danger)]',
};

const PAGE_SIZE = 20;
const HEADER_CELL_CLASS = 'px-4 py-3 font-medium text-[var(--ink-3)]';
const CELL_MUTED_CLASS = 'px-4 py-3 text-[var(--ink-3)]';

export default function VendorsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<VendorRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<VendorRow>>(`/vendors?page=${page}&limit=${PAGE_SIZE}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const handleNewVendor = useCallback(() => router.push('/vendors/new'), [router]);
  const handlePrevPage = useCallback(() => setPage(p => p - 1), []);
  const handleNextPage = useCallback(() => setPage(p => p + 1), []);

  let totalPages = 0;
  if (data) {
    totalPages = Math.ceil(data.total / data.limit);
  }

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="mt-8 flex justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--ink-5)] border-t-[var(--primary)]" />
      </div>
    );
  } else if (!data || data.data.length === 0) {
    body = (
      <div className="mt-12 flex flex-col items-center text-center">
        <Building2 className="size-12 text-[var(--ink-4)]" />
        <p className="mt-3 text-sm text-[var(--ink-3)]">{t('vendor.empty')}</p>
      </div>
    );
  } else {
    body = (
      <>
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--ink-5)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ink-5)] bg-[var(--surface-alt)] text-left">
                <th className={HEADER_CELL_CLASS}>{t('vendor.name')}</th>
                <th className={HEADER_CELL_CLASS}>{t('vendor.country')}</th>
                <th className={HEADER_CELL_CLASS}>
                  <span className="inline-flex items-center gap-1">
                    {t('vendor.dpaStatus')}
                    <DpaTooltip />
                  </span>
                </th>
                <th className={HEADER_CELL_CLASS}>{t('vendor.dpaExpiry')}</th>
                <th className={HEADER_CELL_CLASS}>{t('vendor.treatments')}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map(vendor => {
                let expiryLabel = '—';
                if (vendor.dpaExpiry) {
                  expiryLabel = formatDate(vendor.dpaExpiry);
                }
                return (
                  <tr
                    key={vendor.id}
                    className="border-b border-[var(--ink-6)] hover:bg-[var(--surface-alt)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="font-medium text-[var(--primary)] hover:underline"
                      >
                        {vendor.name}
                      </Link>
                    </td>
                    <td className={CELL_MUTED_CLASS}>{vendor.country ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={DPA_STATUS_COLORS[vendor.dpaStatus]}>
                        {t(`vendor.dpaStatus.${vendor.dpaStatus}`)}
                      </Badge>
                    </td>
                    <td className={CELL_MUTED_CLASS}>{expiryLabel}</td>
                    <td className={CELL_MUTED_CLASS}>{vendor._count.treatments}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrevPage}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-[var(--ink-3)]">
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={handleNextPage}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleNewVendor}>
          {t('vendor.new')}
        </Button>
      </div>

      {body}
    </div>
  );
}
