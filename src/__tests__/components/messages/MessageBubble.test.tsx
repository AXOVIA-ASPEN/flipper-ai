/**
 * @jest-environment jsdom
 */
/**
 * @file src/__tests__/components/messages/MessageBubble.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit tests for MessageBubble post Story 14.7 visual rebuild.
 *
 * @description
 * Asserts outbound/inbound/rejected rendering uses canonical .fp-glass-sm
 * surfaces with inline hex colors per AC #10. Regression-guards against
 * any future `dark:` prefix or palette class drift.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageBubble from '@/components/messages/MessageBubble';

describe('Story 14.7 — MessageBubble canonical styling (AC #10)', () => {
  const baseProps = {
    subject: null,
    body: 'Hello world',
    createdAt: new Date().toISOString(),
  };

  it('outbound bubble has fp-glass-sm and purple background tint', () => {
    render(<MessageBubble direction="OUTBOUND" status="SENT" {...baseProps} />);
    const bodyEl = screen.getByText('Hello world');
    const bubble = bodyEl.closest('.fp-glass-sm') as HTMLElement | null;
    expect(bubble).not.toBeNull();
    expect(bubble!.style.background).toBe('rgba(124, 58, 237, 0.15)');
  });

  it('inbound bubble has fp-glass-sm and no inline purple tint', () => {
    render(<MessageBubble direction="INBOUND" status="DELIVERED" {...baseProps} />);
    const bodyEl = screen.getByText('Hello world');
    const bubble = bodyEl.closest('.fp-glass-sm') as HTMLElement | null;
    expect(bubble).not.toBeNull();
    expect(bubble!.style.background).toBe('');
  });

  it('rejected bubble renders body with line-through and muted color', () => {
    render(<MessageBubble direction="OUTBOUND" status="REJECTED" {...baseProps} />);
    const bodyEl = screen.getByText('Hello world') as HTMLElement;
    expect(bodyEl.style.textDecoration).toBe('line-through');
    expect(bodyEl.style.color).toBe('rgb(100, 116, 139)');
  });

  it('renders subject with line-through for rejected, normal for accepted', () => {
    const { rerender } = render(
      <MessageBubble direction="OUTBOUND" status="REJECTED" {...baseProps} subject="Test subject" />
    );
    const rejected = screen.getByText('Test subject') as HTMLElement;
    expect(rejected.style.textDecoration).toBe('line-through');

    rerender(
      <MessageBubble direction="OUTBOUND" status="SENT" {...baseProps} subject="Test subject" />
    );
    const accepted = screen.getByText('Test subject') as HTMLElement;
    expect(accepted.style.textDecoration).toBe('');
  });

  it('no legacy palette or dark-prefix classes survive in rendered markup', () => {
    const { container } = render(
      <MessageBubble direction="OUTBOUND" status="SENT" {...baseProps} />
    );
    const html = container.innerHTML;
    // Dark-prefix class names — should not appear.
    expect(html).not.toContain('dark:bg');
    expect(html).not.toContain('dark:text');
    // Legacy Tailwind palette shades — should not appear.
    expect(html).not.toMatch(/bg-(blue|gray|yellow|red|green|orange|purple)-\d{2,3}/);
    expect(html).not.toMatch(/text-(blue|gray|yellow|red|green|orange|purple)-\d{2,3}/);
  });

  it('direction label uses canonical purple (outbound) / slate (inbound) colors', () => {
    const { rerender } = render(
      <MessageBubble direction="OUTBOUND" status="SENT" {...baseProps} />
    );
    const outboundLabel = screen.getByLabelText('Sent message') as HTMLElement;
    expect(outboundLabel.style.color).toBe('rgb(196, 181, 253)');

    rerender(<MessageBubble direction="INBOUND" status="DELIVERED" {...baseProps} />);
    const inboundLabel = screen.getByLabelText('Received message') as HTMLElement;
    expect(inboundLabel.style.color).toBe('rgb(148, 163, 184)');
  });
});
