import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Flipper AI E2E tests.
 *
 * Server resolution order:
 *   1. BASE_URL env var (explicit override, e.g. CI staging server)
 *   2. webServer auto-starts `next start` on port 3200 if nothing is running
 *
 * Port 3200 is the Flipper.ai project standard (avoids conflicts with other
 * Next.js projects defaulting to 3000/3001).
 *
 * In CI: build job runs first, then e2e job uses the built output to start
 * `next start` via webServer config below.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  // Auto-start a production server if nothing is already listening on 3200.
  // - In CI: `next build` runs before this job; webServer starts `next start`.
  // - Locally: reuseExistingServer skips launching a new process if 3200 is up.
  // - Override with BASE_URL env var to point at any other server.
  webServer: BASE_URL.includes('localhost:3200')
    ? {
        command: 'npx next start -p 3200',
        url: 'http://localhost:3200',
        reuseExistingServer: !process.env.CI, // In CI, always start fresh
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
          APP_URL: 'http://localhost:3200',
        },
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
