/**
 * @jest-environment jsdom
 */
/**
 * @file src/__tests__/components/QueueItemCard.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Tests for QueueItemCard — status rendering, URL scheme guards.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QueueItemCard, {
  type QueueItem,
} from '@/components/posting-queue/QueueItemCard';

function makeItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'q1',
    listingId: 'l1',
    targetPlatform: 'EBAY',
    status: 'PENDING',
    askingPrice: 50,
    title: null,
    externalPostId: null,
    externalPostUrl: null,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: null,
    listing: {
      id: 'l1',
      title: 'Test Listing',
      platform: 'CRAIGSLIST',
      askingPrice: 50,
      imageUrls: null,
    },
    ...overrides,
  };
}

describe('QueueItemCard', () => {
  const onRetry = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Cancel button for PENDING and calls onCancel after confirm', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <QueueItemCard
        item={makeItem({ status: 'PENDING' })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledWith('q1');

    confirmSpy.mockRestore();
  });

  it('does NOT call onCancel when confirm is dismissed', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <QueueItemCard
        item={makeItem({ status: 'PENDING' })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(onCancel).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('renders the Retry button for FAILED and invokes onRetry', () => {
    render(
      <QueueItemCard
        item={makeItem({ status: 'FAILED', errorMessage: 'Permanent failure' })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledWith('q1');
  });

  it('renders the View link only for safe POSTED URLs (https)', () => {
    render(
      <QueueItemCard
        item={makeItem({
          status: 'POSTED',
          externalPostUrl: 'https://ebay.com/itm/123',
        })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    const link = screen.getByTestId('view-link') as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.href).toBe('https://ebay.com/itm/123');
  });

  it('rejects javascript: URLs on POSTED items', () => {
    render(
      <QueueItemCard
        item={makeItem({
          status: 'POSTED',
          externalPostUrl: 'javascript:alert(1)',
        })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByTestId('view-link')).toBeNull();
  });

  it('rejects data: URLs on POSTED items', () => {
    render(
      <QueueItemCard
        item={makeItem({
          status: 'POSTED',
          externalPostUrl: 'data:text/html,<script>alert(1)</script>',
        })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByTestId('view-link')).toBeNull();
  });

  it('renders a truncated error message with show more toggle', () => {
    const longError = 'A'.repeat(200);
    render(
      <QueueItemCard
        item={makeItem({ status: 'FAILED', errorMessage: longError })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('error-message')).toHaveClass('line-clamp-2');
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByTestId('error-message')).not.toHaveClass('line-clamp-2');
  });

  it('parses first image from JSON-encoded imageUrls string', () => {
    render(
      <QueueItemCard
        item={makeItem({
          listing: {
            id: 'l1',
            title: 'Test Listing',
            platform: 'CRAIGSLIST',
            askingPrice: 50,
            imageUrls: '["https://img.example.com/a.jpg"]',
          },
        })}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
    const img = screen.getByAltText('Test Listing') as HTMLImageElement;
    expect(img.src).toBe('https://img.example.com/a.jpg');
  });
});
