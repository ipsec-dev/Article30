import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Role, type UserDto } from '@article30/shared';

// Override next/navigation locally so usePathname can be controlled per-test.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: vi.fn(() => '/'),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return { ...actual, logout: logoutMock };
});

import { usePathname } from 'next/navigation';
import { MobileNav } from '@/components/layout/mobile-nav';
import { I18nProvider } from '@/i18n/context';

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    role: Role.ADMIN,
    approved: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// The drawer is always in the DOM; the component flips between `translate-x-0`
// (open) and `-translate-x-full` (closed). Find the drawer via its distinctive
// transition-transform class.
function getDrawer(container: HTMLElement): HTMLElement {
  const drawer = container.querySelector('.transition-transform') as HTMLElement | null;
  if (!drawer) {
    throw new Error('Drawer element not found');
  }
  return drawer;
}

describe('MobileNav', () => {
  beforeEach(() => {
    logoutMock.mockClear();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('is closed by default (drawer has -translate-x-full)', () => {
    const { container } = renderWithI18n(<MobileNav user={makeUser()} />);

    const drawer = getDrawer(container);
    expect(drawer.className).toMatch(/-translate-x-full/);
    expect(drawer.className).not.toMatch(/translate-x-0/);

    // Backdrop is conditionally rendered and should be absent when closed.
    expect(screen.queryByRole('button', { name: /Close menu/i })).toBeNull();
  });

  it('opens when the hamburger (Menu) button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(<MobileNav user={makeUser()} />);

    // The hamburger is the first button in the fixed top bar. Its only child is
    // the Menu icon (no accessible label), so locate it positionally.
    const buttons = screen.getAllByRole('button');
    const hamburger = buttons[0];
    await user.click(hamburger);

    const drawer = getDrawer(container);
    expect(drawer.className).toMatch(/translate-x-0/);
    expect(drawer.className).not.toMatch(/-translate-x-full/);

    // Backdrop should now be present.
    expect(screen.getByRole('button', { name: /Close menu/i })).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(<MobileNav user={makeUser()} />);

    // Open first.
    await user.click(screen.getAllByRole('button')[0]);
    const drawer = getDrawer(container);
    expect(drawer.className).toMatch(/translate-x-0/);

    // Click the backdrop (aria-label "Close menu").
    await user.click(screen.getByRole('button', { name: /Close menu/i }));

    expect(drawer.className).toMatch(/-translate-x-full/);
    expect(screen.queryByRole('button', { name: /Close menu/i })).toBeNull();
  });

  it('closes when the X (close) button inside the drawer is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(<MobileNav user={makeUser()} />);

    await user.click(screen.getAllByRole('button')[0]);
    const drawer = getDrawer(container);
    expect(drawer.className).toMatch(/translate-x-0/);

    // The X button lives inside the drawer header. Find it by scoping to the drawer.
    const buttonsInDrawer = within(drawer).getAllByRole('button');
    // Header X button is the first button rendered inside the drawer.
    await user.click(buttonsInDrawer[0]);

    expect(drawer.className).toMatch(/-translate-x-full/);
  });

  it('auto-closes when a nav link is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(<MobileNav user={makeUser()} />);

    await user.click(screen.getAllByRole('button')[0]);
    const drawer = getDrawer(container);
    expect(drawer.className).toMatch(/translate-x-0/);

    const dashboardLink = screen.getByRole('link', { name: /Tableau de bord|Dashboard/i });
    await user.click(dashboardLink);

    // The Link's onClick sets open=false synchronously; wrap in waitFor for safety.
    await waitFor(() => {
      expect(drawer.className).toMatch(/-translate-x-full/);
    });
  });

  it('shows the regulatory-updates badge when count > 0', async () => {
    const user = userEvent.setup();
    renderWithI18n(<MobileNav user={makeUser()} regulatoryNewCount={3} />);

    // Open drawer so the nav links become visible.
    await user.click(screen.getAllByRole('button')[0]);

    const regLink = screen.getByRole('link', { name: /^Veille|Regulatory Watch/i });
    expect(within(regLink).getByText('3')).toBeInTheDocument();
  });

  it('calls logout() when the logout button inside the drawer is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(<MobileNav user={makeUser()} />);

    await user.click(screen.getAllByRole('button')[0]);
    const logoutBtn = screen.getByRole('button', { name: /Déconnexion|Logout/i });
    await user.click(logoutBtn);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('filters out admin-only items for a non-ADMIN user', async () => {
    const user = userEvent.setup();
    renderWithI18n(<MobileNav user={makeUser({ role: Role.AUDITOR })} />);

    await user.click(screen.getAllByRole('button')[0]);

    // AUDITOR can see audit-log but not Users / Settings / DSR.
    expect(screen.getByRole('link', { name: /Journal d'audit|Audit Log/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Utilisateurs|Users/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Paramètres|^Settings$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Demandes de droits|DSR Requests/i })).toBeNull();
  });
});
