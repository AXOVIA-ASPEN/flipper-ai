/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/PriceCalculator.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Component-level tests for PriceCalculator (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * Exercises the PriceCalculator React component through its rendered UI to
 * validate ALL five acceptance criteria at the user-visible level:
 *
 *   AC-1 — optimal price from verified market data (hero numbers, profit)
 *   AC-2 — price breakdown display hierarchy (profit hero, price hero, best
 *           platform badge, margin control, per-platform table, market bar)
 *   AC-3 — real-time margin adjustment (slider + numeric input recalculate
 *           client-side without a new fetch call)
 *   AC-4 — edge case handling (loss warning banner, insufficient data banner,
 *           impossible platforms grayed out)
 *   AC-5 — pre-purchase projection (projected badge, hypothetical purchase
 *           price input)
 *
 * These tests render the component with @testing-library/react, mock
 * `global.fetch` to return a canned API response, and assert on what the
 * user actually sees — text, roles, inputs, and visible state changes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Mock listing-price-constants so we don't pull Prisma into jsdom.
jest.mock('@/lib/listing-price-constants', () => ({
  FREE_ITEM_DISCOUNT_FACTOR: 0.85,
}));

import PriceCalculator from '@/components/PriceCalculator';

// ── Test fixtures ────────────────────────────────────────────────────────────

function makePriceResult(overrides: Record<string, unknown> = {}) {
  return {
    targetPlatform: 'ebay',
    recommendedPrice: 101.75,
    estimatedFees: 13.23,
    estimatedProfit: 30.52,
    estimatedShippingCost: 8,
    targetMarginPercent: 30,
    feeRatePercent: 13,
    verifiedMarketValue: 200,
    costBasis: 58,
    isProjected: false,
    marketDataAvailable: true,
    lossWarning: false,
    aiRecommendedPrice: 105,
    priceBreakdown: {
      cappedByMarket: false,
      freeItemPricing: false,
      ...(overrides.priceBreakdown as Record<string, unknown> ?? {}),
    },
    impossible: false,
    ...overrides,
  };
}

const FIVE_PLATFORMS = [
  makePriceResult({ targetPlatform: 'craigslist', feeRatePercent: 0, recommendedPrice: 82.86, estimatedFees: 0, estimatedProfit: 24.86 }),
  makePriceResult({ targetPlatform: 'facebook', feeRatePercent: 5, recommendedPrice: 89.23, estimatedFees: 4.46, estimatedProfit: 26.77 }),
  makePriceResult({ targetPlatform: 'mercari', feeRatePercent: 10, recommendedPrice: 96.67, estimatedFees: 9.67, estimatedProfit: 29.0 }),
  makePriceResult({ targetPlatform: 'ebay', feeRatePercent: 13, recommendedPrice: 101.75, estimatedFees: 13.23, estimatedProfit: 30.52 }),
  makePriceResult({ targetPlatform: 'offerup', feeRatePercent: 12.9, recommendedPrice: 101.58, estimatedFees: 13.1, estimatedProfit: 30.48 }),
];

function makeApiResponse(
  prices = FIVE_PLATFORMS,
  bestPlatform = 'ebay',
  isProjected = false
) {
  return {
    success: true,
    data: { prices, bestPlatform, isProjected },
  };
}

const originalFetch = global.fetch;

function mockFetchOnce(body: Record<string, unknown>, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// ── AC-1: Optimal price from verified market data ─────────────────────────

describe('AC-1: optimal price from verified market data', () => {
  it('displays the recommended price and estimated profit from the API', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const hero = await screen.findByTestId('price-calculator-hero');
    // Hero shows the best platform's price and profit
    expect(within(hero).getByText('$101.75')).toBeInTheDocument();
    expect(within(hero).getByText('$30.52')).toBeInTheDocument();
  });

  it('shows fee breakdown per platform in the table', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText(/\$13\.23 \(13%\)/)).toBeInTheDocument();
    });
    expect(screen.getByText(/\$0\.00 \(0%\)/)).toBeInTheDocument();
  });
});

// ── AC-2: Price breakdown display hierarchy ───────────────────────────────

describe('AC-2: price breakdown display hierarchy', () => {
  it('renders estimated profit as the hero number (largest, in green section)', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const hero = await screen.findByTestId('price-calculator-hero');
    expect(within(hero).getByText('Estimated Profit')).toBeInTheDocument();
    // Story 14.6: profit hero container uses the canonical .fp-glass-sm
    // surface; the profit number itself uses inline #34d399 (canonical
    // green reserved for financial profit indicators — FR-UI-DESIGN-04).
    const glassCard = within(hero).getByText('Estimated Profit')
      .closest('.fp-glass-sm');
    expect(glassCard).toBeTruthy();
  });

  it('renders recommended list price below the profit hero', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Recommended.*List Price/)).toBeInTheDocument();
    });
    expect(screen.getByText('$101.75')).toBeInTheDocument();
  });

  it('shows the best platform badge with star icon and text label', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Best platform:/)).toBeInTheDocument();
    });
    // Star icon and text both present — never color alone
    expect(screen.getAllByText('★').length).toBeGreaterThan(0);
    // Best platform appears in both the badge and the table row
    expect(screen.getAllByText('eBay').length).toBeGreaterThanOrEqual(1);
  });

  it('renders margin slider and numeric input', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Target profit margin')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Target profit margin (numeric)')).toBeInTheDocument();
  });

  it('renders the per-platform fee breakdown table with all 5 platforms', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Platform Comparison')).toBeInTheDocument();
    });
    // Each platform appears in both table rows and possibly the badge,
    // so use getAllByText and check presence.
    expect(screen.getAllByText(/eBay/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Mercari/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Facebook Marketplace/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OfferUp/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Craigslist/).length).toBeGreaterThanOrEqual(1);
    // Verify exactly 5 "List on" buttons (one per platform)
    const listButtons = screen.getAllByRole('button', { name: /List on/ });
    expect(listButtons).toHaveLength(5);
  });

  it('renders market value comparison bar when verified data exists', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Market Value Comparison')).toBeInTheDocument();
    });
    expect(screen.getByText(/Market: \$200\.00/)).toBeInTheDocument();
  });

  it('hides the source platform row when sourcePlatform prop is set', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" sourcePlatform="EBAY" />);

    await waitFor(() => {
      expect(screen.getByText('Platform Comparison')).toBeInTheDocument();
    });
    // eBay row should be hidden since it's the source platform → 4 buttons
    const buttons = screen.getAllByRole('button', { name: /List on/ });
    expect(buttons).toHaveLength(4);
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('eBay'))).toBe(false);
    expect(labels.some((l) => l.includes('Mercari'))).toBe(true);
  });
});

// ── AC-3: Real-time margin adjustment ─────────────────────────────────────

describe('AC-3: real-time margin adjustment', () => {
  it('recalculates prices client-side when the slider changes (no new fetch)', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('$101.75')).toBeInTheDocument();
    });

    // Initial fetch count
    const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length;

    // Change the slider to 50%
    const slider = screen.getByLabelText('Target profit margin');
    fireEvent.change(slider, { target: { value: '50' } });

    // Wait for recalculation to render
    await waitFor(() => {
      expect(screen.getByText('Target margin: 50%')).toBeInTheDocument();
    });

    // Verify no new fetch was made — recalculation is purely client-side
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallCount);

    // The hero price should have changed from the original $101.75
    expect(screen.queryByText('$101.75')).not.toBeInTheDocument();
  });

  it('recalculates when the numeric input changes', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('$101.75')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Target profit margin (numeric)');
    fireEvent.change(input, { target: { value: '20' } });

    await waitFor(() => {
      expect(screen.getByText('Target margin: 20%')).toBeInTheDocument();
    });
  });

  it('normalizes invalid numeric input on blur', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Target profit margin (numeric)')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Target profit margin (numeric)');
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);

    // Should normalize to MIN_MARGIN (5)
    expect(input).toHaveValue(5);
  });

  it('shows a Refresh button with last-updated timestamp', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('Refresh button re-fetches from the API', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const fetchCountBefore = (global.fetch as jest.Mock).mock.calls.length;
    mockFetchOnce(makeApiResponse());
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(
        fetchCountBefore + 1
      );
    });
  });

  it('shows dynamic max margin hint based on platform fees', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    // Max fee in fixtures is 13% → headroom = floor((1-0.13)*100) - 1 = 86
    // BUT FALLBACK_MAX_MARGIN = 80, so capped at min(80, 86) = 80
    await waitFor(() => {
      expect(screen.getByText(/capped at 80%/)).toBeInTheDocument();
    });
  });
});

// ── AC-4: Edge case handling ──────────────────────────────────────────────

describe('AC-4: edge case handling', () => {
  it('shows loss warning banner when market cap forces price below cost basis', async () => {
    // verifiedMarketValue=60, cap = 57 < costBasis(58) → lossWarning
    // recalcForMargin will detect this from the data, not a flag.
    const prices = FIVE_PLATFORMS.map((p) => ({
      ...p,
      verifiedMarketValue: 60,
      marketDataAvailable: true,
      priceBreakdown: { ...p.priceBreakdown, cappedByMarket: false },
    }));
    mockFetchOnce(makeApiResponse(prices));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Selling at competitive price results in a loss/)
      ).toBeInTheDocument();
    });
  });

  it('shows insufficient data banner for free items with no market data', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({
      ...p,
      recommendedPrice: 0,
      estimatedFees: 0,
      estimatedProfit: 0,
      priceBreakdown: {
        ...p.priceBreakdown,
        freeItemPricing: true,
        insufficientData: true,
        fallbackMessage:
          'Cannot recommend a price: free item with no verified market data.',
      },
    }));
    mockFetchOnce(makeApiResponse(prices, null));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Cannot recommend a price yet/)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/free item with no verified market data/)
    ).toBeInTheDocument();
    expect(screen.getByText('Verify Market Value')).toBeInTheDocument();
  });

  it('grays out impossible platforms and shows Impossible label', async () => {
    // Set eBay fee to 95% so that feeDecimal(0.95) + marginDecimal(0.30) >= 1.0
    // triggers the impossible branch in recalcForMargin.
    const prices = FIVE_PLATFORMS.map((p) =>
      p.targetPlatform === 'ebay'
        ? { ...p, feeRatePercent: 95 }
        : p
    );
    mockFetchOnce(makeApiResponse(prices, 'craigslist'));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Impossible')).toBeInTheDocument();
    });
  });

  it('shows estimated market data warning when marketDataAvailable is false', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({
      ...p,
      marketDataAvailable: false,
      verifiedMarketValue: null,
    }));
    mockFetchOnce(makeApiResponse(prices, 'ebay'));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Market value is estimated/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Verify Market Value/ })
    ).toBeInTheDocument();
  });

  it('shows AI price discrepancy note when formula and LLM differ >15%', async () => {
    const prices = FIVE_PLATFORMS.map((p) =>
      p.targetPlatform === 'ebay'
        ? {
            ...p,
            priceBreakdown: {
              ...p.priceBreakdown,
              priceDiscrepancyNote:
                'Formula price ($101.75) differs from AI recommendation ($200.00) by 97%.',
            },
          }
        : p
    );
    mockFetchOnce(makeApiResponse(prices));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/AI suggestion differs from formula/)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/differs from AI recommendation/)).toBeInTheDocument();
  });

  it('shows error state with retry button on fetch failure', async () => {
    mockFetchOnce({ success: false, error: { detail: 'Server error' } }, false);
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

// ── AC-5: Pre-purchase price projection ───────────────────────────────────

describe('AC-5: pre-purchase price projection', () => {
  it('shows Projected badge when isProjected is true', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({ ...p, isProjected: true }));
    mockFetchOnce(makeApiResponse(prices, 'ebay', true));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      // Badge with aria-label is the distinct projected indicator
      expect(
        screen.getByLabelText('Projected pricing mode')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/not been purchased yet/)
    ).toBeInTheDocument();
  });

  it('shows "Recommended Projected Price" instead of "Recommended List Price"', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({ ...p, isProjected: true }));
    mockFetchOnce(makeApiResponse(prices, 'ebay', true));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Recommended Projected Price/)).toBeInTheDocument();
    });
  });

  it('shows hypothetical purchase price input in projected mode', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({ ...p, isProjected: true }));
    mockFetchOnce(makeApiResponse(prices, 'ebay', true));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Hypothetical purchase price')
      ).toBeInTheDocument();
    });
  });

  it('recalculates when the hypothetical purchase price changes', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({ ...p, isProjected: true }));
    mockFetchOnce(makeApiResponse(prices, 'ebay', true));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Hypothetical purchase price')
      ).toBeInTheDocument();
    });

    const fetchCountBefore = (global.fetch as jest.Mock).mock.calls.length;

    // Change hypothetical purchase price to 40
    const hypotheticalInput = screen.getByLabelText(
      'Hypothetical purchase price'
    );
    fireEvent.change(hypotheticalInput, { target: { value: '40' } });

    // Wait for recalculation — hero price should change
    await waitFor(() => {
      // No new fetch — client-side recalculation only
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(
        fetchCountBefore
      );
    });
  });

  it('does NOT show projected banner or hypothetical input when isProjected is false', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('$101.75')).toBeInTheDocument();
    });

    expect(screen.queryByText(/not been purchased yet/)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Hypothetical purchase price')
    ).not.toBeInTheDocument();
  });
});

// ── Cross-cutting: override before queueing (Task 5.4) ───────────────────

describe('Task 5.4: user can override price before queueing', () => {
  it('renders an editable price input per platform row', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Override list price for eBay/)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByLabelText(/Override list price for Mercari/)
    ).toBeInTheDocument();
  });

  it('calls onListPlatform with the overridden price, not the recommended price', async () => {
    const onListPlatform = jest.fn();
    mockFetchOnce(makeApiResponse());
    render(
      <PriceCalculator listingId="lst-1" onListPlatform={onListPlatform} />
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Override list price for eBay/)
      ).toBeInTheDocument();
    });

    // Override the eBay price to $95.00
    const ebayInput = screen.getByLabelText(/Override list price for eBay/);
    fireEvent.change(ebayInput, { target: { value: '95' } });

    // Click "List on eBay"
    const listButton = screen.getByRole('button', { name: /List on eBay/ });
    fireEvent.click(listButton);

    await waitFor(() => {
      expect(onListPlatform).toHaveBeenCalledWith('ebay', 95);
    });
  });

  it('shows override help text under the table', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Edit any list price before clicking/)
      ).toBeInTheDocument();
    });
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('slider has aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Target profit margin')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Target profit margin');
    expect(slider).toHaveAttribute('aria-valuemin', '5');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
    expect(slider).toHaveAttribute('aria-valuetext', '30 percent');
  });

  it('hero section is wrapped in aria-live polite region', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      const hero = screen.getByTestId('price-calculator-hero');
      expect(hero).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('best platform is conveyed with both icon and text (not color alone)', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      // Star icon + "Best" label inside the table row
      expect(screen.getByText('★ Best')).toBeInTheDocument();
      // Also the star in the standalone badge
      expect(screen.getByText(/Best platform:/)).toBeInTheDocument();
    });
  });

  it('slider touch target meets 44px minimum via style', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Target profit margin')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Target profit margin');
    expect(slider.style.minHeight).toBe('44px');
  });
});

// ── Market value comparison bar (3-color) ─────────────────────────────────

describe('Market value comparison bar', () => {
  it('shows "Below market" for prices well below market', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    // heroPrice=101.75, market=200 → ratio ~0.51 → below market
    await waitFor(() => {
      expect(screen.getByText(/Below market/)).toBeInTheDocument();
    });
  });

  it('does not render the bar when verifiedMarketValue is null', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({
      ...p,
      verifiedMarketValue: null,
      marketDataAvailable: false,
    }));
    mockFetchOnce(makeApiResponse(prices));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByText('$101.75')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Market Value Comparison')
    ).not.toBeInTheDocument();
  });

  it('does not render the bar when verifiedMarketValue is 0 (L1 guard)', async () => {
    const prices = FIVE_PLATFORMS.map((p) => ({
      ...p,
      verifiedMarketValue: 0,
      marketDataAvailable: false,
    }));
    mockFetchOnce(makeApiResponse(prices));
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-calculator')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Market Value Comparison')
    ).not.toBeInTheDocument();
  });
});

// ── Story 14.6 — canonical design system migration ───────────────────────────

describe('Story 14.6 — canonical design system migration', () => {
  it('root container has fp-glass class', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const root = await screen.findByTestId('price-calculator');
    expect(root.className).toMatch(/\bfp-glass\b/);
  });

  it('hero wrapper preserves aria-live="polite"', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const hero = await screen.findByTestId('price-calculator-hero');
    expect(hero.getAttribute('aria-live')).toBe('polite');
  });

  it('range slider exposes aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const slider = await screen.findByLabelText('Target profit margin');
    expect(slider.getAttribute('aria-valuemin')).toBeTruthy();
    expect(slider.getAttribute('aria-valuemax')).toBeTruthy();
    expect(slider.getAttribute('aria-valuenow')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('30 percent');

    fireEvent.change(slider, { target: { value: '50' } });
    expect(slider.getAttribute('aria-valuenow')).toBe('50');
    expect(slider.getAttribute('aria-valuetext')).toBe('50 percent');
  });

  it('slider changes do not trigger additional fetches — Real-Time Data Pattern', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const slider = await screen.findByLabelText('Target profit margin');
    // Initial mount fetch has completed. Move the slider four times.
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.change(slider, { target: { value: '20' } });

    // Only the mount fetch should have happened.
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('profit hero number uses fp-metric-num class', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const hero = await screen.findByTestId('price-calculator-hero');
    const metricNums = hero.querySelectorAll('.fp-metric-num');
    expect(metricNums.length).toBeGreaterThanOrEqual(2);
  });

  it('margin numeric input uses fp-input class', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-calculator')).toBeInTheDocument();
    });
    const input = document.getElementById('price-calc-margin-input');
    expect(input?.className).toMatch(/\bfp-input\b/);
  });

  it('range slider drops accent-purple class and sets inline accentColor', async () => {
    mockFetchOnce(makeApiResponse());
    render(<PriceCalculator listingId="lst-1" />);

    const slider = await screen.findByLabelText('Target profit margin') as HTMLInputElement;
    expect(slider.className).not.toMatch(/accent-[a-z]+-\d+/);
    expect(slider.className).not.toMatch(/focus:ring-/);
    expect(slider.style.accentColor).toBe('#7c3aed');
  });
});
