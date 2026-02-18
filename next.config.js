const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Sentry tree-shaking configuration
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
  },
}

// Sentry Webpack Plugin options for source map uploads
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Auth token for uploading source maps (required in CI/production)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Only upload source maps in CI or when explicitly enabled
  dryRun: !process.env.SENTRY_AUTH_TOKEN || process.env.CI !== 'true',
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
