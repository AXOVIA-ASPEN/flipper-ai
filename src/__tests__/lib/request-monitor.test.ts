import { recordRequest, getRecentRequests, getRequestStats, clearRequests } from '@/lib/request-monitor';
import { metrics } from '@/lib/metrics';

// Mock dependencies
jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: jest.fn(),
    observe: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Request Monitor', () => {
  beforeEach(() => {
    clearRequests();
    jest.clearAllMocks();
  });

  describe('recordRequest', () => {
    it('increments total request counter', () => {
      recordRequest({
        method: 'GET',
        path: '/api/listings',
        statusCode: 200,
        durationMs: 50,
        timestamp: new Date().toISOString(),
      });

      expect(metrics.increment).toHaveBeenCalledWith('http_requests_total');
      expect(metrics.increment).toHaveBeenCalledWith('http_requests.get');
      expect(metrics.increment).toHaveBeenCalledWith('http_status.200');
    });

    it('records response time histogram', () => {
      recordRequest({
        method: 'POST',
        path: '/api/analyze/123',
        statusCode: 200,
        durationMs: 250,
        timestamp: new Date().toISOString(),
      });

      expect(metrics.observe).toHaveBeenCalledWith('http_response_time_ms', 250);
    });

    it('tracks client errors (4xx)', () => {
      recordRequest({
        method: 'GET',
        path: '/api/listings/999',
        statusCode: 404,
        durationMs: 10,
        timestamp: new Date().toISOString(),
      });

      expect(metrics.increment).toHaveBeenCalledWith('http_errors_total');
      expect(metrics.increment).toHaveBeenCalledWith('http_client_errors');
      expect(metrics.increment).not.toHaveBeenCalledWith('http_server_errors');
    });

    it('tracks server errors (5xx)', () => {
      recordRequest({
        method: 'POST',
        path: '/api/listings',
        statusCode: 500,
        durationMs: 30,
        timestamp: new Date().toISOString(),
      });

      expect(metrics.increment).toHaveBeenCalledWith('http_errors_total');
      expect(metrics.increment).toHaveBeenCalledWith('http_server_errors');
    });

    it('does not increment error counters for success', () => {
      recordRequest({
        method: 'GET',
        path: '/api/health',
        statusCode: 200,
        durationMs: 5,
        timestamp: new Date().toISOString(),
      });

      expect(metrics.increment).not.toHaveBeenCalledWith('http_errors_total');
    });

    it('logs slow requests (>1000ms)', () => {
      const { logger } = require('@/lib/logger');
      recordRequest({
        method: 'GET',
        path: '/api/analyze/heavy',
        statusCode: 200,
        durationMs: 1500,
        timestamp: new Date().toISOString(),
      });

      expect(logger.warn).toHaveBeenCalledWith('Slow request detected', expect.objectContaining({
        durationMs: 1500,
      }));
    });

    it('does not log normal speed requests', () => {
      const { logger } = require('@/lib/logger');
      recordRequest({
        method: 'GET',
        path: '/api/health',
        statusCode: 200,
        durationMs: 50,
        timestamp: new Date().toISOString(),
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('stores requests in ring buffer', () => {
      for (let i = 0; i < 5; i++) {
        recordRequest({
          method: 'GET',
          path: `/api/test/${i}`,
          statusCode: 200,
          durationMs: 10 + i,
          timestamp: new Date().toISOString(),
        });
      }

      const recent = getRecentRequests();
      expect(recent).toHaveLength(5);
      expect(recent[0].path).toBe('/api/test/0');
      expect(recent[4].path).toBe('/api/test/4');
    });

    it('respects limit parameter for getRecentRequests', () => {
      for (let i = 0; i < 10; i++) {
        recordRequest({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          durationMs: 10,
          timestamp: new Date().toISOString(),
        });
      }

      expect(getRecentRequests(3)).toHaveLength(3);
    });
  });

  describe('getRequestStats', () => {
    it('returns zeros when no requests recorded', () => {
      const stats = getRequestStats();
      expect(stats).toEqual({
        totalRequests: 0,
        recentCount: 0,
        avgResponseTimeMs: 0,
        errorRate: 0,
      });
    });

    it('calculates average response time', () => {
      recordRequest({ method: 'GET', path: '/a', statusCode: 200, durationMs: 100, timestamp: '' });
      recordRequest({ method: 'GET', path: '/b', statusCode: 200, durationMs: 200, timestamp: '' });
      recordRequest({ method: 'GET', path: '/c', statusCode: 200, durationMs: 300, timestamp: '' });

      const stats = getRequestStats();
      expect(stats.avgResponseTimeMs).toBe(200);
      expect(stats.totalRequests).toBe(3);
    });

    it('calculates error rate', () => {
      recordRequest({ method: 'GET', path: '/ok', statusCode: 200, durationMs: 10, timestamp: '' });
      recordRequest({ method: 'GET', path: '/ok', statusCode: 200, durationMs: 10, timestamp: '' });
      recordRequest({ method: 'GET', path: '/err', statusCode: 500, durationMs: 10, timestamp: '' });
      recordRequest({ method: 'GET', path: '/err', statusCode: 404, durationMs: 10, timestamp: '' });

      const stats = getRequestStats();
      expect(stats.errorRate).toBe(0.5);
    });
  });

  describe('clearRequests', () => {
    it('clears all stored requests', () => {
      recordRequest({ method: 'GET', path: '/a', statusCode: 200, durationMs: 10, timestamp: '' });
      expect(getRecentRequests()).toHaveLength(1);

      clearRequests();
      expect(getRecentRequests()).toHaveLength(0);
    });
  });
});
