/**
 * @jest-environment jsdom
 */

/**
 * Tests for UpgradePrompt component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpgradePrompt from '@/components/UpgradePrompt';

// Mock stripe pricing to avoid env var issues
jest.mock('@/lib/stripe', () => ({
  TIER_PRICING: {
    FREE: { monthly: 0, label: 'Free' },
    FLIPPER: { monthly: 1900, label: '$19/mo' },
    PRO: { monthly: 4900, label: '$49/mo' },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UpgradePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: null }),
    });
  });

  it('renders the feature name and message', () => {
    render(
      <UpgradePrompt
        currentTier="FREE"
        feature="Messaging"
        message="Messaging is not available on the Free plan."
      />
    );

    expect(screen.getByText(/Messaging — Upgrade Required/)).toBeInTheDocument();
    expect(screen.getByText(/Messaging is not available on the Free plan/)).toBeInTheDocument();
  });

  it('shows upgrade button to next tier', () => {
    render(
      <UpgradePrompt
        currentTier="FREE"
        feature="Price History"
        message="Upgrade to access price history."
      />
    );

    const button = screen.getByRole('button', { name: /Upgrade to Flipper/ });
    expect(button).toBeInTheDocument();
  });

  it('suggests PRO when FLIPPER user hits limit', () => {
    render(
      <UpgradePrompt
        currentTier="FLIPPER"
        feature="eBay Cross-listing"
        message="Cross-listing requires PRO."
      />
    );

    const button = screen.getByRole('button', { name: /Upgrade to Pro/ });
    expect(button).toBeInTheDocument();
  });

  it('uses specified requiredTier over next tier', () => {
    render(
      <UpgradePrompt
        currentTier="FREE"
        requiredTier="PRO"
        feature="Advanced Feature"
        message="This requires PRO."
      />
    );

    const button = screen.getByRole('button', { name: /Upgrade to Pro/ });
    expect(button).toBeInTheDocument();
  });

  it('shows pricing in upgrade button', () => {
    render(
      <UpgradePrompt
        currentTier="FREE"
        feature="Feature"
        message="Upgrade needed."
      />
    );

    expect(screen.getByText(/\$19\/mo/)).toBeInTheDocument();
  });

  it('calls POST /api/checkout on button click', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: null }),
    });

    render(
      <UpgradePrompt
        currentTier="FREE"
        feature="Feature"
        message="Upgrade needed."
      />
    );

    await user.click(screen.getByRole('button', { name: /Upgrade to Flipper/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/checkout', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'FLIPPER' }),
      }));
    });
  });

  it('handles checkout error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <UpgradePrompt
        currentTier="FREE"
        feature="Feature"
        message="Upgrade needed."
      />
    );

    await user.click(screen.getByRole('button', { name: /Upgrade to Flipper/ }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initiate checkout:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
