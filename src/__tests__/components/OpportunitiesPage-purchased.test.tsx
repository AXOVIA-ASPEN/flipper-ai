/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 days ago',
}));

// Mock KanbanBoard
jest.mock('@/components/KanbanBoard', () => {
  return function MockKanbanBoard() {
    return <div data-testid="kanban-board" />;
  };
});

const mockFetch = jest.fn();
global.fetch = mockFetch;
global.confirm = jest.fn(() => true);

const baseListing = {
  id: 'lst-1',
  title: 'Sony WH-1000XM5 Headphones',
  platform: 'CRAIGSLIST',
  askingPrice: 150,
  estimatedValue: 300,
  estimatedLow: 250,
  estimatedHigh: 350,
  profitPotential: 120,
  url: 'https://craigslist.org/item/1',
  imageUrls: '["https://example.com/img.jpg"]',
  location: 'Austin, TX',
  sellabilityScore: 80,
  valueScore: 88,
  discountPercent: 50,
  condition: 'Like New',
  description: 'Barely used headphones',
  sellerName: 'John',
  sellerContact: 'john@example.com',
  comparableUrls: null,
  priceReasoning: 'Great deal below market',
  notes: null,
  shippable: true,
  negotiable: true,
  tags: '["electronics","audio"]',
  requestToBuy: 'Hi, is this still available?',
  category: 'Electronics',
  postedAt: '2026-02-10T12:00:00Z',
  identifiedBrand: 'Sony',
  identifiedModel: 'WH-1000XM5',
  identifiedVariant: null,
  identifiedCondition: 'Like New',
  verifiedMarketValue: 280,
  marketDataSource: 'eBay',
  marketDataDate: '2026-02-12T00:00:00Z',
  comparableSalesJson: null,
  sellabilityScore2: null,
  demandLevel: 'High',
  expectedDaysToSell: 7,
  authenticityRisk: 'Low',
  recommendedOffer: 130,
  recommendedList: 270,
  resaleStrategy: 'List on eBay with free shipping',
  trueDiscountPercent: 46,
  llmAnalyzed: true,
  analysisDate: '2026-02-12T00:00:00Z',
  analysisConfidence: 'High',
  analysisReasoning: 'Strong demand, below market price',
};

function makePurchasedOpp(overrides: any = {}) {
  return {
    id: 'opp-purchased-1',
    listingId: 'lst-1',
    status: 'PURCHASED',
    purchasePrice: 140,
    purchaseDate: '2026-02-11T10:00:00Z',
    resalePrice: null,
    resalePlatform: null,
    resaleUrl: null,
    resaleDate: null,
    actualProfit: null,
    fees: null,
    notes: 'Picked up from seller',
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-02-11T10:00:00Z',
    listing: { ...baseListing },
    ...overrides,
  };
}

function makeSoldOpp() {
  return {
    id: 'opp-sold-1',
    listingId: 'lst-2',
    status: 'SOLD',
    purchasePrice: 140,
    purchaseDate: '2026-02-11T10:00:00Z',
    resalePrice: 270,
    resalePlatform: 'eBay',
    resaleUrl: 'https://ebay.com/sold/1',
    resaleDate: '2026-02-14T15:00:00Z',
    actualProfit: 115,
    fees: 15,
    notes: 'Sold quickly',
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-02-14T15:00:00Z',
    listing: { ...baseListing, id: 'lst-2', title: 'AirPods Pro 2' },
  };
}

const mockStats = { totalOpportunities: 2, totalProfit: 115, totalInvested: 280, totalRevenue: 270 };

import OpportunitiesPage from '@/app/opportunities/page';

describe('OpportunitiesPage - Purchased Items Tracking (E5-F2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupFetch(opps: any[] = [makePurchasedOpp()], stats = mockStats) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ opportunities: opps, stats }),
    });
  }

  it('displays purchased item with PURCHASED status badge', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
      expect(screen.getByText('PURCHASED')).toBeInTheDocument();
    });
  });

  it('shows purchase price in opportunity details', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Purchase Price')).toBeInTheDocument();
      expect(screen.getByText('$140.00')).toBeInTheDocument();
    });
  });

  it('shows opportunity notes', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Picked up from seller')).toBeInTheDocument();
    });
  });

  it('shows estimated value for purchased items', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('$300')).toBeInTheDocument(); // estimatedValue
    });
  });

  it('shows profit potential for purchased items', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('$120')).toBeInTheDocument(); // profitPotential
    });
  });

  it('filters by PURCHASED status when button clicked', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    const purchasedBtn = screen.getByRole('button', { name: /Purchased/i });
    await user.click(purchasedBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('status=PURCHASED'));
    });
  });

  it('shows sold item with actual profit', async () => {
    setupFetch([makeSoldOpp()]);
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('AirPods Pro 2')).toBeInTheDocument();
      expect(screen.getByText('SOLD')).toBeInTheDocument();
      expect(screen.getByText('$115.00')).toBeInTheDocument(); // actualProfit
    });
  });

  it('shows resale price for sold items', async () => {
    setupFetch([makeSoldOpp()]);
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Resale Price')).toBeInTheDocument();
      expect(screen.getByText('$270.00')).toBeInTheDocument();
    });
  });

  it('shows fees for sold items', async () => {
    setupFetch([makeSoldOpp()]);
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Fees')).toBeInTheDocument();
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });
  });

  it('displays stats cards with investment totals', async () => {
    setupFetch([makePurchasedOpp(), makeSoldOpp()]);
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Invested')).toBeInTheDocument();
      expect(screen.getByText('Total Profit')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Opportunities')).toBeInTheDocument();
    });
  });

  it('allows editing a purchased opportunity', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    await user.click(editBtn);

    // Should show edit form
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('saves edited purchase price', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Edit/i }));
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Click save
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ opportunities: [makePurchasedOpp()], stats: mockStats }),
    });

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opportunities/opp-purchased-1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('can delete a purchased opportunity', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ opportunities: [], stats: { totalOpportunities: 0, totalProfit: 0, totalInvested: 0, totalRevenue: 0 } }),
    });

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opportunities/opp-purchased-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('shows platform filter in advanced filters', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    // Open advanced filters
    await user.click(screen.getByRole('button', { name: /More Filters/i }));
    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Value Score Range')).toBeInTheDocument();
      expect(screen.getByText(/Profit Range/i)).toBeInTheDocument();
    });
  });

  it('shows market insights for analyzed items', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('market-insights')).toBeInTheDocument();
    });
  });

  it('shows recommendation details', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('recommendation-details')).toBeInTheDocument();
    });
  });

  it('shows listing description', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Barely used headphones')).toBeInTheDocument();
    });
  });

  it('shows seller details', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('shows request-to-buy message with copy button', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Hi, is this still available?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
    });
  });

  it('shows tags for items', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText(/#electronics/)).toBeInTheDocument();
      expect(screen.getByText(/#audio/)).toBeInTheDocument();
    });
  });

  it('switches to kanban view', async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    });

    // Click kanban view button (LayoutGrid icon)
    const kanbanBtn = screen.getByTitle('Kanban view');
    await user.click(kanbanBtn);
    await waitFor(() => {
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });
  });

  it('shows image when available', async () => {
    setupFetch();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Sony WH-1000XM5 Headphones' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    });
  });

  it('shows placeholder when no image', async () => {
    setupFetch([makePurchasedOpp({ listing: { ...baseListing, imageUrls: null } })]);
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Sony WH-1000XM5 Headphones' })).not.toBeInTheDocument();
    });
  });

  it('searches opportunities by title', async () => {
    setupFetch([makePurchasedOpp(), makeSoldOpp()]);
    const user = userEvent.setup();
    render(<OpportunitiesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
      expect(screen.getByText('AirPods Pro 2')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search opportunities...');
    await user.type(searchInput, 'AirPods');

    await waitFor(() => {
      expect(screen.queryByText('Sony WH-1000XM5 Headphones')).not.toBeInTheDocument();
      expect(screen.getByText('AirPods Pro 2')).toBeInTheDocument();
    });
  });
});
