import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30000,
  use: { baseURL: 'http://localhost:3001' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
