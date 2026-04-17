/**
 * @file src/lib/message-constants.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Shared message status badge colors and constants.
 *
 * @description
 * Centralizes message status display colors used across MessageBubble,
 * MessageApprovalCard, and other message-related components. Each value
 * is a canonical `.fp-badge fp-badge-<color>` class combination so every
 * consumer ships the same design-system look. Per FR-UI-DESIGN-04 (green
 * reserved for profit/financial indicators) and ADR-14.7-A, DELIVERED is
 * mapped to blue (neutral info), APPROVED-style non-financial confirmation
 * slots would map to purple — this map does not include those but the
 * rule is documented for future additions.
 *
 * Story 14.7 migration: previous values were Tailwind-palette hex pairs
 * (raw color utilities with numeric shades); rewritten to `.fp-badge-*`
 * without changing the exported signature.
 */

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'fp-badge fp-badge-gray',
  PENDING_APPROVAL: 'fp-badge fp-badge-yellow',
  SENT: 'fp-badge fp-badge-blue',
  DELIVERED: 'fp-badge fp-badge-blue',
  READ: 'fp-badge fp-badge-purple',
  REPLIED: 'fp-badge fp-badge-purple',
  FAILED: 'fp-badge fp-badge-red',
  REJECTED: 'fp-badge fp-badge-red',
};
