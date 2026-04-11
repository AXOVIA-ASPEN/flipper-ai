/**
 * @jest-environment jsdom
 */
/**
 * @file src/__tests__/components/PostingQueueDashboard.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Tests for the Cross-Posts dashboard page.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PostingQueuePage from '@/app/posting-queue/page';

// Firebase auth: authenticated by default
jest.mock('@/hooks/useFirebaseAuth', () => ({
  useFirebaseAuth: jest.fn(() => ({
    user: { uid: 'firebase-1', email: 'u@example.com' },
    loading: false,
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/posting-queue',
}));

// Filter params hook — return a plain object so we can assert against it.
const setFilterSpy = jest.fn();
const setFiltersSpy = jest.fn();
jest.mock('@/hooks/useFilterParams', () => ({
  useFilterParams: () => ({
    filters: { status: 'all', platform: 'all', page: '1' },
    setFilter: setFilterSpy,
    setFilters: setFiltersSpy,
    clearFilters: jest.fn(),
    activeFilterCount: 0,
  }),
}));

const showToastSpy = jest.fn();
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({ showToast: showToastSpy }),
}));

// Stub next/link so no router required
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

describe('PostingQueuePage (Cross-Posts dashboard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockFetchOnce(itemsPayload: unknown, statsPayload: unknown) {
    global.fetch = jest
      .fn()
      // items
      .mockResolvedValueOnce({
        ok: true,
        json: async () => itemsPayload,
      })
      // stats
      .mockResolvedValueOnce({
        ok: true,
        json: async () => statsPayload,
      }) as unknown as typeof fetch;
  }

  it('renders loading skeleton on first paint', async () => {
    global.fetch = jest.fn(
      () => new Promise(() => {}) // never resolves
    ) as unknown as typeof fetch;

    render(<PostingQueuePage />);

    await waitFor(() => {
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });

  it('renders empty state when no items exist', async () => {
    mockFetchOnce(
      { items: [], total: 0, limit: 50, offset: 0 },
      { pending: 0, inProgress: 0, posted: 0, failed: 0, total: 0 }
    );

    render(<PostingQueuePage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No cross-posts yet/i)
    ).toBeInTheDocument();
  });

  it('renders stats cards and item list when loaded', async () => {
    mockFetchOnce(
      {
        items: [
          {
            id: 'q1',
            listingId: 'l1',
            targetPlatform: 'EBAY',
            status: 'PENDING',
            askingPrice: 50,
            title: null,
            externalPostId: null,
            externalPostUrl: null,
            errorMessage: null,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            postedAt: null,
            listing: {
              id: 'l1',
              title: 'Test Listing',
              platform: 'CRAIGSLIST',
              askingPrice: 50,
              imageUrls: null,
            },
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
      { pending: 1, inProgress: 0, posted: 0, failed: 0, total: 1 }
    );

    render(<PostingQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Listing')).toBeInTheDocument();
    });
    expect(screen.getByTestId('stat-pending')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-total')).toHaveTextContent('1');
  });

  it('renders error banner when the fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    render(<PostingQueuePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load cross-posts/i)
      ).toBeInTheDocument();
    });
  });

  it('disables the Process Queue button when no PENDING items exist', async () => {
    mockFetchOnce(
      { items: [], total: 0, limit: 50, offset: 0 },
      { pending: 0, inProgress: 0, posted: 2, failed: 0, total: 2 }
    );

    render(<PostingQueuePage />);

    await waitFor(() => {
      const btn = screen.getByTestId('process-queue-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  it('updates filter via setFilters when status dropdown changes', async () => {
    mockFetchOnce(
      { items: [], total: 0, limit: 50, offset: 0 },
      { pending: 0, inProgress: 0, posted: 0, failed: 0, total: 0 }
    );

    render(<PostingQueuePage />);

    await waitFor(() => {
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('status-filter'), {
      target: { value: 'FAILED' },
    });

    expect(setFiltersSpy).toHaveBeenCalledWith({
      status: 'FAILED',
      page: '1',
    });
  });
});
