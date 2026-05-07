import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Topbar } from '@/components/layout/topbar';

describe('<Topbar />', () => {
  it('renders the title as an h1', () => {
    render(<Topbar title="Tableau de bord" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeInTheDocument();
  });

  it('renders breadcrumb segments separated by /', () => {
    render(<Topbar title="Traitement" breadcrumb={['Article30', 'Registre']} />);
    expect(screen.getByText('Article30')).toBeInTheDocument();
    expect(screen.getByText('Registre')).toBeInTheDocument();
    // breadcrumb is rendered (there is at least one slash separator)
    expect(screen.getAllByText('/').length).toBeGreaterThanOrEqual(1);
  });

  it('omits the breadcrumb wrapper when none provided', () => {
    render(<Topbar title="x" />);
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('renders the menu button only when onMenu is provided', () => {
    const { rerender } = render(<Topbar title="x" />);
    expect(screen.queryByLabelText('Ouvrir le menu')).not.toBeInTheDocument();
    rerender(<Topbar title="x" onMenu={() => {}} />);
    expect(screen.getByLabelText('Ouvrir le menu')).toBeInTheDocument();
  });

  it('invokes onMenu when the menu button is clicked', async () => {
    const onMenu = vi.fn();
    render(<Topbar title="x" onMenu={onMenu} />);
    await userEvent.click(screen.getByLabelText('Ouvrir le menu'));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('renders children in the actions slot', () => {
    render(
      <Topbar title="x">
        <button type="button">Action</button>
      </Topbar>,
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
