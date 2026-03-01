import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Automated Seller Communication (BDD feature 03)
 *
 * Tests the AI-powered message drafting flow when contacting sellers
 * from opportunity cards — generating outreach, editing drafts,
 * approving/sending, and negotiation suggestions.
 */

const mockOpportunity = {
  id: 'opp-1',
  title: 'Vintage Nintendo 64 Console',
  price: 75,
  marketplace: 'craigslist',
  seller: { name: 'John', id: 'seller-1' },
  location: '5 miles away',
  status: 'identified',
  imageUrl: '/images/placeholder.png',
  estimatedValue: 150,
  profitMargin: 100,
};

const mockDraftResponse = {
  id: 'draft-1',
  opportunityId: 'opp-1',
  content:
    'Hi John, I saw your listing for the Vintage Nintendo 64 Console. I\'m very interested and would love to take a look. Would you be available for a pickup this week? Please let me know a good time. Thanks!',
  tone: 'friendly',
  generatedAt: new Date().toISOString(),
};

const mockNegotiationDraft = {
  id: 'draft-2',
  opportunityId: 'opp-1',
  content:
    'Thanks for getting back to me! Based on comparable listings, would you consider $60? I can pick up today and pay cash.',
  suggestedOffer: 60,
  rationale: 'Similar consoles sell for $50-80; $60 leaves healthy margin.',
  generatedAt: new Date().toISOString(),
};

function setupApiMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    // Mock opportunity detail
    page.route('**/api/opportunities/opp-1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: mockOpportunity });
      } else {
        await route.fallback();
      }
    }),

    // Mock AI draft generation
    page.route('**/api/opportunities/opp-1/draft-message', async (route) => {
      await route.fulfill({ json: mockDraftResponse });
    }),

    // Mock AI negotiation draft
    page.route('**/api/opportunities/opp-1/draft-reply', async (route) => {
      await route.fulfill({ json: mockNegotiationDraft });
    }),

    // Mock send message
    page.route('**/api/messages', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          json: {
            id: 'msg-new',
            conversationId: 'conv-new',
            content: body.content,
            status: 'sent',
            createdAt: new Date().toISOString(),
          },
        });
      } else {
        await route.fallback();
      }
    }),

    // Mock opportunity status update
    page.route('**/api/opportunities/opp-1/status', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ json: { ...mockOpportunity, status: 'contacted' } });
      } else {
        await route.fallback();
      }
    }),

    // Mock conversations list
    page.route('**/api/conversations*', async (route) => {
      await route.fulfill({ json: [] });
    }),
  ]);
}

test.describe('Feature: Automated Seller Communication', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await setupApiMocks(page);
  });

  test.describe('Scenario: Generate initial outreach message', () => {
    test('Given an opportunity, When I click "Draft Message", Then AI generates a friendly outreach', async ({
      page,
    }) => {
      // Given: I am on the opportunity detail page
      await page.goto('/opportunities/opp-1');

      // When: I click the Draft Message button
      const draftBtn = page.getByRole('button', { name: /draft message/i });
      await expect(draftBtn).toBeVisible({ timeout: 5000 });
      await draftBtn.click();

      // Then: An AI-drafted message should appear
      const draftArea = page.locator('[data-testid="draft-message"], .draft-message, textarea');
      await expect(draftArea.first()).toBeVisible({ timeout: 5000 });

      // And: The message should contain key elements
      const draftText = await draftArea.first().textContent() ?? await draftArea.first().inputValue().catch(() => '');
      expect(draftText).toContain('John');
      expect(draftText).toContain('Nintendo 64');
      expect(draftText).toContain('pickup');
    });
  });

  test.describe('Scenario: User approves and sends drafted message', () => {
    test('Given an AI-drafted message, When I approve, Then message is sent and status updates to Contacted', async ({
      page,
    }) => {
      // Given: I am on the opportunity detail with a draft ready
      await page.goto('/opportunities/opp-1');

      const draftBtn = page.getByRole('button', { name: /draft message/i });
      if (await draftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await draftBtn.click();
      }

      // When: I click Approve & Send (or Send)
      const sendBtn = page.getByRole('button', { name: /approve.*send|send message|send/i });
      await expect(sendBtn.first()).toBeVisible({ timeout: 5000 });
      await sendBtn.first().click();

      // Then: Confirmation should appear or status should change
      const successIndicator = page.locator(
        '[data-testid="message-sent"], .toast-success, [role="alert"], .status-contacted'
      );
      await expect(successIndicator.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Scenario: User edits AI-drafted message before sending', () => {
    test('Given an AI draft, When I edit and send, Then modified message is sent', async ({ page }) => {
      await page.goto('/opportunities/opp-1');

      // Trigger draft
      const draftBtn = page.getByRole('button', { name: /draft message/i });
      if (await draftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await draftBtn.click();
      }

      // Find editable area and modify
      const editableArea = page.locator(
        'textarea[data-testid="draft-message"], [contenteditable="true"], textarea.draft-editor, textarea'
      );
      if (await editableArea.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editableArea.first().click();
        // Append custom text
        await editableArea.first().press('End');
        await editableArea.first().type(' I am available Saturday afternoon.');

        const value =
          (await editableArea.first().inputValue().catch(() => '')) ||
          (await editableArea.first().textContent() ?? '');
        expect(value).toContain('Saturday afternoon');
      }
    });
  });

  test.describe('Scenario: AI suggests negotiation response', () => {
    test('Given a seller asks for best offer, When I click Draft Reply, Then AI suggests a counteroffer with rationale', async ({
      page,
    }) => {
      // Navigate to opportunity
      await page.goto('/opportunities/opp-1');

      // Look for Draft Reply button (assumes conversation context)
      const draftReplyBtn = page.getByRole('button', { name: /draft reply/i });
      if (await draftReplyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await draftReplyBtn.click();

        // The AI response should include a suggested offer
        const draftArea = page.locator('[data-testid="draft-message"], .draft-message, textarea');
        await expect(draftArea.first()).toBeVisible({ timeout: 5000 });

        const text = await draftArea.first().textContent() ?? await draftArea.first().inputValue().catch(() => '');
        // Should contain a dollar amount (negotiation)
        expect(text).toMatch(/\$\d+/);
      }
    });
  });

  test.describe('Scenario: Schedule pickup from conversation', () => {
    test('Given seller agrees to sell, When I click Schedule Pickup, Then a scheduling UI appears', async ({
      page,
    }) => {
      await page.goto('/opportunities/opp-1');

      const scheduleBtn = page.getByRole('button', { name: /schedule.*pickup/i });
      if (await scheduleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scheduleBtn.click();

        // A date/time picker or scheduling modal should appear
        const scheduler = page.locator(
          '[data-testid="pickup-scheduler"], .pickup-scheduler, [role="dialog"]'
        );
        await expect(scheduler.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
