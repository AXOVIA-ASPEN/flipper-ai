/**
 * @file src/lib/maps-service.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Google Maps Directions API client with exponential-backoff retry and 6-hour LRU cache.
 *
 * @description
 * Provides getRoute() which calls the Google Maps Directions API to calculate
 * driving directions between two addresses. Returns a RouteResult with travel time,
 * distance, and deep-link URLs, or null when no route is available / API is unconfigured.
 *
 * Key design decisions:
 *  - Returns null (not throws) on ZERO_RESULTS / NOT_FOUND — callers render degraded UI.
 *  - Throws ConfigurationError on REQUEST_DENIED (bad API key) — surfaced to ops.
 *  - Throws ExternalServiceError on OVER_DAILY_LIMIT / UNKNOWN_ERROR — retryable.
 *  - Exponential backoff: max 3 attempts, 1 s / 2 s / 4 s; retries on 429 + 5xx only.
 *  - 6-hour in-memory LRU cache keyed by hashed (userId, origin, destination) to avoid
 *    repeated API calls when a user refreshes the listing page.
 *  - Privacy: raw origin/destination addresses are NEVER logged. Hashed keys only.
 *  - deep-link URLs are built server-side with encodeURIComponent — never client-side.
 *  - Does NOT pass departure_time=now to avoid Premium tier billing; uses "typical traffic".
 */

import * as crypto from 'crypto';
import { LRUCache } from '@/lib/cache';
import { ConfigurationError, ExternalServiceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteResult {
  durationSeconds: number;
  distanceMeters: number;
  /** Human-readable duration, e.g. "30 mins" */
  durationText: string;
  /** Human-readable distance, e.g. "15.0 mi" */
  distanceText: string;
  /** Web URL for Google Maps directions (desktop fallback) */
  deepLinkUrl: string;
  /** Fallback search URL when no route available */
  mapsSearchUrl: string;
}

// ---------------------------------------------------------------------------
// Route cache — 6-hour TTL, max 200 entries
// ---------------------------------------------------------------------------

const ROUTE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const routeCache = new LRUCache<RouteResult>({ maxSize: 200, ttlMs: ROUTE_CACHE_TTL_MS });

// ---------------------------------------------------------------------------
// Privacy helpers — never store or log raw addresses
// ---------------------------------------------------------------------------

function hashAddress(address: string): string {
  return crypto.createHash('sha256').update(address).digest('hex').slice(0, 12);
}

function buildCacheKey(userId: string, origin: string, destination: string): string {
  return `route:${userId}:${hashAddress(origin)}:${hashAddress(destination)}`;
}

// ---------------------------------------------------------------------------
// Deep-link URL builders (server-side only — encodeURIComponent mandatory)
// ---------------------------------------------------------------------------

function buildDeepLinkUrl(origin: string, destination: string): string {
  const enc_origin = encodeURIComponent(origin);
  const enc_dest = encodeURIComponent(destination);
  return `https://www.google.com/maps/dir/?api=1&origin=${enc_origin}&destination=${enc_dest}&travelmode=driving`;
}

function buildMapsSearchUrl(destination: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

// ---------------------------------------------------------------------------
// Fetch with exponential-backoff retry (429 + 5xx only)
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
        }
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  throw new ExternalServiceError('Google Maps', `API unavailable after ${maxRetries} retries: ${String(lastError)}`);
}

// ---------------------------------------------------------------------------
// getRoute — main export
// ---------------------------------------------------------------------------

/**
 * Calculate driving route between two addresses via Google Maps Directions API.
 *
 * @param origin      - The start address (e.g. user's homeLocation)
 * @param destination - The destination address (e.g. opportunity.meetingLocation)
 * @param userId      - Used for cache keying only; never included in API calls
 * @returns RouteResult on success, null if no route available or API not configured
 * @throws ConfigurationError when API key is invalid (REQUEST_DENIED)
 * @throws ExternalServiceError when API is over limit or returns unknown error
 */
export async function getRoute(
  origin: string,
  destination: string,
  userId: string
): Promise<RouteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // AC-5: no API key → return null immediately, caller renders degraded UI
  if (!apiKey) {
    return null;
  }

  // Check cache first
  const cacheKey = buildCacheKey(userId, origin, destination);
  const cached = routeCache.get(cacheKey);
  if (cached) {
    logger.debug('maps.route.cache_hit', { cacheKey });
    return cached;
  }

  // Build request URL — encodeURIComponent is mandatory (non-negotiable per story spec)
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&mode=driving` +
    `&key=${apiKey}`;
  // NOTE: departure_time=now intentionally omitted — would trigger Premium tier billing.

  let res: Response;
  try {
    res = await fetchWithRetry(url);
  } catch (err) {
    // fetchWithRetry already wrapped in ExternalServiceError
    throw err;
  }

  let data: GoogleDirectionsResponse;
  try {
    data = (await res.json()) as GoogleDirectionsResponse;
  } catch {
    throw new ExternalServiceError('Google Maps', 'Failed to parse API response');
  }

  const status = data.status;

  if (status === 'OK') {
    const leg = data.routes?.[0]?.legs?.[0];
    if (!leg) {
      throw new ExternalServiceError('Google Maps', 'API returned OK but no route legs');
    }

    const result: RouteResult = {
      durationSeconds: leg.duration.value,
      distanceMeters: leg.distance.value,
      durationText: leg.duration.text,
      distanceText: leg.distance.text,
      deepLinkUrl: buildDeepLinkUrl(origin, destination),
      mapsSearchUrl: buildMapsSearchUrl(destination),
    };

    routeCache.set(cacheKey, result);
    return result;
  }

  if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
    // No driving route found — treat as degraded (AC-5)
    return null;
  }

  if (status === 'REQUEST_DENIED') {
    throw new ConfigurationError(
      'Google Maps API key is invalid or lacks Directions API permission (REQUEST_DENIED)'
    );
  }

  if (status === 'OVER_DAILY_LIMIT' || status === 'OVER_QUERY_LIMIT') {
    throw new ExternalServiceError('Google Maps', `API quota exceeded: ${status}`);
  }

  // UNKNOWN_ERROR or any other non-OK status
  throw new ExternalServiceError('Google Maps', `Unexpected API status: ${status}`);
}

// ---------------------------------------------------------------------------
// Cache invalidation helpers — called from settings/meeting update handlers
// ---------------------------------------------------------------------------

/**
 * Invalidate all route cache entries for a user.
 * Must be called when UserSettings.homeLocation changes.
 */
export function invalidateUserRouteCache(userId: string): void {
  // LRU cache does not support prefix deletion — clear all entries.
  // At scale, use Redis with SCAN + DEL; in-memory MVP accepts this trade-off.
  routeCache.clear();
  logger.debug('maps.route.cache_invalidated_user', { userId: userId.slice(0, 8) + '…' });
}

/**
 * Invalidate route cache for a specific origin/destination pair.
 * Must be called when opportunity.meetingLocation changes.
 */
export function invalidateRouteCache(userId: string, origin: string, destination: string): void {
  const key = buildCacheKey(userId, origin, destination);
  routeCache.delete(key);
}

// ---------------------------------------------------------------------------
// Internal Google Maps API response types
// ---------------------------------------------------------------------------

interface GoogleDirectionsResponse {
  status: string;
  routes?: Array<{
    legs?: Array<{
      duration: { value: number; text: string };
      distance: { value: number; text: string };
    }>;
  }>;
}
