import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Role, type UserDto } from '@article30/shared';

// Sidebar reads usePathname() to compute the active link. We override the
// global next/navigation mock locally so each test can control pathname.
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

// Stub `logout()` so we can assert it is invoked on click without making a
// real API call. `vi.hoisted` ensures the mock is available at module-evaluation time.
const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return { ...actual, logout: logoutMock };
});

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
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

describe('Sidebar', () => {
  beforeEach(() => {
    logoutMock.mockClear();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('renders admin-only nav items for an ADMIN user', () => {
    renderWithI18n(<Sidebar user={makeUser({ role: Role.ADMIN })} />);

    // Admin-only items: Users, Settings.
    expect(screen.getByRole('link', { name: /Utilisateurs|Users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Paramètres|Settings/i })).toBeInTheDocument();
    // DSR requires ADMIN or DPO and should be visible here.
    expect(
      screen.getByRole('link', { name: /Demandes de droits|DSR Requests/i }),
    ).toBeInTheDocument();
  });

  it('hides admin-only items from an AUDITOR user', () => {
    renderWithI18n(<Sidebar user={makeUser({ role: Role.AUDITOR })} />);

    // Users and Settings are ADMIN-only, so they must be absent.
    expect(screen.queryByRole('link', { name: /Utilisateurs|Users/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Paramètres|^Settings$/i })).toBeNull();
    // DSR requires ADMIN or DPO, so it must also be hidden.
    expect(screen.queryByRole('link', { name: /Demandes de droits|DSR Requests/i })).toBeNull();
    // Audit log is available to AUDITOR and should still show.
    expect(screen.getByRole('link', { name: /Journal d'audit|Audit Log/i })).toBeInTheDocument();
  });

  it('applies the active-link style to the link matching usePathname()', () => {
    vi.mocked(usePathname).mockReturnValue('/dsr');
    renderWithI18n(<Sidebar user={makeUser({ role: Role.ADMIN })} />);

    const dsrLink = screen.getByRole('link', { name: /Demandes de droits|DSR Requests/i });
    // Active styling in sidebar.tsx uses inline style props (indigo accent border + bg).
    expect(dsrLink.style.borderLeft).toMatch(/2px solid/);
    expect(dsrLink.style.background).toBeTruthy();

    // Spot-check: an unrelated link (dashboard) must NOT carry the active style.
    const dashboardLink = screen.getByRole('link', { name: /Tableau de bord|Dashboard/i });
    expect(dashboardLink.style.background).toBeFalsy();
  });

  it('shows the regulatory-updates badge when regulatoryNewCount > 0', () => {
    renderWithI18n(<Sidebar user={makeUser()} regulatoryNewCount={7} />);

    const regLink = screen.getByRole('link', { name: /^Veille|Regulatory Watch/i });
    expect(within(regLink).getByText('7')).toBeInTheDocument();
  });

  it('hides the regulatory-updates badge when count is 0 or undefined', () => {
    const { rerender } = renderWithI18n(<Sidebar user={makeUser()} regulatoryNewCount={0} />);

    let regLink = screen.getByRole('link', { name: /^Veille|Regulatory Watch/i });
    // No numeric badge should appear inside the link.
    expect(within(regLink).queryByText('0')).toBeNull();

    rerender(
      <I18nProvider>
        <Sidebar user={makeUser()} />
      </I18nProvider>,
    );
    regLink = screen.getByRole('link', { name: /^Veille|Regulatory Watch/i });
    // The badge span is not rendered when the count prop is undefined.
    // The link's text should only contain the label, no stray digits.
    expect(regLink.textContent).not.toMatch(/\d/);
  });

  it('calls logout() when the logout button is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Sidebar user={makeUser()} />);

    const logoutBtn = screen.getByRole('button', { name: /Déconnexion|Logout/i });
    await user.click(logoutBtn);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('renders user initials derived from firstName and lastName', () => {
    renderWithI18n(<Sidebar user={makeUser({ firstName: 'Jane', lastName: 'Doe' })} />);
    // "Jane Doe" -> first letter of each word, joined, upper-cased, sliced to 2 chars.
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('caps initials at 2 chars when first + last name together have more than two words', () => {
    renderWithI18n(<Sidebar user={makeUser({ firstName: 'Alice', lastName: 'Bob' })} />);
    // Should render "AB".
    expect(screen.getByText('AB')).toBeInTheDocument();
    expect(screen.queryByText('ABC')).toBeNull();
  });
});
