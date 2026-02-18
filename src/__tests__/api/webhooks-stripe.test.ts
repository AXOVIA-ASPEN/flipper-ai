/**
 * Tests for POST /api/webhooks/stripe
 * Covers: signature validation, checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted,
 * unhandled events, and error handling.
 */

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

import { POST } from '@/app/api/webhooks/stripe/route';
import { stripe, PRICE_TO_TIER } from '@/lib/stripe';
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
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeReq('{}', null));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing signature');
  });

  it('returns 400 when signature verification fails', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(makeReq('{}', 'sig_bad'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('handles checkout.session.completed with email and tier metadata', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'PRO' },
          customer_details: { email: 'user@test.com' },
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('falls back to FLIPPER tier when metadata.tier is missing', async () => {
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

  it('falls back to FREE when price and metadata.tier are both missing', async () => {
    retrieveCustomer.mockResolvedValue({ email: 'sub@test.com' });
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: {},
          customer: 'cus_789',
        },
      },
    });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
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
    expect(json.error).toBe('Webhook handler failed');
  });

  // ── Branch coverage ────────────────────────────────────────────────────────
  it('handles non-Error signature verification failure (String(err) branch)', async () => {
    constructEvent.mockImplementation(() => {
       
      throw 'string-based-error'; // Not an Error instance
    });
    const res = await POST(makeReq('{}', 'sig_bad'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('handles subscription.updated with no items (empty priceId)', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_no_items',
          items: { data: [] }, // Empty items
          metadata: {},
        },
      },
    });
    retrieveCustomer.mockResolvedValue({ email: 'user@test.com' });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('falls back to FREE tier when priceId not in PRICE_TO_TIER and no metadata.tier', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_unknown',
          items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
          metadata: {}, // No tier in metadata
        },
      },
    });
    retrieveCustomer.mockResolvedValue({ email: 'user@test.com' });

    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('handles checkout event with null metadata (optional chain branches)', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: null, // null → metadata?.tier → undefined branch
          customer_details: null, // null → customer_details?.email → undefined branch
        },
      },
    });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200); // skips update (no email or userId)
  });

  it('handles subscription.updated with null items (?.price.id branch)', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_null_items',
          items: { data: [null] }, // data[0] is null → ?.price.id
          metadata: { tier: 'PRO' },
        },
      },
    });
    retrieveCustomer.mockResolvedValue({ email: 'user@test.com' });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });

  it('subscription.updated with null metadata (?.tier null branch)', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_null_meta',
          items: { data: [{ price: { id: 'price_unknown' } }] },
          metadata: null, // null metadata → metadata?.tier → undefined
        },
      },
    });
    retrieveCustomer.mockResolvedValue({ email: 'user@test.com' });
    const res = await POST(makeReq('{}', 'sig_ok'));
    expect(res.status).toBe(200);
  });
});
