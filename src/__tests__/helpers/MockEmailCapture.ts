/**
 * @file src/__tests__/helpers/MockEmailCapture.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-10
 * @version 1.0
 * @brief Test utility: wraps NullProvider and captures all sent emails for assertion.
 *
 * @description
 * MockEmailCapture implements EmailProvider. Inject it into an EmailService
 * instance to record every send call in `sentEmails` for assertion, with no
 * real Resend API calls.
 *
 * Usage:
 *   const capture = new MockEmailCapture();
 *   const svc = new EmailService(capture);
 *   await svc.sendOpportunityFound('user@example.com', data);
 *   expect(capture.sentEmails).toHaveLength(1);
 *   expect(capture.sentEmails[0].subject).toContain('sold');
 */

import type { EmailProvider, SendEmailParams, SendEmailResult } from '@/lib/email-service';

export class MockEmailCapture implements EmailProvider {
  readonly sentEmails: SendEmailParams[] = [];

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    this.sentEmails.push({ ...params });
    return { success: true, messageId: `mock-${this.sentEmails.length}` };
  }

  /** Clear captured emails between tests. */
  reset(): void {
    this.sentEmails.length = 0;
  }
}
