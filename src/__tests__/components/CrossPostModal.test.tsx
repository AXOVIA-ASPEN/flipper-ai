/**
 * @jest-environment jsdom
 */
/**
 * @file src/__tests__/components/CrossPostModal.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Tests for the CrossPostModal platform selector.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CrossPostModal from '@/components/posting-queue/CrossPostModal';

const showToastSpy = jest.fn();
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({ showToast: showToastSpy }),
}));

function mockExistingItems(items: Array<{ targetPlatform: string; status: string }>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items, total: items.length, limit: 200, offset: 0 }),
  }) as unknown as typeof fetch;
}

describe('CrossPostModal', () => {
  const baseProps = {
    listingId: 'listing-1',
    sourcePlatform: 'CRAIGSLIST',
    listingTitle: 'A thing',
    askingPrice: 100,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the four resale target platforms and hides the source platform', async () => {
    mockExistingItems([]);

    render(<CrossPostModal {...baseProps} sourcePlatform="CRAIGSLIST" />);

    await waitFor(() => {
      expect(screen.getByTestId('platform-checkbox-EBAY')).toBeInTheDocument();
    });
    expect(screen.getByTestId('platform-checkbox-FACEBOOK_MARKETPLACE')).toBeInTheDocument();
    expect(screen.getByTestId('platform-checkbox-OFFERUP')).toBeInTheDocument();
    expect(screen.getByTestId('platform-checkbox-MERCARI')).toBeInTheDocument();
    // Craigslist is never a target — source or not
    expect(screen.queryByTestId('platform-checkbox-CRAIGSLIST')).toBeNull();
  });

  it('excludes the source platform when source is a resale target (EBAY source)', async () => {
    mockExistingItems([]);

    render(<CrossPostModal {...baseProps} sourcePlatform="EBAY" />);

    await waitFor(() => {
      expect(
        screen.getByTestId('platform-checkbox-FACEBOOK_MARKETPLACE')
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId('platform-checkbox-EBAY')).toBeNull();
  });

  it('disables checkboxes for already-queued platforms', async () => {
    mockExistingItems([{ targetPlatform: 'EBAY', status: 'PENDING' }]);

    render(<CrossPostModal {...baseProps} />);

    await waitFor(() => {
      const ebayBox = screen.getByTestId(
        'platform-checkbox-EBAY'
      ) as HTMLInputElement;
      expect(ebayBox.disabled).toBe(true);
    });
    expect(screen.getAllByText(/Already queued/i).length).toBeGreaterThan(0);
  });

  it('shows the "all queued" message and hides submit when every platform is queued', async () => {
    mockExistingItems([
      { targetPlatform: 'EBAY', status: 'PENDING' },
      { targetPlatform: 'FACEBOOK_MARKETPLACE', status: 'PENDING' },
      { targetPlatform: 'OFFERUP', status: 'PENDING' },
      { targetPlatform: 'MERCARI', status: 'PENDING' },
    ]);

    render(<CrossPostModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('all-queued-message')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('submit-cross-post')).toBeNull();
  });

  it('submits selected platforms as a batch and closes on success', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    const fetchMock = jest
      .fn()
      // initial GET for existing items
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      // POST batch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'q1' }, { id: 'q2' }],
          count: 2,
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <CrossPostModal {...baseProps} onClose={onClose} onSuccess={onSuccess} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('platform-checkbox-EBAY')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('platform-checkbox-EBAY'));
    fireEvent.click(screen.getByTestId('platform-checkbox-MERCARI'));
    fireEvent.click(screen.getByTestId('submit-cross-post'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
    expect(showToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );

    // Inspect the POST body to ensure the batch payload was formed correctly
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toBe('/api/posting-queue');
    const body = JSON.parse(postCall[1].body as string);
    expect(body.listingId).toBe('listing-1');
    expect(body.platforms).toEqual(
      expect.arrayContaining(['EBAY', 'MERCARI'])
    );
    expect(body.askingPrice).toBe(100);
  });

  it('shows an error toast on submit failure', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { detail: 'Server exploded' } }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CrossPostModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('platform-checkbox-EBAY')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('platform-checkbox-EBAY'));
    fireEvent.click(screen.getByTestId('submit-cross-post'));

    await waitFor(() => {
      expect(showToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
