/**
 * Error Tracking for Flipper AI
 * Lightweight error capture with Sentry-ready integration point.
 * Falls back to structured logging when Sentry is not configured.
 */

import { logger } from './logger';
import { metrics } from './metrics';

interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  [key: string]: unknown;
}

interface CapturedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  fingerprint: string;
}

const MAX_ERRORS = 50;
const recentErrors: CapturedError[] = [];

function fingerprint(error: Error, context: ErrorContext): string {
  return `${error.name}:${error.message}:${context.route ?? 'unknown'}`;
}

/**
 * Capture and track an error.
 * If SENTRY_DSN is set, this is where you'd call Sentry.captureException().
 */
export function captureError(error: Error, context: ErrorContext = {}): void {
  const captured: CapturedError = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    fingerprint: fingerprint(error, context),
  };

  // Track in metrics
  metrics.increment('errors_total');
  metrics.increment(`errors.${context.route ?? 'unknown'}`);

  // Structured log
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });

  // Store recent errors (ring buffer)
  recentErrors.push(captured);
  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.shift();
  }

  // Sentry integration point
  if (process.env.SENTRY_DSN) {
    // TODO: Initialize Sentry SDK and call Sentry.captureException(error, { extra: context })
    // For now, we log that Sentry DSN is configured but SDK not yet installed
    logger.debug('Sentry DSN configured - would forward error to Sentry', {
      fingerprint: captured.fingerprint,
    });
  }
}

/** Get recent captured errors for the monitoring dashboard */
export function getRecentErrors(): CapturedError[] {
  return [...recentErrors];
}

/** Clear recent errors */
export function clearErrors(): void {
  recentErrors.length = 0;
}

export default { captureError, getRecentErrors, clearErrors };
