/**
 * Request Monitoring for Flipper AI
 * Tracks API request counts, latencies, status codes, and error rates.
 * Used by API route handlers to record request metrics.
 */

import { metrics } from './metrics';
import { logger } from './logger';

interface RequestRecord {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  requestId?: string;
  userId?: string;
  error?: string;
}

const MAX_RECENT_REQUESTS = 200;
const recentRequests: RequestRecord[] = [];

/**
 * Record an API request for monitoring.
 * Call this at the end of each API handler.
 */
export function recordRequest(record: RequestRecord): void {
  // Counter: total requests
  metrics.increment('http_requests_total');
  metrics.increment(`http_requests.${record.method.toLowerCase()}`);
  metrics.increment(`http_status.${record.statusCode}`);

  // Histogram: response latency
  metrics.observe('http_response_time_ms', record.durationMs);
  metrics.observe(`http_response_time.${normalizePath(record.path)}`, record.durationMs);

  // Track errors (4xx and 5xx)
  if (record.statusCode >= 400) {
    metrics.increment('http_errors_total');
    if (record.statusCode >= 500) {
      metrics.increment('http_server_errors');
    } else {
      metrics.increment('http_client_errors');
    }
  }

  // Structured log for slow requests (>1000ms)
  if (record.durationMs > 1000) {
    logger.warn('Slow request detected', {
      method: record.method,
      path: record.path,
      durationMs: record.durationMs,
      statusCode: record.statusCode,
    });
  }

  // Store recent requests (ring buffer)
  recentRequests.push(record);
  if (recentRequests.length > MAX_RECENT_REQUESTS) {
    recentRequests.shift();
  }
}

/**
 * Normalize API path for metric grouping.
 * e.g., /api/listings/abc123 -> /api/listings/:id
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9-]{20,}/g, '/:id') // UUID-like IDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/^\/api\//, '') // Remove /api/ prefix
    .replace(/\//g, '.'); // Dots for metric names
}

/** Get recent requests for monitoring dashboard */
export function getRecentRequests(limit = 50): RequestRecord[] {
  return recentRequests.slice(-limit);
}

/** Get request rate stats */
export function getRequestStats(): {
  totalRequests: number;
  recentCount: number;
  avgResponseTimeMs: number;
  errorRate: number;
} {
  const total = recentRequests.length;
  if (total === 0) {
    return { totalRequests: 0, recentCount: 0, avgResponseTimeMs: 0, errorRate: 0 };
  }

  const sumDuration = recentRequests.reduce((sum, r) => sum + r.durationMs, 0);
  const errorCount = recentRequests.filter((r) => r.statusCode >= 400).length;

  return {
    totalRequests: total,
    recentCount: total,
    avgResponseTimeMs: Math.round(sumDuration / total),
    errorRate: Math.round((errorCount / total) * 100) / 100,
  };
}

/** Clear recent requests (for testing) */
export function clearRequests(): void {
  recentRequests.length = 0;
}

const requestMonitor = { recordRequest, getRecentRequests, getRequestStats, clearRequests };
export default requestMonitor;
