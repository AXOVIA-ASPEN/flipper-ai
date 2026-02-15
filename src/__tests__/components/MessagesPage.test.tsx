/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next-auth
const mockSession = { user: { id: 'test-user', email: 'test@test.com' } };
let mockAuthStatus = 'authenticated';
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: mockAuthStatus }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import MessagesPage from '@/app/messages/page';

const sampleMessages = [
  {
    id: 'msg-1',
    direction: 'INBOUND',
    status: 'DELIVERED',
    subject: 'About the iPhone',
    body: 'Is this still available?',
    sellerName: 'John Doe',
    sellerContact: null,
    platform: 'craigslist',
    parentId: null,
    sentAt: null,
    readAt: null,
    createdAt: '2026-02-15T10:00:00Z',
    listing: {
      id: 'l1',
      title: 'iPhone 15',
      platform: 'craigslist',
      askingPrice: 500,
      imageUrls: null,
    },
  },
  {
    id: 'msg-2',
    direction: 'OUTBOUND',
    status: 'SENT',
    subject: null,
    body: 'Yes, still available!',
    sellerName: null,
    sellerContact: null,
    platform: 'craigslist',
    parentId: 'msg-1',
    sentAt: '2026-02-15T11:00:00Z',
    readAt: null,
    createdAt: '2026-02-15T11:00:00Z',
    listing: null,
  },
];

function setupFetch(messages = sampleMessages, total = 2) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: messages,
        pagination: { total, limit: 20, offset: 0, hasMore: false },
      }),
  });
}

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStatus = 'authenticated';
    setupFetch();
  });

  it('renders the messages page with header', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });

  it('displays messages after loading', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Is this still available?')).toBeInTheDocument();
      expect(screen.getByText('Yes, still available!')).toBeInTheDocument();
    });
  });

  it('shows direction badges', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('↓ Received')).toBeInTheDocument();
      expect(screen.getByText('↑ Sent')).toBeInTheDocument();
    });
  });

  it('shows status badges', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('DELIVERED')).toBeInTheDocument();
      expect(screen.getByText('SENT')).toBeInTheDocument();
    });
  });

  it('shows listing reference', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Re: iPhone 15 ($500)')).toBeInTheDocument();
    });
  });

  it('shows seller name', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows total count', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('2 conversations total')).toBeInTheDocument();
    });
  });

  it('shows tabs: All, Inbox, Sent', async () => {
    render(<MessagesPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('filters by inbox tab', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Inbox'));
    await user.click(screen.getByText('Inbox'));
    await waitFor(() => {
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
      expect(url).toContain('direction=INBOUND');
    });
  });

  it('filters by outbox tab', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Sent'));
    await user.click(screen.getByText('Sent'));
    await waitFor(() => {
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
      expect(url).toContain('direction=OUTBOUND');
    });
  });

  it('shows empty state when no messages', async () => {
    setupFetch([], 0);
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  it('shows loading skeletons', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<MessagesPage />);
    // Loading state renders pulse divs
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('redirects to login when unauthenticated', () => {
    mockAuthStatus = 'unauthenticated';
    render(<MessagesPage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows loading spinner during auth check', () => {
    mockAuthStatus = 'loading';
    render(<MessagesPage />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has back to dashboard link', async () => {
    render(<MessagesPage />);
    expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
  });

  it('has sort controls', async () => {
    render(<MessagesPage />);
    expect(screen.getByText('Date ↓')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Seller')).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(<MessagesPage />);
    expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });
});
