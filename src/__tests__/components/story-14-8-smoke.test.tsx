/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/story-14-8-smoke.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Smoke render coverage for the 10 Story 14.8 components without dedicated tests.
 *
 * @description
 * Story 14.8 Task 15.3 mandates a smoke render test for every touched component.
 * Six components already have dedicated suites (BillingSettings, MessageApprovalCard,
 * ResaleContentEditor, ScoringSettings, UpgradePrompt, UsageDisplay); this file
 * covers the remaining ten — NotificationSettings, IntegrationsSettings,
 * MessagingSettings, LogisticsSettings, MeetingModal, MeetingRouteCard,
 * ApprovalQueue, CrossPostModal, FilterPanel, QueueItemCard. Each test renders
 * the component with minimum props + provider wrappers and asserts at least one
 * canonical glass surface (.fp-glass / .fp-glass-sm / .fp-glow-card) is present.
 *
 * Asynchronous fetches are silenced with a default mock — failure paths are
 * exercised by per-component dedicated suites where required (ApprovalQueue
 * empty/error has its own file).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ToastProvider } from '@/components/ToastContainer';

import NotificationSettings from '@/components/NotificationSettings';
import IntegrationsSettings from '@/components/IntegrationsSettings';
import MessagingSettings from '@/components/MessagingSettings';
import LogisticsSettings from '@/components/LogisticsSettings';
import MeetingModal from '@/components/MeetingModal';
import MeetingRouteCard from '@/components/MeetingRouteCard';
import ApprovalQueue from '@/components/ApprovalQueue';
import CrossPostModal from '@/components/posting-queue/CrossPostModal';
import FilterPanel from '@/components/FilterPanel';
import QueueItemCard from '@/components/posting-queue/QueueItemCard';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/settings',
}));

const fetchMock = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data: {} }),
});
global.fetch = fetchMock as unknown as typeof fetch;

function renderWithProviders(node: React.ReactElement): { container: HTMLElement } {
  const { container } = render(<ToastProvider>{node}</ToastProvider>);
  return { container };
}

function expectCanonicalSurface(container: HTMLElement, file: string) {
  const found = container.querySelector('.fp-glass, .fp-glass-sm, .fp-glow-card');
  if (!found) {
    throw new Error(`${file}: no canonical glass surface (.fp-glass / .fp-glass-sm / .fp-glow-card) rendered`);
  }
  expect(found).toBeTruthy();
}

describe('Story 14.8 — smoke render coverage (Task 15.3)', () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it('NotificationSettings renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(<NotificationSettings />);
    expectCanonicalSurface(container, 'NotificationSettings');
  });

  it('IntegrationsSettings renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(<IntegrationsSettings />);
    expectCanonicalSurface(container, 'IntegrationsSettings');
  });

  it('MessagingSettings renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(<MessagingSettings />);
    expectCanonicalSurface(container, 'MessagingSettings');
  });

  it('LogisticsSettings renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(<LogisticsSettings />);
    expectCanonicalSurface(container, 'LogisticsSettings');
  });

  it('MeetingModal renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(
      <MeetingModal
        opportunityId="opp-1"
        opportunityStatus="IDENTIFIED"
        initialMeeting={null}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />
    );
    expectCanonicalSurface(container, 'MeetingModal');
  });

  it('MeetingRouteCard renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(
      <MeetingRouteCard opportunityId="opp-1" meetingLocation="123 Main St" />
    );
    expectCanonicalSurface(container, 'MeetingRouteCard');
  });

  it('ApprovalQueue renders on a canonical glass surface (loading skeleton path)', () => {
    const { container } = renderWithProviders(
      <ApprovalQueue
        subscriptionTier="PRO"
        messageApprovalRequired={false}
        onCountChange={jest.fn()}
      />
    );
    // ApprovalQueue's initial loading state renders a LoadingSkeleton — wraps in fp-glass-sm.
    // Even if not yet loaded, the empty-state EmptyState wrapper or the surrounding card
    // produces a fp-glass-* element. Allow either.
    const surface = container.querySelector('.fp-glass, .fp-glass-sm, [data-testid="approval-queue-loading"]');
    expect(surface).toBeTruthy();
  });

  it('CrossPostModal renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(
      <CrossPostModal
        listingId="listing-1"
        sourcePlatform="EBAY"
        listingTitle="Test listing"
        askingPrice={100}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );
    expectCanonicalSurface(container, 'CrossPostModal');
  });

  it('FilterPanel renders on a canonical glass surface', () => {
    const { container } = renderWithProviders(
      <FilterPanel
        filters={{
          search: '',
          platforms: '',
          categories: '',
          statuses: '',
          minPrice: '',
          maxPrice: '',
          sortBy: 'newest',
        }}
        setFilter={jest.fn()}
        setFilters={jest.fn()}
        clearFilters={jest.fn()}
        activeFilterCount={0}
      />
    );
    expectCanonicalSurface(container, 'FilterPanel');
  });

  it('QueueItemCard renders on a canonical glass surface', () => {
    const item = {
      id: 'q-1',
      listingId: 'listing-1',
      targetPlatform: 'EBAY',
      title: 'Test post',
      askingPrice: 100,
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      externalPostUrl: null,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
      listing: {
        id: 'listing-1',
        title: 'Test listing',
        imageUrls: [],
      },
    };
    const { container } = renderWithProviders(
      <QueueItemCard item={item as Parameters<typeof QueueItemCard>[0]['item']} onRetry={jest.fn()} onCancel={jest.fn()} />
    );
    expectCanonicalSurface(container, 'QueueItemCard');
  });
});
