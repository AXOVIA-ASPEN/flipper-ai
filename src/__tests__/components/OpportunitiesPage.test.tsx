/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock lucide-react
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

const mockFetch = jest.fn();
global.fetch = mockFetch;
global.confirm = jest.fn(() => true);

const mockOpportunities = [
  {
    id: 'opp-1',
    listingId: 'lst-1',
    status: 'NEW',
    purchasePrice: null,
    sellingPrice: null,
    actualProfit: null,
    notes: 'Great deal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    listing: {
      id: 'lst-1',
      title: 'MacBook Pro M3',
      platform: 'EBAY',
      askingPrice: 1200,
      estimatedValue: 2000,
      profitPotential: 650,
      url: 'https://ebay.com/item/1',
      imageUrls: null,
      location: 'Tampa, FL',
      sellabilityScore: 85,
      valueScore: 90,
      discountPercent: 40,
    },
  },
];

const mockStats = { totalOpportunities: 1, totalProfit: 0, totalInvested: 0, totalRevenue: 0 };

function setupFetch() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ opportunities: mockOpportunities, stats: mockStats }),
  });
}

import OpportunitiesPage from '@/app/opportunities/page';

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetch();
  });

  it('renders loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<OpportunitiesPage />);
    expect(screen.getByText(/Loading opportunities/i)).toBeInTheDocument();
  });

  it('fetches and displays opportunities', async () => {
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('MacBook Pro M3')).toBeInTheDocument();
    });
  });

  it('handles fetch error (logs to console)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch opportunities:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles empty opportunities', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        opportunities: [],
        stats: { totalOpportunities: 0, totalProfit: 0, totalInvested: 0, totalRevenue: 0 },
      }),
    });
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No opportunities found/i)).toBeInTheDocument();
    });
  });

  it('calls API on mount', async () => {
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/opportunities');
    });
  });

  it('displays profit potential', async () => {
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText(/\$650/)).toBeInTheDocument();
    });
  });
});
