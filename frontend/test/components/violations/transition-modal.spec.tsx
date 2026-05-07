import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { TransitionModal } from '@/components/violations/transition-modal';

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

describe('<TransitionModal>', () => {
  it('renders DISMISSED form with reason textarea', () => {
    renderWithI18n(
      <TransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="DISMISSED"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByText(/(Reçue|Received).*(Écartée|Dismissed)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dismissal reason/i)).toBeInTheDocument();
  });

  it('renders NOTIFIED_CNIL form with phase + channel selects', () => {
    renderWithI18n(
      <TransitionModal
        open
        onClose={() => {}}
        current="NOTIFICATION_PENDING"
        target="NOTIFIED_CNIL"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByLabelText(/phase/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/channel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delay justification/i)).toBeInTheDocument();
  });

  it('submits the entered payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <TransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="DISMISSED"
        onSubmit={onSubmit}
      />,
    );
    const reason = 'Not a personal data breach';
    await userEvent.type(screen.getByLabelText(/dismissal reason/i), reason);
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onSubmit).toHaveBeenCalledWith('DISMISSED', { dismissalReason: reason });
  });

  it('shows error message when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Validation failed: dismissalReason'));
    renderWithI18n(
      <TransitionModal
        open
        onClose={() => {}}
        current="RECEIVED"
        target="DISMISSED"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/dismissal reason/i), 'long enough text');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(await screen.findByText(/Validation failed/i)).toBeInTheDocument();
  });
});
