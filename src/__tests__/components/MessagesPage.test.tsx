/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Firebase auth hook
let mockFirebaseUser: any = { uid: 'test-user', email: 'test@test.com' };
let mockAuthLoading = false;
jest.mock('@/hooks/useFirebaseAuth', () => ({
  useFirebaseAuth: () => ({
    user: mockFirebaseUser,
    loading: mockAuthLoading,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children);
});

// Mock date-fns (avoid flaky relative times)
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import MessagesPage from '@/app/messages/page';

const sampleThreads = [
  {
    listingId: 'listing-1',
    listing: {
      id: 'listing-1',
      title: 'iPhone 15',
      platform: 'CRAIGSLIST',
      askingPrice: 500,
      imageUrls: null,
    },
    lastMessage: {
      body: 'Is this still available?',
      direction: 'INBOUND',
      status: 'DELIVERED',
      createdAt: '2026-02-15T10:00:00Z',
    },
    sellerName: 'John Doe',
    messageCount: 3,
    unreadCount: 1,
    lastMessageAt: '2026-02-15T10:00:00Z',
  },
  {
    listingId: 'listing-2',
    listing: {
      id: 'listing-2',
      title: 'MacBook Air',
      platform: 'EBAY',
      askingPrice: 900,
      imageUrls: null,
    },
    lastMessage: {
      body: 'Thanks for your interest!',
      direction: 'OUTBOUND',
      status: 'SENT',
      createdAt: '2026-02-14T10:00:00Z',
    },
    sellerName: 'Jane Smith',
    messageCount: 2,
    unreadCount: 0,
    lastMessageAt: '2026-02-14T10:00:00Z',
  },
];

function setupFetch(threads = sampleThreads, total = 2) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: threads,
        pagination: { total, limit: 20, offset: 0, hasMore: false },
      }),
  });
}

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseUser = { uid: 'test-user', email: 'test@test.com' };
    mockAuthLoading = false;
    setupFetch();
  });

  it('renders the messages page with header', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });

  it('displays thread items after loading', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });
  });

  it('shows last message preview in threads', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Is this still available?')).toBeInTheDocument();
    });
  });

  it('shows seller name in threads', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows conversation count', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText(/2 conversations/)).toBeInTheDocument();
    });
  });

  it('shows unread count indicator', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('(1 unread)')).toBeInTheDocument();
    });
  });

  it('shows tabs: All, Inbox, Sent', async () => {
    render(<MessagesPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('filters threads by inbox tab (client-side)', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('iPhone 15'));
    await user.click(screen.getByText('Inbox'));
    // Inbox tab filters to threads where lastMessage.direction is INBOUND
    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.queryByText('MacBook Air')).not.toBeInTheDocument();
    });
  });

  it('filters threads by sent tab (client-side)', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('MacBook Air'));
    await user.click(screen.getByText('Sent'));
    // Sent tab filters to threads where lastMessage.direction is OUTBOUND
    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
      expect(screen.queryByText('iPhone 15')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no threads', async () => {
    setupFetch([], 0);
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  it('shows loading skeletons', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<MessagesPage />);
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('redirects to login when unauthenticated', () => {
    mockFirebaseUser = null;
    mockAuthLoading = false;
    render(<MessagesPage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows loading spinner during auth check', () => {
    mockAuthLoading = true;
    render(<MessagesPage />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has back to dashboard link', async () => {
    render(<MessagesPage />);
    const link = screen.getByText(/Back to Dashboard/);
    expect(link).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(<MessagesPage />);
    expect(
      screen.getByPlaceholderText('Search by listing title or seller name...')
    ).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load message threads/)).toBeInTheDocument();
    });
  });

  it('shows platform badge on thread items', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('CRAIGSLIST')).toBeInTheDocument();
      expect(screen.getByText('EBAY')).toBeInTheDocument();
    });
  });

  it('shows message count per thread', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('3 msgs')).toBeInTheDocument();
      expect(screen.getByText('2 msgs')).toBeInTheDocument();
    });
  });

  it('fetches from threads endpoint', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/api/messages/threads');
    });
  });
});
