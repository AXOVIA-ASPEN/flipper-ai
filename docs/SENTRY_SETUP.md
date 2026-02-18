# Sentry Integration Setup

## Overview

Flipper AI uses [Sentry](https://sentry.io/) for real-time error tracking and performance monitoring in production.

## Configuration

### 1. Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account (or sign in)
2. Create a new project and select "Next.js" as the platform
3. Copy your DSN (Data Source Name) from the project settings

### 2. Set Environment Variables

Add the following to your Vercel environment variables (or `.env.local` for local testing):

```bash
# Required: Sentry DSN for error tracking
SENTRY_DSN="https://your-sentry-dsn@o123456.ingest.sentry.io/7654321"
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@o123456.ingest.sentry.io/7654321"

# Optional: For source map uploads (production builds)
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="flipper-ai"
SENTRY_AUTH_TOKEN="your-auth-token"
```

#### Where to add these in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production**, **Preview**, and **Development**
4. Redeploy your app

### 3. Verify Integration

#### Test in Development

```bash
# Set SENTRY_DSN in .env.local
echo 'SENTRY_DSN="https://your-dsn@sentry.io/..."' >> .env.local

# Trigger a test error
npm run dev
# Visit http://localhost:3000/api/test-error (if you create this endpoint)
```

#### Check Sentry Dashboard

1. Go to your Sentry project
2. Navigate to **Issues**
3. You should see captured errors appear in real-time

### 4. Testing Error Capture

You can manually test error capture with:

```typescript
import { captureError } from '@/lib/error-tracker';

try {
  throw new Error('Test error for Sentry');
} catch (error) {
  captureError(error as Error, {
    route: '/test',
    action: 'manual_test',
    userId: 'test-user-123',
  });
}
```

## Features

- ✅ **Automatic error capture** - All errors logged via `captureError()` are sent to Sentry
- ✅ **Performance monitoring** - Traces for API requests and page loads
- ✅ **Session Replay** - Visual playback of user sessions when errors occur
- ✅ **Source maps** - Readable stack traces in production
- ✅ **Release tracking** - Errors linked to specific Git commits

## Configuration Files

- `sentry.client.config.ts` - Browser-side Sentry initialization
- `sentry.server.config.ts` - Server-side Sentry initialization
- `src/lib/error-tracker.ts` - Wrapper that forwards errors to Sentry

## Sampling Rates

By default:

- **Production traces**: 10% sampling (reduce costs)
- **Development traces**: 100% sampling (full visibility)
- **Error replays**: 100% (capture all sessions with errors)
- **Regular replays**: 10% (random sampling for UX insights)

Adjust these in `sentry.client.config.ts` and `sentry.server.config.ts`.

## Troubleshooting

### Errors not appearing in Sentry

1. **Check DSN is set** - Verify `SENTRY_DSN` is in your environment variables
2. **Check network** - Sentry requires outbound HTTPS to `*.ingest.sentry.io`
3. **Check filters** - `beforeSend` hook in config might be filtering out certain errors
4. **Check logs** - Set `debug: true` in Sentry config to see detailed logs

### Source maps not working

1. **Verify auth token** - `SENTRY_AUTH_TOKEN` must have `project:write` scope
2. **Check build logs** - Vercel should show "Uploading source maps to Sentry"
3. **Manual upload** - Run `npx @sentry/wizard@latest` for troubleshooting

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel + Sentry Integration](https://vercel.com/integrations/sentry)
- [Sentry Error Monitoring Best Practices](https://docs.sentry.io/product/issues/)

---

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Last Updated:** February 18, 2026
