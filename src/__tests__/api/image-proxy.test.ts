/**
 * Image Proxy API Tests
 * Tests for GET /api/images/proxy
 */

import { GET } from '@/app/api/images/proxy/route';
import { NextRequest } from 'next/server';

// Mock the image service
jest.mock('@/lib/image-service', () => ({
  generateImageHash: jest.fn().mockReturnValue('abc123hash'),
  isImageCached: jest.fn().mockResolvedValue(null),
  downloadAndCacheImage: jest.fn().mockResolvedValue({ success: false }),
}));

// Mock global fetch for proxy fallback
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/images/proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('returns 400 when url parameter is missing', async () => {
      const req = makeRequest('/api/images/proxy');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing 'url' parameter");
    });

    it('returns 400 for invalid URL format', async () => {
      const req = makeRequest('/api/images/proxy?url=not-a-url');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid URL format');
    });

    it('returns 400 for non-http/https protocols', async () => {
      const req = makeRequest('/api/images/proxy?url=ftp://example.com/img.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid URL format');
    });
  });

  describe('cached images', () => {
    it('redirects to cached image when available', async () => {
      const { isImageCached } = require('@/lib/image-service');
      isImageCached.mockResolvedValueOnce('/images/listings/abc123hash.jpg');

      const req = makeRequest('/api/images/proxy?url=https://example.com/photo.jpg');
      const res = await GET(req);
      expect(res.status).toBe(302);
    });
  });

  describe('download and cache', () => {
    it('redirects to newly cached image on successful download', async () => {
      const { downloadAndCacheImage } = require('@/lib/image-service');
      downloadAndCacheImage.mockResolvedValueOnce({
        success: true,
        cachedImage: { localPath: '/images/listings/abc123hash.jpg' },
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/photo.jpg');
      const res = await GET(req);
      expect(res.status).toBe(302);
    });

    it('skips caching when cache=false', async () => {
      const { downloadAndCacheImage } = require('@/lib/image-service');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/photo.jpg&cache=false');
      const res = await GET(req);
      expect(downloadAndCacheImage).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  });

  describe('proxy fallback', () => {
    it('proxies image directly when caching fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/photo.png');
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/png');
      expect(res.headers.get('X-Image-Source')).toBe('proxy');
    });

    it('returns error status when upstream fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/missing.jpg');
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it('returns 400 when upstream content is not an image', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/page.html');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('not point to an image');
    });

    it('returns 413 when image exceeds size limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': String(10 * 1024 * 1024), // 10MB
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
      });

      const req = makeRequest('/api/images/proxy?url=https://example.com/huge.jpg');
      const res = await GET(req);
      expect(res.status).toBe(413);
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const req = makeRequest('/api/images/proxy?url=https://example.com/photo.jpg');
      const res = await GET(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Failed to proxy image');
    });
  });
});
