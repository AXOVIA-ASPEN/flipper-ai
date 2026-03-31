/**
 * @file src/__tests__/api/webhooks-stripe.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-01
 * @version 2.0
 * @brief Tests for POST /api/webhooks/stripe — comprehensive webhook handler coverage.
 *
 * @description
 * Covers signature validation, checkout.session.completed,
 * customer.subscription.created, customer.subscription.updated,
 * customer.subscription.deleted, invoice.payment_failed,
 * unhandled events, error handling, and the STRIPE_WEBHOOK_SECRET
 * production guard.
 */

// Mock prisma before importing route
const mockUserUpdate = jest.fn().mockResolvedValue({ count: 1 });
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      updateMany: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

// Mock stripe before importing route
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    customers: {
      retrieve: jest.fn(),
    },
  },
  PRICE_TO_TIER: {
    price_flipper_monthly: 'FLIPPER',
    price_pro_monthly: 'PRO',
  } as Record<string, string>,
}));

// Mock emailService before importing route
const mockSendPaymentFailed = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email-service', () => ({
  emailService: {
    sendPaymentFailed: (...args: unknown[]) => mockSendPaymentFailed(...args),
  },
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import { stripe } from '@/lib/stripe';
import { NextRequest } from 'next/server';

function makeReq(body: string, sig: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sig !== null) headers['stripe-signature'] = sig;
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

const constructEvent = stripe.webhooks.constructEvent as jest.Mock;
const retrieveCustomer = stripe.customers.retrieve as jest.Mock;

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserUpdate.mockResolvedValue({ count: 1 });
  });

  // ── Signature validation ──────────────────────────────────────────────────

  it('returns 422 when stripe-signature header is missing', async () => {
    const res = await POST(makeReq('{}', null));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when signature verification fails', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(makeReq('{}', 'sig_bad'));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('handles non-Error signature verification failure (String(err) branch)', async () => {
    constructEvent.mockImplementation(() => {
      throw 'string-based-error'; // Not an Error instance
    });
    const res = await POST(makeReq('{}', 'sig_bad'));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  it('handles checkout.session.completed with email and tier metadata', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'PRO' },
          customer_details: { email: 'user@test.com' },
          customer: 'cus_abc',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'user@test.com' },
      data: { subscriptionTier: 'PRO', stripeCustomerId: 'cus_abc' },
    });
  });

  it('skips tier update when metadata.tier is missing on checkout', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {},
          customer_details: { email: 'user@test.com' },
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    // Should NOT call updateMany — missing tier metadata means skip
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('skips tier update when metadata.tier is invalid on checkout', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'INVALID_TIER' },
          customer_details: { email: 'user@test.com' },
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('uses metadata.userId when customer_details.email is absent', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'PRO', userId: 'user-123' },
          customer_details: {},
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('skips update when no email or userId on checkout', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {},
          customer_details: {},
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('handles checkout event with null metadata (optional chain branches)', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: null,
          customer_details: null,
        },
      },
    });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('returns 500 when prisma user update fails on checkout', async () => {
    mockUserUpdate.mockRejectedValue(new Error('DB connection lost'));
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'PRO' },
          customer_details: { email: 'fail@test.com' },
          customer: 'cus_fail',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(500);
  });

  // ── customer.subscription.created ─────────────────────────────────────────

  it('handles customer.subscription.created with known price', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'new-sub@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_new',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(retrieveCustomer).toHaveBeenCalledWith('cus_new');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'new-sub@test.com' },
      data: { subscriptionTier: 'PRO' },
    });
  });

  it('subscription.created falls back to metadata.tier when price is unknown', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'meta-sub@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: { tier: 'FLIPPER' },
          customer: 'cus_meta',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'meta-sub@test.com' },
      data: { subscriptionTier: 'FLIPPER' },
    });
  });

  it('subscription.created skips update when price and metadata.tier are both unrecognized', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
          metadata: {},
          customer: 'cus_free',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('unrecognized tier'));
    consoleSpy.mockRestore();
  });

  it('subscription.created skips update when customer has no email', async () => {
    retrieveCustomer.mockResolvedValue({ email: null });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_no_email_created',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('subscription.created with empty items array skips update', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [] },
          metadata: {},
          customer: 'cus_empty_items',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('subscription.created with null metadata skips update', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: null,
          customer: 'cus_null_meta_created',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 500 when subscription.created customers.retrieve fails', async () => {
    retrieveCustomer.mockRejectedValue(new Error('Stripe API unavailable'));
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_api_down',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  // ── customer.subscription.updated ─────────────────────────────────────────

  it('handles customer.subscription.updated with known price', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'sub@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_123',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(retrieveCustomer).toHaveBeenCalledWith('cus_123');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'sub@test.com' },
      data: { subscriptionTier: 'PRO' },
    });
  });

  it('falls back to metadata.tier when price is unknown', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'sub@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: { tier: 'FLIPPER' },
          customer: 'cus_456',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('skips update when priceId not in PRICE_TO_TIER and no metadata.tier', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
          metadata: {},
          customer: 'cus_789',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('unrecognized tier'));
    consoleSpy.mockRestore();
  });

  it('skips update when customer has no email on subscription.updated', async () => {
    retrieveCustomer.mockResolvedValue({ email: null });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_no_email',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('subscription.updated with no items (empty priceId) skips update', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_no_items',
          items: { data: [] },
          metadata: {},
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('subscription.updated with null items falls back to metadata.tier', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_null_items',
          items: { data: [null] },
          metadata: { tier: 'PRO' },
        },
      },
    });
    retrieveCustomer.mockResolvedValue({ email: 'user@test.com' });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'user@test.com' },
      data: { subscriptionTier: 'PRO' },
    });
  });

  it('subscription.updated with null metadata and unknown price skips update', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_null_meta',
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: null,
        },
      },
    });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // ── customer.subscription.deleted ─────────────────────────────────────────

  it('handles customer.subscription.deleted and sets FREE tier', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'cancelled@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_cancel',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(retrieveCustomer).toHaveBeenCalledWith('cus_cancel');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'cancelled@test.com' },
      data: { subscriptionTier: 'FREE' },
    });
  });

  it('skips update when customer has no email on subscription.deleted', async () => {
    retrieveCustomer.mockResolvedValue({ email: null });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { customer: 'cus_no_email_del' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('returns 200 when subscription.deleted has no matching user row (updateMany count 0)', async () => {
    mockUserUpdate.mockResolvedValue({ count: 0 });
    retrieveCustomer.mockResolvedValue({ email: 'orphan-del@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { customer: 'cus_orphan_del' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  // ── invoice.payment_failed ────────────────────────────────────────────────

  it('handles invoice.payment_failed and sends notification email', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'payer@test.com', name: 'Alice' });
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_payer',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(retrieveCustomer).toHaveBeenCalledWith('cus_payer');
    expect(mockSendPaymentFailed).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'payer@test.com',
    });
  });

  it('invoice.payment_failed does not update user tier', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'payer@test.com', name: null });
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_payer_no_downgrade' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('invoice.payment_failed passes undefined name when customer.name is null', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'noname@test.com', name: null });
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_noname' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockSendPaymentFailed).toHaveBeenCalledWith({
      name: undefined,
      email: 'noname@test.com',
    });
  });

  it('invoice.payment_failed still returns 200 when email send throws', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'email-error@test.com', name: 'Bob' });
    mockSendPaymentFailed.mockRejectedValue(new Error('SMTP connection refused'));
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_email_err' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('invoice.payment_failed skips when customer has no email', async () => {
    retrieveCustomer.mockResolvedValue({ email: null });
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_no_email_fail' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(mockSendPaymentFailed).not.toHaveBeenCalled();
  });

  it('returns 500 when invoice.payment_failed customers.retrieve throws', async () => {
    retrieveCustomer.mockRejectedValue(new Error('Stripe API down'));
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_fail_retrieve' },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  // ── Unhandled events ──────────────────────────────────────────────────────

  it('handles unrecognized event types gracefully', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: {} },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns 500 when handler throws an unexpected error', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { customer: 'cus_err' },
      },
    });
    retrieveCustomer.mockRejectedValue(new Error('Stripe API down'));

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  // ── updateUserTier edge cases ─────────────────────────────────────────────

  // ── Production guard ───────────────────────────────────────────────────

  it('returns 503 in production when STRIPE_WEBHOOK_SECRET is empty', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await POST(makeReq('{}', 'sig_ok'));
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Service misconfigured');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // ── updateUserTier edge cases ─────────────────────────────────────────────

  it('logs warning when no user found (updateMany count: 0)', async () => {
    mockUserUpdate.mockResolvedValue({ count: 0 });
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    retrieveCustomer.mockResolvedValue({ email: 'ghost@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_ghost',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No user found with email ghost@test.com')
    );
    consoleSpy.mockRestore();
  });
});
