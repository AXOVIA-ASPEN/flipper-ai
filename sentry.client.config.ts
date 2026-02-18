/**
 * Sentry Client Configuration
 * 
 * Runs in the browser to capture client-side errors and performance data.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay (captures user interactions for debugging)
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0,   // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out sensitive data
  beforeSend(event) {
    // Remove user IP addresses
    if (event.request) {
      delete event.request.headers;
    }

    // Filter out auth tokens from URLs and breadcrumbs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/gi, 'token=REDACTED');
    }

    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't send events in development mode by default
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
});
