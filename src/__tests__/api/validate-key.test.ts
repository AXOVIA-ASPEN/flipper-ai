import { NextRequest } from 'next/server';
import { POST } from '@/app/api/user/settings/validate-key/route';

// Mock OpenAI
const mockModelsList = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    models: { list: () => mockModelsList() },
  }));
});

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/user/settings/validate-key', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/user/settings/validate-key', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns valid for working key', async () => {
    mockModelsList.mockResolvedValue({ data: [] });

    const res = await POST(createRequest({ apiKey: 'sk-test123' }));
    const data = await res.json();

    expect(data.valid).toBe(true);
  });

  it('returns 400 when no key provided', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when key is not a string', async () => {
    const res = await POST(createRequest({ apiKey: 123 }));
    expect(res.status).toBe(400);
  });

  it('rejects keys not starting with sk-', async () => {
    const res = await POST(createRequest({ apiKey: 'pk-invalid' }));
    const data = await res.json();

    expect(data.valid).toBe(false);
    expect(data.error).toContain('sk-');
  });

  it('returns invalid for 401 error', async () => {
    mockModelsList.mockRejectedValue({ status: 401, message: 'Unauthorized' });

    const res = await POST(createRequest({ apiKey: 'sk-invalid' }));
    const data = await res.json();

    expect(data.valid).toBe(false);
  });

  it('returns valid for 429 (rate limited but key works)', async () => {
    mockModelsList.mockRejectedValue({ status: 429, message: 'Rate limited' });

    const res = await POST(createRequest({ apiKey: 'sk-ratelimited' }));
    const data = await res.json();

    expect(data.valid).toBe(true);
  });

  it('returns invalid for other OpenAI errors', async () => {
    mockModelsList.mockRejectedValue({ status: 500, message: 'Server error' });

    const res = await POST(createRequest({ apiKey: 'sk-broken' }));
    const data = await res.json();

    expect(data.valid).toBe(false);
  });

  it('returns 500 on unexpected error', async () => {
    const res = await POST(new NextRequest('http://localhost/api/user/settings/validate-key', {
      method: 'POST',
      body: 'not json',
    }));
    expect(res.status).toBe(500);
  });
});
