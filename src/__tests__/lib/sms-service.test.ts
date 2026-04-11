/**
 * @file src/__tests__/lib/sms-service.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for the Twilio SMS service abstraction (Story 11.2).
 *
 * @description
 * Covers the provider abstraction in src/lib/sms-service.ts:
 *   - NullSmsProvider returns success without network calls.
 *   - TwilioProvider invokes twilio() with correct args and returns sid.
 *   - TwilioProvider swallows SDK errors into SendSmsResult (never throws).
 *   - SmsService.send() delegates to its provider.
 *   - Default singleton smsService uses NullSmsProvider in tests.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMessagesCreate = jest.fn();

// The twilio() factory returns an object with `messages.create()`.
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: { create: mockMessagesCreate },
  }));
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  SmsService,
  NullSmsProvider,
  TwilioProvider,
  smsService,
  type SmsProvider,
  type SendSmsResult,
} from '@/lib/sms-service';

// ---------------------------------------------------------------------------
// NullSmsProvider
// ---------------------------------------------------------------------------

describe('NullSmsProvider', () => {
  it('returns success without throwing', async () => {
    const provider = new NullSmsProvider();
    const result = await provider.send('+12025551234', 'hello');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('null-provider');
  });
});

// ---------------------------------------------------------------------------
// TwilioProvider
// ---------------------------------------------------------------------------

describe('TwilioProvider', () => {
  beforeEach(() => {
    mockMessagesCreate.mockReset();
  });

  it('calls twilio messages.create with from/to/body and returns the sid', async () => {
    mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM-123' });

    const provider = new TwilioProvider('AC-sid', 'auth-token', '+15550000000');
    const result = await provider.send('+12025551234', 'hello world');

    expect(mockMessagesCreate).toHaveBeenCalledWith({
      from: '+15550000000',
      to: '+12025551234',
      body: 'hello world',
    });
    expect(result).toEqual({ success: true, messageId: 'SM-123' });
  });

  it('returns failure without throwing when Twilio SDK rejects', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('Twilio down'));

    const provider = new TwilioProvider('AC-sid', 'auth-token', '+15550000000');
    const result = await provider.send('+12025551234', 'hi');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Twilio down');
  });

  it('returns failure when Twilio throws a non-Error value', async () => {
    mockMessagesCreate.mockRejectedValueOnce('string error');

    const provider = new TwilioProvider('AC-sid', 'auth-token', '+15550000000');
    const result = await provider.send('+12025551234', 'hi');

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });
});

// ---------------------------------------------------------------------------
// SmsService.send
// ---------------------------------------------------------------------------

describe('SmsService.send', () => {
  class MockProvider implements SmsProvider {
    public calls: Array<{ to: string; body: string }> = [];
    constructor(private result: SendSmsResult = { success: true, messageId: 'mock' }) {}
    async send(to: string, body: string): Promise<SendSmsResult> {
      this.calls.push({ to, body });
      return this.result;
    }
  }

  it('delegates to the underlying provider', async () => {
    const mock = new MockProvider();
    const service = new SmsService(mock);

    const result = await service.send('+12025551234', 'hello');

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]).toEqual({ to: '+12025551234', body: 'hello' });
    expect(result).toEqual({ success: true, messageId: 'mock' });
  });

  it('propagates provider failure results', async () => {
    const mock = new MockProvider({ success: false, error: 'oops' });
    const service = new SmsService(mock);

    const result = await service.send('+12025551234', 'hi');

    expect(result).toEqual({ success: false, error: 'oops' });
  });
});

// ---------------------------------------------------------------------------
// Singleton factory — no TWILIO_ACCOUNT_SID in test env → NullSmsProvider
// ---------------------------------------------------------------------------

describe('smsService singleton', () => {
  it('uses NullSmsProvider by default in tests (no TWILIO_ACCOUNT_SID)', async () => {
    const result = await smsService.send('+12025551234', 'hello');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('null-provider');
    // twilio() must not have been invoked during module load in tests
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
