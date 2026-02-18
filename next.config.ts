import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppress source map upload logs in CI
  silent: process.env.CI === 'true',

  // Organization and project from Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from public
  hideSourceMaps: true,

  // Disable source map upload in development
  disableSourcemapUpload: process.env.NODE_ENV !== 'production',
};

// Only enable Sentry in production or when explicitly enabled
const useSentry = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true';

export default useSentry
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
