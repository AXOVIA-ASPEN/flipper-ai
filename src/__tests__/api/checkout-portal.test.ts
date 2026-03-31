/**
 * @file src/__tests__/api/checkout-portal.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief Tests for POST /api/checkout/portal — Stripe Customer Portal session.
 *
 * @description
 * Covers auth checks, no Stripe customer found, successful portal session
 * creation with URL return, and Stripe API error handling.
 */

// Mock @/lib/auth (Firebase session-based)
const mockGetCurrentUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { list: jest.fn() },
    billingPortal: { sessions: { create: jest.fn() } },
  },
}));

import { POST } from '@/app/api/checkout/portal/route';
import { stripe } from '@/lib/stripe';

const mockCustomersList = stripe.customers.list as jest.Mock;
const mockPortalCreate = stripe.billingPortal.sessions.create as jest.Mock;

describe('POST /api/checkout/portal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when session has no email', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: null, name: null, firebaseUid: 'fb-1', image: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 404 when no Stripe customer found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [] });

    const res = await POST();
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('creates portal session and returns URL', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_123' }] });
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/xyz' });

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://billing.stripe.com/session/xyz');
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: expect.stringContaining('/settings'),
    });
  });

  it('returns 500 when Stripe API throws', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockRejectedValue(new Error('Stripe down'));

    const res = await POST();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 when error has no message', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
    mockCustomersList.mockRejectedValue({});

    const res = await POST();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
