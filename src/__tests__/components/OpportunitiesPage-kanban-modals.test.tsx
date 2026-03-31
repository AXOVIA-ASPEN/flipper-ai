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
      const Component = ({ children, ...props }: any) => (
        <span data-testid={`icon-${name}`} {...props}>
          {children}
        </span>
      );
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

// Mock FilterPanel (added to page in epic-3 refactor)
jest.mock('@/components/FilterPanel', () => {
  return function MockFilterPanel() {
    return <div data-testid="filter-panel" />;
  };
});

// Mock next/navigation (required by useFilterParams hook)
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/opportunities',
}));

// Shared mock reference for setFilter
const mockSetFilter = jest.fn();

// Mock useFilterParams to avoid router context in tests
jest.mock('@/hooks/useFilterParams', () => ({
  useFilterParams: () => ({
    filters: {
      status: 'all',
      location: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: '',
      platform: 'all',
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
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
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

// Capture onStatusChange so tests can trigger it programmatically
let capturedOnStatusChange: ((id: string, newStatus: string) => Promise<void>) | null = null;

jest.mock('@/components/KanbanBoard', () => {
  return function MockKanbanBoard({ onStatusChange }: any) {
    capturedOnStatusChange = onStatusChange;
    return <div data-testid="kanban-board" />;
  };
});

import OpportunitiesPage from '@/app/opportunities/page';

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
  imageUrls: null,
  location: 'Austin, TX',
  sellabilityScore: 80,
  valueScore: 88,
  discountPercent: 50,
  condition: 'Like New',
  description: 'Barely used headphones',
  sellerName: 'John',
  sellerContact: null,
  comparableUrls: null,
  priceReasoning: 'Great deal',
  notes: null,
  shippable: true,
  negotiable: false,
  tags: null,
  requestToBuy: null,
  category: 'Electronics',
  postedAt: null,
  identifiedBrand: 'Sony',
  identifiedModel: 'WH-1000XM5',
  identifiedVariant: null,
  identifiedCondition: null,
  verifiedMarketValue: null,
  marketDataSource: null,
  marketDataDate: null,
  comparableSalesJson: null,
  demandLevel: null,
  expectedDaysToSell: null,
  authenticityRisk: null,
  recommendedOffer: null,
  recommendedList: null,
  resaleStrategy: null,
  trueDiscountPercent: null,
  llmAnalyzed: null,
  analysisDate: null,
  analysisConfidence: null,
  analysisReasoning: null,
  compMatchConfidence: null,
  soldVolume30Days: null,
  soldVolume60Days: null,
  soldVolume90Days: null,
  completenessLabel: null,
  sellerRating: null,
  sellerReviewCount: null,
  sizeCategory: null,
  estimatedShippingCost: null,
  pickupDistanceMiles: null,
  outsidePickupRadius: null,
  adjustedProfitMargin: null,
};

const baseOpportunity = {
  id: 'opp-1',
  listingId: 'lst-1',
  status: 'IDENTIFIED',
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resalePlatform: null,
  resaleUrl: null,
  resaleDate: null,
  actualProfit: null,
  fees: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  listing: baseListing,
};

const purchasedOpportunity = {
  ...baseOpportunity,
  id: 'opp-2',
  status: 'PURCHASED',
  purchasePrice: 120,
  purchaseDate: new Date().toISOString(),
};

const mockStats = { totalOpportunities: 1, totalProfit: 0, totalInvested: 0, totalRevenue: 0 };

function setupFetch(opps: any[] = [baseOpportunity]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ opportunities: opps, stats: mockStats }),
  });
}

async function renderAndSwitchToKanban(opps: any[] = [baseOpportunity]) {
  setupFetch(opps);
  render(<OpportunitiesPage />);

  // Wait for data to load and switch to kanban view
  await waitFor(() => expect(screen.getByTitle('Kanban view')).toBeInTheDocument());
  await userEvent.click(screen.getByTitle('Kanban view'));
  await waitFor(() => expect(screen.getByTestId('kanban-board')).toBeInTheDocument());
  // After KanbanBoard renders, capturedOnStatusChange is populated
}

describe('OpportunitiesPage – Kanban lifecycle modals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnStatusChange = null;
  });

  it('opens PURCHASED modal when dragged to PURCHASED column', async () => {
    await renderAndSwitchToKanban();

    await capturedOnStatusChange!('opp-1', 'PURCHASED');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as purchased/i })).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/purchase price/i)).toBeInTheDocument();
  });

  it('PURCHASED confirm button is disabled when price is empty', async () => {
    await renderAndSwitchToKanban();
    await capturedOnStatusChange!('opp-1', 'PURCHASED');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as purchased/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('PURCHASED modal submits correct PATCH payload', async () => {
    await renderAndSwitchToKanban();
    await capturedOnStatusChange!('opp-1', 'PURCHASED');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as purchased/i })).toBeInTheDocument()
    );
    await userEvent.type(screen.getByLabelText(/purchase price/i), '125');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-1') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('PURCHASED');
      expect(body.purchasePrice).toBe(125);
      expect(body.purchaseDate).toBeDefined();
    });
  });

  it('PURCHASED modal cancel closes modal without PATCH', async () => {
    await renderAndSwitchToKanban();
    const fetchCountBefore = mockFetch.mock.calls.length;

    await capturedOnStatusChange!('opp-1', 'PURCHASED');
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as purchased/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patchCalls = mockFetch.mock.calls
      .slice(fetchCountBefore)
      .filter(([, opts]: [string, any]) => opts?.method === 'PATCH');
    expect(patchCalls.length).toBe(0);
  });

  it('opens LISTED modal when dragged to LISTED column', async () => {
    await renderAndSwitchToKanban();
    await capturedOnStatusChange!('opp-1', 'LISTED');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as listed/i })).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/resale url/i)).toBeInTheDocument();
  });

  it('LISTED modal submits correct PATCH payload', async () => {
    await renderAndSwitchToKanban();
    await capturedOnStatusChange!('opp-1', 'LISTED');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as listed/i })).toBeInTheDocument()
    );
    await userEvent.type(screen.getByLabelText(/resale url/i), 'https://ebay.com/item/123');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-1') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('LISTED');
      expect(body.resaleUrl).toBe('https://ebay.com/item/123');
    });
  });

  it('opens SOLD modal when dragged to SOLD column', async () => {
    await renderAndSwitchToKanban([purchasedOpportunity]);
    await capturedOnStatusChange!('opp-2', 'SOLD');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/sale price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fees/i)).toBeInTheDocument();
  });

  it('SOLD modal submits correct PATCH payload including purchasePrice for profit calculation', async () => {
    await renderAndSwitchToKanban([purchasedOpportunity]);
    await capturedOnStatusChange!('opp-2', 'SOLD');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );
    await userEvent.type(screen.getByLabelText(/sale price/i), '250');
    await userEvent.type(screen.getByLabelText(/fees/i), '30');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-2') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('SOLD');
      expect(body.resalePrice).toBe(250);
      expect(body.fees).toBe(30);
      expect(body.purchasePrice).toBe(120); // forwarded so server can calculate actualProfit
      expect(body.resaleDate).toBeDefined();
    });
  });

  it('PASSED drag calls PATCH directly without opening a modal', async () => {
    await renderAndSwitchToKanban();
    const fetchCountBefore = mockFetch.mock.calls.length;

    await capturedOnStatusChange!('opp-1', 'PASSED');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls
        .slice(fetchCountBefore)
        .filter(([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-1') && opts?.method === 'PATCH'
        );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('PASSED');
    });
  });

  it('CONTACTED drag calls PATCH directly without modal', async () => {
    await renderAndSwitchToKanban();
    const fetchCountBefore = mockFetch.mock.calls.length;

    await capturedOnStatusChange!('opp-1', 'CONTACTED');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls
        .slice(fetchCountBefore)
        .filter(([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-1') && opts?.method === 'PATCH'
        );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('CONTACTED');
    });
  });

  it('LISTED modal cancel closes modal without PATCH', async () => {
    await renderAndSwitchToKanban();
    const fetchCountBefore = mockFetch.mock.calls.length;

    await capturedOnStatusChange!('opp-1', 'LISTED');
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as listed/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patchCalls = mockFetch.mock.calls
      .slice(fetchCountBefore)
      .filter(([, opts]: [string, any]) => opts?.method === 'PATCH');
    expect(patchCalls.length).toBe(0);
  });

  it('SOLD modal cancel closes modal without PATCH', async () => {
    await renderAndSwitchToKanban([purchasedOpportunity]);
    const fetchCountBefore = mockFetch.mock.calls.length;

    await capturedOnStatusChange!('opp-2', 'SOLD');
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patchCalls = mockFetch.mock.calls
      .slice(fetchCountBefore)
      .filter(([, opts]: [string, any]) => opts?.method === 'PATCH');
    expect(patchCalls.length).toBe(0);
  });

  it('SOLD confirm button is disabled when sale price is empty', async () => {
    await renderAndSwitchToKanban([purchasedOpportunity]);
    await capturedOnStatusChange!('opp-2', 'SOLD');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('SOLD modal submits without fees when fees field is left empty', async () => {
    await renderAndSwitchToKanban([purchasedOpportunity]);
    await capturedOnStatusChange!('opp-2', 'SOLD');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );
    await userEvent.type(screen.getByLabelText(/sale price/i), '200');
    // Leave fees empty — verifies if (modalFees) false branch
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-2') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('SOLD');
      expect(body.resalePrice).toBe(200);
      expect(body.fees).toBeUndefined();
    });
  });

  it('SOLD modal omits purchasePrice when opportunity has no prior purchasePrice', async () => {
    // baseOpportunity has purchasePrice: null — verifies if (opp?.purchasePrice != null) false branch
    await renderAndSwitchToKanban([baseOpportunity]);
    await capturedOnStatusChange!('opp-1', 'SOLD');

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /mark as sold/i })).toBeInTheDocument()
    );
    await userEvent.type(screen.getByLabelText(/sale price/i), '180');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, any]) =>
          url.includes('/api/opportunities/opp-1') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.status).toBe('SOLD');
      expect(body.resalePrice).toBe(180);
      expect(body.purchasePrice).toBeUndefined();
    });
  });
});
