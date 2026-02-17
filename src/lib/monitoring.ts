/**
 * Central Monitoring Module for Flipper AI
 * Provides error alerting, database performance monitoring,
 * and unified monitoring interface.
 */

import os from 'os';
import { logger } from './logger';
import { metrics } from './metrics';

// ─── Error Alerting ───────────────────────────────────────────

interface AlertConfig {
  errorRateThreshold: number; // errors per minute to trigger alert
  slowQueryThresholdMs: number; // ms before a DB query is "slow"
  memoryUsageThreshold: number; // percentage (0-1)
}

const defaultConfig: AlertConfig = {
  errorRateThreshold: 10,
  slowQueryThresholdMs: 1000,
  memoryUsageThreshold: 0.9,
};

let config: AlertConfig = { ...defaultConfig };

const errorTimestamps: number[] = [];
const WINDOW_MS = 60_000; // 1 minute sliding window

export function configureMonitoring(overrides: Partial<AlertConfig>): void {
  config = { ...config, ...overrides };
  logger.info('Monitoring configuration updated', { config });
}

/**
 * Record an application error for alerting purposes.
 */
export function recordError(error: Error | string, context?: Record<string, unknown>): void {
  const now = Date.now();
  errorTimestamps.push(now);

  // Prune old entries outside the window
  while (errorTimestamps.length > 0 && errorTimestamps[0]! < now - WINDOW_MS) {
    errorTimestamps.shift();
  }

  metrics.increment('app_errors_total');
  logger.error(typeof error === 'string' ? error : error.message, {
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  // Check if error rate exceeds threshold
  if (errorTimestamps.length >= config.errorRateThreshold) {
    triggerAlert('high_error_rate', {
      errorsInWindow: errorTimestamps.length,
      threshold: config.errorRateThreshold,
    });
  }
}

// ─── Database Performance Monitoring ──────────────────────────

interface QueryRecord {
  query: string;
  durationMs: number;
  timestamp: number;
}

const recentQueries: QueryRecord[] = [];
const MAX_QUERY_HISTORY = 100;

/**
 * Record a database query for performance tracking.
 */
export function recordDbQuery(query: string, durationMs: number): void {
  const record: QueryRecord = { query, durationMs, timestamp: Date.now() };

  recentQueries.push(record);
  if (recentQueries.length > MAX_QUERY_HISTORY) {
    recentQueries.shift();
  }

  metrics.observe('db_query_duration_ms', durationMs);
  metrics.increment('db_queries_total');

  if (durationMs > config.slowQueryThresholdMs) {
    metrics.increment('db_slow_queries_total');
    logger.warn('Slow database query detected', {
      query: query.substring(0, 200),
      durationMs,
      threshold: config.slowQueryThresholdMs,
    });
  }
}

/**
 * Get database performance summary.
 */
export function getDbPerformanceSummary(): {
  totalQueries: number;
  avgDurationMs: number;
  slowQueries: number;
  recentQueries: QueryRecord[];
} {
  const total = recentQueries.length;
  const avg = total > 0 ? recentQueries.reduce((s, q) => s + q.durationMs, 0) / total : 0;
  const slow = recentQueries.filter((q) => q.durationMs > config.slowQueryThresholdMs).length;

  return {
    totalQueries: total,
    avgDurationMs: Math.round(avg * 100) / 100,
    slowQueries: slow,
    recentQueries: recentQueries.slice(-10),
  };
}

// ─── Alerting ─────────────────────────────────────────────────

type AlertHandler = (type: string, details: Record<string, unknown>) => void;
const alertHandlers: AlertHandler[] = [];

/**
 * Register a callback for monitoring alerts.
 */
export function onAlert(handler: AlertHandler): void {
  alertHandlers.push(handler);
}

function triggerAlert(type: string, details: Record<string, unknown>): void {
  logger.error(`ALERT: ${type}`, details);
  metrics.increment(`alerts.${type}`);
  for (const handler of alertHandlers) {
    try {
      handler(type, details);
    } catch {
      // Don't let alert handlers crash monitoring
    }
  }
}

// ─── System Health ────────────────────────────────────────────

/**
 * Get overall system health snapshot.
 */
export function getSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: { used: number; total: number; percentage: number };
  errorRate: number;
  db: ReturnType<typeof getDbPerformanceSummary>;
} {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const usedMem = mem.rss;
  const memPct = usedMem / totalMem;

  const now = Date.now();
  const recentErrors = errorTimestamps.filter((t) => t > now - WINDOW_MS).length;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (recentErrors >= config.errorRateThreshold || memPct >= config.memoryUsageThreshold) {
    status = 'unhealthy';
  } else if (recentErrors >= config.errorRateThreshold / 2 || memPct >= config.memoryUsageThreshold * 0.8) {
    status = 'degraded';
  }

  return {
    status,
    uptime: process.uptime(),
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: Math.round(memPct * 10000) / 100,
    },
    errorRate: recentErrors,
    db: getDbPerformanceSummary(),
  };
}

export const monitoring = {
  configureMonitoring,
  recordError,
  recordDbQuery,
  getDbPerformanceSummary,
  getSystemHealth,
  onAlert,
};
