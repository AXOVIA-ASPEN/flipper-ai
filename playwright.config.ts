import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Flipper AI E2E tests.
 *
 * Server resolution order:
 *   1. BASE_URL env var (explicit override, e.g. CI staging server)
 *   2. PM2 staging on port 3001 (reuseExistingServer=true picks this up locally)
 *   3. webServer auto-starts `next start` on port 3000 if nothing is running
 *
 * In CI: build job runs first, then e2e job uses the built output to start
 * `next start` via webServer config below.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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
  // Auto-start a production server if nothing is already listening.
  // - In CI: `next build` runs before this job; webServer starts `next start`.
  // - Locally with PM2 on :3001: set BASE_URL=http://localhost:3001 and
  //   reuseExistingServer will skip launching a new process.
  webServer: BASE_URL.includes('localhost:3000')
    ? {
        command: 'npx next start -p 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
          AUTH_SECRET: process.env.AUTH_SECRET || 'playwright-test-secret',
          NEXTAUTH_URL: 'http://localhost:3000',
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
