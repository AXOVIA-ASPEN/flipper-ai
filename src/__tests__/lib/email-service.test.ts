/**
 * EmailService Tests
 *
 * Tests the EmailService class and its providers using a mock provider
 * so no real emails are sent during testing.
 */

import { EmailService, NullProvider, type EmailProvider, type SendEmailParams, type SendEmailResult } from '@/lib/email-service';

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

class MockEmailProvider implements EmailProvider {
  public sent: SendEmailParams[] = [];
  public shouldFail = false;

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (this.shouldFail) {
      return { success: false, error: 'Mock provider failure' };
    }
    this.sent.push(params);
    return { success: true, messageId: 'mock-' + Date.now() };
  }

  reset() {
    this.sent = [];
    this.shouldFail = false;
  }

  get lastEmail(): SendEmailParams | undefined {
    return this.sent[this.sent.length - 1];
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const APP_URL = 'https://flipper-ai.app';
const FROM = 'Flipper AI <notifications@flipper-ai.app>';

let mockProvider: MockEmailProvider;
let service: EmailService;

beforeEach(() => {
  mockProvider = new MockEmailProvider();
  service = new EmailService(mockProvider, APP_URL, FROM);
});

afterEach(() => {
  mockProvider.reset();
});

// ---------------------------------------------------------------------------
// NullProvider
// ---------------------------------------------------------------------------

describe('NullProvider', () => {
  it('always returns success without sending', async () => {
    const provider = new NullProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^null-provider-/);
  });
});

// ---------------------------------------------------------------------------
// EmailService.send()
// ---------------------------------------------------------------------------

describe('EmailService.send()', () => {
  it('delegates to the underlying provider', async () => {
    const result = await service.send({
      to: 'alice@example.com',
      subject: 'Hello',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
    expect(mockProvider.sent).toHaveLength(1);
    expect(mockProvider.sent[0].to).toBe('alice@example.com');
  });

  it('propagates provider errors', async () => {
    mockProvider.shouldFail = true;
    const result = await service.send({
      to: 'alice@example.com',
      subject: 'Hello',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Mock provider failure');
  });

  it('accepts an array of recipients', async () => {
    const result = await service.send({
      to: ['alice@example.com', 'bob@example.com'],
      subject: 'Bulk',
      html: '<p>Hi</p>',
    });

    expect(result.success).toBe(true);
    expect(mockProvider.lastEmail?.to).toEqual(['alice@example.com', 'bob@example.com']);
  });
});

// ---------------------------------------------------------------------------
// EmailService.sendWelcome()
// ---------------------------------------------------------------------------

describe('EmailService.sendWelcome()', () => {
  it('sends a welcome email with correct subject', async () => {
    const result = await service.sendWelcome({ name: 'Alice Smith', email: 'alice@example.com' });

    expect(result.success).toBe(true);
    expect(mockProvider.sent).toHaveLength(1);

    const email = mockProvider.lastEmail!;
    expect(email.to).toBe('alice@example.com');
    expect(email.subject).toContain('Welcome');
    expect(email.html).toContain('Alice'); // first name
    expect(email.html).toContain('Flipper AI');
    expect(email.text).toContain('Welcome to Flipper AI');
  });

  it('works without a name', async () => {
    const result = await service.sendWelcome({ email: 'noname@example.com' });

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('there'); // fallback greeting
  });

  it('includes unsubscribe and settings links', async () => {
    await service.sendWelcome({ name: 'Bob', email: 'bob@example.com' });

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('/api/user/unsubscribe');
    expect(email.html).toContain('/settings#notifications');
  });
});

// ---------------------------------------------------------------------------
// EmailService.sendDigest()
// ---------------------------------------------------------------------------

describe('EmailService.sendDigest()', () => {
  const baseDigest = {
    email: 'user@example.com',
    name: 'Carol',
    totalScanned: 1234,
    scanDate: '2026-02-17',
    opportunities: [
      {
        title: 'iPhone 13 Pro',
        price: 350,
        estimatedResaleValue: 600,
        profit: 250,
        profitPercent: 71,
        marketplace: 'Craigslist',
        url: 'https://craigslist.org/abc',
      },
    ],
  };

  it('sends a digest email with opportunity count in subject', async () => {
    const result = await service.sendDigest(baseDigest);

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.subject).toContain('1 deals found');
    expect(email.html).toContain('iPhone 13 Pro');
    expect(email.html).toContain('1,234'); // formatted number
  });

  it('handles empty opportunities gracefully', async () => {
    const result = await service.sendDigest({ ...baseDigest, opportunities: [] });

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.subject).toContain('0 deals found');
    expect(email.html).toContain('No standout deals');
  });

  it('limits displayed opportunities to 5', async () => {
    const manyOpps = Array.from({ length: 10 }, (_, i) => ({
      title: `Item ${i}`,
      price: 100,
      estimatedResaleValue: 200,
      profit: 100,
      profitPercent: 100,
      marketplace: 'eBay',
      url: `https://ebay.com/item/${i}`,
    }));

    await service.sendDigest({ ...baseDigest, opportunities: manyOpps });

    // The HTML should only contain items 0-4 (first 5)
    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('Item 0');
    expect(email.html).toContain('Item 4');
    expect(email.html).not.toContain('Item 5');
  });

  it('includes both html and text content', async () => {
    await service.sendDigest(baseDigest);

    const email = mockProvider.lastEmail!;
    expect(email.html).toBeTruthy();
    expect(email.text).toContain('iPhone 13 Pro');
  });
});

// ---------------------------------------------------------------------------
// EmailService.sendPriceAlert()
// ---------------------------------------------------------------------------

describe('EmailService.sendPriceAlert()', () => {
  const alertOpts = {
    email: 'dave@example.com',
    name: 'Dave',
    listing: {
      title: 'Sony WH-1000XM5',
      originalPrice: 350,
      newPrice: 249,
      priceDrop: 101,
      priceDropPercent: 28.86,
      marketplace: 'eBay',
      url: 'https://ebay.com/itm/123',
    },
  };

  it('sends a price alert with correct subject', async () => {
    const result = await service.sendPriceAlert(alertOpts);

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.subject).toContain('Price Drop');
    expect(email.subject).toContain('Sony WH-1000XM5');
    expect(email.subject).toContain('28%');
  });

  it('includes old and new price in HTML', async () => {
    await service.sendPriceAlert(alertOpts);

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('350.00');
    expect(email.html).toContain('249.00');
  });

  it('includes a link to the listing', async () => {
    await service.sendPriceAlert(alertOpts);

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('https://ebay.com/itm/123');
    expect(email.text).toContain('https://ebay.com/itm/123');
  });
});

// ---------------------------------------------------------------------------
// EmailService.sendPasswordReset()
// ---------------------------------------------------------------------------

describe('EmailService.sendPasswordReset()', () => {
  it('sends a password reset email with the reset URL', async () => {
    const result = await service.sendPasswordReset({
      name: 'Eve',
      email: 'eve@example.com',
      resetUrl: 'https://flipper-ai.app/reset?token=abc123',
      expiresInMinutes: 60,
    });

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.subject).toContain('password');
    expect(email.html).toContain('https://flipper-ai.app/reset?token=abc123');
    expect(email.html).toContain('60 minutes');
    expect(email.text).toContain('https://flipper-ai.app/reset?token=abc123');
  });

  it('uses default expiry of 60 minutes if not specified', async () => {
    await service.sendPasswordReset({
      email: 'eve@example.com',
      resetUrl: 'https://flipper-ai.app/reset?token=xyz',
    });

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('60 minutes');
  });
});

// ---------------------------------------------------------------------------
// EmailService.sendScanSummary()
// ---------------------------------------------------------------------------

describe('EmailService.sendScanSummary()', () => {
  const summaryOpts = {
    email: 'frank@example.com',
    name: 'Frank',
    scanId: 'scan-001',
    query: 'vintage camera',
    marketplace: 'Craigslist',
    totalResults: 48,
    opportunitiesFound: 3,
    duration: 12,
    topOpportunity: {
      title: 'Nikon FM2',
      price: 120,
      estimatedResaleValue: 300,
      profit: 180,
      profitPercent: 150,
      marketplace: 'Craigslist',
      url: 'https://craigslist.org/abc',
    },
  };

  it('sends a scan summary with opportunity count in subject', async () => {
    const result = await service.sendScanSummary(summaryOpts);

    expect(result.success).toBe(true);
    const email = mockProvider.lastEmail!;
    expect(email.subject).toContain('3 opportunities');
    expect(email.subject).toContain('vintage camera');
  });

  it('includes top opportunity in the email', async () => {
    await service.sendScanSummary(summaryOpts);

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('Nikon FM2');
    expect(email.html).toContain('+$180');
  });

  it('links to scan results page', async () => {
    await service.sendScanSummary(summaryOpts);

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('/opportunities?scan=scan-001');
  });

  it('works without a top opportunity', async () => {
    const result = await service.sendScanSummary({
      ...summaryOpts,
      topOpportunity: undefined,
      opportunitiesFound: 0,
    });

    expect(result.success).toBe(true);
    expect(mockProvider.lastEmail?.html).not.toContain('Nikon FM2');
  });
});

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

describe('URL generation', () => {
  it('generates unsubscribe URL with base64url-encoded email', async () => {
    await service.sendWelcome({ email: 'test@example.com' });

    const email = mockProvider.lastEmail!;
    const encoded = Buffer.from('test@example.com').toString('base64url');
    expect(email.html).toContain(`/api/user/unsubscribe?token=${encoded}`);
  });

  it('generates settings URL pointing to notifications section', async () => {
    await service.sendWelcome({ email: 'test@example.com' });

    const email = mockProvider.lastEmail!;
    expect(email.html).toContain('/settings#notifications');
  });

  it('strips trailing slash from appUrl', async () => {
    const svc = new EmailService(mockProvider, 'https://flipper-ai.app/', FROM);
    await svc.sendWelcome({ email: 'test@example.com' });

    const email = mockProvider.lastEmail!;
    expect(email.html).not.toContain('//settings');
    expect(email.html).not.toContain('app//');
  });
});

// ── ResendProvider branch coverage ────────────────────────────────────────────
describe('ResendProvider', () => {
  it('sends successfully via Resend client', async () => {
    const mockSend = jest.fn().mockResolvedValue({ data: { id: 'res-123' }, error: null });
    jest.mock('resend', () => ({
      Resend: jest.fn().mockImplementation(() => ({
        emails: { send: mockSend },
      })),
    }), { virtual: true });

    // Use ResendProvider directly with a mock
    const { ResendProvider } = await import('@/lib/email-service');
    const mockResendSend = jest.fn().mockResolvedValue({ data: { id: 'msg-001' }, error: null });
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    // Monkey-patch the internal client's send method
    (provider as any).client = { emails: { send: mockResendSend } };

    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-001');
  });

  it('returns error when Resend returns error', async () => {
    const { ResendProvider } = await import('@/lib/email-service');
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    (provider as any).client = {
      emails: {
        send: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Domain not verified' },
        }),
      },
    };

    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Domain not verified');
  });

  it('handles exception thrown during send', async () => {
    const { ResendProvider } = await import('@/lib/email-service');
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    (provider as any).client = {
      emails: {
        send: jest.fn().mockRejectedValue(new Error('Network error')),
      },
    };

    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('handles non-Error exception thrown during send', async () => {
    const { ResendProvider } = await import('@/lib/email-service');
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    (provider as any).client = {
      emails: {
        send: jest.fn().mockRejectedValue('string error'),
      },
    };

    const result = await provider.send({
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('returns messageId=undefined when data.id is null', async () => {
    const { ResendProvider } = await import('@/lib/email-service');
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    (provider as any).client = {
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: undefined }, error: null }),
      },
    };

    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeUndefined();
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('NullProvider - array recipients branch', () => {
  it('joins multiple recipients with comma when to is an array', async () => {
    // Covers: Array.isArray(params.to) ? params.to.join(', ') : params.to  (join branch)
    const { NullProvider } = require('@/lib/email-service');
    const provider = new NullProvider();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await provider.send({
      to: ['alice@example.com', 'bob@example.com'],  // array → hits join branch
      subject: 'Array Recipients Test',
      html: '<p>Hi team</p>',
    });

    expect(result.success).toBe(true);
    const toLogCall = consoleSpy.mock.calls.find((call) => call[0]?.includes('alice@example.com'));
    expect(toLogCall).toBeDefined();
    consoleSpy.mockRestore();
  });
});

describe('ResendProvider - data with no id branch', () => {
  it('returns messageId=undefined when Resend returns data without id', async () => {
    // Covers: data?.id where data is not null but has no id field
    const { ResendProvider } = await import('@/lib/email-service');
    const provider = new ResendProvider('fake-api-key', 'test@test.com');
    const mockSendNoId = jest.fn().mockResolvedValue({ data: null, error: null }); // data is null → data?.id = undefined
    (provider as any).client = { emails: { send: mockSendNoId } };

    const result = await provider.send({
      to: 'test@example.com',
      subject: 'No ID Test',
      html: '<p>Test</p>',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBeUndefined(); // data.id is undefined → data?.id = undefined
  });
});
