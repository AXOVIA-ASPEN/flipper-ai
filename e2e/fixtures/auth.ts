import { type Page, type BrowserContext } from '@playwright/test';

export const TEST_USER = {
  email: 'test@flipper.ai',
  password: 'TestPassword123!',
  name: 'Test User',
};

/**
 * Login helper — performs credential-based login via the UI.
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel(/Email/i).fill(TEST_USER.email);
  await page.getByLabel(/Password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /Sign [Ii]n/i }).click();
  await page.waitForURL('/');
}

/**
 * Mock NextAuth session so tests don't need real credentials.
 */
export async function mockAuthSession(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      json: {
        user: { name: TEST_USER.name, email: TEST_USER.email, image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
    });
  });
}

/**
 * Create an authenticated browser context with a stored session cookie.
 */
export async function createAuthenticatedContext(
  browser: { newContext: () => Promise<BrowserContext> },
): Promise<BrowserContext> {
  const context = await browser.newContext();
  // Add session cookie for NextAuth
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  return context;
}
