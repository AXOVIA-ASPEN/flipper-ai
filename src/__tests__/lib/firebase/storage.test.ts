/**
 * Tests for Firebase Storage helper utilities
 * All Firebase/GCP interactions are mocked — no real API calls.
 */

// Must mock before imports
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockFile = jest.fn().mockReturnValue({
  save: mockSave,
  delete: mockDelete,
});
const mockGetFiles = jest.fn().mockResolvedValue([[]]);
const mockBucket = jest.fn().mockReturnValue({
  name: 'axovia-flipper.firebasestorage.app',
  file: mockFile,
  getFiles: mockGetFiles,
});

jest.mock('@/lib/firebase/admin', () => ({
  adminStorage: {
    bucket: mockBucket,
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}));

import {
  buildStoragePath,
  uploadImage,
  uploadImageFromUrl,
  getPublicUrl,
  deleteImage,
  deleteListingImages,
  getStorageBucket,
} from '@/lib/firebase/storage';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

// JPEG magic bytes: FF D8 FF
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(100).fill(0)]);
// PNG magic bytes: 89 50 4E 47
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(100).fill(0)]);
// WebP magic bytes: 52 49 46 46 (RIFF)
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46, ...new Array(100).fill(0)]);
// GIF magic bytes: 47 49 46
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38, ...new Array(100).fill(0)]);

describe('Firebase Storage Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'axovia-flipper.firebasestorage.app';
  });

  describe('getStorageBucket', () => {
    it('returns the initialized bucket reference', () => {
      const bucket = getStorageBucket();
      expect(mockBucket).toHaveBeenCalled();
      expect(bucket.name).toBe('axovia-flipper.firebasestorage.app');
    });
  });

  describe('buildStoragePath', () => {
    it('generates correct structured path', () => {
      const path = buildStoragePath('user123', 'craigslist', 'listing456', 0, 'jpg');
      expect(path).toBe('user123/craigslist/listing456/0.jpg');
    });

    it('handles different platforms', () => {
      expect(buildStoragePath('u1', 'ebay', 'l1', 1, 'png')).toBe('u1/ebay/l1/1.png');
      expect(buildStoragePath('u1', 'facebook', 'l1', 2, 'webp')).toBe('u1/facebook/l1/2.webp');
      expect(buildStoragePath('u1', 'offerup', 'l1', 3, 'gif')).toBe('u1/offerup/l1/3.gif');
    });

    it('handles large image indices', () => {
      const path = buildStoragePath('user1', 'craigslist', 'listing1', 99, 'jpg');
      expect(path).toBe('user1/craigslist/listing1/99.jpg');
    });
  });

  describe('uploadImage', () => {
    it('uploads a valid JPEG image', async () => {
      const result = await uploadImage(JPEG_MAGIC, 'user1/ebay/l1/0.jpg', 'image/jpeg');

      expect(mockFile).toHaveBeenCalledWith('user1/ebay/l1/0.jpg');
      expect(mockSave).toHaveBeenCalledWith(JPEG_MAGIC, {
        metadata: { contentType: 'image/jpeg' },
        public: true,
      });
      expect(result.storageUrl).toBe(
        'https://storage.googleapis.com/axovia-flipper.firebasestorage.app/user1/ebay/l1/0.jpg'
      );
      expect(result.storagePath).toBe('user1/ebay/l1/0.jpg');
      expect(result.fileSize).toBe(JPEG_MAGIC.length);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('uploads a valid PNG image', async () => {
      const result = await uploadImage(PNG_MAGIC, 'user1/ebay/l1/1.png', 'image/png');
      expect(result.contentType).toBe('image/png');
      expect(mockSave).toHaveBeenCalled();
    });

    it('uploads a valid WebP image', async () => {
      const result = await uploadImage(WEBP_MAGIC, 'user1/ebay/l1/2.webp', 'image/webp');
      expect(result.contentType).toBe('image/webp');
    });

    it('uploads a valid GIF image', async () => {
      const result = await uploadImage(GIF_MAGIC, 'user1/ebay/l1/3.gif', 'image/gif');
      expect(result.contentType).toBe('image/gif');
    });

    it('rejects invalid content type', async () => {
      await expect(
        uploadImage(JPEG_MAGIC, 'path', 'application/pdf')
      ).rejects.toThrow(AppError);

      await expect(
        uploadImage(JPEG_MAGIC, 'path', 'application/pdf')
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('rejects oversized file', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      // Add JPEG magic bytes
      bigBuffer[0] = 0xff;
      bigBuffer[1] = 0xd8;
      bigBuffer[2] = 0xff;

      await expect(
        uploadImage(bigBuffer, 'path', 'image/jpeg')
      ).rejects.toThrow(AppError);

      await expect(
        uploadImage(bigBuffer, 'path', 'image/jpeg')
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('rejects empty file', async () => {
      await expect(
        uploadImage(Buffer.alloc(0), 'path', 'image/jpeg')
      ).rejects.toThrow(AppError);
    });

    it('rejects magic bytes mismatch', async () => {
      // PNG magic bytes declared as JPEG
      await expect(
        uploadImage(PNG_MAGIC, 'path', 'image/jpeg')
      ).rejects.toThrow(AppError);

      await expect(
        uploadImage(PNG_MAGIC, 'path', 'image/jpeg')
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('rejects file too small to validate magic bytes', async () => {
      const tiny = Buffer.from([0xff, 0xd8]); // Only 2 bytes, JPEG needs 3
      await expect(
        uploadImage(tiny, 'path', 'image/jpeg')
      ).rejects.toThrow(AppError);
    });
  });

  describe('uploadImageFromUrl', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('downloads and uploads an image from URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: jest.fn().mockResolvedValue(JPEG_MAGIC.buffer.slice(
          JPEG_MAGIC.byteOffset,
          JPEG_MAGIC.byteOffset + JPEG_MAGIC.byteLength
        )),
      });

      const result = await uploadImageFromUrl(
        'https://example.com/image.jpg',
        'user1/ebay/l1/0.jpg'
      );

      expect(result.originalUrl).toBe('https://example.com/image.jpg');
      expect(result.storageUrl).toContain('user1/ebay/l1/0.jpg');
      expect(result.contentType).toBe('image/jpeg');
      expect(mockSave).toHaveBeenCalled();
    });

    it('handles content-type with charset', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png; charset=utf-8' }),
        arrayBuffer: jest.fn().mockResolvedValue(PNG_MAGIC.buffer.slice(
          PNG_MAGIC.byteOffset,
          PNG_MAGIC.byteOffset + PNG_MAGIC.byteLength
        )),
      });

      const result = await uploadImageFromUrl('https://example.com/img.png', 'path/img.png');
      expect(result.contentType).toBe('image/png');
    });

    it('throws on HTTP error response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        uploadImageFromUrl('https://example.com/missing.jpg', 'path')
      ).rejects.toThrow(AppError);

      await expect(
        uploadImageFromUrl('https://example.com/missing.jpg', 'path')
      ).rejects.toMatchObject({
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      });
    });

    it('wraps network errors from fetch in ExternalServiceError', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

      await expect(
        uploadImageFromUrl('https://unreachable.example.com/img.jpg', 'path')
      ).rejects.toThrow(AppError);

      await expect(
        uploadImageFromUrl('https://unreachable.example.com/img.jpg', 'path')
      ).rejects.toMatchObject({
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      });
    });

    it('throws on invalid content type from URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
      });

      await expect(
        uploadImageFromUrl('https://example.com/page.html', 'path')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getPublicUrl', () => {
    it('generates correct public URL', () => {
      const url = getPublicUrl('user1/ebay/listing1/0.jpg');
      expect(url).toBe(
        'https://storage.googleapis.com/axovia-flipper.firebasestorage.app/user1/ebay/listing1/0.jpg'
      );
    });

    it('handles paths with special characters', () => {
      const url = getPublicUrl('user-abc/face_book/list-123/5.webp');
      expect(url).toContain('user-abc/face_book/list-123/5.webp');
    });
  });

  describe('deleteImage', () => {
    it('deletes a file from storage', async () => {
      await deleteImage('user1/ebay/listing1/0.jpg');

      expect(mockFile).toHaveBeenCalledWith('user1/ebay/listing1/0.jpg');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('wraps storage errors in AppError', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        deleteImage('user1/ebay/listing1/0.jpg')
      ).rejects.toThrow(AppError);

      mockDelete.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        deleteImage('user1/ebay/listing1/0.jpg')
      ).rejects.toMatchObject({
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      });
    });

    it('ignores not-found errors when ignoreNotFound is true', async () => {
      const notFoundError = new Error('No such object: user1/ebay/listing1/0.jpg');
      mockDelete.mockRejectedValueOnce(notFoundError);

      await expect(
        deleteImage('user1/ebay/listing1/0.jpg', { ignoreNotFound: true })
      ).resolves.toBeUndefined();
    });

    it('still throws non-404 errors even with ignoreNotFound', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        deleteImage('user1/ebay/listing1/0.jpg', { ignoreNotFound: true })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteListingImages', () => {
    it('deletes all files with listing prefix and returns count', async () => {
      const mockFileDelete1 = jest.fn().mockResolvedValue(undefined);
      const mockFileDelete2 = jest.fn().mockResolvedValue(undefined);
      mockGetFiles.mockResolvedValueOnce([
        [
          { delete: mockFileDelete1 },
          { delete: mockFileDelete2 },
        ],
      ]);

      const result = await deleteListingImages('user1', 'ebay', 'listing1');

      expect(mockGetFiles).toHaveBeenCalledWith({
        prefix: 'user1/ebay/listing1/',
      });
      expect(mockFileDelete1).toHaveBeenCalled();
      expect(mockFileDelete2).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2, failed: 0 });
    });

    it('returns zero counts when no files match', async () => {
      mockGetFiles.mockResolvedValueOnce([[]]);

      const result = await deleteListingImages('user1', 'ebay', 'nonexistent');

      expect(mockGetFiles).toHaveBeenCalledWith({
        prefix: 'user1/ebay/nonexistent/',
      });
      expect(result).toEqual({ deleted: 0, failed: 0 });
    });

    it('continues deleting remaining files when some fail (Promise.allSettled)', async () => {
      const mockFileDelete1 = jest.fn().mockRejectedValue(new Error('Permission denied'));
      const mockFileDelete2 = jest.fn().mockResolvedValue(undefined);
      const mockFileDelete3 = jest.fn().mockResolvedValue(undefined);

      mockGetFiles.mockResolvedValueOnce([
        [
          { delete: mockFileDelete1 },
          { delete: mockFileDelete2 },
          { delete: mockFileDelete3 },
        ],
      ]);

      const result = await deleteListingImages('user1', 'ebay', 'listing1');

      expect(mockFileDelete1).toHaveBeenCalled();
      expect(mockFileDelete2).toHaveBeenCalled();
      expect(mockFileDelete3).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2, failed: 1 });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete 1/3'),
        expect.objectContaining({ userId: 'user1', platform: 'ebay', listingId: 'listing1', failed: 1 })
      );
    });
  });
});
