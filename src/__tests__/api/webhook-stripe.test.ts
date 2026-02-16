/**
 * Tests for POST /api/webhooks/stripe
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest } from 'next/server';

const mockConstructEvent = jest.fn();
const mockCustomersRetrieve = jest.fn();

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    customers: { retrieve: mockCustomersRetrieve },
  },
  PRICE_TO_TIER: {
    price_flipper_monthly: 'FLIPPER',
    price_pro_monthly: 'PRO',
  },
}));

import { POST } from '@/app/api/webhooks/stripe/route';

function makeRequest(body: string, sig: string | null = 'sig_test'): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sig) headers['stripe-signature'] = sig;
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when signature is missing', async () => {
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
  });

  it('handles checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { tier: 'PRO', userId: 'user@test.com' },
          customer_details: { email: 'user@test.com' },
        },
      },
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it('handles customer.subscription.deleted (downgrade to FREE)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { customer: 'cus_123' },
      },
    });
    mockCustomersRetrieve.mockResolvedValue({ email: 'user@test.com' });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
  });

  it('handles customer.subscription.updated', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_123',
          metadata: {},
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        },
      },
    });
    mockCustomersRetrieve.mockResolvedValue({ email: 'user@test.com' });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
  });

  it('handles unknown event type gracefully', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'unknown.event',
      data: { object: {} },
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
  });
});
