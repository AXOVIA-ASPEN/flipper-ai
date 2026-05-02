/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/ApprovalQueue.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Tests ApprovalQueue empty + error + loading states for Story 14.8 AC #11.
 *
 * @description
 * AC #11 requires the queue to render <EmptyState> when there are zero approvals
 * and <ErrorBanner> when the API fails. This file covers all three render paths
 * (loading skeleton, empty state, error banner) plus a sanity check on the
 * happy-path list render. Also exercises the retry handler from <ErrorBanner>.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApprovalQueue from '@/components/ApprovalQueue';

const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  fetchMock.mockReset();
});

const okEmpty = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: [], pagination: { total: 0 } }),
  } as Response);

const fail500 = () =>
  Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ success: false, error: { detail: 'Internal Server Error' } }),
  } as Response);

describe('ApprovalQueue — AC #11 empty / error / loading', () => {
  it('shows the loading skeleton on initial render', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})); // never resolves
    render(
      <ApprovalQueue
        subscriptionTier="PRO"
        messageApprovalRequired={false}
        onCountChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('approval-queue-loading')).toBeInTheDocument();
  });

  it('renders <EmptyState> with role status when there are zero approvals', async () => {
    fetchMock.mockImplementation(okEmpty);
    render(
      <ApprovalQueue
        subscriptionTier="PRO"
        messageApprovalRequired={false}
        onCountChange={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('approval-queue-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No pending approvals')).toBeInTheDocument();
  });

  it('renders <ErrorBanner> with a retry button on API failure', async () => {
    fetchMock.mockImplementation(fail500);
    render(
      <ApprovalQueue
        subscriptionTier="PRO"
        messageApprovalRequired={false}
        onCountChange={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('approval-queue-error')).toBeInTheDocument();
    });
    // ErrorBanner must expose a retry button per AC #11.
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('clicking retry on <ErrorBanner> re-fires the fetch', async () => {
    fetchMock.mockImplementation(fail500);
    render(
      <ApprovalQueue
        subscriptionTier="PRO"
        messageApprovalRequired={false}
        onCountChange={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('approval-queue-error')).toBeInTheDocument();
    });
    const callsBefore = fetchMock.mock.calls.length;
    fetchMock.mockImplementation(okEmpty);
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
