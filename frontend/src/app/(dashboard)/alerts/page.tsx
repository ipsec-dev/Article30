'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, CheckSquare, Inbox, CheckCircle } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { Card, CardContent } from '@/components/ui/card';
import { StatusDot } from '@/components/a30/status-dot';
import type { StatusKind } from '@/components/a30/status-dot';

interface AlertItem {
  type: string;
  entityId: string;
  title: string;
  severity: string;
  dueDate: string | null;
  url: string;
}

interface AlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
}

interface AlertsResult {
  items: AlertItem[];
  summary: AlertsSummary;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  OPEN_VIOLATION: AlertTriangle,
  TREATMENT_OVERDUE: FileText,
  CHECKLIST_NON_COMPLIANT: CheckSquare,
  DSR_DEADLINE: Inbox,
};

function getSeverityDotKind(severity: string): StatusKind {
  switch (severity) {
    case 'CRITICAL':
      return 'danger';
    case 'HIGH':
      return 'warn';
    case 'MEDIUM':
      return 'warn';
    case 'LOW':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) {
    return false;
  }
  return new Date(dueDate) < new Date();
}

export default function AlertsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AlertsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AlertsResult>('/alerts')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  } else if (!data || data.items.length === 0) {
    content = (
      <div className="mt-12 flex flex-col items-center text-center">
        <CheckCircle className="size-12" style={{ color: 'var(--success)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('alerts.empty')}
        </p>
      </div>
    );
  } else {
    content = (
      <div className="mt-6 space-y-3">
        {data.items.map(item => {
          const Icon = TYPE_ICONS[item.type] ?? AlertTriangle;
          const overdue = isOverdue(item.dueDate);
          let dueDateLabel: string | null = null;
          if (item.dueDate) {
            if (overdue) {
              dueDateLabel = t('alerts.overdue');
            } else {
              dueDateLabel = formatDate(item.dueDate);
            }
          }

          return (
            <Link key={`${item.type}-${item.entityId}`} href={item.url}>
              <Card
                className="transition-colors"
                style={{ '--hover-bg': 'var(--surface-2)' } as React.CSSProperties}
              >
                <CardContent className="flex items-center gap-4 pt-0">
                  <Icon className="size-5 shrink-0" style={{ color: 'var(--ink-3)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {item.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                        {t(`alerts.type.${item.type}`)}
                      </span>
                      {item.dueDate && (
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: overdue ? 'var(--danger)' : 'var(--ink-3)',
                          }}
                        >
                          {dueDateLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusDot kind={getSeverityDotKind(item.severity)}>
                    {t(`alerts.severity.${item.severity}`)}
                  </StatusDot>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <div className="flex flex-wrap items-center gap-2">
          {data && data.summary.critical > 0 && (
            <StatusDot kind="danger">
              {data.summary.critical} {t('alerts.severity.CRITICAL')}
            </StatusDot>
          )}
          {data && data.summary.high > 0 && (
            <StatusDot kind="warn">
              {data.summary.high} {t('alerts.severity.HIGH')}
            </StatusDot>
          )}
          {data && data.summary.medium > 0 && (
            <StatusDot kind="warn">
              {data.summary.medium} {t('alerts.severity.MEDIUM')}
            </StatusDot>
          )}
        </div>
      </div>

      {content}
    </>
  );
}
