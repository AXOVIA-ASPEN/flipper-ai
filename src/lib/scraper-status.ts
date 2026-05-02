/**
 * @file src/lib/scraper-status.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Canonical token mapping for scraper-job status (Story 14.9 ADR-14.9-C).
 *
 * @description
 * Maps scraper-job status strings (COMPLETED, RUNNING, FAILED, QUEUED, …) to the canonical
 * design-system tokens used on the scraper page. Two helpers:
 *   - getStatusColor → inline hex token (used via `style={{ color }}`, scanner-proof per
 *     ADR-14.9-C; never returns a Tailwind className)
 *   - getStatusBadgeClass → ".fp-badge fp-badge-{green|purple|red|gray}" string
 * Extracted from app/scraper/page.tsx so other components can reuse the mapping and so the
 * page file stays focused on rendering (Next.js page files are conventionally entry points).
 */

const PROFIT_GREEN = '#34d399';
const RUNNING_PURPLE = '#a78bfa';
const DANGER_RED = '#f87171';
const TEXT_SECONDARY = '#94a3b8';

export function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return PROFIT_GREEN;
    case 'RUNNING':
      return RUNNING_PURPLE;
    case 'FAILED':
      return DANGER_RED;
    default:
      return TEXT_SECONDARY;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'fp-badge fp-badge-green';
    case 'RUNNING':
      return 'fp-badge fp-badge-purple';
    case 'FAILED':
      return 'fp-badge fp-badge-red';
    default:
      return 'fp-badge fp-badge-gray';
  }
}
