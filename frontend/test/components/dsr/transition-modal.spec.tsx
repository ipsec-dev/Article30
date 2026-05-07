import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { DsrTransitionModal } from '@/components/dsr/transition-modal';

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

const CONFIRM_RE = /Confirmer|Confirm/i;

describe('<DsrTransitionModal>', () => {
  it('renders the modal title with current and target states', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="ACKNOWLEDGED"
        onSubmit={async () => {}}
      />,
    );
    expect(
      screen.getByText(/(Reçue|Received).*(Accusée de réception|Acknowledged)/i),
    ).toBeInTheDocument();
  });

  it('renders REJECTED form with rejectionReason select and rejectionDetails textarea', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="REJECTED"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rejection details/i)).toBeInTheDocument();
  });

  it('renders AWAITING_REQUESTER form with reason select and optional reasonDetails', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="ACKNOWLEDGED"
        target="AWAITING_REQUESTER"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/^reason$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason details/i)).toBeInTheDocument();
  });

  it('renders RESPONDED form with responseNotes textarea', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="IN_PROGRESS"
        target="RESPONDED"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/response notes/i)).toBeInTheDocument();
  });

  it('renders PARTIALLY_FULFILLED form with partialFulfilmentNotes textarea', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="IN_PROGRESS"
        target="PARTIALLY_FULFILLED"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/partial fulfilment notes/i)).toBeInTheDocument();
  });

  it('renders WITHDRAWN form with optional withdrawnReason textarea', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="IN_PROGRESS"
        target="WITHDRAWN"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/withdrawn reason/i)).toBeInTheDocument();
  });

  it('renders no extra fields for empty-payload targets like ACKNOWLEDGED', () => {
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="ACKNOWLEDGED"
        onSubmit={async () => {}}
      />,
    );
    // Should have Confirm button but no input fields
    expect(screen.getByRole('button', { name: CONFIRM_RE })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('submits the entered REJECTED payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="REJECTED"
        onSubmit={onSubmit}
      />,
    );
    // Select the rejection reason (fires onChange to set payload value)
    await userEvent.selectOptions(screen.getByLabelText(/rejection reason/i), 'EXCESSIVE');
    // Fill rejectionDetails
    await userEvent.type(
      screen.getByLabelText(/rejection details/i),
      'This request is clearly excessive in scope',
    );
    await userEvent.click(screen.getByRole('button', { name: CONFIRM_RE }));
    expect(onSubmit).toHaveBeenCalledWith(
      'REJECTED',
      expect.objectContaining({
        rejectionReason: 'EXCESSIVE',
        rejectionDetails: 'This request is clearly excessive in scope',
      }),
    );
  });

  it('shows error message when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Validation failed'));
    renderWithI18n(
      <DsrTransitionModal
        open
        onClose={() => {}}
        current="IN_PROGRESS"
        target="RESPONDED"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/response notes/i), 'Response text');
    await userEvent.click(screen.getByRole('button', { name: CONFIRM_RE }));
    expect(await screen.findByText(/Validation failed/i)).toBeInTheDocument();
  });
});
