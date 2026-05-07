import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { WorkflowTab } from '@/components/violations/workflow-tab';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/violations/v1') && !url.includes('/follow-up')) {
        return Promise.resolve({
          id: 'v1',
          title: 'test',
          status: 'RECEIVED',
          severity: 'LOW',
          awarenessAt: null,
          occurredAt: null,
          breachCategories: [],
          dismissalReason: null,
          delayJustification: null,
          personsNotificationWaiver: null,
          waiverJustification: null,
          closureReason: null,
          lessonsLearned: null,
          organizationId: 'org-a',
          createdAt: '2026-04-26T00:00:00Z',
          updatedAt: '2026-04-26T00:00:00Z',
        });
      }
      if (url.includes('/follow-up/decisions/')) return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    patch: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('<WorkflowTab>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the state strip with current state', async () => {
    render(
      <I18nProvider>
        <WorkflowTab violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Workflow/i)).toBeInTheDocument());
    expect(screen.getByText(/Reçue|Received/i)).toBeInTheDocument();
  });

  it('shows available transitions for the current state', async () => {
    render(
      <I18nProvider>
        <WorkflowTab violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Triée|Triaged/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Écartée|Dismissed/i })).toBeInTheDocument();
  });

  it('opens TransitionModal when an available transition is clicked', async () => {
    render(
      <I18nProvider>
        <WorkflowTab violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() => screen.getByRole('button', { name: /Écartée|Dismissed/i }));
    await userEvent.click(screen.getByRole('button', { name: /Écartée|Dismissed/i }));
    expect(await screen.findByText(/(Reçue|Received).*(Écartée|Dismissed)/i)).toBeInTheDocument();
  });
});
