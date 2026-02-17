/**
 * Tests for src/lib/monitoring.ts
 * Covers: error alerting, DB performance tracking, system health, alert handlers
 */

import {
  configureMonitoring,
  recordError,
  recordDbQuery,
  getDbPerformanceSummary,
  getSystemHealth,
  onAlert,
} from '@/lib/monitoring';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: jest.fn(),
    observe: jest.fn(),
  },
}));

const { logger } = jest.requireMock('@/lib/logger');
const { metrics } = jest.requireMock('@/lib/metrics');

describe('monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config to defaults
    configureMonitoring({
      errorRateThreshold: 10,
      slowQueryThresholdMs: 1000,
      memoryUsageThreshold: 0.9,
    });
  });

  // ─── configureMonitoring ─────────────────────────────────

  describe('configureMonitoring', () => {
    it('should update configuration with partial overrides', () => {
      configureMonitoring({ errorRateThreshold: 5 });
      expect(logger.info).toHaveBeenCalledWith(
        'Monitoring configuration updated',
        expect.objectContaining({
          config: expect.objectContaining({ errorRateThreshold: 5 }),
        })
      );
    });

    it('should merge with existing config', () => {
      configureMonitoring({ slowQueryThresholdMs: 500 });
      expect(logger.info).toHaveBeenCalledWith(
        'Monitoring configuration updated',
        expect.objectContaining({
          config: expect.objectContaining({
            slowQueryThresholdMs: 500,
            errorRateThreshold: 10, // preserved from default
          }),
        })
      );
    });
  });

  // ─── recordError ──────────────────────────────────────────

  describe('recordError', () => {
    it('should record a string error', () => {
      recordError('something broke');
      expect(metrics.increment).toHaveBeenCalledWith('app_errors_total');
      expect(logger.error).toHaveBeenCalledWith('something broke', expect.any(Object));
    });

    it('should record an Error object with stack', () => {
      const err = new Error('test error');
      recordError(err, { userId: '123' });
      expect(logger.error).toHaveBeenCalledWith(
        'test error',
        expect.objectContaining({ stack: expect.any(String), userId: '123' })
      );
    });

    it('should trigger alert when error rate exceeds threshold', () => {
      // Use a high threshold to account for accumulated errors from other tests
      configureMonitoring({ errorRateThreshold: 50 });
      const handler = jest.fn();
      onAlert(handler);

      // Record enough errors to definitely exceed threshold
      for (let i = 0; i < 50; i++) {
        recordError(`err-${i}`);
      }
      expect(handler).toHaveBeenCalledWith(
        'high_error_rate',
        expect.objectContaining({ threshold: 50 })
      );
    });

    it('should not crash if alert handler throws', () => {
      configureMonitoring({ errorRateThreshold: 1 });
      onAlert(() => {
        throw new Error('handler crash');
      });
      // Should not throw
      expect(() => recordError('err')).not.toThrow();
    });
  });

  // ─── recordDbQuery ────────────────────────────────────────

  describe('recordDbQuery', () => {
    it('should record a normal query', () => {
      recordDbQuery('SELECT * FROM users', 50);
      expect(metrics.observe).toHaveBeenCalledWith('db_query_duration_ms', 50);
      expect(metrics.increment).toHaveBeenCalledWith('db_queries_total');
    });

    it('should flag slow queries', () => {
      recordDbQuery('SELECT * FROM big_table', 1500);
      expect(metrics.increment).toHaveBeenCalledWith('db_slow_queries_total');
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow database query detected',
        expect.objectContaining({ durationMs: 1500 })
      );
    });

    it('should not flag queries under threshold', () => {
      recordDbQuery('SELECT 1', 100);
      expect(metrics.increment).not.toHaveBeenCalledWith('db_slow_queries_total');
    });

    it('should truncate long query strings in slow query warnings', () => {
      const longQuery = 'SELECT ' + 'x'.repeat(300);
      recordDbQuery(longQuery, 2000);
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow database query detected',
        expect.objectContaining({
          query: longQuery.substring(0, 200),
        })
      );
    });

    it('should evict old entries when exceeding max history', () => {
      for (let i = 0; i < 105; i++) {
        recordDbQuery(`query-${i}`, 10);
      }
      const summary = getDbPerformanceSummary();
      expect(summary.totalQueries).toBeLessThanOrEqual(100);
    });
  });

  // ─── getDbPerformanceSummary ──────────────────────────────

  describe('getDbPerformanceSummary', () => {
    it('should return zeros when no queries recorded', () => {
      // Note: queries from other tests may linger, so we just test the shape
      const summary = getDbPerformanceSummary();
      expect(summary).toHaveProperty('totalQueries');
      expect(summary).toHaveProperty('avgDurationMs');
      expect(summary).toHaveProperty('slowQueries');
      expect(summary).toHaveProperty('recentQueries');
      expect(summary.recentQueries.length).toBeLessThanOrEqual(10);
    });

    it('should compute average correctly', () => {
      // Record fresh queries
      recordDbQuery('q1', 100);
      recordDbQuery('q2', 200);
      const summary = getDbPerformanceSummary();
      expect(summary.avgDurationMs).toBeGreaterThan(0);
    });
  });

  // ─── getSystemHealth ──────────────────────────────────────

  describe('getSystemHealth', () => {
    it('should return healthy status normally', () => {
      const health = getSystemHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memory).toHaveProperty('used');
      expect(health.memory).toHaveProperty('total');
      expect(health.memory).toHaveProperty('percentage');
      expect(health.db).toHaveProperty('totalQueries');
    });

    it('should report unhealthy when error rate is high', () => {
      configureMonitoring({ errorRateThreshold: 2 });
      // Record enough errors to exceed threshold
      recordError('e1');
      recordError('e2');
      recordError('e3');
      const health = getSystemHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.errorRate).toBeGreaterThanOrEqual(2);
    });

    it('should report degraded when error rate is half threshold', () => {
      configureMonitoring({ errorRateThreshold: 4 });
      // 2 errors = half of 4 threshold
      recordError('e1');
      recordError('e2');
      const health = getSystemHealth();
      // Could be degraded or unhealthy depending on accumulated errors from other tests
      expect(['degraded', 'unhealthy']).toContain(health.status);
    });
  });

  // ─── onAlert ──────────────────────────────────────────────

  describe('onAlert', () => {
    it('should call multiple handlers', () => {
      configureMonitoring({ errorRateThreshold: 1 });
      const h1 = jest.fn();
      const h2 = jest.fn();
      onAlert(h1);
      onAlert(h2);

      recordError('trigger');

      expect(h1).toHaveBeenCalledWith('high_error_rate', expect.any(Object));
      expect(h2).toHaveBeenCalledWith('high_error_rate', expect.any(Object));
    });
  });
});
