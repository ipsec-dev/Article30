import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResetUrlDialog } from '@/components/admin/reset-url-dialog';

const baseProps = {
  url: 'https://app.example.com/auth/reset?token=abc',
  expiresInMinutes: 30,
  title: 'Reset link generated',
  description: 'Share this URL with the user. It is valid for a short time.',
  copyLabel: 'Copy URL',
  closeLabel: 'Close',
  expiresNoteTemplate: 'Expires in {minutes} minutes.',
};

describe('<ResetUrlDialog />', () => {
  it('renders title, description, URL and the templated expiration note', () => {
    render(<ResetUrlDialog open={true} onOpenChange={() => {}} {...baseProps} />);
    expect(screen.getByText('Reset link generated')).toBeInTheDocument();
    expect(screen.getByText(baseProps.description)).toBeInTheDocument();
    expect(screen.getByText(baseProps.url)).toBeInTheDocument();
    expect(screen.getByText('Expires in 30 minutes.')).toBeInTheDocument();
  });

  it('renders nothing when open is false', () => {
    render(<ResetUrlDialog open={false} onOpenChange={() => {}} {...baseProps} />);
    expect(screen.queryByText('Reset link generated')).not.toBeInTheDocument();
  });

  it('writes the URL to the clipboard when Copy is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<ResetUrlDialog open={true} onOpenChange={() => {}} {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }));
    expect(writeText).toHaveBeenCalledWith(baseProps.url);
  });
});
