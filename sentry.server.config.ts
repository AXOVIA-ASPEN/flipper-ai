/**
 * Sentry Server Configuration
 * 
 * Runs on the Node.js server to capture server-side errors and performance data.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Include debugging info in development
  debug: process.env.NODE_ENV === 'development',

  // Filter out sensitive data
  beforeSend(event) {
    // Remove database connection strings
    if (event.request?.env) {
      delete event.request.env.DATABASE_URL;
      delete event.request.env.AUTH_SECRET;
    }

    // Filter out auth tokens from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/gi, 'token=REDACTED');
    }

    return event;
  },

  integrations: [
    // Add profiling (requires @sentry/profiling-node)
    // Sentry.profilingIntegration(),
  ],

  // Don't send events in development mode by default
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
});
