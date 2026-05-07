import { I18nProvider } from '@/i18n/context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DsrWorkflowTab } from '@/components/dsr/workflow-tab';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/dsr/dsr-1') {
        return Promise.resolve({
          id: 'dsr-1',
          type: 'ACCESS',
          status: 'RECEIVED',
          requesterName: 'Jane Doe',
          requesterEmail: 'jane@example.com',
          requesterDetails: null,
          identityVerified: false,
          identityNotes: null,
          description: null,
          affectedSystems: null,
          receivedAt: '2026-04-01T00:00:00Z',
          deadline: '2026-05-01T00:00:00Z',
          extendedDeadline: null,
          extensionReason: null,
          responseNotes: null,
          respondedAt: null,
          closedAt: null,
          closureReason: null,
          rejectionReason: null,
          rejectionDetails: null,
          partialFulfilmentNotes: null,
          withdrawnReason: null,
          createdBy: null,
          assignedTo: null,
          creator: null,
          assignee: null,
          treatments: [],
          organizationId: 'org-1',
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
        });
      }
      if (url.includes('/follow-up/decisions/')) return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    patch: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('<DsrWorkflowTab>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Workflow heading and state strip', async () => {
    render(
      <I18nProvider>
        <DsrWorkflowTab dsrId="dsr-1" />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Workflow/i)).toBeInTheDocument());
    expect(screen.getByText(/Reçue|Received/i)).toBeInTheDocument();
  });

  it('shows available transitions for the RECEIVED state', async () => {
    render(
      <I18nProvider>
        <DsrWorkflowTab dsrId="dsr-1" />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Accusée de réception|Acknowledged/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Rejetée|Rejected/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retirée|Withdrawn/i })).toBeInTheDocument();
  });

  it('opens DsrTransitionModal when an available transition is clicked', async () => {
    render(
      <I18nProvider>
        <DsrWorkflowTab dsrId="dsr-1" />
      </I18nProvider>,
    );
    await waitFor(() => screen.getByRole('button', { name: /Rejetée|Rejected/i }));
    await userEvent.click(screen.getByRole('button', { name: /Rejetée|Rejected/i }));
    expect(await screen.findByText(/(Reçue|Received).*(Rejetée|Rejected)/i)).toBeInTheDocument();
  });

  it('renders the Decisions section with the decision log', async () => {
    render(
      <I18nProvider>
        <DsrWorkflowTab dsrId="dsr-1" />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(screen.getAllByText(/Décisions|Decisions/i).length).toBeGreaterThan(0),
    );
    expect(
      await screen.findByText(/aucune décision enregistrée|no decisions recorded/i),
    ).toBeInTheDocument();
  });
});
