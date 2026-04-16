/**
 * @file test/acceptance/step_definitions/E-002-auth-access.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-15
 * @version 1.0
 * @brief Step definitions for FR-AUTH-ACCESS (Authenticated Access Control).
 *
 * @description
 * Covers scenarios E-002-S-49 through E-002-S-56 verifying:
 *   - Middleware redirects unauthenticated requests on protected routes
 *   - The Navigation component does not render on public routes
 *   - Authenticated users see the full navigation on protected routes
 *   - Expired session cookies are cleared and redirected
 *   - Public routes are unreachable nav sources for protected URLs
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ─── Authenticated-user helper ───────────────────────────────────────────────

Given('I am logged in', async function (this: CustomWorld) {
  // Construct a session cookie with a future `exp` claim. Middleware only
  // inspects the `exp` claim on the Edge runtime; full JWT verification
  // happens in API route handlers via Firebase Admin SDK.
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://session.firebase.google.com/test',
      sub: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1h from now
    })
  ).toString('base64url');
  const signature = 'test-signature-edge-middleware-only-checks-exp';
  const validToken = `${header}.${payload}.${signature}`;

  await this.page.context().addCookies([
    {
      name: '__session',
      value: validToken,
      domain: new URL(BASE_URL).hostname,
      path: '/',
      httpOnly: true,
      secure: false, // localhost dev
      sameSite: 'Strict',
    },
  ]);
});

// `When I navigate to {string}` is provided by E-002-settings.steps.ts.
// For status-code assertions we use an out-of-band fetch below.

// ─── FR-AUTH-ACCESS-01: protected routes redirect to login ───────────────────

Then(
  'I should be redirected to {string} with a {string} of {string}',
  async function (this: CustomWorld, loginPath: string, paramName: string, expectedValue: string) {
    await this.page.waitForURL((url) => url.pathname === loginPath, { timeout: 5000 });
    const url = new URL(this.page.url());
    expect(url.pathname).toBe(loginPath);
    expect(url.searchParams.get(paramName)).toBe(expectedValue);
  }
);

// ─── FR-AUTH-ACCESS-02: nav hidden on public routes ──────────────────────────

Then('I should not see the authenticated navigation bar', async function (this: CustomWorld) {
  const nav = this.page.locator('nav.fp-glass-nav');
  await expect(nav).toHaveCount(0);
});

Then('I should not see a link to {string}', async function (this: CustomWorld, href: string) {
  const navLink = this.page.locator(`nav.fp-glass-nav a[href="${href}"]`);
  await expect(navLink).toHaveCount(0);
});

Then('I should see the authenticated navigation bar', async function (this: CustomWorld) {
  const nav = this.page.locator('nav.fp-glass-nav');
  await expect(nav).toBeVisible();
});

Then(
  'I should see a link labeled {string} pointing to {string}',
  async function (this: CustomWorld, label: string, href: string) {
    const link = this.page.locator(`nav.fp-glass-nav a[href="${href}"]`).filter({ hasText: label });
    await expect(link.first()).toBeVisible();
  }
);

// ─── FR-AUTH-ACCESS-03: expired session ──────────────────────────────────────

Given('I have an expired session cookie', async function (this: CustomWorld) {
  // Craft a JWT with exp in the past. Signature is not verified by middleware's
  // edge-runtime check — only the exp claim is inspected.
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://session.firebase.google.com/test',
      sub: 'expired-user',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    })
  ).toString('base64url');
  const signature = 'invalid-signature-is-fine-middleware-only-checks-exp';
  const expiredToken = `${header}.${payload}.${signature}`;

  await this.page.context().addCookies([
    {
      name: '__session',
      value: expiredToken,
      domain: new URL(BASE_URL).hostname,
      path: '/',
      httpOnly: true,
      secure: false, // localhost dev
      sameSite: 'Strict',
    },
  ]);
});

Then('I should be redirected to {string}', async function (this: CustomWorld, path: string) {
  await this.page.waitForURL((url) => url.pathname === path, { timeout: 5000 });
  expect(new URL(this.page.url()).pathname).toBe(path);
});

Then('the {string} cookie should be cleared', async function (this: CustomWorld, cookieName: string) {
  const cookies = await this.page.context().cookies();
  const cookie = cookies.find((c) => c.name === cookieName);
  // Either absent or value is empty (expired cookies with maxAge=0 are cleared)
  if (cookie) {
    expect(cookie.value).toBe('');
  }
});

// ─── FR-AUTH-ACCESS-05: whitelisted public routes return 200 ─────────────────
// Status code is asserted by issuing a direct fetch so we don't have to rely
// on Playwright's goto() response (which follows middleware redirects).

Then('the response status code should be {int}', async function (this: CustomWorld, expected: number) {
  const currentUrl = new URL(this.page.url());
  const response = await fetch(currentUrl.toString(), { redirect: 'manual' });
  expect(response.status).toBe(expected);
});

// ─── FR-AUTH-ACCESS-06: no protected links on public pages ───────────────────

Then(
  'the page should not contain a link to any of:',
  async function (this: CustomWorld, table: DataTable) {
    const rows = table.raw().map((r) => r[0]);
    for (const href of rows) {
      const link = this.page.locator(`a[href="${href}"]`);
      await expect(link, `Found unexpected link to protected route ${href}`).toHaveCount(0);
    }
  }
);
