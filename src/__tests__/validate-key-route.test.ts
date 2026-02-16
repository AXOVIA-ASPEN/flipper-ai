/**
 * API Key Validation Route Tests
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest } from 'next/server';

// Mock OpenAI before importing route
const mockModelsList = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    models: { list: mockModelsList },
  }));
});

import { POST } from '../app/api/user/settings/validate-key/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/user/settings/validate-key', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/user/settings/validate-key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no apiKey provided', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('required');
  });

  it('should return 400 if apiKey is not a string', async () => {
    const res = await POST(makeRequest({ apiKey: 123 }));
    expect(res.status).toBe(400);
  });

  it('should reject keys not starting with sk-', async () => {
    const res = await POST(makeRequest({ apiKey: 'pk-invalid-key' }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('sk-');
  });

  it('should validate a valid API key', async () => {
    mockModelsList.mockResolvedValueOnce({ data: [] });
    const res = await POST(makeRequest({ apiKey: 'sk-valid-key-123' }));
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.success).toBe(true);
  });

  it('should reject invalid key (401)', async () => {
    mockModelsList.mockRejectedValueOnce({ status: 401, message: 'Invalid' });
    const res = await POST(makeRequest({ apiKey: 'sk-bad-key' }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('Invalid API key');
  });

  it('should accept rate-limited key (429) as valid', async () => {
    mockModelsList.mockRejectedValueOnce({ status: 429, message: 'Rate limited' });
    const res = await POST(makeRequest({ apiKey: 'sk-rate-limited' }));
    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  it('should handle other OpenAI errors', async () => {
    mockModelsList.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    const res = await POST(makeRequest({ apiKey: 'sk-error-key' }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('Server error');
  });

  it('should handle malformed request body (500)', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/settings/validate-key', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
