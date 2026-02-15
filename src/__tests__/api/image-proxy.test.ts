import { NextRequest } from 'next/server';
import { GET } from '@/app/api/images/proxy/route';

// Mock image-service
const mockDownloadAndCacheImage = jest.fn();
const mockGenerateImageHash = jest.fn(() => 'hash123');
const mockIsImageCached = jest.fn();

jest.mock('@/lib/image-service', () => ({
  downloadAndCacheImage: (...args: unknown[]) => mockDownloadAndCacheImage(...args),
  generateImageHash: (...args: unknown[]) => mockGenerateImageHash(...args),
  isImageCached: (...args: unknown[]) => mockIsImageCached(...args),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GET /api/images/proxy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when url param missing', async () => {
    const req = new NextRequest('http://localhost/api/images/proxy');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid URL', async () => {
    const req = new NextRequest('http://localhost/api/images/proxy?url=not-a-url');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-http protocol', async () => {
    const req = new NextRequest('http://localhost/api/images/proxy?url=ftp://example.com/img.jpg');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('redirects to cached image when available', async () => {
    mockIsImageCached.mockResolvedValue('/cached/image.jpg');

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/img.jpg');
    const res = await GET(req);

    expect(res.status).toBe(302);
  });

  it('downloads, caches, and redirects', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockDownloadAndCacheImage.mockResolvedValue({
      success: true,
      cachedImage: { localPath: '/cached/new.jpg' },
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/img.jpg');
    const res = await GET(req);

    expect(res.status).toBe(302);
  });

  it('proxies directly when cache fails', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockDownloadAndCacheImage.mockResolvedValue({ success: false });
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'image/jpeg'], ['content-length', '1024']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/img.jpg');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('returns error status when fetch fails', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockDownloadAndCacheImage.mockResolvedValue({ success: false });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Map(),
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/missing.jpg');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it('rejects non-image content type', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockDownloadAndCacheImage.mockResolvedValue({ success: false });
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'text/html']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/page.html');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('rejects oversized images', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockDownloadAndCacheImage.mockResolvedValue({ success: false });
    const bigSize = String(10 * 1024 * 1024); // 10MB
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'image/jpeg'], ['content-length', bigSize]]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/big.jpg');
    const res = await GET(req);

    expect(res.status).toBe(413);
  });

  it('skips caching when cache=false', async () => {
    mockIsImageCached.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'image/png']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/img.png&cache=false');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDownloadAndCacheImage).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    mockIsImageCached.mockRejectedValue(new Error('Unexpected'));

    const req = new NextRequest('http://localhost/api/images/proxy?url=https://example.com/img.jpg');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
