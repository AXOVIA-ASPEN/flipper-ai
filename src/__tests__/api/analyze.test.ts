import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/analyze/[listingId]/route';

function createParams(listingId: string) {
  return { params: Promise.resolve({ listingId }) };
}

describe('POST /api/analyze/[listingId] - stub', () => {
  it('returns 501 with unavailable message', async () => {
    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('temporarily unavailable');
  });
});

describe('GET /api/analyze/[listingId] - stub', () => {
  it('returns 501 with unavailable message', async () => {
    const req = new NextRequest('http://localhost/api/analyze/listing-1');
    const res = await GET(req, createParams('listing-1'));
    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('temporarily unavailable');
  });
});
