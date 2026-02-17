/**
 * Tests for GET + POST /api/user/onboarding
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest } from 'next/server';

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getUserIdOrDefault: jest.fn().mockResolvedValue('test-user-id'),
}));

// Mock Prisma
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import { GET, POST } from '@/app/api/user/onboarding/route';

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/user/onboarding', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/user/onboarding', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns onboarding status for a user', async () => {
    mockFindUnique.mockResolvedValue({ onboardingComplete: false, onboardingStep: 2 });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.onboardingComplete).toBe(false);
    expect(data.data.onboardingStep).toBe(2);
    expect(data.data.totalSteps).toBe(6);
  });

  it('returns 404 when user not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/user/onboarding', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates onboarding step', async () => {
    mockUpdate.mockResolvedValue({ onboardingComplete: false, onboardingStep: 3 });

    const res = await POST(makePostRequest({ step: 3 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.onboardingStep).toBe(3);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ onboardingStep: 3 }),
      })
    );
  });

  it('marks onboarding complete when complete=true', async () => {
    mockUpdate.mockResolvedValue({ onboardingComplete: true, onboardingStep: 6 });

    const res = await POST(makePostRequest({ step: 5, complete: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.onboardingComplete).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ onboardingComplete: true, onboardingStep: 6 }),
      })
    );
  });

  it('returns 400 for invalid step', async () => {
    const res = await POST(makePostRequest({ step: 99 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invalid step/i);
  });

  it('returns 400 for negative step', async () => {
    const res = await POST(makePostRequest({ step: -1 }));
    expect(res.status).toBe(400);
  });

  it('accepts step=0', async () => {
    mockUpdate.mockResolvedValue({ onboardingComplete: false, onboardingStep: 0 });
    const res = await POST(makePostRequest({ step: 0 }));
    expect(res.status).toBe(200);
  });

  it('updates without step if only complete is passed', async () => {
    mockUpdate.mockResolvedValue({ onboardingComplete: true, onboardingStep: 6 });
    const res = await POST(makePostRequest({ complete: true }));
    expect(res.status).toBe(200);
  });

  it('returns 500 on database error', async () => {
    mockUpdate.mockRejectedValue(new Error('DB write error'));
    const res = await POST(makePostRequest({ step: 1 }));
    expect(res.status).toBe(500);
  });
});
