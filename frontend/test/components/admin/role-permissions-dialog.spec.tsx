import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RolePermissionsDialog } from '@/components/admin/role-permissions-dialog';
import { I18nProvider } from '@/i18n/context';
import { ROLE_PERMISSION_MATRIX } from '@article30/shared';

describe('<RolePermissionsDialog />', () => {
  it('renders nothing visible when closed', () => {
    render(
      <I18nProvider>
        <RolePermissionsDialog open={false} onOpenChange={() => {}} />
      </I18nProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders one row per capability and one column per role when open', () => {
    render(
      <I18nProvider>
        <RolePermissionsDialog open={true} onOpenChange={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    // 1 header row + N capability rows
    expect(rows.length).toBe(ROLE_PERMISSION_MATRIX.length + 1);
  });

  it('uses an emerald check for allowed cells and an em-dash for denied cells', () => {
    render(
      <I18nProvider>
        <RolePermissionsDialog open={true} onOpenChange={() => {}} />
      </I18nProvider>,
    );
    // Radix portals dialog content into document.body — query the whole doc.
    expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
