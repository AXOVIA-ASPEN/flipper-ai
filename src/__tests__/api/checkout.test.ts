/**
 * Tests for POST /api/checkout
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest } from 'next/server';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock stripe
const mockCheckoutCreate = jest.fn();
const mockCustomersList = jest.fn();
const mockCustomersCreate = jest.fn();

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: mockCheckoutCreate } },
    customers: { list: mockCustomersList, create: mockCustomersCreate },
  },
  STRIPE_PRICE_IDS: { FLIPPER: 'price_flipper_monthly', PRO: 'price_pro_monthly' },
}));

import { POST } from '@/app/api/checkout/route';
import { getServerSession } from 'next-auth';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_123' }] });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/xyz' });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ tier: 'FLIPPER' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid tier', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } } as any);
    const res = await POST(makeRequest({ tier: 'INVALID' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for FREE tier', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } } as any);
    const res = await POST(makeRequest({ tier: 'FREE' }));
    expect(res.status).toBe(400);
  });

  it('creates checkout session for FLIPPER tier', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@test.com', name: 'Test' },
    } as any);

    const res = await POST(makeRequest({ tier: 'FLIPPER' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe('https://checkout.stripe.com/xyz');
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_flipper_monthly', quantity: 1 }],
      })
    );
  });

  it('creates checkout session for PRO tier', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'pro@test.com', name: 'Pro User' },
    } as any);

    const res = await POST(makeRequest({ tier: 'PRO' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe('https://checkout.stripe.com/xyz');
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
      })
    );
  });

  it('creates new Stripe customer if none exists', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'new@test.com', name: 'New User' },
    } as any);
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });

    await POST(makeRequest({ tier: 'FLIPPER' }));

    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@test.com' })
    );
  });

  it('reuses existing Stripe customer', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'existing@test.com' },
    } as any);
    mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_existing' }] });

    await POST(makeRequest({ tier: 'FLIPPER' }));

    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    );
  });
});
