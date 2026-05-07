import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { TreatmentProcessingPanel } from '@/components/dsr/treatment-processing-panel';

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

// Silence the treatments-list fetch inside LinkTreatmentForm.
vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 }) },
}));

const mockUpsert = vi.fn().mockResolvedValue(undefined);
const mockLink = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/dsr/use-treatment-processing', () => ({
  useTreatmentProcessing: vi.fn(),
}));

import { useTreatmentProcessing } from '@/lib/dsr/use-treatment-processing';

const processingRow = {
  dsrId: 'dsr-1',
  treatmentId: 'treatment-1',
  organizationId: 'org-1',
  treatmentName: 'HR payroll processing',
  searchedAt: '2026-04-15T09:00:00Z',
  findingsSummary: 'Found 5 records matching the request',
  actionTaken: 'ACCESS_EXPORT' as const,
  actionTakenAt: '2026-04-15T10:00:00Z',
  vendorPropagationStatus: 'NOT_REQUIRED' as const,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-15T10:00:00Z',
};

describe('<TreatmentProcessingPanel>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders processing rows with correct data', async () => {
    vi.mocked(useTreatmentProcessing).mockReturnValue({
      processingLogs: [processingRow],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      upsert: mockUpsert,
      link: mockLink,
    });

    renderWithI18n(<TreatmentProcessingPanel dsrId="dsr-1" />);

    await waitFor(() => expect(screen.getByText('HR payroll processing')).toBeInTheDocument());

    expect(screen.getByText('Access / export')).toBeInTheDocument();
    expect(screen.getByText('Not required')).toBeInTheDocument();
    expect(screen.getByText(/Found 5 records matching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('clicks Edit, changes actionTaken, and submits upsert with the right payload', async () => {
    vi.mocked(useTreatmentProcessing).mockReturnValue({
      processingLogs: [processingRow],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      upsert: mockUpsert,
      link: mockLink,
    });

    renderWithI18n(<TreatmentProcessingPanel dsrId="dsr-1" />);

    await waitFor(() => screen.getByRole('button', { name: /edit/i }));

    // Click Edit to open inline form
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    // The action taken select should be visible
    const actionSelect = screen.getByLabelText(/action taken/i);
    expect(actionSelect).toBeInTheDocument();

    // Change actionTaken to DELETED
    await userEvent.selectOptions(actionSelect, 'DELETED');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith('treatment-1', {
        actionTaken: 'DELETED',
        vendorPropagationStatus: 'NOT_REQUIRED',
        findingsSummary: 'Found 5 records matching the request',
      }),
    );
  });

  it('renders empty state when there are no processing logs', async () => {
    vi.mocked(useTreatmentProcessing).mockReturnValue({
      processingLogs: [],
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      upsert: mockUpsert,
      link: mockLink,
    });

    renderWithI18n(<TreatmentProcessingPanel dsrId="dsr-1" />);
    await waitFor(() => expect(screen.getByText(/No treatments linked yet/i)).toBeInTheDocument());
  });
});
