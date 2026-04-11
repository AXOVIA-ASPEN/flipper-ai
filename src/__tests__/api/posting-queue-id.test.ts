import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/posting-queue/[id]/route';

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    postingQueueItem: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

import { getAuthUserId } from '@/lib/auth-middleware';

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/posting-queue/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/posting-queue/1'), makeContext('1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when item not found', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/posting-queue/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('returns item when found', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    const item = {
      id: '1',
      userId: 'user-1',
      status: 'PENDING',
      listing: { title: 'Test', images: [], imageUrls: null },
    };
    mockFindFirst.mockResolvedValue(item);
    const res = await GET(new NextRequest('http://localhost/api/posting-queue/1'), makeContext('1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('1');
  });

  // Story 9.4: the detail route eager-loads sorted images and computes imageStatus.
  it('eager-loads sorted listing.images and computes imageStatus (Story 9.4)', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      status: 'PENDING',
      listing: {
        id: 'lst-1',
        title: 'Test',
        images: [
          { id: 'img-1', imageIndex: 0, storageUrl: 'https://x', contentType: 'image/jpeg' },
        ],
        imageUrls: null,
      },
    });

    const res = await GET(
      new NextRequest('http://localhost/api/posting-queue/1'),
      makeContext('1')
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          listing: expect.objectContaining({
            select: expect.objectContaining({
              images: expect.objectContaining({
                select: expect.objectContaining({ storageUrl: true }),
                orderBy: { imageIndex: 'asc' },
              }),
            }),
          }),
        }),
      })
    );

    const data = await res.json();
    expect(data.imageStatus).toBe('available');
  });

  it("GET /:id returns imageStatus='legacy-fallback' for listings with only imageUrls", async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      listing: {
        id: 'lst-1',
        images: [],
        imageUrls: JSON.stringify(['https://legacy.example/a.jpg']),
      },
    });

    const res = await GET(
      new NextRequest('http://localhost/api/posting-queue/1'),
      makeContext('1')
    );
    const data = await res.json();
    expect(data.imageStatus).toBe('legacy-fallback');
  });

  it("GET /:id returns imageStatus='manual-upload-required' when neither source has URLs", async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      listing: { id: 'lst-1', images: [], imageUrls: null },
    });

    const res = await GET(
      new NextRequest('http://localhost/api/posting-queue/1'),
      makeContext('1')
    );
    const data = await res.json();
    expect(data.imageStatus).toBe('manual-upload-required');
  });

  it('returns 500 on error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('fail'));
    const res = await GET(new NextRequest('http://localhost/api/posting-queue/1'), makeContext('1'));
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/posting-queue/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New' }),
    });
    const res = await PATCH(req, makeContext('1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when item not found', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New' }),
    });
    const res = await PATCH(req, makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('updates item successfully', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({ id: '1', userId: 'user-1' });
    const updated = { id: '1', title: 'Updated', status: 'PENDING' };
    mockUpdate.mockResolvedValue(updated);
    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const res = await PATCH(req, makeContext('1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.title).toBe('Updated');
  });

  it('returns 500 on error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('fail'));
    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New' }),
    });
    const res = await PATCH(req, makeContext('1'));
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/posting-queue/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/posting-queue/1', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when item not found', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/posting-queue/1', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when item is in progress', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({ id: '1', userId: 'user-1', status: 'IN_PROGRESS' });
    const req = new NextRequest('http://localhost/api/posting-queue/1', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('1'));
    expect(res.status).toBe(409);
  });

  it('deletes item successfully', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({ id: '1', userId: 'user-1', status: 'PENDING' });
    mockDelete.mockResolvedValue({});
    const req = new NextRequest('http://localhost/api/posting-queue/1', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
  });

  it('returns 500 on error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('fail'));
    const req = new NextRequest('http://localhost/api/posting-queue/1', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('1'));
    expect(res.status).toBe(500);
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('PATCH /api/posting-queue/[id] - branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when body is invalid', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INVALID_STATUS_VALUE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, makeContext('1'));
    expect(res.status).toBe(400);
  });

  it('updates with optional fields provided', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue({ id: '1', userId: 'user-1', status: 'PENDING' });
    mockUpdate.mockResolvedValue({
      id: '1',
      status: 'PENDING',
      askingPrice: 150,
      title: 'New Title',
      description: 'New Desc',
    });

    const req = new NextRequest('http://localhost/api/posting-queue/1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'PENDING',
        askingPrice: 150,
        title: 'New Title',
        description: 'New Desc',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, makeContext('1'));
    expect(res.status).toBe(200);
  });
});
