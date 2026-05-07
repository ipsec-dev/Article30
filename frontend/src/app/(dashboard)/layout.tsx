'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { api } from '@/lib/api/client';
import { useI18n } from '@/i18n/context';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Topbar } from '@/components/layout/topbar';
import { RoleBanner } from '@/components/layout/role-banner';
import { Toaster } from 'sonner';
import type { UserDto } from '@article30/shared';

interface AlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
}

interface AlertsResult {
  items: unknown[];
  summary: AlertsSummary;
}

const SPINNER_CLASS =
  'size-8 animate-spin rounded-full border-4 border-[var(--a30-border)] border-t-[var(--primary)]';

interface TitleEntry {
  titleKey: string;
  breadcrumbKeys?: string[];
  descriptionKey?: string;
}

const TITLE_MAP: Record<string, TitleEntry> = {
  '/': { titleKey: 'page.dashboard.title', descriptionKey: 'page.dashboard.description' },
  '/register': {
    titleKey: 'page.register.title',
    descriptionKey: 'page.register.description',
  },
  '/checklist': {
    titleKey: 'page.checklist.title',
    descriptionKey: 'page.checklist.description',
  },
  '/governance': {
    titleKey: 'page.governance.title',
    descriptionKey: 'page.governance.description',
  },
  '/vendors': {
    titleKey: 'page.vendors.title',
    descriptionKey: 'page.vendors.description',
  },
  '/violations': {
    titleKey: 'page.violations.title',
    descriptionKey: 'page.violations.description',
  },
  '/dsr': {
    titleKey: 'page.dsr.title',
    descriptionKey: 'page.dsr.description',
  },
  '/alerts': {
    titleKey: 'page.alerts.title',
    descriptionKey: 'page.alerts.description',
  },
  '/regulatory-updates': {
    titleKey: 'page.regulatoryUpdates.title',
    descriptionKey: 'page.regulatoryUpdates.description',
  },
  '/iso': {
    titleKey: 'page.iso.title',
    descriptionKey: 'page.iso.description',
  },
  '/recitals': {
    titleKey: 'page.recitals.title',
    descriptionKey: 'page.recitals.description',
  },
  '/articles': {
    titleKey: 'page.articles.title',
    descriptionKey: 'page.articles.description',
  },
  '/glossary': {
    titleKey: 'page.glossary.title',
    descriptionKey: 'page.glossary.description',
  },
  '/users': {
    titleKey: 'page.users.title',
    breadcrumbKeys: ['nav.section.referentiel'],
    descriptionKey: 'page.users.description',
  },
  '/settings': {
    titleKey: 'page.settings.title',
    breadcrumbKeys: ['nav.section.referentiel'],
    descriptionKey: 'page.settings.description',
  },
  '/settings/account': {
    titleKey: 'page.account.title',
    breadcrumbKeys: ['nav.section.referentiel'],
    descriptionKey: 'page.account.description',
  },
  '/audit-log': {
    titleKey: 'page.auditLog.title',
    breadcrumbKeys: ['nav.section.referentiel'],
    descriptionKey: 'page.auditLog.description',
  },
};

function resolveTitle(pathname: string): TitleEntry {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  const match = Object.keys(TITLE_MAP)
    .filter(k => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (match) {
    // Detail/sub-routes inherit the parent's breadcrumb + title verbatim.
    // Appending base.title to the breadcrumb here would duplicate the h1
    // since we don't have a detail-specific title to render in its place.
    return TITLE_MAP[match];
  }
  return { titleKey: 'app.title' };
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [regulatoryNewCount, setRegulatoryNewCount] = useState(0);

  useEffect(() => {
    getMe().then(u => {
      if (!u) {
        router.push('/login');
        return;
      }
      if (!u.approved) {
        router.push('/pending');
        return;
      }
      setUser(u);
      setLoading(false);

      api
        .get<AlertsResult>('/alerts')
        .then(data => setAlertCount(data.summary.total))
        .catch(() => {});

      api
        .get<{ count: number }>('/regulatory-updates/new-count')
        .then(data => setRegulatoryNewCount(data.count))
        .catch(() => {});
    });
  }, [router]);

  const handleDismissAlert = useCallback(() => setAlertDismissed(true), []);

  const titleEntry = useMemo(() => resolveTitle(pathname), [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={SPINNER_CLASS} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar user={user} regulatoryNewCount={regulatoryNewCount} />
      <MobileNav user={user} regulatoryNewCount={regulatoryNewCount} />
      <main className="ml-0 min-h-screen transition-[margin] duration-150 md:ml-[var(--sidebar-width,232px)]">
        <Topbar
          title={t(titleEntry.titleKey)}
          breadcrumb={titleEntry.breadcrumbKeys?.map(k => t(k))}
          description={titleEntry.descriptionKey ? t(titleEntry.descriptionKey) : undefined}
        >
          <Link
            href="/alerts"
            className="relative flex size-9 items-center justify-center"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Notifications"
          >
            <Bell aria-hidden="true" className="size-4" />
            {alertCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full"
                style={{ background: 'var(--danger)' }}
              />
            )}
          </Link>
        </Topbar>
        <RoleBanner role={user.role} />
        {alertCount > 0 && !alertDismissed && (
          <div
            className="flex items-center justify-between border-b px-4 py-2 sm:px-6 lg:px-8"
            style={{
              background: 'var(--warn-bg)',
              borderColor: 'var(--a30-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium" style={{ color: 'var(--warn)' }}>
                {t('dashboard.alertsBanner').replace('{count}', String(alertCount))}
              </p>
              <Link
                href="/alerts"
                className="text-sm font-medium underline"
                style={{ color: 'var(--warn)' }}
              >
                {t('dashboard.alertsBannerLink')}
              </Link>
            </div>
            <button
              type="button"
              onClick={handleDismissAlert}
              style={{ color: 'var(--warn)' }}
              aria-label="Dismiss"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
        <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
