#!/usr/bin/env tsx
/**
 * Load Testing Script for Flipper AI
 *
 * Usage:
 *   pnpm tsx src/__tests__/performance/load-test.ts [scenario]
 *
 * Scenarios: healthCheck, listingsRead, opportunitiesRead, analyticsRead, all
 * Default: all
 *
 * Requires a running server: pnpm start (or pnpm dev)
 */

import autocannon from 'autocannon';
import { loadTestScenarios, performanceBudgets, type LoadTestConfig } from './load-test.config';

interface LoadTestResult {
  scenario: string;
  requests: { total: number; average: number; min: number; max: number };
  latency: { avg: number; p50: number; p95: number; p99: number; max: number };
  throughput: { avg: number; total: number };
  errors: number;
  timeouts: number;
  passed: boolean;
  failures: string[];
}

async function runScenario(name: string, config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(`\n🔄 Running: ${name}`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Connections: ${config.connections} | Duration: ${config.duration}s`);

  const result = await autocannon({
    url: config.url,
    connections: config.connections,
    duration: config.duration,
    pipelining: config.pipelining,
  });

  const failures: string[] = [];

  if (result.requests.average < config.expectedRps) {
    failures.push(
      `RPS ${result.requests.average.toFixed(0)} < expected ${config.expectedRps}`
    );
  }

  if (result.latency.p99 > config.expectedLatencyP99) {
    failures.push(
      `P99 latency ${result.latency.p99}ms > expected ${config.expectedLatencyP99}ms`
    );
  }

  const passed = failures.length === 0;
  const icon = passed ? '✅' : '❌';

  console.log(`${icon} ${name}:`);
  console.log(`   RPS: avg=${result.requests.average.toFixed(0)} (min ${config.expectedRps})`);
  console.log(`   Latency: p50=${result.latency.p50}ms p95=${result.latency.p95}ms p99=${result.latency.p99}ms (max p99: ${config.expectedLatencyP99}ms)`);
  console.log(`   Errors: ${result.errors} | Timeouts: ${result.timeouts}`);
  if (failures.length) console.log(`   Failures: ${failures.join('; ')}`);

  return {
    scenario: name,
    requests: {
      total: result.requests.total,
      average: result.requests.average,
      min: result.requests.min,
      max: result.requests.max,
    },
    latency: {
      avg: result.latency.average,
      p50: result.latency.p50,
      p95: result.latency.p95,
      p99: result.latency.p99,
      max: result.latency.max,
    },
    throughput: {
      avg: result.throughput.average,
      total: result.throughput.total,
    },
    errors: result.errors,
    timeouts: result.timeouts,
    passed,
    failures,
  };
}

async function main() {
  const scenario = process.argv[2] || 'all';

  console.log('🐧 Flipper AI Load Testing');
  console.log('==========================');
  console.log(`Performance budgets: min ${performanceBudgets.minRpsUnderLoad} RPS, max ${performanceBudgets.maxTTFB}ms TTFB`);

  const scenarios =
    scenario === 'all'
      ? Object.entries(loadTestScenarios)
      : [[scenario, loadTestScenarios[scenario]] as [string, LoadTestConfig]].filter(
          ([, v]) => v
        );

  if (scenarios.length === 0) {
    console.error(`Unknown scenario: ${scenario}`);
    console.log(`Available: ${Object.keys(loadTestScenarios).join(', ')}, all`);
    process.exit(1);
  }

  const results: LoadTestResult[] = [];

  for (const [name, config] of scenarios) {
    results.push(await runScenario(name, config as LoadTestConfig));
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  const allPassed = results.every((r) => r.passed);
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(
      `${icon} ${r.scenario}: ${r.requests.average.toFixed(0)} RPS, p99=${r.latency.p99}ms, errors=${r.errors}`
    );
  }

  console.log(`\n${allPassed ? '✅ All scenarios passed!' : '❌ Some scenarios failed!'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
