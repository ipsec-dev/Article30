'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { getMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Role, Severity, WRITE_ROLES, DELETE_ROLES } from '@article30/shared';
import type { ViolationDto, UserDto, PaginatedResponse } from '@article30/shared';

const PAGE_SIZE = 10;

const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.LOW]: 'bg-green-100 text-green-800',
  [Severity.MEDIUM]: 'bg-amber-100 text-amber-800',
  [Severity.HIGH]: 'bg-red-100 text-red-800',
  [Severity.CRITICAL]: 'bg-red-200 text-red-900',
};

interface ViolationRowProps {
  violation: ViolationDto;
  canWrite: boolean;
  canDelete: boolean;
  t: (key: string) => string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function ViolationRow({
  violation,
  canWrite,
  canDelete,
  t,
  onView,
  onEdit,
  onDelete,
}: Readonly<ViolationRowProps>) {
  const handleView = useCallback(() => onView(violation.id), [onView, violation.id]);
  const handleEdit = useCallback(() => onEdit(violation.id), [onEdit, violation.id]);
  const handleDelete = useCallback(() => onDelete(violation.id), [onDelete, violation.id]);

  return (
    <TableRow>
      <TableCell className="font-medium">{violation.title}</TableCell>
      <TableCell>
        <Badge className={SEVERITY_COLORS[violation.severity]}>
          {t(`violation.severity.${violation.severity}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="bg-blue-100 text-blue-800">
          {t(`violation.status.${violation.status}`)}
        </Badge>
      </TableCell>
      <TableCell style={{ color: 'var(--ink-2)' }}>{formatDate(violation.awarenessAt)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={handleView}>
            {t('common.view')}
          </Button>
          {canWrite && (
            <Button variant="ghost" size="xs" onClick={handleEdit}>
              {t('common.edit')}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="xs"
              className="text-red-600 hover:text-red-700"
              onClick={handleDelete}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ViolationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [violations, setViolations] = useState<ViolationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const canWrite = Boolean(user && (WRITE_ROLES as readonly Role[]).includes(user.role));
  const canDelete = Boolean(user && (DELETE_ROLES as readonly Role[]).includes(user.role));

  const fetchViolations = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<ViolationDto>>(
        `/violations?page=${p}&limit=${PAGE_SIZE}`,
      );
      setViolations(res.data);
      setTotal(res.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMe().then(u => setUser(u));
  }, []);

  useEffect(() => {
    fetchViolations(page);
  }, [page, fetchViolations]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(t('common.confirmDelete'))) {
        return;
      }
      try {
        await api.delete(`/violations/${id}`);
        fetchViolations(page);
      } catch {}
    },
    [fetchViolations, page, t],
  );

  const handleView = useCallback((id: string) => router.push(`/violations/${id}`), [router]);
  const handleEdit = useCallback((id: string) => router.push(`/violations/${id}/edit`), [router]);
  const handleCreate = useCallback(() => router.push('/violations/new'), [router]);
  const handlePrev = useCallback(() => setPage(p => p - 1), []);
  const handleNext = useCallback(() => setPage(p => p + 1), []);

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: '2rem',
            height: '2rem',
            animation: 'spin 1s linear infinite',
            borderRadius: '9999px',
            border: '4px solid var(--ink-3)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  } else if (violations.length === 0) {
    body = (
      <p
        style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--ink-2)',
        }}
      >
        {t('common.noResults')}
      </p>
    );
  } else {
    body = (
      <>
        <div style={{ marginTop: '1.5rem' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('violation.title')}</TableHead>
                <TableHead>{t('violation.severity')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('violation.awarenessAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map(v => (
                <ViolationRow
                  key={v.id}
                  violation={v}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  t={t}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrev}>
              {t('common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={handleNext}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        {canWrite && (
          <Button size="sm" onClick={handleCreate}>
            {t('common.create')}
          </Button>
        )}
      </div>
      {body}
    </div>
  );
}
