'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Rss,
  Scale,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { logout } from '@/lib/auth';
import { AvatarInitials } from '@/components/a30/avatar-initials';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarCollapsed } from '@/lib/sidebar/use-sidebar-collapsed';
import type { UserDto } from '@article30/shared';
import { Role } from '@article30/shared';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: Role[];
  badge?: number;
  exact?: boolean;
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

interface SidebarProps {
  user: UserDto;
  regulatoryNewCount?: number;
}

const buildPrimaryNav = (regulatoryNewCount?: number): NavSection[] => [
  {
    labelKey: 'nav.section.overview',
    items: [{ href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    labelKey: 'nav.section.compliance',
    items: [
      { href: '/register', labelKey: 'nav.register', icon: BookOpen },
      { href: '/governance', labelKey: 'nav.governance', icon: CheckSquare },
      { href: '/checklist', labelKey: 'nav.checklist', icon: Shield },
      { href: '/vendors', labelKey: 'nav.vendors', icon: Building2 },
    ],
  },
  {
    labelKey: 'nav.section.incidents',
    items: [
      { href: '/violations', labelKey: 'nav.violations', icon: AlertTriangle },
      { href: '/dsr', labelKey: 'nav.dsr', icon: Inbox, roles: [Role.ADMIN, Role.DPO] },
      { href: '/alerts', labelKey: 'nav.alerts', icon: Bell },
    ],
  },
  {
    labelKey: 'nav.section.resources',
    items: [
      {
        href: '/regulatory-updates',
        labelKey: 'nav.regulatoryUpdates',
        icon: Rss,
        badge: regulatoryNewCount,
      },
      { href: '/iso', labelKey: 'nav.isoMapping', icon: Layers },
      { href: '/recitals', labelKey: 'nav.recitals', icon: Newspaper },
      { href: '/articles', labelKey: 'nav.articles', icon: Scale },
      { href: '/glossary', labelKey: 'nav.glossary', icon: BookMarked },
    ],
  },
];

const REFERENTIEL_NAV: NavItem[] = [
  { href: '/users', labelKey: 'nav.users', icon: Users, roles: [Role.ADMIN] },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings, roles: [Role.ADMIN], exact: true },
  {
    href: '/audit-log',
    labelKey: 'nav.auditLog',
    icon: History,
    roles: [Role.ADMIN, Role.DPO, Role.AUDITOR],
  },
  { href: '/settings/account', labelKey: 'nav.account', icon: UserCog },
];

export function Sidebar({ user, regulatoryNewCount }: Readonly<SidebarProps>) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarCollapsed();

  const sections = useMemo(() => {
    const all = buildPrimaryNav(regulatoryNewCount);
    return all
      .map(section => ({
        ...section,
        items: section.items.filter(item => !item.roles || item.roles.includes(user.role)),
      }))
      .filter(section => section.items.length > 0);
  }, [regulatoryNewCount, user.role]);

  const referentiel = useMemo(
    () => REFERENTIEL_NAV.filter(item => !item.roles || item.roles.includes(user.role)),
    [user.role],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [router]);

  const isActive = (item: NavItem) =>
    (item.exact ?? item.href === '/') ? pathname === item.href : pathname.startsWith(item.href);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item);

    const linkContent = collapsed ? (
      <span className="relative flex items-center justify-center">
        <Icon aria-hidden="true" className="size-[17px] shrink-0" />
        {item.badge ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 size-2 rounded-full"
            style={{ background: '#f87171' }}
          />
        ) : null}
      </span>
    ) : (
      <>
        <span className="flex items-center gap-2.5">
          <Icon aria-hidden="true" className="size-[17px] shrink-0" />
          <span>{t(item.labelKey)}</span>
        </span>
        {item.badge ? (
          <span
            className="num rounded px-1.5 py-[1px] text-[10.5px] font-semibold"
            style={{ background: 'rgba(248,113,113,.18)', color: '#fca5a5' }}
          >
            {item.badge}
          </span>
        ) : null}
      </>
    );

    const linkEl = (
      <Link
        href={item.href}
        className={
          collapsed
            ? 'mb-0.5 flex w-full items-center justify-center rounded px-2.5 py-2 text-[13px] transition-colors hover:bg-white/5 hover:text-white'
            : 'mb-0.5 flex w-full items-center justify-between gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors hover:bg-white/5 hover:text-white'
        }
        style={{
          background: active ? 'var(--color-sidebar-accent)' : undefined,
          color: active ? 'var(--color-sidebar-accent-foreground)' : '#cbd5e1',
          borderLeft: active ? '2px solid var(--color-sidebar-primary)' : '2px solid transparent',
          fontWeight: active ? 600 : 500,
        }}
      >
        {linkContent}
      </Link>
    );

    if (collapsed) {
      return (
        <li key={item.href}>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
            <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
          </Tooltip>
        </li>
      );
    }

    return <li key={item.href}>{linkEl}</li>;
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-30 hidden h-screen flex-col transition-[width] duration-150 md:flex ${collapsed ? 'w-14' : 'w-[232px]'}`}
      style={{
        background: 'var(--color-sidebar)',
        color: 'var(--color-sidebar-foreground)',
        borderRight: '1px solid var(--color-sidebar-border)',
      }}
      aria-label={t('app.title')}
    >
      <div
        className={`flex items-center px-4 py-5 ${collapsed ? 'justify-center' : 'justify-between gap-2.5'}`}
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center text-[15px] font-semibold"
              style={{ background: 'var(--primary)', color: 'white', borderRadius: 4 }}
            >
              A
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-none">Article30</div>
              <div
                className="mt-1 text-[10.5px] uppercase tracking-wide"
                style={{ color: '#64748b' }}
              >
                Registre RGPD
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          className="flex shrink-0 items-center justify-center rounded p-1.5 transition-colors hover:bg-white/5 hover:text-white"
          style={{ color: '#64748b' }}
        >
          {collapsed ? (
            <ChevronsRight aria-hidden="true" className="size-4" />
          ) : (
            <ChevronsLeft aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      <nav className="scrollbar-dark flex-1 overflow-y-auto px-2 py-3">
        <TooltipProvider delayDuration={150}>
          {sections.map((section, idx) => (
            <div key={section.labelKey}>
              {idx > 0 && (
                <div
                  className="my-2"
                  style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
                />
              )}
              {!collapsed && (
                <div
                  className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#64748b' }}
                >
                  {t(section.labelKey)}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">{section.items.map(renderItem)}</ul>
            </div>
          ))}

          {referentiel.length > 0 && (
            <>
              {!collapsed && (
                <div
                  className="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#64748b' }}
                >
                  {t('nav.section.referentiel')}
                </div>
              )}
              {collapsed && (
                <div
                  className="my-2"
                  style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
                />
              )}
              <ul className="flex flex-col gap-0.5">{referentiel.map(renderItem)}</ul>
            </>
          )}
        </TooltipProvider>
      </nav>

      {/* User footer */}
      <div
        className={`flex items-center px-3 py-3 ${collapsed ? 'flex-col gap-2' : 'gap-2.5'}`}
        style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
      >
        <AvatarInitials name={`${user.firstName} ${user.lastName}`} size={30} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">{`${user.firstName} ${user.lastName}`}</div>
            <div className="text-[10.5px] uppercase tracking-wide" style={{ color: '#64748b' }}>
              {t(`role.${user.role}`)}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
          className="shrink-0 transition-colors hover:text-white"
          style={{ color: 'var(--color-sidebar-foreground)' }}
        >
          <LogOut aria-hidden="true" className="size-4" />
        </button>
      </div>
    </aside>
  );
}
