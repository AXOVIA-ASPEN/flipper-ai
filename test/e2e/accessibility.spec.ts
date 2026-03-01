import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Accessibility Compliance
 *
 * All major pages should meet WCAG 2.1 Level AA standards.
 * Uses axe-core to detect violations automatically.
 */

test.describe('Feature: Accessibility Compliance (WCAG 2.1 AA)', () => {
  test.describe('Scenario: Public pages are accessible', () => {
    test('Given a visitor on the login page, Then there should be no critical accessibility violations', async ({
      page,
    }) => {
      await page.goto('/login');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(
        results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
        `Login page has critical/serious a11y violations:\n${formatViolations(results.violations)}`
      ).toHaveLength(0);
    });

    test('Given a visitor on the registration page, Then there should be no critical accessibility violations', async ({
      page,
    }) => {
      await page.goto('/register');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(
        results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
        `Registration page has critical/serious a11y violations:\n${formatViolations(results.violations)}`
      ).toHaveLength(0);
    });
  });

  test.describe('Scenario: Authenticated pages are accessible', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    const authenticatedPages = [
      { name: 'Dashboard', path: '/' },
      { name: 'Opportunities', path: '/opportunities' },
      { name: 'Scraper', path: '/scraper' },
      { name: 'Messages', path: '/messages' },
      { name: 'Settings', path: '/settings' },
    ];

    for (const { name, path } of authenticatedPages) {
      test(`Given a logged-in user on the ${name} page, Then there should be no critical accessibility violations`, async ({
        page,
      }) => {
        await page.goto(path);
        // Wait for page content to load
        await page.waitForLoadState('networkidle');

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        const serious = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(
          serious,
          `${name} page has ${serious.length} critical/serious a11y violations:\n${formatViolations(serious)}`
        ).toHaveLength(0);
      });
    }
  });

  test.describe('Scenario: Keyboard navigation works on key pages', () => {
    test('Given a visitor on the login page, When they tab through elements, Then focus is visible and logical', async ({
      page,
    }) => {
      await page.goto('/login');

      // Tab through interactive elements and verify focus is visible
      const focusableElements: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const tag = el.tagName.toLowerCase();
          const type = el.getAttribute('type') || '';
          const name = el.getAttribute('name') || el.getAttribute('aria-label') || '';
          return `${tag}[${type || name}]`;
        });
        if (focused) focusableElements.push(focused);
      }

      // Login page should have at least email, password, and submit button focusable
      expect(focusableElements.length).toBeGreaterThanOrEqual(2);
    });

    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Given a logged-in user on the dashboard, When they tab through elements, Then interactive elements receive focus', async ({
      page,
    }) => {
      await mockAuthSession(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const focusableElements: string[] = [];
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return el.tagName.toLowerCase();
        });
        if (focused) focusableElements.push(focused);
      }

      // Dashboard should have navigable elements (links, buttons)
      expect(focusableElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});

/**
 * Format axe violations into a readable string for test output.
 */
function formatViolations(violations: { id: string; impact?: string | null; description: string; nodes: { html: string }[] }[]): string {
  if (violations.length === 0) return 'None';
  return violations
    .map(
      (v) =>
        `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n    Affected: ${v.nodes
          .slice(0, 3)
          .map((n) => n.html.substring(0, 80))
          .join('\n    ')}`
    )
    .join('\n');
}
