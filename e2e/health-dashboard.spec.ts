import { test, expect } from '@playwright/test';

/**
 * Feature: /health - Production System Status Dashboard
 *
 * Verifies the real-time health monitoring page renders correctly
 * and shows accurate service status information.
 */

test.describe('/health page', () => {
  test('renders the health dashboard with title and status banner', async ({ page }) => {
    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    // Title should be visible
    await expect(page.getByText('Flipper AI System Status')).toBeVisible();

    // Should show a status banner (online / checking)
    await expect(
      page.getByText(/All Systems Operational|Partial Outage|Service Disruption|Checking status/)
    ).toBeVisible();
  });

  test('shows all expected service checks', async ({ page }) => {
    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    const services = [
      'API Server',
      'Database (SQLite/Postgres)',
      'Authentication (NextAuth)',
      'AI Analysis (LLM)',
      'Real-time SSE',
      'Rate Limiter',
    ];

    for (const service of services) {
      await expect(page.getByText(service)).toBeVisible();
    }
  });

  test('shows metric cards after health resolves', async ({ page }) => {
    // Mock the health API response
    await page.route('/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          version: '1.0.0',
          environment: 'test',
        }),
      });
    });

    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    // Wait for metrics to appear
    await expect(page.getByText('Uptime')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Version')).toBeVisible();
    await expect(page.getByText('1h 0m')).toBeVisible(); // 3600 seconds = 1h
    await expect(page.getByText('v1.0.0')).toBeVisible();
  });

  test('shows quick links section', async ({ page }) => {
    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Quick Links')).toBeVisible();
    await expect(page.getByRole('link', { name: /API Docs/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Health Check/ })).toBeVisible();
  });

  test('refresh button triggers re-fetch', async ({ page }) => {
    let callCount = 0;
    await page.route('/api/health', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: callCount * 100,
          version: '1.0.0',
          environment: 'test',
        }),
      });
    });

    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    const initialCount = callCount;
    await page.getByRole('button', { name: /Refresh/ }).click();
    await page.waitForTimeout(500);

    expect(callCount).toBeGreaterThan(initialCount);
  });

  test('handles API server offline gracefully', async ({ page }) => {
    await page.route('/api/health', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/health');
    await page.waitForLoadState('networkidle');

    // Should not crash - status banner should appear
    await expect(page.getByText('Flipper AI System Status')).toBeVisible();
    // Services should still render
    await expect(page.getByText('API Server')).toBeVisible();
  });

  test('screenshot: health dashboard full page', async ({ page }) => {
    // Mock for deterministic screenshot
    await page.route('/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          timestamp: '2026-02-17T15:00:00.000Z',
          uptime: 7200,
          version: '1.0.0',
          environment: 'production',
        }),
      });
    });
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('/api/events', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // let status checks settle

    await page.screenshot({
      path: 'e2e/screenshots/health-dashboard.png',
      fullPage: true,
    });
  });
});
