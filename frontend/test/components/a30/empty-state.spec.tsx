import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/a30/empty-state';

describe('<EmptyState />', () => {
  it('renders title and body', () => {
    render(<EmptyState title="Aucun élément" body="Créez votre premier traitement." />);
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
    expect(screen.getByText('Créez votre premier traitement.')).toBeInTheDocument();
  });

  it('renders the action node when provided', () => {
    render(<EmptyState title="x" body="y" action={<button type="button">Démarrer</button>} />);
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeInTheDocument();
  });

  it('omits the action area when no action is provided', () => {
    render(<EmptyState title="x" body="y" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts a ReactNode body for richer content', () => {
    render(<EmptyState title="x" body={<span data-testid="custom-body">rich</span>} />);
    expect(screen.getByTestId('custom-body')).toBeInTheDocument();
  });
});
