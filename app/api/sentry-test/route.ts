/**
 * Sentry Test Endpoint
 * 
 * Use this to verify Sentry error tracking is working.
 * Visit /api/sentry-test in your browser to trigger a test error.
 * 
 * ⚠️ REMOVE THIS FILE BEFORE PRODUCTION DEPLOYMENT
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'error';

  if (testType === 'error') {
    // Test 1: Unhandled exception
    throw new Error('🧪 Sentry test error: This is a test error from /api/sentry-test');
  }

  if (testType === 'handled') {
    // Test 2: Manually captured exception
    try {
      throw new Error('🧪 Sentry test handled error');
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: 'manual-capture',
          endpoint: '/api/sentry-test',
        },
        level: 'warning',
      });

      return NextResponse.json({
        success: true,
        message: 'Handled error sent to Sentry',
        checkSentry: 'https://sentry.io',
      });
    }
  }

  if (testType === 'message') {
    // Test 3: Manual message
    Sentry.captureMessage('🧪 Sentry test message: Testing manual messages', {
      level: 'info',
      tags: {
        test: 'manual-message',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent to Sentry',
      checkSentry: 'https://sentry.io',
    });
  }

  return NextResponse.json({
    message: 'Sentry test endpoint',
    usage: {
      error: '/api/sentry-test?type=error (throws unhandled exception)',
      handled: '/api/sentry-test?type=handled (captures exception)',
      message: '/api/sentry-test?type=message (sends info message)',
    },
  });
}
