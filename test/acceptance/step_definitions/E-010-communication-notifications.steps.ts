/**
 * @file test/acceptance/step_definitions/E-010-communication-notifications.steps.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-010 Story 10.4 — Communication Email Notifications.
 *
 * @description
 * Service-level BDD tests for the three communication notification event types:
 *   - message.received (AC1, FR-NOTIFY-02)
 *   - message.draft_ready (AC2, FR-NOTIFY-03)
 *   - message.sent (AC3, FR-NOTIFY-04)
 *
 * Tests use CommunicationNotificationService directly with stubbed prisma and
 * emailService — appropriate for ACs that describe email-sending logic rather
 * than user-visible UI.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import prisma from '../../../src/lib/db';
import { emailService } from '../../../src/lib/email-service';
import { CommunicationNotificationService } from '../../../src/lib/communication-notification';

// ---------------------------------------------------------------------------
// Per-scenario state
// ---------------------------------------------------------------------------

interface EmailCapture {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface ScenarioState {
  emailNotifications: boolean;
  userId: string;
  listingId: string;
  listingTitle: string | null;
  sellerName: string | null;
  messageBody: string;
  deliveryStatus: string;
  capturedEmails: EmailCapture[];
  service: CommunicationNotificationService;
}

let state: ScenarioState;

function freshState(): ScenarioState {
  return {
    emailNotifications: true,
    userId: 'user-cucumber-1',
    listingId: 'listing-cucumber-1',
    listingTitle: null,
    sellerName: null,
    messageBody: '',
    deliveryStatus: 'Delivered',
    capturedEmails: [],
    service: new CommunicationNotificationService(),
  };
}

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function installPrismaStub(state: ScenarioState): void {
  // Replace prisma.user.findUnique with an in-memory stub
  (prisma.user as unknown as Record<string, unknown>).findUnique = async () => {
    return {
      email: 'testuser@example.com',
      settings: { emailNotifications: state.emailNotifications },
    };
  };
}

function installEmailSpy(state: ScenarioState): void {
  emailService.send = async (params) => {
    state.capturedEmails.push({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { success: true };
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

Before({ tags: '@story-10-4' }, function () {
  state = freshState();
  installPrismaStub(state);
  installEmailSpy(state);
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a user with email notifications enabled', function () {
  state.emailNotifications = true;
  installPrismaStub(state);
});

Given('a user with email notifications disabled', function () {
  state.emailNotifications = false;
  installPrismaStub(state);
});

Given(
  'the seller {string} replies with body {string} on listing {string}',
  function (sellerName: string, body: string, listingTitle: string) {
    state.sellerName = sellerName || null;
    state.messageBody = body;
    state.listingTitle = listingTitle;
  }
);

Given(
  'an AI draft {string} is ready for listing {string}',
  function (draftBody: string, listingTitle: string) {
    state.messageBody = draftBody;
    state.listingTitle = listingTitle;
  }
);

Given(
  'a message {string} was sent for listing {string}',
  function (body: string, listingTitle: string) {
    state.messageBody = body;
    state.listingTitle = listingTitle;
  }
);

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('the message.received notification is triggered', async function () {
  await state.service.notifyMessageReceived({
    userId: state.userId,
    listingId: state.listingId,
    listingTitle: state.listingTitle,
    sellerName: state.sellerName,
    messagePreview: state.messageBody,
  });
});

When('the message.draft_ready notification is triggered', async function () {
  await state.service.notifyDraftReady({
    userId: state.userId,
    listingId: state.listingId,
    listingTitle: state.listingTitle,
    draftPreview: state.messageBody,
  });
});

When(
  'the message.sent notification is triggered with delivery status {string}',
  async function (deliveryStatus: string) {
    state.deliveryStatus = deliveryStatus;
    await state.service.notifyMessageSent({
      userId: state.userId,
      listingId: state.listingId,
      listingTitle: state.listingTitle,
      messagePreview: state.messageBody,
      deliveryStatus,
    });
  }
);

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the email service receives a send request', function () {
  assert.ok(
    state.capturedEmails.length > 0,
    `Expected at least one email to be sent, but none were captured. emailNotifications=${state.emailNotifications}`
  );
});

Then('no email is sent', function () {
  assert.strictEqual(
    state.capturedEmails.length,
    0,
    `Expected no emails to be sent, but ${state.capturedEmails.length} were captured.`
  );
});

Then('the email subject contains {string}', function (expectedPart: string) {
  assert.ok(
    state.capturedEmails.length > 0,
    'No emails captured — cannot check subject'
  );
  const subject = state.capturedEmails[0].subject;
  assert.ok(
    subject.toLowerCase().includes(expectedPart.toLowerCase()),
    `Expected subject "${subject}" to contain "${expectedPart}"`
  );
});

Then('the email body contains the seller name {string}', function (expectedName: string) {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes(expectedName),
    `Expected email body to contain seller name "${expectedName}"`
  );
});

Then('the email body contains the message preview {string}', function (expectedPreview: string) {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes(expectedPreview),
    `Expected email body to contain message preview "${expectedPreview}"`
  );
});

Then('the email body contains the listing title {string}', function (listingTitle: string) {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes(listingTitle),
    `Expected email body to contain listing title "${listingTitle}"`
  );
});

Then('the email body contains a link to the thread', function () {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes('/messages'),
    `Expected email body to contain a link to /messages`
  );
});

Then('the email body contains a review link', function () {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes('/messages'),
    `Expected email body to contain a review link to /messages`
  );
});

Then('the email body contains the draft preview {string}', function (expectedDraft: string) {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes(expectedDraft),
    `Expected email body to contain draft preview "${expectedDraft}"`
  );
});

Then('the email body contains the delivery status {string}', function (expectedStatus: string) {
  assert.ok(state.capturedEmails.length > 0, 'No emails captured');
  const html = state.capturedEmails[0].html;
  assert.ok(
    html.includes(expectedStatus),
    `Expected email body to contain delivery status "${expectedStatus}"`
  );
});
