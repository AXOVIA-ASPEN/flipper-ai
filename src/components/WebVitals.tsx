'use client';

import { useEffect } from 'react';

/**
 * Web Vitals Reporting Component for Flipper AI
 * Reports Core Web Vitals (LCP, FID, CLS, FCP, TTFB) to the analytics endpoint.
 * Include this component in the root layout for client-side performance monitoring.
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
}

function sendToAnalytics(metric: WebVitalMetric): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  // Send to analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
  });

  // Use sendBeacon for reliability (works even during page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/health/vitals', body);
  } else {
    fetch('/api/health/vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail — vitals reporting is best-effort
    });
  }
}

export function WebVitals(): null {
  useEffect(() => {
    // Dynamically import web-vitals; gracefully skip if not installed
    const loadVitals = new Function(
      'cb',
      `import('web-vitals').then(m => cb(m)).catch(() => {})`
    );
    loadVitals((mod: Record<string, (fn: typeof sendToAnalytics) => void>) => {
      mod.onCLS?.(sendToAnalytics);
      mod.onFID?.(sendToAnalytics);
      mod.onLCP?.(sendToAnalytics);
      mod.onFCP?.(sendToAnalytics);
      mod.onTTFB?.(sendToAnalytics);
    });
  }, []);

  return null;
}

export default WebVitals;
