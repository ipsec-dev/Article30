import { I18nProvider } from '@/i18n/context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowUpPanel } from '@/components/follow-up/follow-up-panel';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/timeline/')) return Promise.resolve([]);
      if (url.includes('/comments/')) return Promise.resolve([]);
      if (url.includes('/attachments/')) return Promise.resolve([]);
      return Promise.resolve([]);
    }),
    post: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('<FollowUpPanel>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders three tabs and starts on Timeline', async () => {
    render(
      <I18nProvider>
        <FollowUpPanel entityType="VIOLATION" entityId="v1" />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: /chronologie|timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /commentaires|comments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pièces jointes|attachments/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/aucun événement|no events yet/i)).toBeInTheDocument(),
    );
  });

  it('switches to Comments tab on click', async () => {
    render(
      <I18nProvider>
        <FollowUpPanel entityType="DSR" entityId="d1" />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /commentaires|comments/i }));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/ajouter un commentaire|add a comment/i),
      ).toBeInTheDocument(),
    );
  });

  it('switches to Attachments tab on click', async () => {
    render(
      <I18nProvider>
        <FollowUpPanel entityType="VIOLATION" entityId="v1" />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /pièces jointes|attachments/i }));
    await waitFor(() =>
      expect(screen.getByText(/aucune pièce jointe|no attachments yet/i)).toBeInTheDocument(),
    );
  });
});
