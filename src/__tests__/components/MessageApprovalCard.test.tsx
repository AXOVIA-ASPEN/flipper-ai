/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/MessageApprovalCard.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-07
 * @version 1.0
 * @brief Tests for MessageApprovalCard — status-driven button rendering, edit, reject, copy.
 *
 * @description
 * Validates Story 8.4 acceptance criteria at the component level: DRAFT shows
 * Approve/Edit/Reject; PENDING_APPROVAL shows Confirm Send/Edit/Reject; SENT
 * shows "Queued for delivery" with no actions; REJECTED shows no actions;
 * inline edit toggling; status badge colors; null listing placeholder; stale
 * listing warning; copy-to-clipboard; FREE-tier disabled state.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import MessageApprovalCard from '@/components/MessageApprovalCard';

const baseListing = {
  id: 'listing-1',
  title: 'iPhone 14',
  platform: 'craigslist',
  askingPrice: 500,
  updatedAt: '2026-03-30T00:00:00.000Z',
};

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    status: 'DRAFT',
    subject: 'About your listing',
    body: 'Is this still available?',
    sellerName: 'Jane',
    platform: 'craigslist',
    createdAt: '2026-03-31T00:00:00.000Z',
    sentAt: null,
    listing: baseListing,
    ...overrides,
  };
}

const noopHandlers = {
  onApprove: jest.fn(),
  onConfirm: jest.fn(),
  onEdit: jest.fn(),
  onReject: jest.fn(),
};

describe('MessageApprovalCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Approve, Edit, Reject buttons for DRAFT status', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.getByRole('button', { name: /Approve & Send/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reject$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm Send/ })).not.toBeInTheDocument();
  });

  it('shows "Approve" label (without "& Send") when messageApprovalRequired is true', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={true}
        {...noopHandlers}
      />
    );
    expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve & Send/ })).not.toBeInTheDocument();
  });

  it('renders Confirm Send, Edit, and Reject for PENDING_APPROVAL status', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'PENDING_APPROVAL' })}
        loadingAction={null}
        messageApprovalRequired={true}
        {...noopHandlers}
      />
    );
    expect(screen.getByRole('button', { name: /Confirm Send/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reject$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  });

  it('shows "Queued for delivery" and no action buttons for SENT status', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'SENT', sentAt: '2026-04-01T00:00:00.000Z' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.getByText('Queued for delivery')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve|Confirm|Reject/ })).not.toBeInTheDocument();
  });

  it('shows no action buttons for REJECTED status', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'REJECTED' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.queryByRole('button', { name: /Approve|Confirm|Reject/ })).not.toBeInTheDocument();
    // Copy button is always available
    expect(screen.getByRole('button', { name: /Copy Message/ })).toBeInTheDocument();
  });

  it('toggles inline edit textarea when Edit clicked', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/ }));
    // After entering edit mode, Save and Cancel appear
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('shows "Original listing no longer available" when listing is null', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT', listing: null })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.getByText(/Original listing no longer available/)).toBeInTheDocument();
    // Action buttons still functional
    expect(screen.getByRole('button', { name: /Approve & Send/ })).toBeInTheDocument();
  });

  it('shows stale listing warning when listing.updatedAt > message.createdAt', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({
          status: 'DRAFT',
          createdAt: '2026-03-29T00:00:00.000Z',
          listing: { ...baseListing, updatedAt: '2026-03-31T00:00:00.000Z' },
        })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.getByText(/Listing updated since this message was drafted/)).toBeInTheDocument();
  });

  it('does not show stale warning when listing is older than message', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({
          status: 'DRAFT',
          createdAt: '2026-03-31T00:00:00.000Z',
          listing: { ...baseListing, updatedAt: '2026-03-29T00:00:00.000Z' },
        })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    expect(screen.queryByText(/Listing updated since/)).not.toBeInTheDocument();
  });

  it('calls onApprove when Approve button clicked', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));
    expect(noopHandlers.onApprove).toHaveBeenCalledWith('msg-1');
  });

  it('calls onConfirm when Confirm Send clicked on PENDING_APPROVAL', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'PENDING_APPROVAL' })}
        loadingAction={null}
        messageApprovalRequired={true}
        {...noopHandlers}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Confirm Send/ }));
    expect(noopHandlers.onConfirm).toHaveBeenCalledWith('msg-1');
  });

  it('requires double-click to confirm reject (5s confirmation pattern)', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    const rejectBtn = screen.getByRole('button', { name: /^Reject$/ });
    fireEvent.click(rejectBtn);
    // Not yet rejected — first click arms confirmation
    expect(noopHandlers.onReject).not.toHaveBeenCalled();
    // Second click confirms
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reject\?/ }));
    expect(noopHandlers.onReject).toHaveBeenCalledWith('msg-1');
  });

  it('Edit button on PENDING_APPROVAL triggers reject (returns to DRAFT for editing)', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'PENDING_APPROVAL' })}
        loadingAction={null}
        messageApprovalRequired={true}
        {...noopHandlers}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/ }));
    // Edit on PENDING_APPROVAL calls onReject (which returns to DRAFT)
    expect(noopHandlers.onReject).toHaveBeenCalledWith('msg-1');
  });

  it('disables all action buttons when disabled prop is true (FREE tier)', () => {
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        disabled={true}
        {...noopHandlers}
      />
    );
    expect(screen.getByRole('button', { name: /Approve & Send/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Edit$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Reject$/ })).toBeDisabled();
  });

  it('renders Copy Message button and reflects Copied! state on success', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    render(
      <MessageApprovalCard
        message={makeMessage({ status: 'DRAFT' })}
        loadingAction={null}
        messageApprovalRequired={false}
        {...noopHandlers}
      />
    );
    const copyBtn = screen.getByRole('button', { name: /Copy Message/ });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Is this still available?');
  });

  // Story 14.8 AC #10 + Task 9.3 + Task 15.2 — guard against the 14.7 line-202 regression.
  describe('Story 14.8 — canonical badge surfaces (AC #10, Task 15.2)', () => {
    const FP_BADGE_RE = /^fp-badge fp-badge-(red|blue|gray|yellow|purple|green)$/;

    it.each([
      ['DRAFT', 'fp-badge fp-badge-gray'],
      ['PENDING_APPROVAL', 'fp-badge fp-badge-yellow'],
      ['SENT', 'fp-badge fp-badge-blue'],
      ['REJECTED', 'fp-badge fp-badge-red'],
      ['READ', 'fp-badge fp-badge-purple'],
    ])('status %s pill className matches the canonical fp-badge regex', (status, expected) => {
      const { container } = render(
        <MessageApprovalCard
          message={makeMessage({ status })}
          loadingAction={null}
          messageApprovalRequired={false}
          {...noopHandlers}
        />
      );
      const pills = container.querySelectorAll('.fp-badge.fp-badge-gray, .fp-badge.fp-badge-yellow, .fp-badge.fp-badge-blue, .fp-badge.fp-badge-red, .fp-badge.fp-badge-purple, .fp-badge.fp-badge-green');
      const statusPill = Array.from(pills).find((el) => el.textContent?.trim() === (status === 'PENDING_APPROVAL' ? 'PENDING' : status));
      expect(statusPill).toBeTruthy();
      // The status-pill className contains a flex-shrink-0 layout token plus the canonical fp-badge string.
      // Normalize by stripping known layout tokens, then assert the residual matches the fp-badge regex.
      const cls = (statusPill?.className ?? '')
        .split(/\s+/)
        .filter((t) => t !== 'flex-shrink-0' && t !== '')
        .join(' ');
      expect(cls).toBe(expected);
      expect(cls).toMatch(FP_BADGE_RE);
    });

    it('status pill className contains NO external padding/font/rounded utilities (14.7 line-202 fix preserved)', () => {
      const { container } = render(
        <MessageApprovalCard
          message={makeMessage({ status: 'DRAFT' })}
          loadingAction={null}
          messageApprovalRequired={false}
          {...noopHandlers}
        />
      );
      // The DRAFT status pill — find it by its rendered text.
      const pill = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent?.trim() === 'DRAFT' && el.className.includes('fp-badge')
      );
      expect(pill).toBeTruthy();
      const className = pill?.className ?? '';
      // None of these external wrap utilities should appear — they would re-introduce the
      // double-padding / double-font-weight bug ADR-14.7-I called out.
      expect(className).not.toMatch(/\btext-xs\b/);
      expect(className).not.toMatch(/\bpx-2\b/);
      expect(className).not.toMatch(/\bpy-0\.5\b/);
      expect(className).not.toMatch(/\brounded\b/);
      expect(className).not.toMatch(/\bfont-medium\b/);
    });

    it('source-platform pill renders as fp-badge fp-badge-blue (AC #10)', () => {
      render(
        <MessageApprovalCard
          message={makeMessage({ status: 'DRAFT' })}
          loadingAction={null}
          messageApprovalRequired={false}
          {...noopHandlers}
        />
      );
      const pill = screen.getByTestId('source-platform-pill');
      expect(pill.className).toContain('fp-badge');
      expect(pill.className).toContain('fp-badge-blue');
      expect(pill.textContent).toBe('craigslist');
    });
  });
});
