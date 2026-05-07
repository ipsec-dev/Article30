import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/context';
import { HeroBand } from '@/components/dashboard/hero-band';

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

describe('<HeroBand />', () => {
  it('greets the user by their first name', () => {
    renderWithI18n(<HeroBand greetingName="Camille" isAdmin={false} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Bonjour Camille/);
  });

  it('always renders the "Nouveau traitement" link', () => {
    renderWithI18n(<HeroBand greetingName="x" isAdmin={false} />);
    const link = screen.getByRole('link', { name: /Nouveau traitement/ });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('hides admin actions for non-admin users', () => {
    renderWithI18n(<HeroBand greetingName="x" isAdmin={false} />);
    expect(screen.queryByRole('button', { name: /Exporter le registre/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Audit pack/ })).not.toBeInTheDocument();
  });

  it('shows admin actions and fires their handlers', async () => {
    const onDownloadReport = vi.fn();
    const onDownloadAuditPackage = vi.fn();
    renderWithI18n(
      <HeroBand
        greetingName="x"
        isAdmin
        onDownloadReport={onDownloadReport}
        onDownloadAuditPackage={onDownloadAuditPackage}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Exporter le registre/ }));
    expect(onDownloadReport).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /Audit pack/ }));
    expect(onDownloadAuditPackage).toHaveBeenCalledTimes(1);
  });
});
