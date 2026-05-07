import { I18nProvider } from '@/i18n/context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RiskPanel } from '@/components/violations/risk-panel';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/risk-assessment')) return Promise.resolve(null);
      if (url.endsWith('/risk-assessment/history')) return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

import { api } from '@/lib/api/client';

describe('<RiskPanel>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty state when no current assessment', async () => {
    render(
      <I18nProvider>
        <RiskPanel violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Aucune évaluation du risque|No risk assessment/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /assess|évaluer/i })).toBeInTheDocument();
  });

  it('opens form on Assess click and posts on submit', async () => {
    render(
      <I18nProvider>
        <RiskPanel violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() => screen.getByRole('button', { name: /assess|évaluer/i }));
    await userEvent.click(screen.getByRole('button', { name: /assess|évaluer/i }));
    await userEvent.type(
      screen.getByLabelText(/potential consequences|conséquences/i),
      'Identity theft for affected users',
    );
    await userEvent.click(screen.getByRole('button', { name: /save assessment|enregistrer/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      '/violations/v1/risk-assessment',
      expect.objectContaining({
        likelihood: 'MEDIUM',
        severity: 'MEDIUM',
        potentialConsequences: 'Identity theft for affected users',
      }),
    );
  });
});
