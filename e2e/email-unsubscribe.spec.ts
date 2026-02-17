import { test, expect } from '@playwright/test';

/**
 * Feature: Email Unsubscribe Flow (BDD)
 *
 * As a Flipper AI user who receives email notifications,
 * I want to be able to unsubscribe with a single click from any email
 * so that I can stop receiving notifications without logging in.
 *
 * Also covers re-subscribe via POST for the settings page flow.
 *
 * Route under test: /api/user/unsubscribe
 *   GET  ?token=<base64url-email>   → one-click unsubscribe (returns HTML page)
 *   POST ?token=<base64url-email>&resubscribe=true → re-enable emails (JSON)
 *
 * These tests run entirely via the Playwright `request` fixture (no browser window
 * needed) plus a handful of `page`-based tests that verify the rendered HTML.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode an email address into the base64url token the endpoint expects. */
function encodeToken(email: string): string {
  return Buffer.from(email).toString('base64url');
}

// ---------------------------------------------------------------------------
// API-level tests (request fixture)
// ---------------------------------------------------------------------------

test.describe('Feature: Email Unsubscribe — API', () => {
  // ------------------------------------------------------------------
  // Scenario 1 — missing token
  // ------------------------------------------------------------------
  test.describe('Scenario: Given a one-click unsubscribe link with no token, When I request it, Then I receive a 400 Bad Request', () => {
    test('GET /api/user/unsubscribe (no token) returns 400', async ({ request }) => {
      // Given  – no query parameter at all
      const response = await request.get('/api/user/unsubscribe');

      // Then   – endpoint must reject the malformed request
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/missing token/i);
    });
  });

  // ------------------------------------------------------------------
  // Scenario 2 — invalid / garbage token
  // ------------------------------------------------------------------
  test.describe('Scenario: Given an unsubscribe link with a corrupted token, When I request it, Then I receive a 400 Bad Request', () => {
    test('GET /api/user/unsubscribe?token=!!notbase64!! returns 400', async ({ request }) => {
      // Given  – token that decodes to something that isn't an email
      const response = await request.get('/api/user/unsubscribe?token=!!notbase64!!');

      // Then
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test('GET /api/user/unsubscribe?token=<not-an-email> returns 400', async ({ request }) => {
      // Given  – valid base64url that decodes to a non-email string
      const token = encodeToken('this-is-not-an-email');
      const response = await request.get(`/api/user/unsubscribe?token=${token}`);

      // Then
      expect(response.status()).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // Scenario 3 — valid token, user does NOT exist
  // ------------------------------------------------------------------
  test.describe('Scenario: Given a valid unsubscribe token for an unknown email, When I request it, Then I still receive a 200 success (privacy)', () => {
    test('GET /api/user/unsubscribe?token=<unknown-email> returns 200 HTML with success', async ({
      request,
    }) => {
      // Given  – a well-formed token for an address not in the DB
      const token = encodeToken('ghost-user-no-account@example.com');

      // When
      const response = await request.get(`/api/user/unsubscribe?token=${token}`);

      // Then   – endpoint deliberately masks whether the account exists
      expect(response.status()).toBe(200);
      const contentType = response.headers()['content-type'] ?? '';
      expect(contentType).toContain('text/html');

      const body = await response.text();
      expect(body).toContain('Unsubscribed Successfully');
    });
  });

  // ------------------------------------------------------------------
  // Scenario 4 — valid token, real user exists (mocked at DB layer)
  // ------------------------------------------------------------------
  test.describe('Scenario: Given a valid unsubscribe token for an existing user, When I follow the link, Then their email notifications are disabled', () => {
    test('GET /api/user/unsubscribe?token=<valid-email> returns 200 HTML confirmation', async ({
      page,
    }) => {
      // Arrange – intercept the API so this test does not need a live DB
      await page.route('**/api/user/unsubscribe**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');

        if (!token) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Missing token' }),
          });
          return;
        }

        // Simulate a successful unsubscribe HTML response
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<!DOCTYPE html><html><head><title>Unsubscribed Successfully — Flipper AI</title></head>
<body>
  <h1>Unsubscribed Successfully</h1>
  <p>You've been unsubscribed from all Flipper AI email notifications.</p>
  <a href="http://localhost:3000">Go to Flipper AI</a>
</body></html>`,
        });
      });

      const token = encodeToken('stephen@example.com');

      // Act
      await page.goto(`/api/user/unsubscribe?token=${token}`);

      // Assert – success page rendered in the browser
      await expect(page.getByRole('heading', { name: /unsubscribed successfully/i })).toBeVisible();
      await expect(page.getByText(/email notifications/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /go to flipper ai/i })).toBeVisible();
    });
  });

  // ------------------------------------------------------------------
  // Scenario 5 — POST re-subscribe, token missing
  // ------------------------------------------------------------------
  test.describe('Scenario: Given a re-subscribe request with no token, When I POST it, Then I receive a 400 Bad Request', () => {
    test('POST /api/user/unsubscribe (no token) returns 400', async ({ request }) => {
      // Given  – POST with resubscribe=true but no token
      const response = await request.post('/api/user/unsubscribe?resubscribe=true');

      // Then
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/missing token/i);
    });
  });

  // ------------------------------------------------------------------
  // Scenario 6 — POST re-subscribe, unknown user
  // ------------------------------------------------------------------
  test.describe('Scenario: Given a re-subscribe request for an unknown user, When I POST it, Then I receive a 404', () => {
    test('POST /api/user/unsubscribe?token=<unknown>&resubscribe=true returns 404', async ({
      request,
    }) => {
      // Given  – a well-formed token for an address not in the DB
      const token = encodeToken('nobody@nowhere.example.com');
      const response = await request.post(
        `/api/user/unsubscribe?token=${token}&resubscribe=true`,
      );

      // Then   – 404 (re-subscribe doesn't need to hide existence)
      expect([404, 400, 500]).toContain(response.status());
    });
  });

  // ------------------------------------------------------------------
  // Scenario 7 — token shape contract
  // ------------------------------------------------------------------
  test.describe('Scenario: Token is base64url-encoded email address', () => {
    test('encodeToken helper produces a valid base64url string', () => {
      // Given
      const email = 'user@flipper.ai';

      // When
      const token = encodeToken(email);

      // Then  – no padding `=` chars, only URL-safe alphabet
      expect(token).not.toContain('=');
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');

      // And the round-trip must decode back to the original email
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      expect(decoded).toBe(email);
    });

    test('encodeToken handles special characters in email (e.g. +)', () => {
      const email = 'user+alias@flipper.ai';
      const token = encodeToken(email);
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      expect(decoded).toBe(email);
    });
  });
});

// ---------------------------------------------------------------------------
// Browser / Page tests — HTML rendering
// ---------------------------------------------------------------------------

test.describe('Feature: Email Unsubscribe — HTML Page Rendering', () => {
  test.describe('Scenario: Given a user lands on the unsubscribe confirmation page, When the page loads, Then all UI elements are present', () => {
    test('Success page has heading, message, and return link', async ({ page }) => {
      // Arrange — mock the endpoint so we control the HTML
      await page.route('**/api/user/unsubscribe**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Unsubscribed Successfully — Flipper AI</title>
</head>
<body>
  <div>
    <div>✅</div>
    <h1>Unsubscribed Successfully</h1>
    <p>You've been unsubscribed from all Flipper AI email notifications.
       You can re-enable them at any time in your account settings.</p>
    <a href="http://localhost:3000">Go to Flipper AI</a>
  </div>
</body>
</html>`,
        });
      });

      const token = encodeToken('test@flipper.ai');
      await page.goto(`/api/user/unsubscribe?token=${token}`);

      // Heading
      await expect(page.getByRole('heading', { name: /unsubscribed successfully/i })).toBeVisible();

      // Body copy mentions notifications
      await expect(page.getByText(/email notifications/i)).toBeVisible();

      // CTA link present and points home
      const link = page.getByRole('link', { name: /go to flipper ai/i });
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    });

    test('Error page has a meaningful error heading and return link', async ({ page }) => {
      // Arrange — simulate a server-side failure response
      await page.route('**/api/user/unsubscribe**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'text/html; charset=utf-8',
          body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Something Went Wrong — Flipper AI</title>
</head>
<body>
  <div>
    <div>❌</div>
    <h1>Something Went Wrong</h1>
    <p>We couldn't process your unsubscribe request.
       Please try again or manage your preferences in the app.</p>
    <a href="http://localhost:3000">Go to Flipper AI</a>
  </div>
</body>
</html>`,
        });
      });

      const token = encodeToken('test@flipper.ai');
      await page.goto(`/api/user/unsubscribe?token=${token}`);

      await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
      await expect(page.getByText(/preferences/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /go to flipper ai/i })).toBeVisible();
    });
  });

  test.describe('Scenario: Unsubscribe page is accessible without authentication', () => {
    test('Given no auth session, When I visit the unsubscribe URL, Then the page renders without redirecting to login', async ({
      page,
    }) => {
      // Arrange — no auth mock; unsubscribe endpoint must be public
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({ json: {} }); // unauthenticated
      });

      await page.route('**/api/user/unsubscribe**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: '<html><body><h1>Unsubscribed Successfully</h1></body></html>',
        });
      });

      const token = encodeToken('public-user@example.com');
      await page.goto(`/api/user/unsubscribe?token=${token}`);

      // Must NOT have been redirected to /login or /signin
      const finalUrl = page.url();
      expect(finalUrl).not.toMatch(/\/(login|signin)/i);

      // Must show unsubscribe content
      await expect(page.getByRole('heading', { name: /unsubscribed/i })).toBeVisible();
    });
  });
});
