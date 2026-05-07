'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDateTime } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditLogDto, PaginatedResponse } from '@article30/shared';

const ENTITY_TYPES = ['treatment', 'violation', 'user', 'checklist', 'organization'] as const;
const PAGE_LIMIT = 20;
const FILTER_ALL = 'all';
const DETAIL_COLSPAN = 5;

interface LogRowProps {
  log: AuditLogDto;
  expanded: boolean;
  onToggle: (id: string) => void;
}

function LogRow({ log, expanded, onToggle }: Readonly<LogRowProps>) {
  const handleClick = useCallback(() => onToggle(log.id), [onToggle, log.id]);
  const performerLabel = log.performer
    ? `${log.performer.firstName ?? ''} ${log.performer.lastName ?? ''}`.trim() || log.performedBy
    : log.performedBy;
  return (
    <Fragment key={log.id}>
      <TableRow className="cursor-pointer" onClick={handleClick}>
        <TableCell>{formatDateTime(log.performedAt)}</TableCell>
        <TableCell>{performerLabel}</TableCell>
        <TableCell>{log.action}</TableCell>
        <TableCell>{log.entity}</TableCell>
        <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
      </TableRow>
      {expanded && log.newValue && (
        <TableRow key={`${log.id}-details`}>
          <TableCell colSpan={DETAIL_COLSPAN} style={{ background: 'var(--surface-2)' }}>
            <pre
              className="max-h-64 overflow-auto rounded p-3 text-xs"
              style={{ background: 'var(--surface)', color: 'var(--ink-2)' }}
            >
              {JSON.stringify(log.newValue, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

export default function AuditLogPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState<string>(FILTER_ALL);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let filterParam = '';
      if (entityFilter !== FILTER_ALL) {
        filterParam = `&entity=${entityFilter}`;
      }
      const res = await api.get<PaginatedResponse<AuditLogDto>>(
        `/audit-log?page=${page}&limit=${PAGE_LIMIT}${filterParam}`,
      );
      setLogs(res.data);
      setTotal(res.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const handleFilterChange = useCallback((v: string) => {
    setEntityFilter(v);
    setPage(1);
  }, []);

  const handleToggleRow = useCallback((id: string) => {
    setExpandedRow(current => {
      if (current === id) {
        return null;
      }
      return id;
    });
  }, []);

  const handlePrev = useCallback(() => setPage(p => p - 1), []);
  const handleNext = useCallback(() => setPage(p => p + 1), []);

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  } else if (logs.length === 0) {
    body = (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('auditLog.noResults')}
      </p>
    );
  } else {
    body = (
      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('auditLog.date')}</TableHead>
              <TableHead>{t('auditLog.user')}</TableHead>
              <TableHead>{t('auditLog.action')}</TableHead>
              <TableHead>{t('auditLog.entity')}</TableHead>
              <TableHead>{t('auditLog.entityId')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedRow === log.id}
                onToggle={handleToggleRow}
              />
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrev}>
              {t('auditLog.previous')}
            </Button>
            <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={handleNext}>
              {t('auditLog.next')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Select value={entityFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('auditLog.filterEntity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>{t('auditLog.allEntities')}</SelectItem>
            {ENTITY_TYPES.map(entity => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {body}
    </>
  );
}
