/**
 * Tests for POST /api/checkout/portal
 * Covers: auth check, no customer found, successful portal creation, error handling.
 */

// Mock @/lib/auth (next-auth v5 style)
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
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
    mockAuth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 401 when session has no email', async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 404 when no Stripe customer found', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
    mockCustomersList.mockResolvedValue({ data: [] });

    const res = await POST();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('No billing account');
  });

  it('creates portal session and returns URL', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
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
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
    mockCustomersList.mockRejectedValue(new Error('Stripe down'));

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Stripe down');
  });

  it('returns generic message when error has no message', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
    mockCustomersList.mockRejectedValue({});

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to create portal session');
  });
});
