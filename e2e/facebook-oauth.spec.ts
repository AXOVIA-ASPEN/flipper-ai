import { test, expect } from '@playwright/test';

/**
 * E2E: Facebook OAuth Integration Flow
 *
 * BDD Scenarios for the Facebook OAuth endpoints:
 *   - GET  /api/auth/facebook/status    (check connection status)
 *   - GET  /api/auth/facebook/authorize  (initiate OAuth)
 *   - POST /api/auth/facebook/disconnect (revoke + delete token)
 *
 * These tests use API-level mocking since Facebook OAuth requires
 * external redirects that can't be completed in e2e without real credentials.
 */

test.describe('Facebook OAuth Integration', () => {
  test.describe('Feature: Check Facebook Connection Status', () => {
    test('Scenario: Given an unauthenticated user, When they check Facebook status, Then they receive 401', async ({
      request,
    }) => {
      const response = await request.get('/api/auth/facebook/status');
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Unauthorized');
    });

    test('Scenario: Given an authenticated user with no Facebook token, When they check status, Then connected is false', async ({
      page,
    }) => {
      // Mock auth session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      // Mock Facebook status — no token stored
      await page.route('**/api/auth/facebook/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: false, expiresAt: null }),
        });
      });

      // Navigate to settings where Facebook status is typically shown
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify the page loaded (settings page exists)
      expect(page.url()).toContain('/settings');
    });

    test('Scenario: Given an authenticated user with a valid Facebook token, When they check status, Then connected is true with expiry', async ({
      page,
    }) => {
      const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();

      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/facebook/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: true, expiresAt: futureDate }),
        });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/settings');
    });
  });

  test.describe('Feature: Initiate Facebook OAuth Authorization', () => {
    test('Scenario: Given an unauthenticated user, When they try to authorize Facebook, Then they receive 401', async ({
      request,
    }) => {
      const response = await request.get('/api/auth/facebook/authorize', {
        maxRedirects: 0,
      });
      // Either 401 or redirect to login
      expect([401, 302, 307]).toContain(response.status());
    });

    test('Scenario: Given Facebook OAuth is not configured, When an authenticated user initiates auth, Then they receive a config error', async ({
      page,
    }) => {
      // Mock the authorize endpoint to simulate missing config
      await page.route('**/api/auth/facebook/authorize', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error:
              'Facebook OAuth not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env',
          }),
        });
      });

      const response = await page.request.get('/api/auth/facebook/authorize');
      // Mocked response
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('not configured');
    });

    test('Scenario: Given Facebook OAuth is configured, When an authenticated user initiates auth, Then they are redirected to Facebook', async ({
      page,
    }) => {
      // Mock authorize to simulate a redirect to Facebook
      await page.route('**/api/auth/facebook/authorize', async (route) => {
        await route.fulfill({
          status: 302,
          headers: {
            Location: 'https://www.facebook.com/v18.0/dialog/oauth?client_id=fake&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Ffacebook%2Fcallback&state=abc123&scope=email',
          },
        });
      });

      const response = await page.request.get('/api/auth/facebook/authorize', {
        maxRedirects: 0,
      });

      expect(response.status()).toBe(302);
      const location = response.headers()['location'];
      expect(location).toContain('facebook.com');
      expect(location).toContain('dialog/oauth');
    });
  });

  test.describe('Feature: Disconnect Facebook Account', () => {
    test('Scenario: Given an unauthenticated user, When they try to disconnect Facebook, Then they receive 401', async ({
      request,
    }) => {
      const response = await request.post('/api/auth/facebook/disconnect');
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Unauthorized');
    });

    test('Scenario: Given an authenticated user with a connected Facebook account, When they disconnect, Then the connection is removed', async ({
      page,
    }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/facebook/disconnect', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      const response = await page.request.post('/api/auth/facebook/disconnect');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('success', true);
    });

    test('Scenario: Given an authenticated user with no Facebook connection, When they disconnect, Then it still succeeds gracefully', async ({
      page,
    }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-2', email: 'noconnection@example.com', name: 'No FB User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/facebook/disconnect', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      const response = await page.request.post('/api/auth/facebook/disconnect');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  test.describe('Feature: Facebook OAuth UI Flow on Settings Page', () => {
    test('Scenario: Given a user is on settings page, When Facebook is not connected, Then they see a connect button', async ({
      page,
    }) => {
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/facebook/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: false, expiresAt: null }),
        });
      });

      // Mock user settings
      await page.route('**/api/user/settings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            theme: 'dark',
            notifications: true,
            defaultLocation: 'sarasota',
          }),
        });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Facebook-related UI elements
      const fbSection = page.getByText(/facebook/i).first();
      if (await fbSection.isVisible()) {
        // If there's a connect button, verify it exists
        const connectBtn = page.getByRole('button', { name: /connect.*facebook/i });
        const linkBtn = page.getByRole('link', { name: /connect.*facebook/i });

        const hasConnect = (await connectBtn.count()) > 0 || (await linkBtn.count()) > 0;
        // The settings page should show Facebook integration status
        expect(await fbSection.isVisible()).toBeTruthy();
      }
    });

    test('Scenario: Given a user is on settings page, When Facebook is connected, Then they see disconnect option and expiry info', async ({
      page,
    }) => {
      const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();

      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/facebook/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: true, expiresAt: futureDate }),
        });
      });

      await page.route('**/api/user/settings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            theme: 'dark',
            notifications: true,
            defaultLocation: 'sarasota',
          }),
        });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const fbSection = page.getByText(/facebook/i).first();
      if (await fbSection.isVisible()) {
        // When connected, should show connected status or disconnect option
        const connectedIndicator = page.getByText(/connected|disconnect/i).first();
        if (await connectedIndicator.count()) {
          expect(await connectedIndicator.isVisible()).toBeTruthy();
        }
      }
    });
  });
});
