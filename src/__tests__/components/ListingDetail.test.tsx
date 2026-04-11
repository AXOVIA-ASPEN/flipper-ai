/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockUseParams = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

// Mock lucide-react
jest.mock('lucide-react', () => {
  const handler = {
    get: (_: unknown, name: string) => {
      const Component = (props: Record<string, unknown>) => (
        <span data-testid={`icon-${name}`} {...props} />
      );
      Component.displayName = name;
      return Component;
    },
  };
  return new Proxy({}, handler);
});

// Mock image helpers
jest.mock('@/lib/image-helpers', () => ({
  getListingImageUrl: jest.fn(() => null),
  getAllListingImageUrls: jest.fn(() => []),
}));

// Mock the toast hook so the page can call useToast() outside of a real
// ToastProvider in tests. The page wires toast feedback into its
// PriceCalculator onListPlatform handler (Story 9.2 review fix M4).
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockListing = {
  id: 'listing-123',
  platform: 'EBAY',
  title: 'iPhone 15 Pro',
  description: 'Excellent condition, barely used',
  askingPrice: 500,
  estimatedValue: 800,
  profitPotential: 250,
  valueScore: 85,
  discountPercent: 37.5,
  trueDiscountPercent: null,
  status: 'OPPORTUNITY',
  location: 'Tampa, FL',
  url: 'https://ebay.com/item/123',
  scrapedAt: new Date().toISOString(),
  imageUrls: null,
  images: [],
  verifiedMarketValue: null,
  demandLevel: 'rising',
  identifiedBrand: 'Apple',
  identifiedModel: 'iPhone 15 Pro',
  identifiedCondition: 'Excellent',
  comparableSalesJson: null,
  resaleStrategy: 'List on eBay within 7 days for maximum return',
  opportunity: null,
};

import ListingDetailPage from '@/app/listings/[id]/page';

describe('ListingDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'listing-123' });
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<ListingDetailPage />);
    expect(screen.getByText('Loading listing...')).toBeInTheDocument();
  });

  it('fetches from the correct API endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/listings/listing-123');
    });
  });

  it('displays listing title, platform, and status after load', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    // Use heading role to distinguish title from identifiedModel in AI section
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'iPhone 15 Pro' })).toBeInTheDocument();
    });
    expect(screen.getByText('EBAY')).toBeInTheDocument();
    expect(screen.getByText('OPPORTUNITY')).toBeInTheDocument();
  });

  it('displays asking price', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('$500')).toBeInTheDocument();
    });
  });

  it('renders Back to Dashboard link', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      const backLinks = screen.getAllByText('Back to Dashboard');
      expect(backLinks.length).toBeGreaterThan(0);
      expect(backLinks[0].closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  it('renders View on Marketplace external link', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/View on Marketplace/i)).toBeInTheDocument();
    });
  });

  it('renders AI analysis section with brand, model, condition', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('AI Analysis')).toBeInTheDocument();
    });
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('List on eBay within 7 days for maximum return')).toBeInTheDocument();
  });

  it('renders listing description', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: mockListing }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Excellent condition, barely used')).toBeInTheDocument();
    });
  });

  it('renders comparable sales when comparableSalesJson is set', async () => {
    const listingWithSales = {
      ...mockListing,
      comparableSalesJson: JSON.stringify([
        { title: 'Similar iPhone 15 Pro', price: 750 },
        { title: 'iPhone 15 Pro 256GB', price: 700 },
      ]),
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: listingWithSales }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Comparable Sales')).toBeInTheDocument();
    });
    expect(screen.getByText('Similar iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('$750')).toBeInTheDocument();
  });

  it('renders opportunity section with link when listing has an opportunity', async () => {
    const listingWithOpp = {
      ...mockListing,
      opportunity: {
        id: 'opp-1',
        status: 'IDENTIFIED',
        purchasePrice: null,
        resalePrice: null,
        actualProfit: null,
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: listingWithOpp }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Opportunity Status')).toBeInTheDocument();
    });
    expect(screen.getByText('IDENTIFIED')).toBeInTheDocument();
    expect(screen.getByText('View Opportunities →')).toBeInTheDocument();
  });

  it('shows error message when API returns error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { detail: 'Listing not found' } }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Listing not found')).toBeInTheDocument();
    });
  });

  it('shows Back to Dashboard link in error state', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { detail: 'Not found' } }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      const backLinks = screen.getAllByText('Back to Dashboard');
      expect(backLinks.length).toBeGreaterThan(0);
    });
  });

  it('handles network error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch listing:',
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it('does not fetch when id is undefined', () => {
    mockUseParams.mockReturnValue({ id: undefined });
    render(<ListingDetailPage />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips AI analysis section when no AI data present', async () => {
    const listingNoAI = {
      ...mockListing,
      identifiedBrand: null,
      identifiedModel: null,
      identifiedCondition: null,
      resaleStrategy: null,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: listingNoAI }),
    });
    render(<ListingDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });
    expect(screen.queryByText('AI Analysis')).not.toBeInTheDocument();
  });

  it('handles malformed comparableSalesJson gracefully', async () => {
    const listingBadJson = {
      ...mockListing,
      comparableSalesJson: 'not valid json{{{',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ listing: listingBadJson }),
    });
    render(<ListingDetailPage />);
    // Use heading role to distinguish title from identifiedModel in AI section
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'iPhone 15 Pro' })).toBeInTheDocument();
    });
    // Comparable Sales should NOT render with bad JSON
    expect(screen.queryByText('Comparable Sales')).not.toBeInTheDocument();
  });
});
