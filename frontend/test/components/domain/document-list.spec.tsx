import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/context';
import { DocumentList } from '@/components/domain/document-list';
import { Role } from '@article30/shared';
import type { DocumentDto, UserDto } from '@article30/shared';

// DocumentList behaviour under test (mirrors src/components/domain/document-list.tsx):
// - On mount calls getMe() AND api.get('/documents?entity=…&entityId=…').
// - Shows a spinner while loading, then either the empty-state or a <li> per document.
// - Upload button is only visible when the loaded user's role is in WRITE_ROLES
// (ADMIN / DPO / EDITOR). AUDITOR and PROCESS_OWNER never see it.
// - Upload itself bypasses the `api` client and calls `fetch` directly on
// `${NEXT_PUBLIC_API_URL || DEFAULT_API_URL}/api/documents/upload` with FormData,
// `credentials: 'include'`, and a manually-built `X-XSRF-TOKEN` header read from
// the `XSRF-TOKEN` cookie. On success the component re-fetches the list.
// - Delete: window.confirm() → api.delete(`/documents/:id`) → local state filter.
// - Download: window.open('/api/documents/:id/download', '_blank', 'noopener') - same-origin, no JSON round-trip.

const { apiMock, authMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  authMock: {
    getMe: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: apiMock };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return { ...actual, ...authMock };
});

function makeUser(role: Role, overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 'u-1',
    firstName: 'Alice',
    lastName: 'Test',
    email: 'alice@example.com',
    role,
    approved: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDoc(overrides: Partial<DocumentDto> = {}): DocumentDto {
  return {
    id: 'doc-1',
    filename: 'policy.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    s3Key: 'uploads/policy.pdf',
    linkedEntity: 'TREATMENT' as DocumentDto['linkedEntity'],
    linkedEntityId: 'tr-1',
    uploadedBy: 'u-1',
    uploadedAt: '2026-03-15T10:00:00.000Z',
    uploader: { id: 'u-1', firstName: 'Alice', lastName: 'Test' },
    ...overrides,
  };
}

function renderList(linkedEntity = 'TREATMENT', linkedEntityId = 'tr-1') {
  return render(
    <I18nProvider>
      <DocumentList linkedEntity={linkedEntity} linkedEntityId={linkedEntityId} />
    </I18nProvider>,
  );
}

const fetchSpy = vi.fn();

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.patch.mockReset();
  apiMock.put.mockReset();
  apiMock.delete.mockReset();
  authMock.getMe.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();

  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
  // CSRF token lives in a cookie; the upload path reads it synchronously.
  document.cookie = 'XSRF-TOKEN=test-csrf-token';

  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'open').mockImplementation(() => null);

  // Safe defaults — each test overrides as needed.
  authMock.getMe.mockResolvedValue(makeUser(Role.DPO));
  apiMock.get.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DocumentList', () => {
  it('shows a loading spinner then renders the seeded document after fetch resolves', async () => {
    const doc = makeDoc({ id: 'doc-seed', filename: 'contract.pdf' });
    apiMock.get.mockResolvedValueOnce([doc]);

    const { container } = renderList();

    // Spinner is a div with animate-spin (no accessible name); we just check it exists.
    expect(container.querySelector('.animate-spin')).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    });
    expect(container.querySelector('.animate-spin')).toBeNull();

    expect(apiMock.get).toHaveBeenCalledWith('/documents?entity=TREATMENT&entityId=tr-1');
    expect(authMock.getMe).toHaveBeenCalledTimes(1);
  });

  it('renders the empty-state message when the API returns no documents', async () => {
    apiMock.get.mockResolvedValueOnce([]);

    renderList();

    // fr translation for `documents.noDocuments`.
    expect(await screen.findByText('Aucun document attaché')).toBeInTheDocument();
  });

  it('shows the upload button for a DPO user (WRITE_ROLES includes DPO)', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([]);

    renderList();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Téléverser|Upload/i })).toBeInTheDocument();
    });
  });

  it('hides the upload button for an AUDITOR user (NOT in WRITE_ROLES)', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.AUDITOR));
    apiMock.get.mockResolvedValueOnce([makeDoc()]);

    renderList();

    // Wait for the list itself to paint so we know the loading phase is finished.
    await screen.findByText('policy.pdf');

    expect(screen.queryByRole('button', { name: /Téléverser|Upload/i })).not.toBeInTheDocument();
  });

  it('POSTs the selected file to /api/documents/upload with FormData and CSRF header', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([]);

    const { container } = renderList();
    // Wait until the upload button is mounted (implies getMe resolved).
    await screen.findByRole('button', { name: /Téléverser|Upload/i });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-doc', filename: 'new.pdf' }),
    } as Response);
    // The refresh fetch after a successful upload (2nd api.get call).
    apiMock.get.mockResolvedValueOnce([makeDoc({ id: 'new-doc', filename: 'new.pdf' })]);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const file = new File(['hello'], 'new.pdf', { type: 'application/pdf' });

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/documents\/upload$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect((fd.get('file') as File).name).toBe('new.pdf');
    expect(fd.get('linkedEntity')).toBe('TREATMENT');
    expect(fd.get('linkedEntityId')).toBe('tr-1');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
  });

  it('appends the newly uploaded document to the list after a successful upload', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    // Initial list: empty.
    apiMock.get.mockResolvedValueOnce([]);

    const { container } = renderList();
    await screen.findByRole('button', { name: /Téléverser|Upload/i });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-doc' }),
    } as Response);
    // The refetch after upload returns the new document.
    apiMock.get.mockResolvedValueOnce([makeDoc({ id: 'new-doc', filename: 'invoice.pdf' })]);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, new File(['x'], 'invoice.pdf', { type: 'application/pdf' }));

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it('calls toast.error when the upload request fails', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([]);

    const { container } = renderList();
    await screen.findByRole('button', { name: /Téléverser|Upload/i });

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      statusText: 'Payload too large',
      json: async () => ({ message: 'File exceeds 10MB' }),
    } as Response);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, new File(['x'], 'huge.pdf', { type: 'application/pdf' }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('File exceeds 10MB');
    });
    // On failure the documents list stays untouched (still empty state).
    expect(screen.getByText('Aucun document attaché')).toBeInTheDocument();
  });

  it('deletes a document when the user confirms: calls api.delete and removes the row', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([
      makeDoc({ id: 'doc-A', filename: 'A.pdf' }),
      makeDoc({ id: 'doc-B', filename: 'B.pdf' }),
    ]);
    apiMock.delete.mockResolvedValueOnce(undefined);

    renderList();
    await screen.findByText('A.pdf');

    vi.mocked(window.confirm).mockReturnValue(true);

    // First "Supprimer" button is on row A (ordered by the mocked response).
    const deleteButtons = screen.getAllByRole('button', { name: /Supprimer|Delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(apiMock.delete).toHaveBeenCalledWith('/documents/doc-A');
    });
    await waitFor(() => {
      expect(screen.queryByText('A.pdf')).not.toBeInTheDocument();
    });
    expect(screen.getByText('B.pdf')).toBeInTheDocument();
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it('does not call api.delete when the user cancels the confirm dialog', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([makeDoc({ id: 'doc-A', filename: 'A.pdf' })]);

    renderList();
    await screen.findByText('A.pdf');

    vi.mocked(window.confirm).mockReturnValue(false);

    const deleteButton = screen.getByRole('button', { name: /Supprimer|Delete/i });
    await userEvent.click(deleteButton);

    expect(apiMock.delete).not.toHaveBeenCalled();
    // Row is still present.
    expect(screen.getByText('A.pdf')).toBeInTheDocument();
  });

  it('opens the same-origin download URL in a new tab when Download is clicked', async () => {
    authMock.getMe.mockResolvedValueOnce(makeUser(Role.DPO));
    apiMock.get.mockResolvedValueOnce([makeDoc({ id: 'doc-X', filename: 'X.pdf' })]);

    renderList();
    await screen.findByText('X.pdf');

    const downloadButton = screen.getByRole('button', { name: /Télécharger|Download/i });
    await userEvent.click(downloadButton);

    // No JSON round-trip; we open the same-origin streaming endpoint directly.
    expect(apiMock.get).toHaveBeenCalledTimes(1); // only the initial list fetch
    expect(apiMock.get).not.toHaveBeenCalledWith('/documents/doc-X/download');
    expect(window.open).toHaveBeenCalledWith('/api/documents/doc-X/download', '_blank', 'noopener');
  });

  it('threads linkedEntity and linkedEntityId into the initial list query string', async () => {
    apiMock.get.mockResolvedValueOnce([]);
    renderList('VIOLATION', 'v-42');

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith('/documents?entity=VIOLATION&entityId=v-42');
    });
  });
});
