/**
 * Tests for POST /api/checkout
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest } from 'next/server';

// Mock @/lib/auth (Firebase session-based)
const mockGetCurrentUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
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
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeRequest({ tier: 'FLIPPER' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 for invalid tier', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    const res = await POST(makeRequest({ tier: 'INVALID' }));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for FREE tier', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    const res = await POST(makeRequest({ tier: 'FREE' }));
    expect(res.status).toBe(422);
  });

  it('creates checkout session for FLIPPER tier', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });

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
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'pro@test.com', name: 'Pro User', firebaseUid: 'fb-1', image: null });

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
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'new@test.com', name: 'New User', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });

    await POST(makeRequest({ tier: 'FLIPPER' }));

    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@test.com' })
    );
  });

  it('reuses existing Stripe customer', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'existing@test.com', name: 'Existing', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_existing' }] });

    await POST(makeRequest({ tier: 'FLIPPER' }));

    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    );
  });

  it('returns 500 when checkout throws Error instance', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_1' });
    mockCheckoutCreate.mockRejectedValue(new Error('Stripe unavailable'));

    const res = await POST(makeRequest({ tier: 'FLIPPER' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 when checkout throws non-Error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_1' });
    mockCheckoutCreate.mockRejectedValue('string error');

    const res = await POST(makeRequest({ tier: 'FLIPPER' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
