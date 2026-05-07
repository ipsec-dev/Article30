import { I18nProvider } from '@/i18n/context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionItemsPanel } from '@/components/violations/action-items-panel';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      {
        id: 'a1',
        violationId: 'v1',
        title: 'Patch the auth bug',
        description: null,
        ownerId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        deadline: '2026-05-01T00:00:00Z',
        doneAt: null,
        doneBy: null,
        status: 'PENDING',
        createdAt: '2026-04-26T00:00:00Z',
        updatedAt: '2026-04-26T00:00:00Z',
      },
    ]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

import { api } from '@/lib/api/client';

describe('<ActionItemsPanel>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders existing items and changes status', async () => {
    render(
      <I18nProvider>
        <ActionItemsPanel violationId="v1" />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Patch the auth bug')).toBeInTheDocument());
    await userEvent.selectOptions(
      screen.getByLabelText(/status for Patch the auth bug/i),
      'IN_PROGRESS',
    );
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledWith('/violations/v1/action-items/a1', {
      status: 'IN_PROGRESS',
    });
  });
});
