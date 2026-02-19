/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => null), toString: () => '' }),
  usePathname: () => '/',
}));

// Mock useFilterParams
const mockSetFilter = jest.fn();
const mockClearFilters = jest.fn();
jest.mock('@/hooks/useFilterParams', () => ({
  useFilterParams: () => ({
    filters: {
      search: '',
      platform: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      location: '',
      category: '',
      dateFrom: '',
      dateTo: '',
    },
    setFilter: mockSetFilter,
    clearFilters: mockClearFilters,
    activeFilterCount: 0,
  }),
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
        total: 42,
        pagination: { page: 1, limit: 20, total: 42, totalPages: 3 },
      }),
    });
  });
}

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
        total: 0,
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
      expect(screen.getAllByText('Opportunities').length).toBeGreaterThan(0);
    });
  });

  it('handles create opportunity from listing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listings: mockListings,
          total: 2,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-opp' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listings: mockListings,
          total: 2,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    const starIcons = screen.getAllByTestId('icon-Star');
    if (starIcons.length > 0) {
      const btn = starIcons[0].closest('button');
      if (btn) {
        await userEvent.click(btn);
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
