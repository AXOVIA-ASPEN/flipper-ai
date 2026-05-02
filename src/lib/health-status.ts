/**
 * @file src/lib/health-status.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Canonical token mapping for service-health status (Story 14.9 ADR-14.9-D).
 *
 * @description
 * Maps service-status values ('online' | 'degraded' | 'offline' | 'loading') to canonical
 * design-system tokens used on the health page. statusIconColor returns inline hex (used via
 * `style={{ color }}`); statusBadgeClass returns the canonical .fp-badge-* class string.
 * Extracted from app/health/page.tsx so the page file stays an entry point and the helpers
 * can be unit-tested + reused independently.
 */

export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'loading';

const TEXT_SECONDARY = '#94a3b8';
const PROFIT_GREEN = '#34d399';
const WARNING_YELLOW = '#fbbf24';
const DANGER_RED = '#f87171';

export function statusIconColor(status: ServiceStatus): string {
  if (status === 'loading') return TEXT_SECONDARY;
  if (status === 'online') return PROFIT_GREEN;
  if (status === 'degraded') return WARNING_YELLOW;
  return DANGER_RED;
}

export function statusBadgeClass(status: ServiceStatus): string {
  if (status === 'online') return 'fp-badge fp-badge-green';
  if (status === 'degraded') return 'fp-badge fp-badge-yellow';
  if (status === 'loading') return 'fp-badge fp-badge-gray';
  return 'fp-badge fp-badge-red';
}
