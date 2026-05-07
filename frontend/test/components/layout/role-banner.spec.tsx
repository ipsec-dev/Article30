import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Role } from '@article30/shared';
import { RoleBanner } from '@/components/layout/role-banner';

describe('<RoleBanner />', () => {
  it('renders nothing for ADMIN', () => {
    const { container } = render(<RoleBanner role={Role.ADMIN} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an Auditor banner for AUDITOR', () => {
    render(<RoleBanner role={Role.AUDITOR} />);
    expect(screen.getByText(/Mode Auditeur/)).toBeInTheDocument();
  });

  it('renders an Editor banner for DPO', () => {
    render(<RoleBanner role={Role.DPO} />);
    expect(screen.getByText(/Mode Éditeur/)).toBeInTheDocument();
  });

  it('renders an Editor banner for EDITOR', () => {
    render(<RoleBanner role={Role.EDITOR} />);
    expect(screen.getByText(/Mode Éditeur/)).toBeInTheDocument();
  });

  it('renders an Editor banner for PROCESS_OWNER', () => {
    render(<RoleBanner role={Role.PROCESS_OWNER} />);
    expect(screen.getByText(/Mode Éditeur/)).toBeInTheDocument();
  });
});
