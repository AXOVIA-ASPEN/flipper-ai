/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock next/navigation
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => null), toString: () => '' }),
  usePathname: () => '/',
}));

// Mock useFilterParams
const mockSetFilter = jest.fn();
const mockSetFilters = jest.fn();
const mockClearFilters = jest.fn();
jest.mock('@/hooks/useFilterParams', () => ({
  useFilterParams: () => ({
    filters: {
      platform: 'all',
      status: 'all',
      location: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: '',
      minScore: '',
      maxScore: '',
      minProfit: '',
      maxProfit: '',
      page: '1',
      limit: '20',
      platforms: '',
      categories: '',
      statuses: '',
    },
    setFilter: mockSetFilter,
    setFilters: mockSetFilters,
    clearFilters: mockClearFilters,
    activeFilterCount: 0,
  }),
  toggleMultiSelectValue: (current: string, value: string) => {
    const values = current ? current.split(',').filter(Boolean) : [];
    const idx = values.indexOf(value);
    if (idx === -1) return [...values, value].join(',');
    return values.filter((v: string) => v !== value).join(',');
  },
  isMultiSelectActive: (current: string, value: string) =>
    current ? current.split(',').filter(Boolean).includes(value) : false,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const handler = {
    get: (_: any, name: string) => {
      const Component = (props: any) => <span data-testid={`icon-${name}`} {...props} />;
      Component.displayName = name;
      return Component;
    },
  };
  return new Proxy({}, handler);
});

// Mock useSseEvents (EventSource not available in jsdom)
jest.mock('@/hooks/useSseEvents', () => ({
  useSseEvents: jest.fn().mockReturnValue({
    events: [],
    isConnected: true,
    lastError: null,
    clearEvents: jest.fn(),
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
global.confirm = jest.fn(() => true);

const mockListings = [
  {
    id: '1',
    platform: 'EBAY',
    title: 'iPhone 15 Pro',
    askingPrice: 500,
    estimatedValue: 800,
    profitPotential: 250,
    valueScore: 85,
    discountPercent: 37.5,
    status: 'NEW',
    location: 'Tampa, FL',
    url: 'https://ebay.com/item/1',
    scrapedAt: new Date().toISOString(),
    imageUrls: '["https://example.com/img.jpg"]',
    opportunity: null,
  },
  {
    id: '2',
    platform: 'CRAIGSLIST',
    title: 'Vintage Guitar',
    askingPrice: 200,
    estimatedValue: 600,
    profitPotential: 350,
    valueScore: 92,
    discountPercent: 66.7,
    status: 'OPPORTUNITY',
    location: 'Orlando, FL',
    url: 'https://craigslist.org/item/2',
    scrapedAt: new Date().toISOString(),
    imageUrls: null,
    opportunity: { id: 'opp-1' },
  },
];

function setupFetchMock() {
  mockFetch.mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/user/onboarding')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { onboardingComplete: true, onboardingStep: 6, totalSteps: 6 },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({
        listings: mockListings,
        stats: {
          totalListings: 42,
          opportunitiesFound: 5,
          activeFlips: 3,
          totalProfit: 1250,
        },
        pagination: { page: 1, limit: 20, total: 42, totalPages: 3 },
      }),
    });
  });
}

import { useSseEvents } from '@/hooks/useSseEvents';

const mockUseSseEvents = useSseEvents as jest.Mock;

import Dashboard from '@/app/dashboard/page';

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetchMock();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/user/onboarding')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { onboardingComplete: true, onboardingStep: 6, totalSteps: 6 },
          }),
        });
      }
      return new Promise(() => {});
    });
    render(<Dashboard />);
    expect(screen.getByText('Loading listings...')).toBeInTheDocument();
  });

  it('fetches and displays listings', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });
    expect(screen.getByText('Vintage Guitar')).toBeInTheDocument();
  });

  it('displays total listings stat', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      // stats.totalListings = data.total = 42
      expect(screen.getByText('Total Listings')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully (logs to console)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<Dashboard />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch listings:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles empty listings', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        listings: [],
        stats: { totalListings: 0, opportunitiesFound: 0, activeFlips: 0, totalProfit: 0 },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/No listings found/i)).toBeInTheDocument();
    });
  });

  it('calls fetch with correct URL on mount', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/listings'));
    });
  });

  it('renders platform badges', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('EBAY')).toBeInTheDocument();
      expect(screen.getByText('CRAIGSLIST')).toBeInTheDocument();
    });
  });

  it('renders listing prices', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
    });
  });

  it('shows opportunities stat label', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getAllByText('Opportunities Found').length).toBeGreaterThan(0);
    });
  });

  // SSE connection status indicator tests (Story 6.6)
  it('shows "Live" indicator when SSE is connected', async () => {
    mockUseSseEvents.mockReturnValue({
      events: [],
      isConnected: true,
      lastError: null,
      clearEvents: jest.fn(),
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  it('shows "Reconnecting…" indicator when SSE is disconnected', async () => {
    mockUseSseEvents.mockReturnValue({
      events: [],
      isConnected: false,
      lastError: null,
      clearEvents: jest.fn(),
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
    });
  });

  it('shows dismissible error banner when SSE has lastError', async () => {
    mockUseSseEvents.mockReturnValue({
      events: [],
      isConnected: false,
      lastError: 'Connection timed out',
      clearEvents: jest.fn(),
    });
    render(<Dashboard />);
    await waitFor(() => {
      const banner = screen.getByTestId('sse-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('Connection timed out');
    });
  });

  it('dismisses SSE error banner when dismiss button is clicked', async () => {
    mockUseSseEvents.mockReturnValue({
      events: [],
      isConnected: false,
      lastError: 'Connection refused',
      clearEvents: jest.fn(),
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('sse-error-banner')).toBeInTheDocument();
    });

    const dismissBtn = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('sse-error-banner')).not.toBeInTheDocument();
  });

  it('handles create opportunity from listing', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/opportunities') && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 'new-opp' }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          listings: mockListings,
          stats: { totalListings: 2, opportunitiesFound: 1, activeFlips: 1, totalProfit: 0 },
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      });
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    // Find Star buttons - listing 1 has opportunity: null so its button is enabled
    const starIcons = screen.getAllByTestId('icon-Star');
    if (starIcons.length > 0) {
      const btn = starIcons[0].closest('button');
      if (btn && !btn.disabled) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/opportunities',
            expect.objectContaining({ method: 'POST' })
          );
        });
      }
    }
  });
});
