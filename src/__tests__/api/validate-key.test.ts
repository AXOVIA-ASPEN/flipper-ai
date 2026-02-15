import { NextRequest } from 'next/server';
import { POST } from '@/app/api/user/settings/validate-key/route';

// Mock OpenAI
const mockList = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    models: { list: mockList },
  }));
});

function createMockRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/user/settings/validate-key'), {
    method: 'POST',
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

describe('POST /api/user/settings/validate-key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 when apiKey is missing', async () => {
    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
  });

  it('should return 400 when apiKey is not a string', async () => {
    const req = createMockRequest({ apiKey: 123 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
  });

  it('should reject keys not starting with sk-', async () => {
    const req = createMockRequest({ apiKey: 'invalid-key' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.valid).toBe(false);
    expect(data.error).toContain("start with 'sk-'");
  });

  it('should validate a valid API key', async () => {
    mockList.mockResolvedValue({ data: [] });

    const req = createMockRequest({ apiKey: 'sk-valid123' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.valid).toBe(true);
  });

  it('should return invalid for 401 (bad key)', async () => {
    mockList.mockRejectedValue({ status: 401, message: 'Unauthorized' });

    const req = createMockRequest({ apiKey: 'sk-bad123' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.valid).toBe(false);
  });

  it('should return valid for 429 (rate limited but key works)', async () => {
    mockList.mockRejectedValue({ status: 429, message: 'Rate limited' });

    const req = createMockRequest({ apiKey: 'sk-ratelimited' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.valid).toBe(true);
  });

  it('should return invalid for other OpenAI errors', async () => {
    mockList.mockRejectedValue({ status: 500, message: 'Server error' });

    const req = createMockRequest({ apiKey: 'sk-other' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.valid).toBe(false);
  });

  it('should return 500 on unexpected error', async () => {
    // Simulate JSON parse failure by sending invalid request
    const req = new NextRequest(new URL('http://localhost:3000/api/user/settings/validate-key'), {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.valid).toBe(false);
  });
});
