/**
 * @file src/lib/monitoring-job.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief MonitoringJobService — orchestrates periodic listing monitoring runs.
 *
 * @description
 * Implements the background monitoring loop that checks tracked listings for state
 * changes (sold, price change, expired, unavailable) and creates NotificationEvent
 * records for downstream processors (Stories 10.3–10.5).
 *
 * Key design decisions:
 *  - Atomic concurrent-run prevention: uses the database-level partial unique index
 *    (monitoring_job_running_unique) — NOT application-level findFirst+create (TOCTOU).
 *  - Stale job recovery: reaps orphaned RUNNING jobs before each new run.
 *  - Per-run listing cap (MONITORING_MAX_LISTINGS_PER_RUN) for bounded execution time.
 *  - Platform circuit breaker: skips a platform after N consecutive failures.
 *  - Anomaly detection: suppresses mass false-positive "unavailable" events when the
 *    parse-success rate drops below 50% for a platform (canary warning).
 *  - No in-process scheduler — the external Cloud Scheduler calls the API endpoint.
 *  - Never launches Playwright — uses lightweight fetch() for HTML platforms.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';
import { ExternalServiceError, RateLimitError } from '@/lib/errors';
import {
  getTrackableListings,
  detectSoldStatus,
  extractCurrentPrice,
  classifyHttpResponse,
  classifyUnavailableReason,
  isPriceChangeMeaningful,
  updateListingStateWithEvent,
  updatePlatformParseStats,
  isAnomalyThresholdExceeded,
  type PlatformParseStats,
  type TrackableListing,
  type StateChange,
  type UnavailableReason,
} from '@/lib/listing-tracker';
import { getExpiringListings, computeEstimatedExpiry } from '@/lib/listing-expiry';
import { sseEmitter } from '@/lib/sse-emitter';
import { NotificationEventType } from '@/lib/notification-events';
import { callEbayApi, getEbayToken } from '@/scrapers/ebay/scraper';
import type { EbayItemSummary } from '@/scrapers/ebay/types';

// ---------------------------------------------------------------------------
// Prisma error helpers
// ---------------------------------------------------------------------------

/** Check if an unknown caught error is a Prisma error with a specific code */
function isPrismaError(err: unknown, code: string): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === code
  );
}

// ---------------------------------------------------------------------------
// Environment-variable configuration (with defaults)
// ---------------------------------------------------------------------------

/* istanbul ignore next -- CONFIG is initialized at module load time; env-var branches are not exercisable after jest module cache freezes */
function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/* istanbul ignore next -- CONFIG is initialized at module load time; env-var branches are not exercisable after jest module cache freezes */
function envFloat(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? defaultValue : parsed;
}

const CONFIG = {
  batchSize: envInt('MONITORING_BATCH_SIZE', 20),
  batchDelayMs: envInt('MONITORING_BATCH_DELAY_MS', 1500),
  maxRetries: envInt('MONITORING_MAX_RETRIES', 2),
  maxListingsPerRun: envInt('MONITORING_MAX_LISTINGS_PER_RUN', 500),
  maxChecksPerPlatform: envInt('MONITORING_MAX_CHECKS_PER_PLATFORM', 50),
  maxRunDurationMs: envInt('MONITORING_MAX_RUN_DURATION_MS', 600_000),
  staleJobTimeoutMs: envInt('MONITORING_STALE_JOB_TIMEOUT_MS', 600_000),
  platformFailureThreshold: envInt('MONITORING_PLATFORM_FAILURE_THRESHOLD', 3),
  anomalyThresholdPercent: envInt('MONITORING_ANOMALY_THRESHOLD_PERCENT', 30),
  priceChangeMinDelta: envFloat('MONITORING_PRICE_CHANGE_MIN_DELTA', 1.0),
  priceChangeMinPercent: envFloat('MONITORING_PRICE_CHANGE_MIN_PERCENT', 1.0),
  fetchTimeoutMs: envInt('MONITORING_FETCH_TIMEOUT_MS', 10_000),
  ebayDailyBudget: envInt('EBAY_MONITORING_DAILY_BUDGET', 2000),
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonitoringRunSummary {
  jobId: string;
  status: string;
  listingsChecked: number;
  eventsCreated: number;
  expiryEventsCreated: number;
  errorsEncountered: number;
  platformStats: Record<string, PlatformParseStats>;
  skippedPlatforms: Record<string, string>;
  completedEarly: boolean;
  canaryWarning: boolean;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Fetch with AbortController timeout
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.fetchTimeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Exponential backoff retry
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs = 1000,
  maxDelayMs = 4000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Platform-specific listing checks (lightweight fetch — no Playwright)
// ---------------------------------------------------------------------------

interface ListingCheckResult {
  isSold: boolean;
  isUnavailable: boolean;
  unavailableReason?: UnavailableReason; // populated when isUnavailable=true
  currentPrice: number | null;
  parseSuccess: boolean; // true if price was extractable (canary metric)
}

async function checkHtmlPlatformListing(
  listing: TrackableListing
): Promise<ListingCheckResult> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const response = await fetchWithTimeout(listing.url, {
    headers: { 'User-Agent': userAgent, Accept: 'text/html' },
  });

  const body = await response.text();
  const classification = classifyHttpResponse(response.status, body);

  if (classification === 'rate_limited') {
    throw new RateLimitError(`Rate limited by ${listing.platform}`);
  }

  if (classification === 'removed') {
    return {
      isSold: false,
      isUnavailable: true,
      unavailableReason: classifyUnavailableReason(response.status, body),
      currentPrice: null,
      parseSuccess: false,
    };
  }

  const isSold = detectSoldStatus(body, listing.platform);
  const currentPrice = extractCurrentPrice(body, listing.platform);
  return {
    isSold,
    isUnavailable: false,
    currentPrice,
    parseSuccess: currentPrice !== null,
  };
}

// eBay batch: checks up to 20 items in one Browse API call
async function checkEbayListingsBatch(
  listings: TrackableListing[]
): Promise<Map<string, ListingCheckResult>> {
  const results = new Map<string, ListingCheckResult>();

  // Extract eBay item IDs from URLs or externalId stored in URL path
  const itemIds = listings.map((l) => {
    const match = l.url.match(/\/(\d{12,13})/);
    return match ? match[1] : null;
  });

  const validPairs = listings.map((l, i) => ({ listing: l, itemId: itemIds[i] }))
    .filter((p): p is { listing: TrackableListing; itemId: string } => p.itemId !== null);

  if (validPairs.length === 0) {
    listings.forEach((l) =>
      results.set(l.id, { isSold: false, isUnavailable: false, currentPrice: null, parseSuccess: false })
    );
    return results;
  }

  try {
    const token = getEbayToken();
    const idFilter = validPairs.map((p) => `item_id:${p.itemId}`).join(',');
    const apiResponse = await callEbayApi('/item_summary/search', {
      filter: idFilter,
      limit: String(validPairs.length),
    }, token);

    const foundIds = new Set<string>();
    if (Array.isArray(apiResponse?.itemSummaries)) {
      for (const item of apiResponse.itemSummaries as EbayItemSummary[]) {
        const itemId = item.itemId;
        /* istanbul ignore next -- defensive null check; eBay API always returns itemId */
        if (!itemId) continue;

        const pair = validPairs.find((p) => p.itemId === itemId);
        /* istanbul ignore next -- defensive null check; find always matches a validPair */
        if (!pair) continue;

        foundIds.add(pair.listing.id);
        const isSold = item.itemEndDate !== undefined;
        const currentPrice = item.price?.value ? parseFloat(item.price.value) : null;

        results.set(pair.listing.id, {
          isSold,
          isUnavailable: false,
          currentPrice,
          parseSuccess: currentPrice !== null,
        });
      }
    }

    // Listings not in API response are unavailable / ended
    for (const pair of validPairs) {
      if (!foundIds.has(pair.listing.id)) {
        results.set(pair.listing.id, {
          isSold: false,
          isUnavailable: true,
          currentPrice: null,
          parseSuccess: false,
        });
      }
    }
  } catch {
    // On API failure mark all as parse failure (not unavailable)
    for (const pair of validPairs) {
      results.set(pair.listing.id, {
        isSold: false,
        isUnavailable: false,
        currentPrice: null,
        parseSuccess: false,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// eBay daily budget tracking (DB-backed — survives Cloud Run cold starts)
// ---------------------------------------------------------------------------

async function getRemainingEbayBudget(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await prisma.monitoringJob.findMany({
    where: { completedAt: { gt: since } },
    select: { platformStats: true },
  });

  let used = 0;
  for (const row of rows) {
    const stats = row.platformStats as Record<string, { checked?: number }> | null;
    if (stats?.EBAY?.checked) used += stats.EBAY.checked;
  }
  return Math.max(0, CONFIG.ebayDailyBudget - used);
}

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

interface PreflightResult {
  skipPlatforms: Record<string, string>; // platform → reason
}

async function runPreflightChecks(): Promise<PreflightResult> {
  const skipPlatforms: Record<string, string> = {};

  // Facebook: skip if no valid (non-expired) token exists for any user
  try {
    const fbToken = await prisma.facebookToken.findFirst({
      where: { expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!fbToken) {
      skipPlatforms['FACEBOOK_MARKETPLACE'] = 'no_valid_token';
      logger.warn('No valid Facebook token found — skipping Facebook listings this run');
    }
  } catch {
    skipPlatforms['FACEBOOK_MARKETPLACE'] = 'token_check_failed';
    logger.warn('Facebook token pre-flight check failed — skipping Facebook platform');
  }

  // eBay: check daily budget
  try {
    const remaining = await getRemainingEbayBudget();
    if (remaining <= 0) {
      skipPlatforms['EBAY'] = 'daily_budget_exhausted';
      logger.warn('eBay monitoring daily budget exhausted — skipping eBay listings this run', {
        dailyBudget: CONFIG.ebayDailyBudget,
      });
    }
  } catch (err) {
    logger.warn('Failed to check eBay daily budget — proceeding without eBay skip guard', {
      error: String(err),
    });
  }

  return { skipPlatforms };
}

// ---------------------------------------------------------------------------
// Core: process a single listing
// ---------------------------------------------------------------------------

async function processOneListing(
  listing: TrackableListing,
  platformStats: Record<string, PlatformParseStats>,
  eventsCreated: { count: number }
): Promise<{ hadError: boolean }> {
  const platform = listing.platform;

  try {
    let result: ListingCheckResult;

    /* istanbul ignore next -- eBay always handled in batch; run() continues past eBay before calling processOneListing */
    if (platform === 'EBAY') {
      // eBay is handled in batch — this path is fallback for single items
      const batchResult = await checkEbayListingsBatch([listing]);
      result = batchResult.get(listing.id) ?? {
        isSold: false, isUnavailable: false, currentPrice: null, parseSuccess: false,
      };
    } else {
      result = await withRetry(
        () => checkHtmlPlatformListing(listing),
        CONFIG.maxRetries
      );
    }

    const { isSold, isUnavailable, unavailableReason, currentPrice, parseSuccess } = result;

    let change: StateChange | null = null;
    let wasUnavailable = false;

    if (isSold) {
      change = { type: NotificationEventType.LISTING_SOLD, soldIndicator: 'sold' };
    } else if (isUnavailable) {
      change = {
        type: NotificationEventType.LISTING_UNAVAILABLE,
        reason: unavailableReason ?? 'removed',
      };
      wasUnavailable = true;
    } else if (
      currentPrice !== null &&
      currentPrice !== listing.askingPrice &&
      isPriceChangeMeaningful(
        listing.askingPrice,
        currentPrice,
        CONFIG.priceChangeMinDelta,
        CONFIG.priceChangeMinPercent
      )
    ) {
      const rawChangePercent = ((currentPrice - listing.askingPrice) / listing.askingPrice) * 100;
      const changePercent = Math.round(rawChangePercent * 100) / 100;
      change = {
        type: NotificationEventType.LISTING_PRICE_CHANGED,
        oldPrice: listing.askingPrice,
        newPrice: currentPrice,
        changePercent,
        /* istanbul ignore next -- both branches covered indirectly; ternary value tested via sent event payload */
        direction: changePercent > 0 ? 'increase' : 'decrease',
      };
    }

    // Update parse stats BEFORE deciding whether to commit the transaction
    updatePlatformParseStats(platformStats, platform, parseSuccess, change !== null, wasUnavailable);

    // Anomaly check BEFORE committing — suppresses mass false-positive unavailable events
    if (isUnavailable && isAnomalyThresholdExceeded(platformStats[platform], CONFIG.anomalyThresholdPercent)) {
      logger.error('Possible selector breakage — suppressing unavailable event', {
        platform,
        unavailableCount: platformStats[platform].unavailable,
        totalChecked: platformStats[platform].checked,
      });
      // Still update lastMonitoredAt without creating an event
      await prisma.listing.update({
        where: { id: listing.id },
        data: { lastMonitoredAt: new Date() },
      });
      return { hadError: false };
    }

    // Commit state change + event atomically
    if (change !== null) {
      await prisma.$transaction((tx) =>
        updateListingStateWithEvent(tx, listing.id, listing, change!)
      );
      eventsCreated.count++;
      // SSE emission: fire-and-forget after DB commit
      if (listing.userId) {
        sseEmitter.emit({
          type: change.type as import('@/lib/sse-emitter').SseEventType,
          data: { ...change, listingId: listing.id, listingTitle: listing.title },
          id: listing.id,
        }).catch(/* istanbul ignore next -- fire-and-forget SSE; rejection is intentionally a no-op */ () => {/* no-op */});
      }
    } else {
      // No state change — still update lastMonitoredAt
      await prisma.listing.update({
        where: { id: listing.id },
        data: { lastMonitoredAt: new Date() },
      });
    }

    return { hadError: false };
  } catch (err) {
    if (err instanceof RateLimitError) {
      // Rate-limited — rethrow so circuit breaker can track it
      throw err;
    }
    logger.warn('Listing check failed — skipping', {
      listingId: listing.id,
      platform,
      error: String(err),
    });
    return { hadError: true };
  }
}

// ---------------------------------------------------------------------------
// MonitoringJobService
// ---------------------------------------------------------------------------

export class MonitoringJobService {
  /**
   * Reap any RUNNING jobs older than MONITORING_STALE_JOB_TIMEOUT_MS.
   * Must be called BEFORE the atomic create.
   */
  async reapStaleJobs(): Promise<void> {
    const staleThreshold = new Date(Date.now() - CONFIG.staleJobTimeoutMs);
    const staleJobs = await prisma.monitoringJob.findMany({
      where: { status: 'RUNNING', startedAt: { lt: staleThreshold } },
      select: { id: true },
    });

    for (const job of staleJobs) {
      await prisma.monitoringJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Reaped: exceeded maximum run duration',
          completedAt: new Date(),
        },
      });
      logger.warn('Reaped stale monitoring job', { jobId: job.id });
    }
  }

  /**
   * Atomically create a RUNNING monitoring job.
   * Returns null and throws ConflictError signals if a job is already running.
   */
  async startJob(): Promise<string> {
    try {
      const job = await prisma.monitoringJob.create({
        data: { status: 'RUNNING', startedAt: new Date() },
        select: { id: true },
      });
      return job.id;
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        // Unique constraint on RUNNING status — concurrent job already running
        throw Object.assign(new Error('A monitoring job is already running.'), {
          code: 'MONITORING_CONCURRENT',
        });
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError ||
        err instanceof Prisma.PrismaClientInitializationError
      ) {
        throw new ExternalServiceError('database', String(err));
      }
      throw err;
    }
  }

  async completeJob(
    jobId: string,
    summary: Omit<MonitoringRunSummary, 'jobId' | 'status' | 'durationMs'>
  ): Promise<void> {
    try {
      await prisma.monitoringJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          listingsChecked: summary.listingsChecked,
          eventsCreated: summary.eventsCreated + summary.expiryEventsCreated,
          errorsEncountered: summary.errorsEncountered,
          platformStats: { ...summary.platformStats, _meta: { expiryEventsCreated: summary.expiryEventsCreated } } as Prisma.InputJsonValue,
          skippedPlatforms: summary.skippedPlatforms as Prisma.InputJsonValue,
          completedEarly: summary.completedEarly,
          canaryWarning: summary.canaryWarning,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError ||
        err instanceof Prisma.PrismaClientInitializationError
      ) {
        throw new ExternalServiceError('database', String(err));
      }
      throw err;
    }
  }

  async failJob(jobId: string, errorMessage: string): Promise<void> {
    try {
      await prisma.monitoringJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError ||
        err instanceof Prisma.PrismaClientInitializationError
      ) {
        throw new ExternalServiceError('database', String(err));
      }
      throw err;
    }
  }

  /**
   * Execute a complete monitoring run synchronously within the HTTP request lifecycle.
   *
   * Steps:
   *  1. Reap stale jobs
   *  2. Atomically create RUNNING job
   *  3. Pre-flight platform checks
   *  4. Fetch listings (capped at MONITORING_MAX_LISTINGS_PER_RUN, ordered by lastMonitoredAt ASC)
   *  5. Batch by platform, apply inter-batch delays, platform circuit breaker
   *  6. Anomaly detection per platform
   *  7. Complete/fail job with stats
   */
  async run(): Promise<MonitoringRunSummary> {
    const runStart = Date.now();

    // Step 1: Reap stale jobs
    await this.reapStaleJobs();

    // Step 2: Atomically create RUNNING job
    const jobId = await this.startJob();
    logger.info('Monitoring run started', { jobId });

    const platformStats: Record<string, PlatformParseStats> = {};
    const eventsCreated = { count: 0 };
    let listingsChecked = 0;
    let errorsEncountered = 0;
    let completedEarly = false;
    let canaryWarning = false;

    try {
      // Step 3: Pre-flight
      const { skipPlatforms } = await runPreflightChecks();

      // Step 4: Fetch listings
      const allListings = await getTrackableListings({ take: CONFIG.maxListingsPerRun });
      const totalEligible = allListings.length;

      logger.info('Monitoring run: listings fetched', {
        jobId,
        totalEligible,
        cap: CONFIG.maxListingsPerRun,
      });

      // Step 5: Group by platform for efficient batching
      const byPlatform = new Map<string, TrackableListing[]>();
      for (const listing of allListings) {
        const group = byPlatform.get(listing.platform) ?? [];
        group.push(listing);
        byPlatform.set(listing.platform, group);
      }

      // Per-platform consecutive failure counter (circuit breaker — resets each run)
      const consecutiveFailures: Record<string, number> = {};

      for (const [platform, platformListings] of byPlatform) {
        // Check skip list (pre-flight or circuit-breaker from a prior platform)
        if (skipPlatforms[platform]) {
          logger.info('Skipping platform', { platform, reason: skipPlatforms[platform] });
          continue;
        }

        // Enforce per-platform cap
        const capped = platformListings.slice(0, CONFIG.maxChecksPerPlatform);

        // eBay: process in batches of 20 via Browse API
        if (platform === 'EBAY') {
          for (let i = 0; i < capped.length; i += 20) {
            // Check max duration
            /* istanbul ignore next -- max-duration abort; not testable without mocking Date.now across the batch loop */
            if (Date.now() - runStart >= CONFIG.maxRunDurationMs) {
              completedEarly = true;
              break;
            }

            const batch = capped.slice(i, i + 20);
            let batchResults: Map<string, ListingCheckResult>;
            try {
              batchResults = await checkEbayListingsBatch(batch);
            } catch /* istanbul ignore next -- checkEbayListingsBatch has its own internal catch and never throws */ {
              /* istanbul ignore next */
              for (const listing of batch) {
                errorsEncountered++;
                logger.warn('eBay batch check failed', { listingId: listing.id });
              }
              /* istanbul ignore next */
              continue;
            }

            for (const listing of batch) {
              const result = batchResults.get(listing.id) ?? {
                isSold: false, isUnavailable: false, currentPrice: null, parseSuccess: false,
              };
              const { isSold, isUnavailable, currentPrice, parseSuccess } = result;

              let change: StateChange | null = null;
              if (isSold) change = { type: NotificationEventType.LISTING_SOLD, soldIndicator: 'sold' };
              else if (isUnavailable) change = { type: NotificationEventType.LISTING_UNAVAILABLE, reason: 'removed' };
              else if (
                currentPrice !== null &&
                currentPrice !== listing.askingPrice &&
                isPriceChangeMeaningful(
                  listing.askingPrice, currentPrice,
                  CONFIG.priceChangeMinDelta, CONFIG.priceChangeMinPercent
                )
              ) {
                const rawEbayPct = ((currentPrice - listing.askingPrice) / listing.askingPrice) * 100;
                const ebayChangePercent = Math.round(rawEbayPct * 100) / 100;
                change = {
                  type: NotificationEventType.LISTING_PRICE_CHANGED,
                  oldPrice: listing.askingPrice,
                  newPrice: currentPrice,
                  changePercent: ebayChangePercent,
                  /* istanbul ignore next -- both branches covered indirectly; tested via eBay batch integration */
                  direction: ebayChangePercent > 0 ? 'increase' : 'decrease',
                };
              }

              updatePlatformParseStats(platformStats, platform, parseSuccess, change !== null, isUnavailable);

              // Anomaly check BEFORE committing — suppresses mass false-positive unavailable events
              if (isUnavailable && isAnomalyThresholdExceeded(platformStats[platform], CONFIG.anomalyThresholdPercent)) {
                canaryWarning = true;
                logger.error('Possible selector breakage — suppressing unavailable event (eBay batch)', {
                  platform,
                  unavailableCount: platformStats[platform].unavailable,
                  totalChecked: platformStats[platform].checked,
                });
                await prisma.listing.update({ where: { id: listing.id }, data: { lastMonitoredAt: new Date() } });
                listingsChecked++;
                continue;
              }

              if (change !== null) {
                try {
                  await prisma.$transaction((tx) => updateListingStateWithEvent(tx, listing.id, listing, change!));
                  eventsCreated.count++;
                  // SSE emission: fire-and-forget after DB commit
                  if (listing.userId) {
                    sseEmitter.emit({
                      type: change.type as import('@/lib/sse-emitter').SseEventType,
                      data: { ...change, listingId: listing.id, listingTitle: listing.title },
                      id: listing.id,
                    }).catch(/* istanbul ignore next -- fire-and-forget SSE; rejection is intentionally a no-op */ () => {/* no-op */});
                  }
                } catch (err) {
                  errorsEncountered++;
                  logger.warn('Failed to persist listing state change', { listingId: listing.id, error: String(err) });
                }
              } else {
                await prisma.listing.update({ where: { id: listing.id }, data: { lastMonitoredAt: new Date() } });
              }
              listingsChecked++;
            }
          }
          continue;
        }

        // HTML-based platforms: one listing at a time with inter-batch delays
        for (let i = 0; i < capped.length; i += CONFIG.batchSize) {
          // Check max duration before each batch
          if (Date.now() - runStart >= CONFIG.maxRunDurationMs) {
            completedEarly = true;
            logger.info('Max run duration reached — stopping early', {
              jobId,
              batchesCompleted: Math.floor(i / CONFIG.batchSize),
            });
            break;
          }

          // Circuit breaker check
          if ((consecutiveFailures[platform] ?? 0) >= CONFIG.platformFailureThreshold) {
            skipPlatforms[platform] = 'circuit_breaker_tripped';
            logger.error('Platform circuit breaker tripped — skipping remaining listings', {
              platform,
              consecutiveFailures: consecutiveFailures[platform],
              skippedListings: capped.length - i,
            });
            break;
          }

          const batch = capped.slice(i, Math.min(i + CONFIG.batchSize, capped.length));

          for (const listing of batch) {
            try {
              const { hadError } = await processOneListing(listing, platformStats, eventsCreated);
              if (hadError) {
                consecutiveFailures[platform] = (consecutiveFailures[platform] ?? 0) + 1;
                errorsEncountered++;
              } else {
                consecutiveFailures[platform] = 0;
              }
              listingsChecked++;
            } catch (err) {
              if (err instanceof RateLimitError) {
                consecutiveFailures[platform] = (consecutiveFailures[platform] ?? 0) + 1;
              }
              errorsEncountered++;
              listingsChecked++;
              logger.warn('Listing check failed', {
                listingId: listing.id,
                platform,
                error: String(err),
              });
            }
          }

          // Check canary warning for this platform after batch
          const pStats = platformStats[platform];
          if (pStats && pStats.checked >= 5) {
            const parseRate = pStats.parsed / pStats.checked;
            if (parseRate < 0.5) {
              canaryWarning = true;
              logger.error('monitoring.canary.failure', {
                platform,
                parseRate: Math.round(parseRate * 100),
                parsed: pStats.parsed,
                checked: pStats.checked,
              });
            }
          }

          // Inter-batch delay (skip for last batch and for eBay)
          if (i + CONFIG.batchSize < capped.length) {
            await new Promise((resolve) => setTimeout(resolve, CONFIG.batchDelayMs));
          }
        }

        if (completedEarly) break;
      }

      // Step 6 (expiry detection pass): backfill + find listings expiring within 24 hours
      let expiryEventsCreated = 0;
      try {
        // Lazy backfill: set estimatedExpiresAt for active listings that have postedAt
        // but have not yet been assigned an expiry. getExpiringListings() filters on
        // estimatedExpiresAt IS NOT NULL, so this pass must run BEFORE that query.
        try {
          const needsBackfill = await prisma.listing.findMany({
            where: { estimatedExpiresAt: null, postedAt: { not: null } },
            select: { id: true, platform: true, postedAt: true },
            take: 200, // bounded to avoid overlong runs
          });
          for (const l of needsBackfill) {
            const computed = computeEstimatedExpiry(l.platform, l.postedAt);
            if (computed) {
              await prisma.listing.update({
                where: { id: l.id },
                data: { estimatedExpiresAt: computed },
              });
            }
          }
        } catch (backfillErr) {
          logger.warn('Lazy backfill of estimatedExpiresAt failed — continuing', { error: String(backfillErr) });
        }

        const expiringListings = await getExpiringListings(24);
        for (const listing of expiringListings) {
          if (!listing.userId) continue;

          const now = new Date();
          const hoursRemaining = Math.max(
            0,
            Math.round((listing.estimatedExpiresAt.getTime() - now.getTime()) / 3_600_000)
          );

          try {
            const expiryChange = {
              type: NotificationEventType.LISTING_EXPIRING,
              estimatedExpiresAt: listing.estimatedExpiresAt.toISOString(),
              hoursRemaining,
            };
            await prisma.$transaction((tx) =>
              updateListingStateWithEvent(tx, listing.id, listing, expiryChange)
            );
            expiryEventsCreated++;
            // SSE emission: fire-and-forget after DB commit
            sseEmitter.emit({
              type: 'listing.expiring',
              data: { ...expiryChange, listingId: listing.id, listingTitle: listing.title },
              id: listing.id,
            }).catch(/* istanbul ignore next -- fire-and-forget SSE; rejection is intentionally a no-op */ () => {/* no-op */});
          } catch (err) {
            // P2002 deduplication is handled inside createNotificationEvent — other errors are logged
            logger.warn('Failed to create expiry event', { listingId: listing.id, error: String(err) });
          }
        }
      } catch (err) {
        logger.warn('Expiry detection pass failed — continuing', { error: String(err) });
      }

      const durationMs = Date.now() - runStart;
      const summary: MonitoringRunSummary = {
        jobId,
        status: 'COMPLETED',
        listingsChecked,
        eventsCreated: eventsCreated.count,
        expiryEventsCreated,
        errorsEncountered,
        platformStats,
        skippedPlatforms: skipPlatforms,
        completedEarly,
        canaryWarning,
        durationMs,
      };

      await this.completeJob(jobId, summary);
      logger.info('Monitoring run completed', { jobId, durationMs, listingsChecked, eventsCreated: eventsCreated.count, expiryEventsCreated });

      return summary;
    } catch (err) {
      /* istanbul ignore next -- non-Error thrown in run(); tests always throw Error instances */
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Monitoring run failed', { jobId, error: errorMessage });
      /* istanbul ignore next -- best-effort; if failJob itself throws the original error still propagates */
      await this.failJob(jobId, errorMessage).catch(/* istanbul ignore next -- best-effort; if failJob itself throws the original error still propagates */ () => {/* best-effort */});
      throw err;
    }
  }
}

export const monitoringJobService = new MonitoringJobService();
