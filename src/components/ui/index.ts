/**
 * @file src/components/ui/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Barrel re-exports for the shared UI state components.
 *
 * @description
 * Re-exports the four shared UI state components (LoadingSkeleton, ErrorBanner,
 * EmptyState, ScoreRing) from a single barrel so consumers import from
 * "@/components/ui" rather than individual file paths.
 */

export { LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonProps } from './LoadingSkeleton';
export { ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';
export { ScoreRing, scoreColor } from './ScoreRing';
export type { ScoreRingProps } from './ScoreRing';
