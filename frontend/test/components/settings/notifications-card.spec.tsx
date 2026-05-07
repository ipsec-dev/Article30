import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { NotificationsCard } from '@/components/settings/notifications-card';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

describe('<NotificationsCard>', () => {
  beforeEach(async () => {
    const { api } = await import('@/lib/api/client');
    vi.mocked(api.get).mockResolvedValue({
      notifyDsrDeadline: true,
      notifyVendorDpaExpiry: true,
      notifyTreatmentReview: false,
      notifyViolation72h: true,
    });
    vi.mocked(api.patch).mockResolvedValue(undefined);
  });

  it('renders all 4 toggles', async () => {
    renderWithI18n(<NotificationsCard />);
    const switches = await screen.findAllByRole('switch');
    expect(switches).toHaveLength(4);
  });

  it('renders the 4 toggles reflecting the server state', async () => {
    renderWithI18n(<NotificationsCard />);
    const dsr = await screen.findByLabelText(/Échéance DSR|DSR deadline/i);
    expect(dsr).toBeChecked();
    const treatment = await screen.findByLabelText(/Revue de traitement|Treatment review/i);
    expect(treatment).not.toBeChecked();
  });

  it('PATCHes when a toggle flips', async () => {
    const { api } = await import('@/lib/api/client');
    renderWithI18n(<NotificationsCard />);
    const violation = await screen.findByLabelText(/Fenêtre CNIL|72h CNIL window/i);
    await userEvent.click(violation);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organization/settings', {
        notifyViolation72h: false,
      });
    });
  });

  it('rolls back the toggle if the PATCH fails', async () => {
    const { api } = await import('@/lib/api/client');
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('network'));
    renderWithI18n(<NotificationsCard />);
    const violation = await screen.findByLabelText(/Fenêtre CNIL|72h CNIL window/i);
    expect(violation).toBeChecked();
    await userEvent.click(violation);
    // Optimistic flip happens immediately, but the failure should roll it back.
    await waitFor(() => expect(violation).toBeChecked());
  });
});
