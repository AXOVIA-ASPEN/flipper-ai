# Monitoring & Observability — Flipper AI

## Overview

Flipper AI uses a layered monitoring approach:

| Layer | Module | Purpose |
|-------|--------|---------|
| HTTP Requests | `src/lib/request-monitor.ts` | Track API latency, status codes, error rates |
| Application | `src/lib/monitoring.ts` | Error alerting, DB perf, system health |
| Metrics | `src/lib/metrics.ts` | In-memory counters and histograms |
| Client | `src/components/WebVitals.tsx` | Core Web Vitals (LCP, FID, CLS, FCP, TTFB) |
| Health Check | `src/app/api/health/route.ts` | Liveness/readiness endpoint |

## Endpoints

### `GET /api/health`
Returns application health status, uptime, and dependency checks.

### `POST /api/health/vitals`
Receives client-side Web Vitals reports from the `<WebVitals />` component.

## Setup

### 1. Install web-vitals (optional, for client metrics)
```bash
pnpm add web-vitals
```

### 2. Add WebVitals to root layout
```tsx
import { WebVitals } from '@/components/WebVitals';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

### 3. Configure monitoring thresholds
```ts
import { configureMonitoring } from '@/lib/monitoring';

configureMonitoring({
  errorRateThreshold: 10,      // errors/min before alert
  slowQueryThresholdMs: 1000,  // slow query threshold
  memoryUsageThreshold: 0.9,   // memory alert at 90%
});
```

## Alerting

Register alert handlers to receive notifications:

```ts
import { onAlert } from '@/lib/monitoring';

onAlert((type, details) => {
  // Send to Slack, PagerDuty, email, etc.
  console.error(`ALERT [${type}]`, details);
});
```

### Alert Types
- `high_error_rate` — Error count exceeds threshold within 1-minute window

## Database Monitoring

```ts
import { recordDbQuery, getDbPerformanceSummary } from '@/lib/monitoring';

// Wrap DB calls
const start = Date.now();
const result = await prisma.user.findMany();
recordDbQuery('user.findMany', Date.now() - start);

// Get summary
const summary = getDbPerformanceSummary();
// { totalQueries, avgDurationMs, slowQueries, recentQueries }
```

## System Health

```ts
import { getSystemHealth } from '@/lib/monitoring';

const health = getSystemHealth();
// { status: 'healthy'|'degraded'|'unhealthy', uptime, memory, errorRate, db }
```

## Dashboards

For production, export metrics to external systems:
- **Prometheus**: Expose `/api/metrics` endpoint with `prom-client`
- **Grafana**: Connect to Prometheus for dashboards
- **Sentry**: Add `@sentry/nextjs` for error tracking with stack traces
- **Vercel Analytics**: Built-in if deployed on Vercel

## Runbook

### High Error Rate Alert
1. Check `/api/health` for status
2. Review application logs for error patterns
3. Check database connectivity and latency
4. Roll back recent deployments if needed

### Degraded Performance
1. Check `getDbPerformanceSummary()` for slow queries
2. Review memory usage in `getSystemHealth()`
3. Check for N+1 query patterns in recent changes
4. Scale resources if under load

### Memory Threshold Exceeded
1. Check for memory leaks (growing RSS over time)
2. Review recent code changes for large in-memory caches
3. Restart the service as immediate mitigation
4. Profile with `--inspect` flag for root cause
