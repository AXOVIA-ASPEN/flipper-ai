/**
 * Sentry Edge Configuration
 * 
 * Runs on Edge Runtime (Vercel Edge Functions, Middleware) to capture errors.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out sensitive data
  beforeSend(event) {
    // Filter out auth tokens from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/gi, 'token=REDACTED');
    }

    return event;
  },

  // Don't send events in development mode by default
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
});
