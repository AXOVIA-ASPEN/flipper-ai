import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MessagesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigate() {
    await this.goto('/messages');
  }

  async navigateToConversation(conversationId: string) {
    await this.goto(`/messages/${conversationId}`);
  }

  // Selectors
  get conversationList(): Locator {
    return this.page.getByTestId('conversation-list');
  }

  get conversationItems(): Locator {
    return this.page.getByTestId('conversation-item');
  }

  get composeForm(): Locator {
    return this.page.getByTestId('message-compose-form');
  }

  get messageInput(): Locator {
    return this.page.getByPlaceholder(/type a message|write a message/i);
  }

  get sendButton(): Locator {
    return this.page.getByRole('button', { name: /send/i });
  }

  get aiTemplateButton(): Locator {
    return this.page.getByRole('button', { name: /ai template|generate message/i });
  }

  get aiTemplateOptions(): Locator {
    return this.page.getByTestId('ai-template-options');
  }

  get messageHistory(): Locator {
    return this.page.getByTestId('message-history');
  }

  get messageBubbles(): Locator {
    return this.page.getByTestId('message-bubble');
  }

  get schedulePickupButton(): Locator {
    return this.page.getByRole('button', { name: /schedule pickup/i });
  }

  get messageStatusIndicators(): Locator {
    return this.page.getByTestId('message-status');
  }

  get emptyState(): Locator {
    return this.page.getByTestId('messages-empty-state');
  }

  get newMessageButton(): Locator {
    return this.page.getByRole('button', { name: /new message/i });
  }

  get sellerSelect(): Locator {
    return this.page.getByTestId('seller-select');
  }

  // Actions
  async composeMessage(text: string) {
    await this.messageInput.fill(text);
  }

  async sendMessage(text: string) {
    await this.composeMessage(text);
    await this.sendButton.click();
  }

  async selectAiTemplate(templateName: string) {
    await this.aiTemplateButton.click();
    await this.page.getByText(templateName).click();
  }

  async openConversation(index: number) {
    await this.conversationItems.nth(index).click();
  }

  async schedulePickup() {
    await this.schedulePickupButton.click();
  }
}
