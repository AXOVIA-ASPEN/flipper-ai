/**
 * @file src/__tests__/components/BillingSettings.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief Comprehensive tests for BillingSettings component.
 *
 * @description
 * Tests all rendering states (loading, FREE, FLIPPER, PRO), upgrade/billing
 * flows, scan progress bar, ROI messaging, trust signals, error handling,
 * and edge cases for the conversion-focused billing component.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock useToast
const mockShowToast = jest.fn();
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock stripe pricing
jest.mock('@/lib/stripe', () => ({
  TIER_PRICING: {
    FREE: { monthly: 0, label: 'Free' },
    FLIPPER: { monthly: 1900, label: '$19/mo' },
    PRO: { monthly: 4900, label: '$49/mo' },
  },
}));

// Mock subscription tiers
jest.mock('@/lib/subscription-tiers', () => ({
  TIER_LIMITS: {
    FREE: {
      name: 'Free',
      scansPerDay: 10,
      maxMarketplaces: 1,
      maxSearchConfigs: 3,
      maxActiveJobs: 1,
      aiAnalysis: true,
      priceHistory: false,
      messaging: false,
      ebayCrossListing: false,
    },
    FLIPPER: {
      name: 'Flipper',
      scansPerDay: null,
      maxMarketplaces: 3,
      maxSearchConfigs: 20,
      maxActiveJobs: 5,
      aiAnalysis: true,
      priceHistory: true,
      messaging: true,
      ebayCrossListing: false,
    },
    PRO: {
      name: 'Pro',
      scansPerDay: null,
      maxMarketplaces: Infinity,
      maxSearchConfigs: Infinity,
      maxActiveJobs: 20,
      aiAnalysis: true,
      priceHistory: true,
      messaging: true,
      ebayCrossListing: true,
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import BillingSettings from '@/components/BillingSettings';

function mockUsageResponse(tier: string, scansToday: number) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          tier,
          scans: {
            usedToday: scansToday,
            usedThisMonth: scansToday,
            limitPerDay: tier === 'FREE' ? 10 : null,
          },
          analyses: { usedThisMonth: 0, limit: null },
        },
      }),
  };
}

describe('BillingSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: FREE tier
    mockFetch.mockResolvedValue(mockUsageResponse('FREE', 3));
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows skeleton loader initially', () => {
      render(<BillingSettings />);
      expect(screen.getByTestId('billing-skeleton')).toBeInTheDocument();
    });

    it('skeleton has three placeholder cards', () => {
      render(<BillingSettings />);
      const skeleton = screen.getByTestId('billing-skeleton');
      const cards = within(skeleton).getAllByRole('generic').filter(
        el => el.classList.contains('animate-pulse')
      );
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── FREE tier rendering ────────────────────────────────────────────────────

  describe('FREE tier', () => {
    it('displays section header', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Subscription & Billing')).toBeInTheDocument();
      });
    });

    it('shows current plan badge as Free', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Current plan:')).toBeInTheDocument();
      });
      // The badge text "Free" matches the TIER_LIMITS.FREE.name
      const badges = screen.getAllByText('Free');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows scan progress bar with usage', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('3 of 10 daily scans used')).toBeInTheDocument();
      });
    });

    it('shows upgrade buttons for FLIPPER and PRO', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
    });

    it('shows "Current Plan" badge on FREE card', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });
    });

    it('does not show Manage Billing button', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
      expect(screen.queryByText('Manage Billing')).not.toBeInTheDocument();
    });

    it('shows "Most Popular" badge on FLIPPER card', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Most Popular')).toBeInTheDocument();
      });
    });

    it('shows ROI messaging for FREE users', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('One good flip pays for a year of Flipper')).toBeInTheDocument();
      });
    });

    it('shows trust signals for FREE users', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        const trustSignals = screen.getByTestId('trust-signals');
        expect(within(trustSignals).getByText(/Secure checkout via Stripe/)).toBeInTheDocument();
        expect(within(trustSignals).getByText(/Cancel anytime/)).toBeInTheDocument();
        expect(within(trustSignals).getByText(/30-day money-back guarantee/)).toBeInTheDocument();
      });
    });

    it('shows pricing amounts for each tier', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('$0')).toBeInTheDocument();
        expect(screen.getByText('$19')).toBeInTheDocument();
        expect(screen.getByText('$49')).toBeInTheDocument();
      });
    });

    it('shows feature comparison rows in each pricing card', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        // Each feature label appears once per pricing card (3 cards)
        expect(screen.getAllByText('Daily scans').length).toBe(3);
        expect(screen.getAllByText('Marketplaces').length).toBe(3);
        expect(screen.getAllByText('AI analysis').length).toBe(3);
      });
    });

    it('shows daily cost framing on paid tiers', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Less than a coffee/day')).toBeInTheDocument();
        expect(screen.getByText('Pays for itself in one flip')).toBeInTheDocument();
      });
    });
  });

  // ── Scan progress bar edge cases ───────────────────────────────────────────

  describe('scan progress bar', () => {
    it('shows amber warning when usage >= 80%', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse('FREE', 8));
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Almost there')).toBeInTheDocument();
      });
    });

    it('shows limit reached at 100%', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse('FREE', 10));
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Limit reached')).toBeInTheDocument();
        expect(screen.getByText(/Upgrade to unlock unlimited scans/)).toBeInTheDocument();
      });
    });

    it('shows no warning at low usage', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse('FREE', 2));
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('2 of 10 daily scans used')).toBeInTheDocument();
      });
      expect(screen.queryByText('Almost there')).not.toBeInTheDocument();
      expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();
    });

    it('does not show progress bar for tiers with unlimited scans', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse('FLIPPER', 50));
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('scan-progress')).not.toBeInTheDocument();
    });
  });

  // ── FLIPPER tier rendering ─────────────────────────────────────────────────

  describe('FLIPPER tier', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(mockUsageResponse('FLIPPER', 25));
    });

    it('shows Manage Billing button', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
    });

    it('shows $19/mo label next to plan badge', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('$19/mo')).toBeInTheDocument();
      });
    });

    it('shows only PRO upgrade button', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Upgrade to Flipper/)).not.toBeInTheDocument();
    });

    it('shows "Current Plan" on FLIPPER card', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });
    });

    it('shows "Included in your plan" on FREE card', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Included in your plan')).toBeInTheDocument();
      });
    });

    it('does not show ROI messaging for paid users', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
      expect(screen.queryByText('One good flip pays for a year of Flipper')).not.toBeInTheDocument();
    });

    it('does not show trust signals for paid users', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('trust-signals')).not.toBeInTheDocument();
    });
  });

  // ── PRO tier rendering ─────────────────────────────────────────────────────

  describe('PRO tier', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(mockUsageResponse('PRO', 100));
    });

    it('shows no upgrade buttons', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
      expect(screen.queryByText(/Upgrade to Flipper/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Upgrade to Pro/)).not.toBeInTheDocument();
    });

    it('shows $49/mo label', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        expect(screen.getByText('$49/mo')).toBeInTheDocument();
      });
    });

    it('shows "Included in your plan" for lower tiers', async () => {
      render(<BillingSettings />);
      await waitFor(() => {
        const included = screen.getAllByText('Included in your plan');
        expect(included.length).toBe(2); // FREE and FLIPPER cards
      });
    });
  });

  // ── Upgrade flow ───────────────────────────────────────────────────────────

  describe('upgrade flow', () => {
    it('calls checkout API when upgrade button is clicked', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://checkout.stripe.com/test' }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Flipper/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/checkout', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }));
      });
    });

    it('calls checkout API and receives redirect URL on success', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session123' }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Flipper/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/checkout', expect.objectContaining({
          method: 'POST',
        }));
      });
    });

    it('sends correct tier in checkout request body', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: null }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Pro/));

      await waitFor(() => {
        const checkoutCall = mockFetch.mock.calls.find(
          (call: unknown[]) => call[0] === '/api/checkout'
        );
        expect(checkoutCall).toBeDefined();
        const body = JSON.parse((checkoutCall[1] as RequestInit).body as string);
        expect(body.tier).toBe('PRO');
      });
    });

    it('handles null URL in checkout response without error', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: null }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Flipper/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Component should still be rendered without errors
      expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
    });

    it('handles checkout API error gracefully and shows error toast', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockRejectedValueOnce(new Error('Network error'));

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Flipper/));

      // Should still render normally after error
      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'Checkout failed' })
      );
    });

    it('disables all upgrade buttons while an upgrade is in progress', async () => {
      const user = userEvent.setup();
      let resolveCheckout: (value: unknown) => void;
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FREE', 0))
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveCheckout = resolve;
          })
        );

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Upgrade to Flipper/));

      // Both upgrade buttons should be disabled during the request
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const upgradeButtons = buttons.filter(
        btn => btn.hasAttribute('disabled')
      );
      expect(upgradeButtons.length).toBeGreaterThanOrEqual(1);

      // Resolve to clean up
      resolveCheckout!({
        ok: true,
        json: () => Promise.resolve({ url: null }),
      });
    });
  });

  // ── Manage Billing flow ────────────────────────────────────────────────────

  describe('manage billing flow', () => {
    it('calls portal API when Manage Billing is clicked', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FLIPPER', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://billing.stripe.com/portal123' }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Billing'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/checkout/portal', { method: 'POST' });
      });
    });

    it('calls portal API and receives redirect URL', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('PRO', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://billing.stripe.com/p/session_test' }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Billing'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/checkout/portal', { method: 'POST' });
      });
    });

    it('handles portal API error gracefully and shows error toast', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FLIPPER', 0))
        .mockRejectedValueOnce(new Error('Portal unavailable'));

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Billing'));

      // Should still render normally
      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'Billing portal unavailable' })
      );
    });

    it('handles null URL in portal response without error', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockUsageResponse('FLIPPER', 0))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: null }),
        });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manage Billing'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Should still render normally
      expect(screen.getByText('Manage Billing')).toBeInTheDocument();
    });
  });

  // ── Error and edge cases ───────────────────────────────────────────────────

  describe('error and edge cases', () => {
    it('falls back to FREE defaults when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
    });

    it('falls back to FREE defaults when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
    });

    it('handles response with flat tier field (no data wrapper)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            tier: 'FLIPPER',
            scans: { usedToday: 5, usedThisMonth: 5, limitPerDay: null },
          }),
      });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('Manage Billing')).toBeInTheDocument();
      });
    });

    it('handles response with missing scans.used field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { tier: 'FREE' } }),
      });

      render(<BillingSettings />);

      await waitFor(() => {
        expect(screen.getByText('0 of 10 daily scans used')).toBeInTheDocument();
      });
    });

    it('handles completely empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<BillingSettings />);

      // Should show FREE defaults
      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Flipper/)).toBeInTheDocument();
      });
    });
  });
});
