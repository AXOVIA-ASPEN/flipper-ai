const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig = {
  output: isExport ? 'export' : 'standalone',
  ...(isExport ? {} : {
    outputFileTracingIncludes: {
      '/*': ['./node_modules/.prisma/client/**/*'],
    },
  }),
  images: {
    unoptimized: isExport,
  },
  serverExternalPackages: ['@browserbasehq/stagehand', 'playwright'],
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Security headers for production deployment
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // TODO: replace 'unsafe-eval' and 'unsafe-inline' with nonces in a
              // follow-up — Next.js currently needs them for client hydration.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              // img-src stays permissive because marketplace image URLs span many
              // domains (ebay, craigslist, mercari, facebook, offerup, etc.).
              // Images can't execute code, so the blast radius is small.
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // connect-src is tightened — explicit allowlist of every backend
              // the app talks to. Adding a new service requires updating this list.
              [
                "connect-src 'self'",
                'https://api.stripe.com',
                'https://*.firebaseio.com',
                'https://*.googleapis.com',
                'https://identitytoolkit.googleapis.com',
                'https://securetoken.googleapis.com',
                'https://firestore.googleapis.com',
                'https://firebasestorage.googleapis.com',
                'https://*.sentry.io',
                'https://*.ingest.sentry.io',
                'https://api.openai.com',
                'https://api.anthropic.com',
                'https://api.groq.com',
                'https://generativelanguage.googleapis.com',
                'https://maps.googleapis.com',
                'wss://ws.pusherapp.com',
              ].join(' '),
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
        ],
      },
    ];
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
