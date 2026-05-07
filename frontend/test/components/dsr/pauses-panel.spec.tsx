import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { PausesPanel } from '@/components/dsr/pauses-panel';

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

const mockTransition = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/dsr/use-pauses', () => ({
  usePauses: vi.fn(),
}));

vi.mock('@/lib/dsr/use-dsr-detail', () => ({
  useDsrDetail: vi.fn(),
}));

import { usePauses } from '@/lib/dsr/use-pauses';
import { useDsrDetail } from '@/lib/dsr/use-dsr-detail';

const closedPause = {
  id: 'pause-1',
  dsrId: 'dsr-1',
  reason: 'SCOPE_CLARIFICATION' as const,
  reasonDetails: 'Need more info',
  pausedAt: '2026-04-01T10:00:00Z',
  resumedAt: '2026-04-03T10:00:00Z',
  startedBy: 'user-1',
  organizationId: 'org-1',
};

const openPause = {
  id: 'pause-2',
  dsrId: 'dsr-1',
  reason: 'IDENTITY_VERIFICATION' as const,
  reasonDetails: null,
  pausedAt: '2026-04-10T10:00:00Z',
  resumedAt: null,
  startedBy: 'user-1',
  organizationId: 'org-1',
};

describe('<PausesPanel>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDsrDetail).mockReturnValue({
      dsr: {
        id: 'dsr-1',
        type: 'ACCESS',
        status: 'IN_PROGRESS',
        requesterName: 'Jane',
        requesterEmail: 'jane@example.com',
        requesterDetails: null,
        identityVerified: false,
        identityNotes: null,
        description: null,
        affectedSystems: null,
        receivedAt: '2026-04-01T00:00:00Z',
        deadline: '2026-05-01T00:00:00Z',
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
      },
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      transition: mockTransition,
    });
  });

  it('renders a closed pause and an open pause correctly', async () => {
    vi.mocked(usePauses).mockReturnValue({
      pauses: [closedPause, openPause],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    renderWithI18n(<PausesPanel dsrId="dsr-1" />);

    await waitFor(() => expect(screen.getByText(/Pauses/i)).toBeInTheDocument());

    // Closed pause
    expect(screen.getByText('Scope clarification')).toBeInTheDocument();
    expect(screen.getByText('Need more info')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();

    // Open pause
    expect(screen.getByText('Identity verification')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();

    // Hint message when open pause exists
    expect(screen.getByText(/open pause exists/i)).toBeInTheDocument();

    // No pause button when an open pause already exists
    expect(
      screen.queryByRole('button', { name: /pause \(awaiting requester\)/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the Pause form when no open pause and status is IN_PROGRESS, and submits transition on submit', async () => {
    vi.mocked(usePauses).mockReturnValue({
      pauses: [closedPause],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    renderWithI18n(<PausesPanel dsrId="dsr-1" />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /pause \(awaiting requester\)/i }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /pause \(awaiting requester\)/i }));

    expect(screen.getByLabelText(/^reason$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause request/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /pause request/i }));

    await waitFor(() =>
      expect(mockTransition).toHaveBeenCalledWith('AWAITING_REQUESTER', {
        reason: 'IDENTITY_VERIFICATION',
        reasonDetails: undefined,
      }),
    );
  });

  it('renders empty state when there are no pauses', async () => {
    vi.mocked(usePauses).mockReturnValue({
      pauses: [],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    renderWithI18n(<PausesPanel dsrId="dsr-1" />);
    await waitFor(() => expect(screen.getByText(/No pauses recorded/i)).toBeInTheDocument());
  });
});
