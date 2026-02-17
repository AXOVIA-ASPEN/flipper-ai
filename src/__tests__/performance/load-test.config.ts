/**
 * Load Testing Configuration for Flipper AI
 * Uses autocannon for HTTP load testing
 */

export interface LoadTestConfig {
  url: string;
  connections: number;
  duration: number; // seconds
  pipelining: number;
  expectedRps: number; // minimum requests per second
  expectedLatencyP99: number; // max p99 latency in ms
}

export const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:3000';

export const loadTestScenarios: Record<string, LoadTestConfig> = {
  healthCheck: {
    url: `${BASE_URL}/api/health`,
    connections: 50,
    duration: 10,
    pipelining: 10,
    expectedRps: 500,
    expectedLatencyP99: 200,
  },
  listingsRead: {
    url: `${BASE_URL}/api/listings`,
    connections: 25,
    duration: 10,
    pipelining: 5,
    expectedRps: 100,
    expectedLatencyP99: 500,
  },
  opportunitiesRead: {
    url: `${BASE_URL}/api/opportunities`,
    connections: 25,
    duration: 10,
    pipelining: 5,
    expectedRps: 50,
    expectedLatencyP99: 1000,
  },
  analyticsRead: {
    url: `${BASE_URL}/api/analytics`,
    connections: 10,
    duration: 10,
    pipelining: 2,
    expectedRps: 30,
    expectedLatencyP99: 1500,
  },
};

export const performanceBudgets = {
  /** Max bundle size for main page (KB) */
  maxBundleSize: 500,
  /** Max time to first byte (ms) */
  maxTTFB: 800,
  /** Max memory usage per request (MB) */
  maxMemoryPerRequest: 50,
  /** Min requests/sec under load */
  minRpsUnderLoad: 50,
};
