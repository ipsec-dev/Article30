'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Shield,
  AlertTriangle,
  Bell,
  Inbox,
  Building2,
  BookMarked,
  BookOpen,
  Scale,
  History,
  Users,
  Settings,
  LogOut,
  Layers,
  Newspaper,
  UserCog,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { logout } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import type { UserDto } from '@article30/shared';
import { Role } from '@article30/shared';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  roles?: Role[];
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    labelKey: 'nav.section.overview',
    items: [{ href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    labelKey: 'nav.section.compliance',
    items: [
      { href: '/register', labelKey: 'nav.register', icon: FileText },
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
      { href: '/regulatory-updates', labelKey: 'nav.regulatoryUpdates', icon: Newspaper },
      { href: '/iso', labelKey: 'nav.isoMapping', icon: Layers },
      { href: '/recitals', labelKey: 'nav.recitals', icon: BookOpen },
      { href: '/articles', labelKey: 'nav.articles', icon: Scale },
      { href: '/glossary', labelKey: 'nav.glossary', icon: BookMarked },
    ],
  },
  {
    labelKey: 'nav.section.admin',
    items: [
      {
        href: '/audit-log',
        labelKey: 'nav.auditLog',
        icon: History,
        roles: [Role.ADMIN, Role.DPO, Role.AUDITOR],
      },
      { href: '/users', labelKey: 'nav.users', icon: Users, roles: [Role.ADMIN] },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings, roles: [Role.ADMIN] },
      { href: '/settings/account', labelKey: 'nav.account', icon: UserCog },
    ],
  },
];

const INITIALS_MAX_CHARS = 2;

interface MobileNavProps {
  user: UserDto;
  regulatoryNewCount?: number;
}

export function MobileNav({ user, regulatoryNewCount }: Readonly<MobileNavProps>) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(user.role)),
    }))
    .filter(section => section.items.length > 0);

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, INITIALS_MAX_CHARS);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [router]);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  let drawerTransform: string;
  if (open) {
    drawerTransform = 'translate-x-0';
  } else {
    drawerTransform = '-translate-x-full';
  }

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div
        className="fixed left-0 right-0 top-0 z-40 flex h-12 items-center gap-3 px-4"
        style={{ background: 'var(--color-sidebar)' }}
      >
        <button
          type="button"
          onClick={handleOpen}
          aria-label={t('nav.openMenu')}
          className="text-white"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <span className="text-sm font-semibold text-white">{t('app.title')}</span>
      </div>

      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col transition-transform duration-200 ${drawerTransform}`}
        style={{ background: 'var(--color-sidebar)' }}
      >
        {/* Drawer header */}
        <div className="flex h-12 items-center justify-between px-4">
          <span className="text-sm font-semibold text-white">{t('app.title')}</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('nav.closeMenu')}
            className="hover:text-white"
            style={{ color: 'var(--ink-3)' }}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {visibleSections.map((section, sectionIdx) => (
            <div key={section.labelKey}>
              {sectionIdx > 0 && (
                <div
                  className="my-2 border-t"
                  style={{ borderColor: 'var(--color-sidebar-border)' }}
                />
              )}
              <p
                className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: '#64748b' }}
              >
                {t(section.labelKey)}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map(item => {
                  let active: boolean;
                  if (item.href === '/') {
                    active = pathname === '/';
                  } else {
                    active = pathname.startsWith(item.href);
                  }
                  const Icon = item.icon;
                  let linkStateClass: string;
                  if (active) {
                    linkStateClass = 'border-l-[3px] pl-[9px]';
                  } else {
                    linkStateClass = 'hover:text-white';
                  }
                  const showBadge = item.href === '/regulatory-updates' && !!regulatoryNewCount;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleClose}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${linkStateClass}`}
                        style={{
                          background: active ? 'var(--color-sidebar-accent)' : undefined,
                          color: active
                            ? 'var(--color-sidebar-accent-foreground)'
                            : 'var(--color-sidebar-foreground)',
                          borderLeftColor: active ? 'var(--color-sidebar-primary)' : 'transparent',
                        }}
                      >
                        <Icon className="size-4 shrink-0" />
                        {t(item.labelKey)}
                        {showBadge && (
                          <span
                            className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ background: 'var(--primary)' }}
                          >
                            {regulatoryNewCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div
          className="flex items-center gap-3 border-t px-4 py-3"
          style={{ borderColor: 'var(--color-sidebar-border)' }}
        >
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ background: 'var(--primary)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{`${user.firstName} ${user.lastName}`}</p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {t(`role.${user.role}`)}
            </Badge>
          </div>
          <button
            onClick={handleLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="shrink-0 transition-colors hover:text-white"
            style={{ color: 'var(--ink-3)' }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
