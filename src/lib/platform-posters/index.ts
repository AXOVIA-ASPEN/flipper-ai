/**
 * @file src/lib/platform-posters/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Stub registrations for platform-specific posting handlers.
 *
 * @description
 * Registers stub PlatformPoster handlers for EBAY, FACEBOOK_MARKETPLACE,
 * MERCARI, and OFFERUP. Each stub returns { success: false } with a
 * descriptive error so the processing pipeline, retry logic, and error
 * display can be exercised end-to-end before real poster implementations
 * land. ensurePostersRegistered() is the explicit entry point — it is
 * idempotent and safe to call at the top of any request handler that
 * invokes processQueue(). We do this via an explicit call instead of a
 * module-level side effect because serverless cold starts can reset
 * module state between invocations, and a registry populated at import
 * time is not guaranteed to survive.
 */

import {
  registerPoster,
  type PlatformPoster,
} from '@/lib/posting-queue-processor';

/**
 * Build a stub PlatformPoster that always reports "not yet implemented" so
 * the processing pipeline surfaces the failure to the user. Retry logic in
 * processQueue() will cycle the item back to PENDING until retryCount hits
 * maxRetries, at which point the item is marked FAILED permanently.
 */
function createStubPoster(platformLabel: string): PlatformPoster {
  return async () => ({
    success: false,
    errorMessage: `${platformLabel} posting not yet implemented`,
  });
}

let registered = false;

/**
 * Register all platform poster stubs. Idempotent — subsequent calls are a
 * no-op while a single Lambda instance stays warm. Call this at the top of
 * any route handler that invokes processQueue() so a cold-started instance
 * is guaranteed to have posters registered before processing begins.
 */
export function ensurePostersRegistered(): void {
  if (registered) return;
  registerPoster('EBAY', createStubPoster('eBay'));
  registerPoster('FACEBOOK_MARKETPLACE', createStubPoster('Facebook Marketplace'));
  registerPoster('MERCARI', createStubPoster('Mercari'));
  registerPoster('OFFERUP', createStubPoster('OfferUp'));
  registered = true;
}

/**
 * Test-only reset hook. Flips the `registered` guard off so unit tests can
 * re-run ensurePostersRegistered() and observe the fresh registration calls.
 * Not exported from the barrel intentionally — treat as internal.
 */
export function __resetForTests(): void {
  registered = false;
}
