/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/CrossPostModal.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Tests CrossPostModal tier-gate badges (Story 14.8 AC #14).
 *
 * @description
 * AC #14 requires the marketplace selector's tier-gate pills to use
 * `.fp-badge .fp-badge-purple` for "Pro" and `.fp-badge .fp-badge-yellow`
 * for "Enterprise". This file verifies both pills render with the correct
 * canonical badge classes and that disabled rows carry `opacity-50` +
 * `cursor-not-allowed` for already-queued targets (which acts as a
 * keyboard/visual gate equivalent to tier locking).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/components/ToastContainer';

import CrossPostModal from '@/components/posting-queue/CrossPostModal';

const fetchMock = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, items: [] }),
});

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  fetchMock.mockClear();
});

function renderModal(sourcePlatform = 'CRAIGSLIST') {
  return render(
    <ToastProvider>
      <CrossPostModal
        listingId="listing-1"
        sourcePlatform={sourcePlatform}
        listingTitle="Test listing"
        askingPrice={100}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    </ToastProvider>
  );
}

describe('CrossPostModal — Story 14.8 AC #14 tier-gate badges', () => {
  it('renders the "Pro" pill on the eBay row with .fp-badge .fp-badge-purple', async () => {
    renderModal('CRAIGSLIST');
    await waitFor(() => {
      expect(screen.getByTestId('platform-checkbox-EBAY')).toBeInTheDocument();
    });
    const proPill = screen.getByText('Pro');
    expect(proPill.className).toContain('fp-badge');
    expect(proPill.className).toContain('fp-badge-purple');
  });

  it('renders the "Enterprise" pill on the Facebook Marketplace row with .fp-badge .fp-badge-yellow', async () => {
    renderModal('CRAIGSLIST');
    await waitFor(() => {
      expect(screen.getByTestId('platform-checkbox-FACEBOOK_MARKETPLACE')).toBeInTheDocument();
    });
    const entPill = screen.getByText('Enterprise');
    expect(entPill.className).toContain('fp-badge');
    expect(entPill.className).toContain('fp-badge-yellow');
  });

  it('marks already-queued rows with opacity-50 + cursor-not-allowed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          items: [{ targetPlatform: 'EBAY', status: 'PENDING' }],
        }),
    });
    renderModal('CRAIGSLIST');
    await waitFor(() => {
      const ebayCheckbox = screen.getByTestId('platform-checkbox-EBAY');
      const row = ebayCheckbox.closest('label');
      expect(row?.className).toContain('opacity-50');
      expect(row?.className).toContain('cursor-not-allowed');
    });
  });
});
